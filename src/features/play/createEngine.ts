import { createGame } from "@/rules";
import { RandomMoveEngine } from "@/engine";
import type { EngineAdapter } from "@/engine";

/** Wires the placeholder bot to the rules layer. Phase 2 swaps this for Stockfish. */
export function createRandomBotEngine(): EngineAdapter {
  return new RandomMoveEngine((fen) =>
    createGame(fen)
      .legalMoves()
      .map((m) => ({ from: m.from, to: m.to, promotion: m.promotion })),
  );
}
