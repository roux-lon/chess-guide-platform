import { createGame, isPieceSafe, pieceAt, pieceValue, unsafePieces } from "@/rules";
import type { CoachEvent } from "../events";
import { meta } from "../types";
import type { MoveContext } from "../types";

/**
 * One of the player's pieces could be won before their move, and their move did nothing about
 * it: it is still on the same square and still in danger. That is the classic "I did not look
 * at what the bot was threatening" mistake. Not reported when the move was forcing (it gave
 * check) or won at least as much as the piece is worth.
 */
export function missedThreat(ctx: MoveContext): CoachEvent[] {
  const { move, actor, playerColor } = ctx;
  if (actor !== "you") return [];

  if (createGame(move.fenAfter).status().inCheck) return []; // the bot has to answer a check first

  const stillInDanger = unsafePieces(move.fenBefore, playerColor).filter(({ piece }) => {
    const now = pieceAt(move.fenAfter, piece.square);
    return now?.type === piece.type && now.color === piece.color && !isPieceSafe(move.fenAfter, piece.square);
  });

  const worst = stillInDanger[0];
  if (!worst) return [];
  if (move.captured && pieceValue(move.captured) >= pieceValue(worst.piece.type)) return [];

  const attackers = unsafePieces(move.fenAfter, playerColor).find(
    (u) => u.piece.square === worst.piece.square,
  );
  return [
    {
      kind: "missed_threat",
      ...meta("user", "threat"),
      piece: { type: worst.piece.type, square: worst.piece.square },
      attackers: (attackers?.attackers ?? worst.attackers).map((a) => ({ type: a.type, square: a.square })),
      gain: attackers?.gain ?? worst.gain,
    },
  ];
}
