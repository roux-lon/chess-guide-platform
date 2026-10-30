import { pieceValue } from "@/rules";
import type { CoachEvent } from "../events";
import { meta, perspectiveOf, whoIs } from "../types";
import type { MoveContext } from "../types";
import { isRecapture } from "./captureTrade";

/**
 * A capture followed by a recapture on the same square is ONE story: a trade. It is judged by
 * what each side took over the whole exchange, so a queen swap reads as a queen trade and the
 * recapture is never described as the other side "leaving a piece unprotected".
 * Fires on the recapture, because that is when the exchange is complete.
 */
export function tradeSequence(ctx: MoveContext): CoachEvent[] {
  const { move, previousMove, playerColor, actor } = ctx;
  if (!previousMove?.captured || !move.captured || !isRecapture(ctx)) return [];

  const opener = whoIs(previousMove.color, playerColor);
  const firstCaptured = previousMove.captured;
  const recaptured = move.captured;
  const won = opener === "you" ? firstCaptured : recaptured;
  const lost = opener === "you" ? recaptured : firstCaptured;
  const netForYou = pieceValue(won) - pieceValue(lost);
  const verdict = netForYou > 0 ? "good" : netForYou === 0 ? "equal" : "bad";

  return [
    {
      kind: "trade_sequence",
      ...meta(perspectiveOf(netForYou === 0 ? actor : netForYou > 0 ? "you" : "bot"), "trade"),
      opener,
      firstCaptured,
      recaptured,
      square: move.to,
      won,
      lost,
      netForYou,
      verdict,
    },
  ];
}
