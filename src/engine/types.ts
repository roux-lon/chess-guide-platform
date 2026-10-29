export type Side = "white" | "black";

/** A move in our own format. Squares are algebraic ("e2"). */
export interface EngineMove {
  from: string;
  to: string;
  promotion?: "queen" | "rook" | "bishop" | "knight";
}

/** Bot strength preset: 1 = very weak (true beginner), 5 = strongest we offer. */
export type BotLevel = 1 | 2 | 3 | 4 | 5;

export interface EvaluateOptions {
  /** Search depth limit. Default 12. */
  depth?: number;
  /** Time limit in milliseconds. Default 1000. */
  movetimeMs?: number;
}

/**
 * Result of evaluating a position. Always from White's point of view:
 * positive is good for White, negative is good for Black.
 */
export interface Evaluation {
  /** Centipawns (100 = about one pawn) from White's perspective. Null when the position is a forced mate. */
  cpWhite: number | null;
  /**
   * Forced mate, from White's perspective: +3 means White mates in 3 moves,
   * -3 means Black mates in 3. 0 means the side to move is already checkmated.
   * Null when no forced mate was found.
   */
  mateIn: number | null;
  /** Best move for the side to move, or null if there is none (mate or stalemate). */
  bestMove: EngineMove | null;
  /** The line the engine expects, starting with `bestMove`. */
  principalVariation: EngineMove[];
}
