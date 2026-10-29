import { COACH_CONFIG, TAKE_BACK_MESSAGES, buildHintEvents } from "@/coach";
import type { CoachEvent, Narrator } from "@/coach";
import { CoachAnalyzer } from "@/features/coach";
import type { CoachLogEntry } from "@/features/coach";
import { createGame } from "@/rules";
import type { Color, Game, GameStatus, MoveInfo, PromotionPiece, Square } from "@/rules";
import { DEFAULT_LEVEL } from "@/engine";
import type { BotLevel, EngineAdapter } from "@/engine";

export interface HintView {
  /** 1 = where to look, 2 = what the bot threatens, 3 = the suggested move. */
  tier: number;
  text: string;
}

export interface TakeBackOffer {
  /** The half-move the offer is about. */
  ply: number;
  reason: "hanging" | "blunder";
  message: string;
}

export interface GameSnapshot {
  fen: string;
  turn: Color;
  playerColor: Color;
  level: BotLevel;
  status: GameStatus;
  /** Legal destinations for the human. Empty when it is not their turn. */
  legalDests: Map<Square, Square[]>;
  lastMove?: { from: Square; to: Square };
  moves: MoveInfo[];
  botThinking: boolean;
  pendingPromotion?: { from: Square; to: Square };
  canUndo: boolean;
  error?: string;
  /** One comment per half-move played so far, oldest first. */
  coachLog: readonly CoachLogEntry[];
  /** Hints revealed for the current position, in tier order. Reset after every move. */
  hints: HintView[];
  hintLoading: boolean;
  canRequestHint: boolean;
  /** Set when the player's last move left a piece hanging or was a blunder. */
  takeBackOffer?: TakeBackOffer;
}

export interface GameSessionOptions {
  engine: EngineAdapter;
  /**
   * A second engine used only for coaching (evaluations and hints). It must not be the same
   * instance as `engine`: an engine runs one search at a time and would cancel the bot.
   * Without it the game still works, just with no coach.
   */
  analysisEngine?: EngineAdapter;
  narrator?: Narrator;
  playerColor?: Color;
  level?: BotLevel;
  /** Pause before the bot replies so its move is easy to follow. */
  botDelayMs?: number;
  /**
   * The bot waits up to this long for the coach to comment on the player's move, so a
   * warning can show up before the bot punishes the move.
   */
  coachWaitMs?: number;
  /** Position for the first game only (handy for tests); new games use the standard start. */
  startFen?: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Orchestrates one game between the human and an engine, plus the coach. No React in here. */
export class GameSession {
  private game: Game;
  private playerColor: Color;
  private level: BotLevel;
  private botThinking = false;
  private pendingPromotion?: { from: Square; to: Square };
  private error?: string;
  /** Bumped whenever a pending bot reply should be thrown away. */
  private token = 0;
  private listeners = new Set<() => void>();
  private snapshot: GameSnapshot;
  private readonly engine: EngineAdapter;
  private readonly botDelayMs: number;
  private readonly coachWaitMs: number;

  private readonly coach?: CoachAnalyzer;
  /** Resolves when the coach has finished commenting on the player's latest move. */
  private pendingAnalysis?: Promise<unknown>;
  private hints: HintView[] = [];
  private hintEvents?: CoachEvent[];
  private hintLoading = false;
  /** Bumped when the position changes, so a slow hint lookup is thrown away. */
  private hintToken = 0;

  constructor({
    engine,
    analysisEngine,
    narrator,
    playerColor = "white",
    level = DEFAULT_LEVEL,
    botDelayMs = 400,
    coachWaitMs = 1500,
    startFen,
  }: GameSessionOptions) {
    this.game = createGame(startFen);
    this.engine = engine;
    this.level = level;
    engine.setLevel(level);
    this.playerColor = playerColor;
    this.botDelayMs = botDelayMs;
    this.coachWaitMs = coachWaitMs;
    if (analysisEngine) {
      this.coach = new CoachAnalyzer({ engine: analysisEngine, narrator, onChange: () => this.emit() });
    }
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
    // Warm the engines up now so the first reply is quick. A failure resurfaces on first use.
    this.engine.init().catch(() => {});
    this.coach?.warmUp();
    if (!this.botThinking) void this.maybeBotMove();
  }

  /** Changes bot strength. If the bot is mid-thought it starts over at the new level. */
  setLevel(level: BotLevel): void {
    if (level === this.level) return;
    this.level = level;
    this.engine.setLevel(level);
    if (this.botThinking) {
      this.token++;
      this.botThinking = false;
      this.engine.cancel();
      void this.maybeBotMove();
    } else {
      this.emit();
    }
  }

  newGame(playerColor: Color = this.playerColor): void {
    this.token++;
    this.engine.cancel();
    this.coach?.reset();
    this.pendingAnalysis = undefined;
    this.resetHints();
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
    this.engine.cancel();
    this.botThinking = false;
    this.pendingPromotion = undefined;
    this.pendingAnalysis = undefined;
    this.error = undefined;
    this.resetHints();
    if (this.game.undo()) {
      while (this.game.turn() !== this.playerColor && this.game.undo()) {
        // keep going until it is the human's turn again
      }
    }
    this.coach?.truncate(this.game.history().length);
    this.emit();
    void this.maybeBotMove();
  }

