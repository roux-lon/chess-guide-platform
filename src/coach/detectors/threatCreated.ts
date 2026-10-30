import { doubleAttack, createGame, isPieceSafe, winnableThreats } from "@/rules";
import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import { meta, perspectiveOf } from "../types";
import type { MoveContext } from "../types";

/**
 * The move attacks something worth winning (judged by static exchange, so attacking a
 * protected pawn with a queen does not count). The other side has to answer it, which is why
 * this is a threat for whoever is attacked, and never a chance for the one who just moved.
 *
 * Not reported when:
 * - the attacking piece could simply be captured for a gain (nothing is really threatened);
 * - the move gives two threats at once (that is the double-attack detector's story);
 * - the game is over.
 */
export function threatCreated(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (createGame(move.fenAfter).status().isGameOver) return [];
  if (doubleAttack(move.fenBefore, move.fenAfter, move.color, move.to)) return [];

  const movedIsSafe = isPieceSafe(move.fenAfter, move.to);
  const targets = winnableThreats(move.fenBefore, move.fenAfter, move.color, move.to).filter(
    // A threat made only by a piece that can be taken is not a threat.
    (t) => movedIsSafe || t.attackers.some((a) => a.square !== move.to),
  );
  const top = targets[0];
  if (!top) return [];

  const attacker = top.attackers.find((a) => a.square === move.to) ?? top.attackers[0];
  return [
    {
      kind: "threat_created",
      ...meta(perspectiveOf(actor), "threat"),
      actor,
      attacker: { type: attacker.type, square: attacker.square },
      targets: targets
        .slice(0, COACH_CONFIG.maxThreatTargets)
        .map((t) => ({ type: t.piece.type, square: t.piece.square })),
      gain: top.gain,
      discovered: top.discovered,
    },
  ];
}
