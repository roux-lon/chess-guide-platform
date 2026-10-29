import { sideToMove } from "@/lib/perspective";
import { allPieces, kingSquare, pieceAt } from "./analysis";
import { createGame } from "./game";
import type { PieceOnSquare } from "./analysis";
import type { Square } from "./types";

/** Why a move is not allowed. Lessons turn these into friendly explanations. */
export type IllegalReason =
  | "no-piece"
  | "not-your-piece"
  | "same-square"
  /** The piece does not move that way at all. */
  | "wrong-shape"
  /** The shape is right but another piece is in the way. */
  | "blocked"
  | "own-piece"
  /** A pawn moving diagonally with nothing to capture. */
  | "pawn-needs-capture"
  | "castle-not-allowed"
  /** The player's king is in check and this move does not fix it. */
  | "must-escape-check"
  /** The move would leave (or put) the player's own king in check. */
  | "exposes-king";

const fileOf = (square: Square) => square.charCodeAt(0) - 97;
const rankOf = (square: Square) => Number(square[1]);
const squareAt = (file: number, rank: number) => `${String.fromCharCode(97 + file)}${rank}`;

/** True if every square strictly between `from` and `to` (on a line) is empty. */
function pathClear(occupied: Set<Square>, from: Square, to: Square): boolean {
  const df = Math.sign(fileOf(to) - fileOf(from));
  const dr = Math.sign(rankOf(to) - rankOf(from));
  let file = fileOf(from) + df;
  let rank = rankOf(from) + dr;
  while (file !== fileOf(to) || rank !== rankOf(to)) {
    if (occupied.has(squareAt(file, rank))) return false;
    file += df;
    rank += dr;
  }
  return true;
}

/**
 * Explains why moving `from` -> `to` is not allowed in this position, or returns null if it
 * is allowed. Only looks at the move itself: promotion choice is not checked.
 */
export function explainIllegalMove(fen: string, from: Square, to: Square): IllegalReason | null {
  if (createGame(fen).legalMovesFrom(from).includes(to)) return null;

  const piece = pieceAt(fen, from);
  if (!piece) return "no-piece";
  if (from === to) return "same-square";
  if (piece.color !== sideToMove(fen)) return "not-your-piece";

  const pieces = allPieces(fen);
  const occupied = new Set(pieces.map((p) => p.square));
  const target: PieceOnSquare | undefined = pieces.find((p) => p.square === to);
  const enPassant = fen.trim().split(/\s+/)[3];

  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  // 1. Is the shape of the move right for this piece, ignoring everything else?
  let shapeOk: boolean;
  switch (piece.type) {
    case "knight":
      shapeOk = (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
      break;
    case "bishop":
      shapeOk = adf === adr;
      break;
    case "rook":
      shapeOk = df === 0 || dr === 0;
      break;
    case "queen":
      shapeOk = adf === adr || df === 0 || dr === 0;
      break;
    case "king":
      if (adf === 2 && dr === 0) return "castle-not-allowed";
      shapeOk = adf <= 1 && adr <= 1;
      break;
    case "pawn": {
      const dir = piece.color === "white" ? 1 : -1;
      const startRank = piece.color === "white" ? 2 : 7;
      if (df === 0 && dr === dir) {
        shapeOk = true;
      } else if (df === 0 && dr === 2 * dir && rankOf(from) === startRank) {
        shapeOk = true;
      } else if (adf === 1 && dr === dir) {
        if (!target && to !== enPassant) return "pawn-needs-capture";
        shapeOk = true;
      } else {
        shapeOk = false;
      }
      break;
    }
  }
  if (!shapeOk) return "wrong-shape";

  // 2. Is something in the way?
  if (piece.type === "pawn" && df === 0) {
    if (target || !pathClear(occupied, from, to)) return "blocked";
  }
  if ((piece.type === "bishop" || piece.type === "rook" || piece.type === "queen") && !pathClear(occupied, from, to)) {
    return "blocked";
  }

  // 3. Landing on a friend?
  if (target && target.color === piece.color) return "own-piece";

  // 4. Everything about the move is fine, so the king must be the problem.
  const kingAt = kingSquare(fen, piece.color);
  const inCheck = kingAt ? createGame(fen).status().inCheck : false;
  return inCheck ? "must-escape-check" : "exposes-king";
}
