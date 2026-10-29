import type { CoachEvent } from "./events";
import type { MoveContext } from "./types";

/** The lead event of every comment: just what was played. Not a detector, it always fires. */
export function movePlayed(ctx: MoveContext): CoachEvent {
  const { move, actor } = ctx;
  return {
    kind: "move_played",
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
