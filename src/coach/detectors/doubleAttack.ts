import { createGame, doubleAttack as findDoubleAttack } from "@/rules";
import type { CoachEvent } from "../events";
import { meta, perspectiveOf } from "../types";
import type { MoveContext } from "../types";

/**
 * One move that makes two threats at once (two winnable pieces, or check plus a winnable
 * piece), so the other side can only answer one of them. It does not fire when the attacking
 * piece can just be captured, or when only one of the targets is worth winning.
 */
export function doubleAttack(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (createGame(move.fenAfter).status().isGameOver) return [];

  const found = findDoubleAttack(move.fenBefore, move.fenAfter, move.color, move.to);
  if (!found) return [];
  return [
    {
      kind: "double_attack",
      ...meta(perspectiveOf(actor), "threat"),
      actor,
      attacker: { type: found.attacker.type, square: found.attacker.square },
      targets: found.targets.map((t) => ({ type: t.type, square: t.square })),
      givesCheck: found.givesCheck,
    },
  ];
}
