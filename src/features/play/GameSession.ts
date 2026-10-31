import { COACH_CONFIG, HINT_TITLES, TAKE_BACK_MESSAGES, buildHintEvents } from "@/coach";
import type { CoachEvent, Narrator } from "@/coach";
import { CoachAnalyzer } from "@/features/coach";
import type { CoachLogEntry } from "@/features/coach";
import { newId } from "@/lib/id";
import { createGame, createGameFromSan } from "@/rules";
import type { Color, Game, GameStatus, MoveInfo, PromotionPiece, Square } from "@/rules";
import { DEFAULT_LEVEL } from "@/engine";
import type { BotLevel, EngineAdapter } from "@/engine";
import type { CoachLogRecord, CoachingMode, MistakeRecord } from "@/storage";
import { openingView } from "@/features/opening";
import type { OpeningView } from "@/features/opening";
import { dangerHighlights } from "./dangers";
import type { DangerHighlight } from "./dangers";

export interface HintView {
  /** 1 = safety check, 2 = plan check, 3 = the suggested move with its reason. */
  tier: number;
  /** Short name of the tier, such as "Safety check". */
  title: string;
  text: string;
}

export interface TakeBackOffer {
  /** The half-move the offer is about. */
  ply: number;
  reason: "hanging" | "blunder";
  message: string;
}

export interface GameSnapshot {
  /** Stays the same for the whole game, including after it is resumed. */
  gameId: string;
  fen: string;
  turn: Color;
  playerColor: Color;
  level: BotLevel;
  coachingMode: CoachingMode;
  /** A practice position (retrying a mistake): never saved to the diary. */
  practice: boolean;
  status: GameStatus;
  /** The game has ended, by the rules or because the player resigned. */
  gameOver: boolean;
  resigned: boolean;
  /** Legal destinations for the human. Empty when it is not their turn. */
  legalDests: Map<Square, Square[]>;
  lastMove?: { from: Square; to: Square };
  moves: MoveInfo[];
  /** The moves in standard notation, oldest first. */
  sanMoves: string[];
  botThinking: boolean;
  pendingPromotion?: { from: Square; to: Square };
  canUndo: boolean;
  canResign: boolean;
  error?: string;
  /** One comment per half-move played so far, oldest first. Empty when coaching is off. */
  coachLog: readonly CoachLogEntry[];
  /** Full coaching only: squares to light up on the board. */
  dangers: DangerHighlight[];
  /** Full coaching only: the coach's latest words, shown beside the board. */
  latestComment?: string;
  /** Hints revealed for the current position, in tier order. Reset after every move. */
  hints: HintView[];
  hintLoading: boolean;
  canRequestHint: boolean;
  /** Set when the player's last move left a piece hanging or was a blunder. */
  takeBackOffer?: TakeBackOffer;
  /** Opening practice only: the checklist, the next step and a note on the last move. */
  opening?: OpeningView;
}

/** What is needed to continue a saved game. */
export interface RestoreState {
  moves: readonly string[];
  coachLog: readonly CoachLogRecord[];
  mistakes: readonly MistakeRecord[];
}

