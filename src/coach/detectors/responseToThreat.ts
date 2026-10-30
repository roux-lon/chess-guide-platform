import { unsafePieces, winnableThreats, createGame } from "@/rules";
import type { CoachEvent } from "../events";
import { meta } from "../types";
import type { MoveContext } from "../types";

/**
 * The bot's move answered a threat: one of its pieces could be won before the move. Says how
 * it dealt with it (moved the piece, protected it, took the attacker) or that it hit back
 * with a threat of its own. If the threat was simply ignored, nothing is said here: that is a
 * chance for the player, which the opportunity detector reports.
 */
export function responseToThreat(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (actor !== "bot") return [];

  const threatened = unsafePieces(move.fenBefore, move.color)[0];
  if (!threatened) return [];

  const moved = move.from === threatened.piece.square;
  const squareNow = moved ? move.to : threatened.piece.square;
  const stillInDanger = unsafePieces(move.fenAfter, move.color).some(
    (u) => u.piece.type === threatened.piece.type && u.piece.square === squareNow,
  );
  const piece = { type: threatened.piece.type, square: squareNow };

  if (!stillInDanger) {
    const tookAttacker = threatened.attackers.some((a) => a.square === move.to);
    const how = tookAttacker ? "captured_attacker" : moved ? "moved" : "defended";
    return [{ kind: "response_to_threat", ...meta("bot", "info"), actor: "bot", how, piece }];
  }

  const hitsBack =
    createGame(move.fenAfter).status().inCheck ||
    winnableThreats(move.fenBefore, move.fenAfter, move.color, move.to).length > 0;
  return hitsBack
    ? [{ kind: "response_to_threat", ...meta("bot", "info"), actor: "bot", how: "counterattack", piece }]
    : [];
}
