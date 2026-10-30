import {
  attackersOf,
  createGame,
  isMinorHomeSquare,
  isPieceSafe,
  pieceMobility,
  unsafePieces,
  winnableThreats,
} from "@/rules";
import type { MoveInfo } from "@/rules";
import { CENTER_SQUARES, COACH_CONFIG } from "../config";
import type { CoachEvent, Purpose } from "../events";
import { meta, perspectiveOf } from "../types";
import type { MoveContext } from "../types";

const isCenter = (square: string) => (CENTER_SQUARES as readonly string[]).includes(square);

/** How far a square is from the mover's own back rank: 0 for the back rank, 7 for the far side. */
const advance = (color: "white" | "black", square: string) => {
  const rank = Number(square[1]);
  return color === "white" ? rank - 1 : 8 - rank;
};

/**
 * Sorts a move into the one job it mostly does, checking the more specific jobs first:
 * castle, trade / capture, retreat from an attack, defend something in danger, develop a
 * knight or bishop, attack (give check or threaten a win), control the center, king move,
 * pawn move, make a piece more active. Anything else is "other": a quiet move.
 */
export function classifyPurpose(
  move: MoveInfo,
  options: { ply: number; previousMove?: MoveInfo },
): Purpose {
  const { fenBefore, fenAfter, color } = move;

  if (move.kind === "castle-kingside" || move.kind === "castle-queenside") return "castle";

  if (move.captured) {
    const recapture = options.previousMove?.captured && options.previousMove.to === move.to;
    return recapture ? "trade" : "capture";
  }

  const dangerBefore = unsafePieces(fenBefore, color);
  const wasInDanger = dangerBefore.some((d) => d.piece.square === move.from);
  if (wasInDanger && isPieceSafe(fenAfter, move.to)) return "retreat";

  const dangerAfter = unsafePieces(fenAfter, color);
  const wasInCheck = createGame(fenBefore).status().inCheck;
  const eased = dangerAfter.reduce((sum, d) => sum + d.gain, 0) < dangerBefore.reduce((sum, d) => sum + d.gain, 0);
  if (wasInCheck || eased) return "defend";

  if (
    (move.piece === "knight" || move.piece === "bishop") &&
    isMinorHomeSquare(color, move.from) &&
    !isMinorHomeSquare(color, move.to)
  ) {
    return "develop";
  }

  const gaveCheck = createGame(fenAfter).status().inCheck;
  if (gaveCheck || winnableThreats(fenBefore, fenAfter, color, move.to).length > 0) return "attack";

  const early = options.ply <= COACH_CONFIG.earlyGameMaxPly;
  if (move.piece === "pawn" && isCenter(move.to)) return "controlCenter";
  if (early && move.piece !== "pawn" && move.piece !== "king") {
    const watches = (fen: string, from: string) =>
      CENTER_SQUARES.filter((sq) => attackersOf(fen, sq, color).some((a) => a.square === from));
    const had = new Set<string>(watches(fenBefore, move.from));
    if (watches(fenAfter, move.to).some((sq) => !had.has(sq))) return "controlCenter";
  }

  if (move.piece === "king") return "kingSafety";
  if (move.piece === "pawn") return "pawnAdvance";

  if (advance(color, move.to) < advance(color, move.from)) return "retreat";
  if (pieceMobility(fenAfter, move.to) > pieceMobility(fenBefore, move.from)) return "improvePiece";
  return "other";
}

/** Always says what the move was for, so a comment can explain itself even on a quiet move. */
export function movePurpose(ctx: MoveContext): CoachEvent[] {
  const { move, actor, ply, previousMove } = ctx;
  return [
    {
      kind: "move_purpose",
      ...meta(perspectiveOf(actor), "info"),
      actor,
      purpose: classifyPurpose(move, { ply, previousMove }),
      piece: move.piece,
      to: move.to,
    },
  ];
}
