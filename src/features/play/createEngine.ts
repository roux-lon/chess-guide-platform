import { createGame } from "@/rules";
import { RandomMoveEngine, createStockfishEngine } from "@/engine";
import type { EngineAdapter } from "@/engine";

/** The real opponent: Stockfish in a Web Worker. */
export function createBotEngine(): EngineAdapter {
  return createStockfishEngine();
}

/** Random mover wired to the rules layer. Kept for tests and as a fallback. */
export function createRandomBotEngine(): EngineAdapter {
  return new RandomMoveEngine((fen) =>
    createGame(fen)
      .legalMoves()
      .map((m) => ({ from: m.from, to: m.to, promotion: m.promotion })),
  );
}