export interface GameSessionOptions {
  engine: EngineAdapter;
  /**
   * A second engine used only for coaching (evaluations and hints). It must not be the same
   * instance as `engine`: an engine runs one search at a time and would cancel the bot.
   * Without it the game still works, just with no coach. Leave it out when coaching is off.
   */
  analysisEngine?: EngineAdapter;
  narrator?: Narrator;
  playerColor?: Color;
  level?: BotLevel;
  coachingMode?: CoachingMode;
  /** Identifies the game in the diary. Made up if not given. */
  gameId?: string;
  /** Pause before the bot replies so its move is easy to follow. */
  botDelayMs?: number;
  /**
   * The bot waits up to this long for the coach to comment on the player's move, so a
   * warning can show up before the bot punishes the move.
   */
  coachWaitMs?: number;
  /** Position for the first game only (handy for tests and practice); new games use the standard start. */
  startFen?: string;
  /** Continue a saved game instead of starting a new one. */
  restore?: RestoreState;
  /** A practice position: the game is not meant to be saved. */
  practice?: boolean;
  /** Opening practice: the snapshot carries the opening checklist. Not saved as a game. */
  opening?: boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Orchestrates one game between the human and an engine, plus the coach. No React in here. */
export class GameSession {
  readonly gameId: string;
  private game: Game;
  private playerColor: Color;
  private level: BotLevel;
  private readonly coachingMode: CoachingMode;
  private readonly practice: boolean;
  private readonly opening: boolean;
  private botThinking = false;
  private resigned = false;
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
  /** Mistakes kept from an earlier visit to this game (a resumed game). */
  private restoredMistakes: MistakeRecord[] = [];
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
    coachingMode = "quiet",
    gameId,
    botDelayMs = 400,
    coachWaitMs = 1500,
    startFen,
    restore,
    practice = false,
    opening = false,
  }: GameSessionOptions) {
    this.gameId = gameId ?? newId();
    this.engine = engine;
    this.level = level;
    engine.setLevel(level);
    this.playerColor = playerColor;
    this.coachingMode = coachingMode;
    this.practice = practice;
    this.opening = opening;
    this.botDelayMs = botDelayMs;
    this.coachWaitMs = coachWaitMs;

    let initialLog: CoachLogEntry[] = [];
    if (restore) {
      const replayed = createGameFromSan(restore.moves);
      if (!replayed) throw new Error("The saved game could not be replayed.");
      this.game = replayed;
      this.restoredMistakes = [...restore.mistakes];
      // Comments from before keep their words, but not the detail behind them.
      initialLog = restore.coachLog.map((record) => ({
        ply: record.ply,
        moveSan: restore.moves[record.ply - 1] ?? "",
        side: (record.ply % 2 === 1) === (playerColor === "white") ? "you" : "bot",
        events: [],
        text: record.text,
      }));
    } else {
      this.game = createGame(startFen);
    }

    if (analysisEngine) {
      this.coach = new CoachAnalyzer({
        engine: analysisEngine,
        narrator,
        initialLog,
        onChange: () => this.emit(),
      });
    }
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Stable between changes, as useSyncExternalStore requires. */
  getSnapshot = (): GameSnapshot => this.snapshot;

  /** Mistakes kept from an earlier visit, still valid for the moves now on the board. */
  getRestoredMistakes(): readonly MistakeRecord[] {
    return this.restoredMistakes;
  }

  /** Resolves once the coach has commented on every move so far. Resolves at once with no coach. */
  coachSettled(): Promise<void> {
    return this.coach?.idle() ?? Promise.resolve();
  }

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

  /** The player gives up. The game stops here; the bot makes no more moves. */
  resign(): void {
    if (this.resigned || this.game.status().isGameOver) return;
    this.token++;
    this.engine.cancel();
    this.botThinking = false;
    this.pendingPromotion = undefined;
    this.resigned = true;
    this.resetHints();
    this.emit();
  }

  /**
   * Takes back the human's last move (and the bot's reply, if it made one).
   * Not available with coaching off: that mode is the "can I play on my own?" test.
   */
  undo(): void {
    if (this.resigned || this.coachingMode === "off") return;
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
    const length = this.game.history().length;
    this.restoredMistakes = this.restoredMistakes.filter((m) => m.ply <= length);
    this.coach?.truncate(length);
    this.emit();
    void this.maybeBotMove();
  }

  /**
   * The "I'm stuck" button. Each press reveals the next step of the thinking routine for the
   * current position: a safety check, a plan check, then the suggested move with its reason.
   */
  async requestHint(): Promise<void> {
    const coach = this.coach;
    if (!coach || !this.snapshot.canRequestHint) return;

    const token = this.hintToken;
    if (!this.hintEvents) {
      this.hintLoading = true;
      this.emit();
      const fen = this.game.fen();
      const history = this.game.history();
      const best = await coach.bestMoveFor(fen);
      if (token !== this.hintToken) return;
      this.hintEvents = buildHintEvents({
        fen,
        playerColor: this.playerColor,
        bestMove: best ? { from: best.from, to: best.to, promotion: best.promotion } : null,
        ply: history.length + 1,
        previousMove: history[history.length - 1],
      });
      this.hintLoading = false;
    }

    const next = this.hints.length;
    if (next >= this.hintEvents.length) return this.emit();
    this.hints = [
      ...this.hints,
      { tier: next + 1, title: HINT_TITLES[next] ?? "", text: coach.narrate([this.hintEvents[next]]) },
    ];
    this.emit();
  }

  dispose(): void {
    this.token++;
    this.listeners.clear();
    this.engine.dispose();
    this.coach?.dispose();
  }

  private isOver(): boolean {
    return this.resigned || this.game.status().isGameOver;
  }

  private isHumanTurn(): boolean {
    return !this.botThinking && !this.isOver() && this.game.turn() === this.playerColor;
  }

  private resetHints(): void {
    this.hintToken++;
    this.hints = [];
    this.hintEvents = undefined;
    this.hintLoading = false;
  }

  /** Sends a move that was just played to the coach and returns when its comment is ready. */
  private analyze(fenBefore: string, from: Square, to: Square, promotion?: PromotionPiece) {
    const history = this.game.history();
    return this.coach?.enqueue({
      fenBefore,
      from,
      to,
      promotion,
      ply: history.length,
      playerColor: this.playerColor,
      previousMove: history[history.length - 2],
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

  /** After the bot failed to move, asks it again. Does nothing if there is no problem to retry. */
  retryBot(): void {
    if (!this.error || this.botThinking) return;
    this.error = undefined;
    void this.maybeBotMove();
  }

  private async maybeBotMove(): Promise<void> {
    if (this.isOver() || this.game.turn() === this.playerColor) return;
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
    const over = this.isOver();
    const log = this.coach?.getLog() ?? [];
    const full = this.coachingMode === "full";
    return {
      gameId: this.gameId,
      fen: this.game.fen(),
      turn: this.game.turn(),
      playerColor: this.playerColor,
      level: this.level,
      coachingMode: this.coachingMode,
      practice: this.practice,
      status: this.game.status(),
      gameOver: over,
      resigned: this.resigned,
      legalDests: humanTurn ? this.game.legalDests() : new Map(),
      lastMove: last ? { from: last.from, to: last.to } : undefined,
      moves,
      sanMoves: moves.map((m) => m.san),
      botThinking: this.botThinking,
      pendingPromotion: this.pendingPromotion,
      canUndo: moves.some((m) => m.color === this.playerColor) && this.coachingMode !== "off" && !this.resigned,
      canResign: !over,
      error: this.error,
      coachLog: log,
      dangers: full && !over ? dangerHighlights(this.game.fen(), this.playerColor) : [],
      ...(full && log.length > 0 ? { latestComment: log[log.length - 1].text } : {}),
      hints: this.hints,
      hintLoading: this.hintLoading,
      canRequestHint:
        !!this.coach &&
        humanTurn &&
        !this.hintLoading &&
        this.hints.length < COACH_CONFIG.hintTierCount,
      takeBackOffer: this.buildTakeBackOffer(moves),
      ...(this.opening ? { opening: openingView(this.game.fen(), this.playerColor, moves) } : {}),
    };
  }
}
