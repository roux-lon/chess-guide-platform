import type { CoachEvent } from "./events";
import { meta, perspectiveOf } from "./types";
import type { MoveContext } from "./types";

/** The first event of every analysis: just what was played. Not a detector, it always fires. */
export function movePlayed(ctx: MoveContext): CoachEvent {
  const { move, actor } = ctx;
  return {
    kind: "move_played",
    ...meta(perspectiveOf(actor), "info"),
    actor,
    piece: move.piece,
    from: move.from,
    to: move.to,
    san: move.san,
    captured: move.captured,
    castle:
      move.kind === "castle-kingside"
        ? "kingside"
        : move.kind === "castle-queenside"
          ? "queenside"
          : undefined,
    promotion: move.promotion,
  };
}