  /**
   * The "I'm stuck" button. Each press reveals the next tier for the current position:
   * where to look, what the bot threatens, then the suggested move.
   */
  async requestHint(): Promise<void> {
    const coach = this.coach;
    if (!coach || !this.snapshot.canRequestHint) return;

    const token = this.hintToken;
    if (!this.hintEvents) {
      this.hintLoading = true;
      this.emit();
      const fen = this.game.fen();
      const best = await coach.bestMoveFor(fen);
      if (token !== this.hintToken) return;
      this.hintEvents = buildHintEvents({
        fen,
        playerColor: this.playerColor,
        bestMove: best ? { from: best.from, to: best.to, promotion: best.promotion } : null,
      });
      this.hintLoading = false;
    }

    const next = this.hints.length;
    if (next >= this.hintEvents.length) return this.emit();
    this.hints = [...this.hints, { tier: next + 1, text: coach.narrate([this.hintEvents[next]]) }];
    this.emit();
  }

  dispose(): void {
    this.token++;
    this.listeners.clear();
    this.engine.dispose();
    this.coach?.dispose();
  }

  private isHumanTurn(): boolean {
    return (
      !this.botThinking &&
      !this.game.status().isGameOver &&
      this.game.turn() === this.playerColor
    );
  }

  private resetHints(): void {
    this.hintToken++;
    this.hints = [];
    this.hintEvents = undefined;
    this.hintLoading = false;
  }

  /** Sends a move that was just played to the coach and returns when its comment is ready. */
  private analyze(fenBefore: string, from: Square, to: Square, promotion?: PromotionPiece) {
    return this.coach?.enqueue({
      fenBefore,
      from,
      to,
      promotion,
      ply: this.game.history().length,
      playerColor: this.playerColor,
    });
  }

  private playHuman(from: Square, to: Square, promotion?: PromotionPiece): void {
    const fenBefore = this.game.fen();
    if (!this.game.tryMove(from, to, promotion)) return this.emit();
    this.error = undefined;
    this.resetHints();
    this.pendingAnalysis = this.analyze(fenBefore, from, to, promotion);
    this.emit();
    void this.maybeBotMove();
  }

  private async maybeBotMove(): Promise<void> {
    if (this.game.status().isGameOver || this.game.turn() === this.playerColor) return;
    const token = ++this.token;
    this.botThinking = true;
    this.emit();
    try {
      // Give the coach a moment to comment on the player's move first, but never wait long.
      const coachReady = this.pendingAnalysis
        ? Promise.race([this.pendingAnalysis, sleep(this.coachWaitMs)])
        : undefined;
      const [move] = await Promise.all([
        this.engine.getBotMove(this.game.fen()),
        sleep(this.botDelayMs),
        coachReady,
      ]);
      if (token !== this.token) return;
      const fenBefore = this.game.fen();
      if (!this.game.tryMove(move.from, move.to, move.promotion)) {
        throw new Error(`Bot proposed an illegal move: ${move.from}${move.to}`);
      }
      this.resetHints();
      void this.analyze(fenBefore, move.from, move.to, move.promotion);
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

  private buildTakeBackOffer(moves: MoveInfo[]): TakeBackOffer | undefined {
    if (!this.coach) return undefined;
    let lastPlayerPly = 0;
    moves.forEach((m, i) => {
      if (m.color === this.playerColor) lastPlayerPly = i + 1;
    });
    const entry = this.coach.getLog().find((e) => e.ply === lastPlayerPly && e.side === "you");
    if (!entry?.warning) return undefined;
    return { ply: entry.ply, reason: entry.warning, message: TAKE_BACK_MESSAGES[entry.warning] };
  }

  private buildSnapshot(): GameSnapshot {
    const moves = this.game.history();
    const last = moves[moves.length - 1];
    const humanTurn = this.isHumanTurn();
    return {
      fen: this.game.fen(),
      turn: this.game.turn(),
      playerColor: this.playerColor,
      level: this.level,
      status: this.game.status(),
      legalDests: humanTurn ? this.game.legalDests() : new Map(),
      lastMove: last ? { from: last.from, to: last.to } : undefined,
      moves,
      botThinking: this.botThinking,
      pendingPromotion: this.pendingPromotion,
      canUndo: moves.some((m) => m.color === this.playerColor),
      error: this.error,
      coachLog: this.coach?.getLog() ?? [],
      hints: this.hints,
      hintLoading: this.hintLoading,
      canRequestHint:
        !!this.coach &&
        humanTurn &&
        !this.hintLoading &&
        this.hints.length < COACH_CONFIG.hintTierCount,
      takeBackOffer: this.buildTakeBackOffer(moves),
    };
  }
}
