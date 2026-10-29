import type { EngineAdapter } from "./EngineAdapter";
import { DEFAULT_LEVEL } from "./levels";
import type { BotLevel, EngineMove, EvaluateOptions, Evaluation } from "./types";

const NO_EVALUATION: Evaluation = {
  cpWhite: null,
  mateIn: null,
  bestMove: null,
  principalVariation: [],
};

/**
 * A scriptable EngineAdapter for tests in later phases (coach, lessons, guided games).
 * Queue the bot moves and evaluations you want, then inspect what was asked.
 */
export class FakeEngine implements EngineAdapter {
  readonly name = "Fake engine";

  level: BotLevel = DEFAULT_LEVEL;
  initCount = 0;
  cancelCount = 0;
  disposeCount = 0;
  /** Every FEN passed to getBotMove, in order. */
  readonly botMoveRequests: string[] = [];
  /** Every FEN passed to evaluate, in order. */
  readonly evaluateRequests: string[] = [];

  private readonly botMoves: EngineMove[];
  private readonly evaluations: (fen: string) => Evaluation;

  /**
   * @param botMoves moves to play, one per getBotMove call
   * @param evaluations a map from FEN to evaluation, or a function; unknown FENs get an empty evaluation
   */
  constructor(
    botMoves: EngineMove[] = [],
    evaluations: Record<string, Evaluation> | ((fen: string) => Evaluation) = {},
  ) {
    this.botMoves = [...botMoves];
    this.evaluations =
      typeof evaluations === "function"
        ? evaluations
        : (fen) => evaluations[fen] ?? NO_EVALUATION;
  }

  async init(): Promise<void> {
    this.initCount++;
  }

  setLevel(level: BotLevel): void {
    this.level = level;
  }

  async getBotMove(fen: string): Promise<EngineMove> {
    this.botMoveRequests.push(fen);
    const move = this.botMoves.shift();
    if (!move) throw new Error("FakeEngine has no more scripted moves");
    return move;
  }

  async evaluate(fen: string, options?: EvaluateOptions): Promise<Evaluation> {
    void options;
    this.evaluateRequests.push(fen);
    return this.evaluations(fen);
  }

  cancel(): void {
    this.cancelCount++;
  }

  dispose(): void {
    this.disposeCount++;
  }
}
