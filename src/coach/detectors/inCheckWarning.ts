import { attackersOf, createGame, kingSquare } from "@/rules";
import type { CoachEvent } from "../events";
import { meta } from "../types";
import type { MoveContext } from "../types";

/** The bot's move put the player's king in check (not mate). Tells them how many ways out they have. */
export function inCheckWarning(ctx: MoveContext): CoachEvent[] {
  const { move, actor, playerColor } = ctx;
  if (actor !== "bot") return [];

  const game = createGame(move.fenAfter);
  const status = game.status();
  if (!status.inCheck || status.outcome === "checkmate") return [];

  const kingAt = kingSquare(move.fenAfter, playerColor);
  if (!kingAt) return [];
  const checkers = attackersOf(move.fenAfter, kingAt, move.color).map((c) => ({
    type: c.type,
    square: c.square,
  }));
  return [
    {
      kind: "in_check_warning",
      ...meta("user", "threat"),
      kingSquare: kingAt,
      checkers,
      escapeMoves: game.legalMoves().length,
    },
  ];
}
