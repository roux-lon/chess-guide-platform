import { attackersOf } from "@/rules";
import { CENTER_SQUARES, COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

const isCenter = (square: string) => (CENTER_SQUARES as readonly string[]).includes(square);

/**
 * Early game: a pawn moved into the center, or a knight or bishop now eyes center
 * squares it did not eye before.
 */
export function centerControl(ctx: MoveContext): CoachEvent[] {
  const { move, ply, actor } = ctx;
  if (ply > COACH_CONFIG.earlyGameMaxPly) return [];

  if (move.piece === "pawn") {
    return isCenter(move.to) && !move.captured
      ? [{ kind: "center_control", actor, how: "occupy", piece: "pawn", squares: [move.to] }]
      : [];
  }

  if (move.piece !== "knight" && move.piece !== "bishop") return [];

  const watched = (fen: string, from: string) =>
    CENTER_SQUARES.filter((sq) => attackersOf(fen, sq, move.color).some((a) => a.square === from));
  const before = new Set<string>(watched(move.fenBefore, move.from));
  const gained = watched(move.fenAfter, move.to).filter((sq) => !before.has(sq));
  if (gained.length === 0) return [];

  return [{ kind: "center_control", actor, how: "attack", piece: move.piece, squares: gained }];
}
