import { allHangingPieces, hangingInfo, pieceAt, pieceValue } from "@/rules";
import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import { whoIs } from "../types";
import type { MoveContext } from "../types";

/**
 * Pieces that this move left (or put) in danger: capturable for free, or capturable by a
 * cheaper piece. Only pieces that were not already in that state before the move are
 * reported, so the coach does not nag about the same piece every turn.
 */
export function hangingPiece(ctx: MoveContext): CoachEvent[] {
  const { move, playerColor, actor } = ctx;

  const isNew = (square: string, type: string, color: string): boolean => {
    const before = pieceAt(move.fenBefore, square);
    if (!before || before.type !== type || before.color !== color) return true;
    return hangingInfo(move.fenBefore, square) === null;
  };

  return allHangingPieces(move.fenAfter)
    .filter((h) => isNew(h.piece.square, h.piece.type, h.piece.color))
    .sort((a, b) => pieceValue(b.piece.type) - pieceValue(a.piece.type))
    .slice(0, COACH_CONFIG.maxHangingPerMove)
    .map((h) => ({
      kind: "hanging_piece" as const,
      actor,
      owner: whoIs(h.piece.color, playerColor),
      piece: { type: h.piece.type, square: h.piece.square },
      attackers: h.attackers.map((a) => ({ type: a.type, square: a.square })),
      reason: h.reason,
    }));
}
