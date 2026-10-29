import { pieceValue, staticExchange } from "@/rules";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

/**
 * Judges a capture by piece value. The capturer's risk is what the other side could win
 * by taking it back on the same square (with both sides recapturing while it pays).
 * net > 0 won material, 0 even trade, < 0 gave up more than it gained.
 */
export function captureTrade(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (!move.captured) return [];

  const opponent = move.color === "white" ? "black" : "white";
  const risk = Math.max(0, staticExchange(move.fenAfter, move.to, opponent));
  const netPoints = pieceValue(move.captured) - risk;

  return [
    {
      kind: "capture_trade",
      actor,
      captured: move.captured,
      capturer: move.piece,
      square: move.to,
      netPoints,
      verdict: netPoints > 0 ? "good" : netPoints === 0 ? "equal" : "bad",
    },
  ];
}
