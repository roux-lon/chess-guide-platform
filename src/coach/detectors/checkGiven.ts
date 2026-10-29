import { attackersOf, createGame, kingSquare } from "@/rules";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

/** The player just put the bot's king in check (not mate: that is the game-over event). */
export function checkGiven(ctx: MoveContext): CoachEvent[] {
  const { move, actor } = ctx;
  if (actor !== "you") return [];

  const status = createGame(move.fenAfter).status();
  if (!status.inCheck || status.outcome === "checkmate") return [];

  const kingAt = kingSquare(move.fenAfter, status.turn);
  const checkers = kingAt ? attackersOf(move.fenAfter, kingAt, move.color) : [];
  const by = checkers.some((c) => c.square === move.to)
    ? move.piece
    : (checkers[0]?.type ?? move.piece);
  return [{ kind: "check_given", actor: "you", by }];
}
