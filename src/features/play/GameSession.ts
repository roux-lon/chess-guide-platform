import { createGame } from "@/rules";
import type { Color, Game, GameStatus, MoveInfo, PromotionPiece, Square } from "@/rules";
import type { EngineAdapter } from "@/engine";

export interface GameSnapshot {
  fen: string;
  turn: Color;
  playerColor: Color;
  status: GameStatus;
  /** Legal destinations for the human. Empty when it is not their turn. */
  legalDests: Map<Square, Square[]>;
  lastMove?: { from: Square; to: Square };
  moves: MoveInfo[];
  botThinking: boolean;
  pendingPromotion?: { from: Square; to: Square };
  canUndo: boolean;
  error?: string;
}

export interface GameSessionOptions {
  engine: EngineAdapter;
  playerColor?: Color;
  /** Pause before the bot replies so its move is easy to follow. */
  botDelayMs?: number;
  /** Position for the first game only (handy for tests); new games use the standard start. */
  startFen?: string;
}

/** Orchestrates one game between the human and an engine. No React in here. */
export class GameSession {
  private game: Game;
  private playerColor: Color;
  private botThinking = false;
  private pendingPromotion?: { from: Square; to: Square };
  private error?: string;
  /** Bumped whenever a pending bot reply should be thrown away. */
  private token = 0;
  private listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private readonly engine: EngineAdapter;
  private readonly botDelayMs: number;

  constructor({ engine, playerColor = "white", botDelayMs = 400, startFen }: GameSessionOptions) {
    this.game = createGame(startFen);
    this.engine = engine;
    this.playerColor = playerColor;
    this.botDelayMs = botDelayMs;
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Stable between changes, as useSyncExternalStore requires. */
  getSnapshot = (): GameSnapshot => this.snapshot;

  /** Starts the game; if the human plays black the bot makes the first move. */
  start(): void {
    if (!this.botThinking) void this.maybeBotMove();
  }

  newGame(playerColor: Color = this.playerColor): void {
    this.token++;
    this.game = createGame();
    this.playerColor = playerColor;
    this.botThinking = false;
    this.pendingPromotion = undefined;
    this.error = undefined;
    this.emit();
    void this.maybeBotMove();
  }

  /** Called when the human drags or clicks a move. Illegal moves are ignored. */
  attemptMove(from: Square, to: Square): void {
    if (!this.isHumanTurn()) return this.emit();
    if (this.game.needsPromotion(from, to)) {
      this.pendingPromotion = { from, to };
      return this.emit();
    }
    this.playHuman(from, to);
  }

  choosePromotion(piece: PromotionPiece): void {
    const pending = this.pendingPromotion;
    if (!pending || !this.isHumanTurn()) return;
    this.pendingPromotion = undefined;
    this.playHuman(pending.from, pending.to, piece);
  }

  cancelPromotion(): void {
    this.pendingPromotion = undefined;
    this.emit();
  }

  /** Takes back the human's last move (and the bot's reply, if it made one). */
  undo(): void {
    this.token++;
    this.botThinking = false;
    this.pendingPromotion = undefined;
    this.error = undefined;
    if (this.game.undo()) {
      while (this.game.turn() !== this.playerColor && this.game.undo()) {
        // keep going until it is the human's turn again
      }
    }
    this.emit();
    void this.maybeBotMove();
  }

  dispose(): void {
    this.token++;
    this.listeners.clear();
    this.engine.dispose();
  }

  private isHumanTurn(): boolean {
    return (
      !this.botThinking &&
      !this.game.status().isGameOver &&
      this.game.turn() === this.playerColor
    );
  }

  private playHuman(from: Square, to: Square, promotion?: PromotionPiece): void {
    if (!this.game.tryMove(from, to, promotion)) return this.emit();
    this.error = undefined;
    this.emit();
    void this.maybeBotMove();
  }

  private async maybeBotMove(): Promise<void> {
    if (this.game.status().isGameOver || this.game.turn() === this.playerColor) return;
    const token = ++this.token;
    this.botThinking = true;
    this.emit();
    try {
      const [move] = await Promise.all([
        this.engine.chooseMove(this.game.fen()),
        new Promise((resolve) => setTimeout(resolve, this.botDelayMs)),
      ]);
      if (token !== this.token) return;
      if (!this.game.tryMove(move.from, move.to, move.promotion)) {
        throw new Error(`Bot proposed an illegal move: ${move.from}${move.to}`);
      }
    } catch (e) {
      if (token !== this.token) return;
      this.error = e instanceof Error ? e.message : "The bot had a problem.";
    }
    this.botThinking = false;
    this.emit();
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): GameSnapshot {
    const moves = this.game.history();
    const last = moves[moves.length - 1];
    return {
      fen: this.game.fen(),
      turn: this.game.turn(),
      playerColor: this.playerColor,
      status: this.game.status(),
      legalDests: this.isHumanTurn() ? this.game.legalDests() : new Map(),
      lastMove: last ? { from: last.from, to: last.to } : undefined,
      moves,
      botThinking: this.botThinking,
      pendingPromotion: this.pendingPromotion,
      canUndo: moves.some((m) => m.color === this.playerColor),
      error: this.error,
    };
  }
}
