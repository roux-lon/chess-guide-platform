import { createGame } from "@/rules";
import type { CoachEvent } from "../events";
import { meta, perspectiveOf } from "../types";
import type { MoveContext } from "../types";

/** The move ended the game. */
export function gameOver(ctx: MoveContext): CoachEvent[] {
  const status = createGame(ctx.move.fenAfter).status();
  if (!status.isGameOver || !status.outcome) return [];

  if (status.outcome === "checkmate") {
    return [
      {
        kind: "game_over",
        ...meta(perspectiveOf(ctx.actor), "info"),
        result: ctx.actor === "you" ? "you_win" : "bot_wins",
        reason: "checkmate",
      },
    ];
  }
  return [
    {
      kind: "game_over",
      ...meta(perspectiveOf(ctx.actor), "info"),
      result: "draw",
      reason: status.outcome === "stalemate" ? "stalemate" : (status.drawReason ?? "stalemate"),
    },
  ];
}
