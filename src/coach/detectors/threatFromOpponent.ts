import { hangingInfo, pieceAt, pieceValue, piecesAttackedBy } from "@/rules";
import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

/**
 * What the bot's last move now attacks: the player's protected pieces (knight or bigger)
 * that the moved piece could trade for. Pieces that can be won outright are reported by
 * the hanging-piece detector instead, so they are skipped here.
 */
export function threatFromOpponent(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (actor !== "bot") return [];

  const attacker = pieceAt(move.fenAfter, move.to);
  if (!attacker || attacker.type === "king") return [];

  const targets = piecesAttackedBy(move.fenAfter, move.to)
    .filter(
      (t) =>
        t.type !== "king" &&
        t.type !== "pawn" &&
        pieceValue(t.type) >= pieceValue(attacker.type) &&
        hangingInfo(move.fenAfter, t.square) === null,
    )
    .sort((a, b) => pieceValue(b.type) - pieceValue(a.type))
    .slice(0, COACH_CONFIG.maxThreatTargets);

  if (targets.length === 0) return [];
  return [
    {
      kind: "threat_from_opponent",
      attacker: { type: attacker.type, square: attacker.square },
      targets: targets.map((t) => ({ type: t.type, square: t.square })),
    },
  ];
}
