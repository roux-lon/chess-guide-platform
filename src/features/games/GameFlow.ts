import { sideToMove } from "@/lib/perspective";
import type { BotLevel, EngineAdapter } from "@/engine";
import { GameSession } from "@/features/play/GameSession";
import type { GameSessionOptions } from "@/features/play/GameSession";
import type { ProgressStore } from "@/features/progress/ProgressStore";
import type { Color } from "@/rules";
import type { CoachingMode, GameRecord } from "@/storage";
import { newId } from "@/lib/id";
import {
  buildActiveGame,
  buildGameRecord,
  recordFromActive,
  resultFromStatus,
  resumeOffer,
} from "./record";
import type { GameMeta, ResumeOffer } from "./record";
import { buildReview } from "./review";
import type { Review, ReviewMistake } from "./review";

export type FlowPhase = "menu" | "playing" | "review";

/** What the person picks before a game. */
export interface GameConfig {
  level: BotLevel;
  playerColor: Color;
  coachingMode: CoachingMode;
}

export interface FlowSnapshot {
  phase: FlowPhase;
  /** The game being played (also the practice position). Present while `phase` is "playing". */
  session?: GameSession;
  /** A practice position, not a real game: nothing is saved. */
  practice: boolean;
  /** The finished game has been written down and its review is ready to open. */
  reviewReady: boolean;
  /** The review of the game that just ended. Present in the "review" phase. */
  review?: Review;
  /** An unfinished game that can be continued. */
  resume: ResumeOffer | null;
  /** The diary has been read, so games can be saved. */
  diaryReady: boolean;
  /** A finished game is waiting for the diary to be connected before it can be saved. */
  unsaved: boolean;
  /** The last choices, to fill in the setup form. */
  defaults: GameConfig;
}

export interface GameFlowDeps {
  progress: ProgressStore;
  createBotEngine: () => EngineAdapter;
  createAnalysisEngine: () => EngineAdapter;
  now?: () => Date;
  /** Extra options for every game's session, for example no thinking delay in tests. */
  sessionDefaults?: Partial<GameSessionOptions>;
}

const toLevel = (value: number): BotLevel => Math.min(5, Math.max(1, Math.round(value))) as BotLevel;

/**
 * Runs the life of a game, outside React: choosing the setup, playing, resigning, leaving,
 * continuing a saved game, the review afterwards, and practising a mistake again. It saves
 * to the diary at the right moments:
 *  - when a game ends or is resigned (written straight away),
 *  - when the game is left (as "abandoned", while keeping it to continue),
 *  - and, after a quiet moment but never on every move, while a game is in progress.
 */
export class GameFlow {
  private readonly progress: ProgressStore;
  private readonly now: () => Date;

  private phase: FlowPhase = "menu";
  private session?: GameSession;
  private meta?: GameMeta;
  private practice = false;
  private review?: Review;
  /** Set once the current game has been written down (or is waiting to be). */
  private finished = false;
  private finishing = false;
  private reviewReady = false;
  /** A finished game that could not be saved yet because the diary was not connected. */
  private unsaved?: GameRecord;
  private lastSavedKey = "";
  private stopSession?: () => void;
  private listeners = new Set<() => void>();
  private snapshot: FlowSnapshot;
  private stopProgress?: () => void;

  constructor(private readonly deps: GameFlowDeps) {
    this.progress = deps.progress;
    this.now = deps.now ?? (() => new Date());
    this.snapshot = this.buildSnapshot();
  }

