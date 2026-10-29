import type { BotLevel, EngineMove, EvaluateOptions, Evaluation } from "./types";

/** Thrown by a search that was replaced or cancelled before it finished. */
export class EngineCancelledError extends Error {
  constructor() {
    super("Search cancelled");
    this.name = "EngineCancelledError";
  }
}

/** Thrown when the engine cannot be started, times out or keeps crashing. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

/**
 * Anything that can play a side and judge positions. Library-agnostic:
 * Stockfish, a random mover and test fakes all implement this.
 *
 * Only one search runs at a time. Starting a new one cancels the old one,
 * which then rejects with EngineCancelledError.
 */
export interface EngineAdapter {
  readonly name: string;
  /** Starts the engine. Safe to call repeatedly; the other methods call it if needed. */
  init(): Promise<void>;
  /** Sets bot strength for later getBotMove calls. Does not affect evaluate. */
  setLevel(level: BotLevel): void;
  /** A move for the side to move in `fen`, at the current level. */
  getBotMove(fen: string): Promise<EngineMove>;
  /** Full-strength evaluation of `fen`, from White's perspective. */
  evaluate(fen: string, options?: EvaluateOptions): Promise<Evaluation>;
  /** Cancels any search in progress. */
  cancel(): void;
  /** Stops the engine and frees its resources. A later call may start it again. */
  dispose(): void;
}
