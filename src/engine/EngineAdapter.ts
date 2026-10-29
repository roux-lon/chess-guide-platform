/** A move an engine wants to play. Squares are algebraic ("e2"). */
export interface EngineMove {
  from: string;
  to: string;
  promotion?: "queen" | "rook" | "bishop" | "knight";
}

/**
 * Anything that can pick a move for the side to move.
 * Phase 2 extends this with levels and evaluations.
 */
export interface EngineAdapter {
  readonly name: string;
  /** Resolves with a move for the side to move in `fen`. */
  chooseMove(fen: string): Promise<EngineMove>;
  dispose(): void;
}
