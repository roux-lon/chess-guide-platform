import type { EngineAdapter } from "./EngineAdapter";
import type { BotLevel, EngineMove, Evaluation } from "./types";

/** Lists the legal moves for a position. Injected so engine/ does not depend on rules/. */
export type LegalMoveProvider = (fen: string) => EngineMove[];

/** Test and fallback opponent: plays a uniformly random legal move and cannot evaluate. */
export class RandomMoveEngine implements EngineAdapter {
  readonly name = "Random mover";

  constructor(
    private readonly legalMoves: LegalMoveProvider,
    private readonly random: () => number = Math.random,
  ) {}

  async init(): Promise<void> {}

  setLevel(level: BotLevel): void {
    void level;
  }

  async getBotMove(fen: string): Promise<EngineMove> {
    const moves = this.legalMoves(fen);
    if (moves.length === 0) throw new Error("No legal moves in this position");
    return moves[Math.floor(this.random() * moves.length)];
  }

  async evaluate(): Promise<Evaluation> {
    return { cpWhite: null, mateIn: null, bestMove: null, principalVariation: [] };
  }

  cancel(): void {}

  dispose(): void {}
}
