import { defendersOf, pieceValue, unsafePieces } from "@/rules";
import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import { meta } from "../types";
import type { MoveContext } from "../types";

/**
 * The player's own move put one of their pieces where the bot wins material by taking it
 * (judged by static exchange, so a protected piece that is still a bad trade counts).
 * Only pieces that were not already in that state before the move are reported, so the coach
 * does not nag about the same piece every turn (the missed-threat detector covers that).
 * A capture that wins at least as much as it risks is a fair trade, not a hanging piece.
 * Only about the player's pieces and only after the player's move: the bot's pieces are
 * threats or chances, depending on whose turn it is.
 */
export function hangingPiece(ctx: MoveContext): CoachEvent[] {
  const { move, actor, playerColor } = ctx;
  if (actor !== "you") return [];

  const before = unsafePieces(move.fenBefore, playerColor);
  const wasUnsafe = (type: string, square: string) =>
    before.some((b) => b.piece.type === type && b.piece.square === square);

  return unsafePieces(move.fenAfter, playerColor)
    .filter(({ piece }) => !wasUnsafe(piece.type, piece.square))
    .filter(({ piece, gain }) => {
      const isCapturer = piece.square === move.to && move.captured !== undefined;
      return !(isCapturer && move.captured && pieceValue(move.captured) - gain >= 0);
    })
    .slice(0, COACH_CONFIG.maxHangingPerMove)
    .map(({ piece, attackers, gain }): CoachEvent => {
      const defended = defendersOf(move.fenAfter, piece.square).length > 0;
      const reason = !defended
        ? "undefended"
        : pieceValue(attackers[0].type) < pieceValue(piece.type)
          ? "cheaper-attacker"
          : "outnumbered";
      return {
        kind: "hanging_piece",
        ...meta("user", "threat"),
        actor: "you",
        owner: "you",
        piece: { type: piece.type, square: piece.square },
        attackers: attackers.map((a) => ({ type: a.type, square: a.square })),
        reason,
        gain,
      };
    });
}
