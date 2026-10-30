import { createGame, winningCaptures } from "@/rules";
import type { CoachEvent } from "../events";
import { meta } from "../types";
import type { MoveContext } from "../types";

/**
 * It is the player's turn and a capture wins material right now. That can only be true
 * straight after the bot's move: after the player's own move it is the bot's turn, and
 * anything the player attacks is a threat (see threatCreated), not a chance.
 */
export function opportunity(ctx: MoveContext): CoachEvent[] {
  const { move, toMove } = ctx;
  if (toMove !== "you") return [];
  if (createGame(move.fenAfter).status().isGameOver) return [];

  const captures = winningCaptures(move.fenAfter);
  const best = captures[0];
  if (!best) return [];

  return [
    {
      kind: "opportunity",
      ...meta("user", "opportunity"),
      target: { type: best.target.type, square: best.target.square },
      attacker: { type: best.attacker.type, square: best.attacker.square },
      gain: best.gain,
      count: captures.length,
    },
  ];
}
