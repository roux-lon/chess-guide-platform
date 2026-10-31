import { PLAYBOOK } from "@/content";
import type { Caution } from "@/content";
import { undevelopedMinors, unsafePieces } from "@/rules";
import type { Color, MoveInfo } from "@/rules";
import { evaluateCondition } from "./conditions";

/**
 * A habit worth a gentle word, if `move` (made by `color`) showed one. At most one caution per
 * move: the first rule in the playbook's list that fits. `earlier` are the moves before it.
 * Cautions are advice, never a block, and never fire for a move that was answering a danger.
 */
export function cautionFor(move: MoveInfo, earlier: readonly MoveInfo[], color: Color): Caution | undefined {
  if (move.color !== color || move.captured) return undefined;
  const before = move.fenBefore;
  const homeMinors = undevelopedMinors(before, color).length;
  const wasAttacked = unsafePieces(before, color).some((u) => u.piece.square === move.from);

  return PLAYBOOK.cautions.find((caution) => {
    switch (caution.rule) {
      case "same-piece-twice": {
        if (move.piece === "pawn" || move.piece === "king" || wasAttacked || homeMinors === 0) return false;
        const mine = earlier.filter((m) => m.color === color);
        return mine[mine.length - 1]?.to === move.from && mine[mine.length - 1]?.piece === move.piece;
      }
      case "early-queen":
        return move.piece === "queen" && homeMinors >= 2;
      case "edge-pawn":
        return (
          move.piece === "pawn" &&
          (move.from[0] === "a" || move.from[0] === "h") &&
          !evaluateCondition({ type: "pawnOn", squares: ["e4", "d4"] }, before, color)
        );
      case "early-f-pawn":
        return move.piece === "pawn" && move.from[0] === "f" && !evaluateCondition({ type: "castled" }, before, color);
    }
  });
}
