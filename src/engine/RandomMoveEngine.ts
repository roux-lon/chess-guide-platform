import type { EngineAdapter, EngineMove } from "./EngineAdapter";

/** Lists the legal moves for a position. Injected so engine/ does not depend on rules/. */
export type LegalMoveProvider = (fen: string) => EngineMove[];

/** Placeholder opponent: plays a uniformly random legal move. */
export class RandomMoveEngine implements EngineAdapter {
  readonly name = "Random mover";

  constructor(
    private readonly legalMoves: LegalMoveProvider,
    private readonly random: () => number = Math.random,
  ) {}

  async chooseMove(fen: string): Promise<EngineMove> {
    const moves = this.legalMoves(fen);
    if (moves.length === 0) throw new Error("No legal moves in this position");
    return moves[Math.floor(this.random() * moves.length)];
  }

  dispose(): void {}
}