  /**
   * Starts following the diary (so the menu and a waiting game stay up to date). Returns a
   * function that stops following and walks away from any game in progress. Safe to call
   * more than once, which React's development mode does on purpose.
   */
  connect(): () => void {
    this.stopProgress?.();
    this.stopProgress = this.progress.subscribe(() => this.onProgressChanged());
    this.onProgressChanged();
    return () => {
      this.stopProgress?.();
      this.stopProgress = undefined;
      void this.leave();
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): FlowSnapshot => this.snapshot;

  /** Starts a new game. An unfinished one that was waiting is given up (saved as abandoned). */
  async startGame(config: GameConfig): Promise<void> {
    await this.leave();
    if (this.progress.getSnapshot().diary.activeGame) await this.discardResume();

    const meta: GameMeta = {
      id: newId(),
      startedAt: this.now().toISOString(),
      playerColor: config.playerColor,
      botLevel: config.level,
      coachingMode: config.coachingMode,
    };
    this.begin(meta, {});
    // Remember the choices for next time. Saved after a quiet moment.
    void this.progress.updateSettings({ botLevel: config.level, coachingMode: config.coachingMode });
  }

  /** Continues the unfinished game. False if there is none or it cannot be replayed. */
  async resumeGame(): Promise<boolean> {
    await this.leave();
    const active = this.progress.getSnapshot().diary.activeGame;
    const offer = resumeOffer(active);
    if (!active || !offer) {
      // A saved game that cannot be replayed is dropped rather than risking a broken board.
      if (active) await this.progress.saveActiveGame(null);
      this.emit();
      return false;
    }
    const meta: GameMeta = {
      id: active.id,
      startedAt: active.startedAt,
      playerColor: active.playerColor,
      botLevel: active.botLevel,
      coachingMode: active.coachingMode,
    };
    this.begin(meta, {
      restore: { moves: active.moves, coachLog: active.coachLog, mistakes: active.mistakes },
    });
    return true;
  }

  /** Gives up the unfinished game without playing on: it is kept in the history as abandoned. */
  async discardResume(): Promise<void> {
    const active = this.progress.getSnapshot().diary.activeGame;
    if (!active) return;
    await this.progress.recordGame(recordFromActive(active, "abandoned", this.now()), { activeGame: null });
    this.emit();
  }

  /** The player gives up. The game is saved as abandoned and its review opens. */
  async resign(): Promise<void> {
    const session = this.session;
    if (!session || this.practice) return;
    session.resign();
    await this.finish("abandoned");
  }

  /** From the end of a game to its review. */
  openReview(): void {
    if (!this.review) return;
    this.phase = "review";
    this.emit();
  }

  /** Replays the position before a mistake as a practice game, to try the move again. */
  startPractice(mistake: ReviewMistake): void {
    const review = this.review;
    if (!review) return;
    this.closeSession();
    this.practice = true;
    this.phase = "playing";
    const session = this.createSession({
      playerColor: sideToMove(mistake.fenBefore),
      level: toLevel(review.record.botLevel),
      coachingMode: "full",
      gameId: newId(),
      startFen: mistake.fenBefore,
      practice: true,
    });
    this.attach(session);
    session.start();
    this.emit();
  }

  /** Leaves the practice position and goes back to the review. */
  endPractice(): void {
    if (!this.practice) return;
    this.closeSession();
    this.practice = false;
    this.phase = this.review ? "review" : "menu";
    this.emit();
  }

  backToMenu(): void {
    this.closeSession();
    this.practice = false;
    this.review = undefined;
    this.reviewReady = false;
    this.finished = false;
    this.phase = "menu";
    this.emit();
  }

  /**
   * Walks away from the game in progress (going to another page, or back to the menu). A game
   * with moves is saved as abandoned and kept so it can be continued; a game nobody has moved
   * in is simply dropped. A game that already ended, or a practice position, saves nothing.
   */
  async leave(): Promise<void> {
    const session = this.session;
    if (!session) return;
    const snap = session.getSnapshot();
    const meta = this.meta;
    const playedAnything = snap.moves.some((m) => m.color === snap.playerColor);
    const worthSaving = !!meta && !this.practice && !this.finished && !snap.gameOver && playedAnything;
    const dropActive = !!meta && !this.practice && !this.finished && !snap.gameOver && !playedAnything;

    // Capture everything now: the session is about to be closed.
    const liveMeta = meta ? { ...meta, botLevel: snap.level } : undefined;
    const record =
      worthSaving && liveMeta
        ? buildGameRecord({
            meta: liveMeta,
            sanMoves: snap.sanMoves,
            result: "abandoned",
            entries: snap.coachLog,
            restoredMistakes: session.getRestoredMistakes(),
            now: this.now(),
          })
        : undefined;
    const active =
      worthSaving && liveMeta
        ? buildActiveGame({
            meta: liveMeta,
            fen: snap.fen,
            sanMoves: snap.sanMoves,
            entries: snap.coachLog,
            restoredMistakes: session.getRestoredMistakes(),
          })
        : undefined;

    this.closeSession();
    this.practice = false;
    this.phase = "menu";
    this.review = undefined;
    this.reviewReady = false;
    this.finished = false;
    this.emit();

    if (record && active) await this.progress.recordGame(record, { activeGame: active });
    else if (dropActive) await this.progress.saveActiveGame(null);
  }

  /** Stops following the diary, walks away from any game, and drops all listeners. */
  async dispose(): Promise<void> {
    this.stopProgress?.();
    this.stopProgress = undefined;
    await this.leave();
    this.listeners.clear();
  }

  // ---- internals ----

  private createSession(options: Partial<GameSessionOptions> & Pick<GameSessionOptions, "playerColor">): GameSession {
    const coachingMode = options.coachingMode ?? "quiet";
    return new GameSession({
      engine: this.deps.createBotEngine(),
      // With coaching off there is no analysis engine at all.
      analysisEngine: coachingMode === "off" ? undefined : this.deps.createAnalysisEngine(),
      ...this.deps.sessionDefaults,
      ...options,
    });
  }

  private begin(meta: GameMeta, extra: Partial<GameSessionOptions>): void {
    this.closeSession();
    this.meta = meta;
    this.practice = false;
    this.review = undefined;
    this.reviewReady = false;
    this.finished = false;
    this.finishing = false;
    this.phase = "playing";
    const session = this.createSession({
      playerColor: meta.playerColor,
      level: toLevel(meta.botLevel),
      coachingMode: meta.coachingMode,
      gameId: meta.id,
      ...extra,
    });
    // Do not rewrite what was just restored.
    this.lastSavedKey = this.keyOf(session);
    this.attach(session);
    session.start();
    this.emit();
  }

  private attach(session: GameSession): void {
    this.session = session;
    this.stopSession = session.subscribe(() => this.onSessionChanged());
  }

  private closeSession(): void {
    this.stopSession?.();
    this.stopSession = undefined;
    this.session?.dispose();
    this.session = undefined;
  }

  private keyOf(session: GameSession): string {
    const snap = session.getSnapshot();
    return `${snap.sanMoves.join(" ")}|${snap.coachLog.length}`;
  }

  private onSessionChanged(): void {
    const session = this.session;
    const meta = this.meta;
    if (!session || this.practice) return this.emit();
    const snap = session.getSnapshot();

    if (snap.gameOver && !snap.resigned && !this.finished && !this.finishing) {
      void this.finish(resultFromStatus(snap.status, snap.playerColor) ?? "abandoned");
    } else if (!snap.gameOver && !this.finished && meta && snap.sanMoves.length > 0) {
      // Remember the game in progress, after a quiet moment (the diary debounces it).
      const key = this.keyOf(session);
      if (key !== this.lastSavedKey) {
        this.lastSavedKey = key;
        void this.progress.saveActiveGame(
          buildActiveGame({
            meta: { ...meta, botLevel: snap.level },
            fen: snap.fen,
            sanMoves: snap.sanMoves,
            entries: snap.coachLog,
            restoredMistakes: session.getRestoredMistakes(),
          }),
        );
      }
    }
    this.emit();
  }

  /** Writes the finished (or resigned) game to the diary and prepares its review. */
  private async finish(result: "win" | "loss" | "draw" | "abandoned"): Promise<void> {
    const session = this.session;
    const meta = this.meta;
    if (!session || !meta || this.finishing || this.finished) return;
    this.finishing = true;

    // Let the coach finish commenting on the last move, so the record is complete.
    await session.coachSettled();
    const snap = session.getSnapshot();
    const record = buildGameRecord({
      meta: { ...meta, botLevel: snap.level },
      sanMoves: snap.sanMoves,
      result,
      entries: snap.coachLog,
      restoredMistakes: session.getRestoredMistakes(),
      now: this.now(),
    });

    const saved = await this.progress.recordGame(record, { activeGame: null });
    this.unsaved = saved ? undefined : record;
    this.review = buildReview(record);
    this.reviewReady = true;
    this.finished = true;
    this.finishing = false;
    this.emit();
  }

  /** If the diary was not connected when a game ended, save it as soon as it is. */
  private onProgressChanged(): void {
    const progress = this.progress.getSnapshot();
    if (this.unsaved && progress.ready) {
      const record = this.unsaved;
      this.unsaved = undefined;
      void this.progress.recordGame(record, { activeGame: null }).then((saved) => {
        if (!saved) this.unsaved = record;
        this.emit();
      });
    }
    this.emit();
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): FlowSnapshot {
    const progress = this.progress.getSnapshot();
    const settings = progress.diary.settings;
    return {
      phase: this.phase,
      session: this.session,
      practice: this.practice,
      reviewReady: this.reviewReady,
      review: this.review,
      resume: resumeOffer(progress.diary.activeGame),
      diaryReady: progress.ready,
      unsaved: this.unsaved !== undefined,
      defaults: {
        level: toLevel(settings.botLevel),
        playerColor: "white",
        coachingMode: settings.coachingMode,
      },
    };
  }
}
