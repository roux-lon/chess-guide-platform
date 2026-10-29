import { allHangingPieces, createGame, hangingInfo, pieceAt, pieceValue } from "@/rules";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

/**
 * The player's piece was hanging before their move, and their move did nothing about it:
 * it is still on the same square and still hangs. That is the classic "I did not look at
 * what the bot was threatening" mistake. Not reported when the move was forcing (it gave
 * check) or won at least as much as the piece is worth.
 */
export function missedThreat(ctx: MoveContext): CoachEvent[] {
  const { move, actor, playerColor } = ctx;
  if (actor !== "you") return [];

  if (createGame(move.fenAfter).status().inCheck) return []; // the bot has to answer a check first

  const stillHanging = allHangingPieces(move.fenBefore, playerColor)
    .filter(({ piece }) => {
      const now = pieceAt(move.fenAfter, piece.square);
      return now?.type === piece.type && now.color === piece.color && hangingInfo(move.fenAfter, piece.square) !== null;
    })
    .sort((a, b) => pieceValue(b.piece.type) - pieceValue(a.piece.type));

  const worst = stillHanging[0];
  if (!worst) return [];
  if (move.captured && pieceValue(move.captured) >= pieceValue(worst.piece.type)) return [];

  const after = hangingInfo(move.fenAfter, worst.piece.square);
  return [
    {
      kind: "missed_threat",
      piece: { type: worst.piece.type, square: worst.piece.square },
      attackers: (after?.attackers ?? worst.attackers).map((a) => ({ type: a.type, square: a.square })),
    },
  ];
}
