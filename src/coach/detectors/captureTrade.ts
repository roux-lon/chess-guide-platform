import { pieceValue, staticExchange } from "@/rules";
import type { CoachEvent } from "../events";
import { meta, perspectiveOf } from "../types";
import type { MoveContext } from "../types";

/** Is this move the recapture in a capture-and-recapture on one square? That story belongs to tradeSequence. */
export function isRecapture(ctx: MoveContext): boolean {
  const { move, previousMove } = ctx;
  return !!move.captured && !!previousMove?.captured && previousMove.to === move.to;
}

/**
 * Judges a capture by piece value. The capturer's risk is what the other side could win
 * by taking it back on the same square (with both sides recapturing while it pays).
 * net > 0 won material, 0 even trade, < 0 gave up more than it gained.
 * A recapture is skipped: together with the capture before it, it is one trade (tradeSequence).
 */
export function captureTrade(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (!move.captured || isRecapture(ctx)) return [];

  const opponent = move.color === "white" ? "black" : "white";
  const risk = Math.max(0, staticExchange(move.fenAfter, move.to, opponent));
  const netPoints = pieceValue(move.captured) - risk;
  const verdict = netPoints > 0 ? "good" : netPoints === 0 ? "equal" : "bad";

  // Whoever comes out ahead gets the credit; an even swap is told from the mover's side.
  const winner = netPoints === 0 ? actor : netPoints > 0 ? actor : actor === "you" ? "bot" : "you";
  return [
    {
      kind: "capture_trade",
      ...meta(perspectiveOf(winner), "trade"),
      actor,
      captured: move.captured,
      capturer: move.piece,
      square: move.to,
      netPoints,
      verdict,
    },
  ];
}
