import { Chess } from "chess.js";
import type { Square as ChessSquare } from "chess.js";
import {
  PIECE_VALUES,
  TYPE_BY_SYMBOL,
  allPieces,
  attackersOf,
  kingSquare,
  opposite,
  pieceAt,
  staticExchange,
} from "./analysis";
import type { PieceOnSquare } from "./analysis";
import type { Color, Square } from "./types";

// Questions about who is safe and who is in danger, all answered with static exchange
// evaluation (SEE) so "attacked" is never mistaken for "lost". Like analysis.ts these take
// FENs, ignore pins, and are written for coaching a beginner, not for playing strongly.

/** A piece that can be won, with the pieces that would win it and the points it nets. */
export interface PieceGain {
  piece: PieceOnSquare;
  /** Enemy pieces attacking it, cheapest first. */
  attackers: PieceOnSquare[];
  /** What the attacking side nets by starting captures there. */
  gain: number;
}

/**
 * Is the piece on `square` truly safe? It is when the other side gains nothing by capturing it
 * (counting the recaptures). A pawn guarding a knight makes an attack by a rook harmless; an
 * unguarded pawn under attack is not safe. A king is safe when it is not in check.
 */
export function isPieceSafe(fen: string, square: Square): boolean {
  const piece = pieceAt(fen, square);
  if (!piece) return true;
  if (piece.type === "king") return attackersOf(fen, square, opposite(piece.color)).length === 0;
  return staticExchange(fen, square, opposite(piece.color)) <= 0;
}

/** Pieces of `color` (never the king) that the other side wins by capturing, biggest loss first. */
export function unsafePieces(fen: string, color: Color): PieceGain[] {
  const result: PieceGain[] = [];
  for (const piece of allPieces(fen)) {
    if (piece.color !== color || piece.type === "king") continue;
    const gain = staticExchange(fen, piece.square, opposite(color));
    if (gain > 0) result.push({ piece, attackers: attackersOf(fen, piece.square, opposite(color)), gain });
  }
  return result.sort((a, b) => b.gain - a.gain || PIECE_VALUES[b.piece.type] - PIECE_VALUES[a.piece.type]);
}

/** An enemy piece that a move started to attack. */
export interface NewAttack extends PieceGain {
  /** True when the piece that moved is not one of the attackers: a piece behind it got uncovered. */
  discovered: boolean;
}

/**
 * Enemy pieces (never the king) that colour `by` attacks after its move but did not attack
 * before it. This includes attacks uncovered when a piece steps out of the way. `movedTo` is
 * where the moved piece landed. `gain` is what `by` would net by capturing, so a value of zero
 * or less means the attack is not worth winning. Largest gain first.
 */
export function piecesNewlyAttacked(
  fenBefore: string,
  fenAfter: string,
  by: Color,
  movedTo: Square,
): NewAttack[] {
  const result: NewAttack[] = [];
  for (const target of allPieces(fenAfter)) {
    if (target.color === by || target.type === "king") continue;
    const attackers = attackersOf(fenAfter, target.square, by);
    if (attackers.length === 0) continue;
    const before = pieceAt(fenBefore, target.square);
    const wasAttacked =
      before?.type === target.type &&
      before.color === target.color &&
      attackersOf(fenBefore, target.square, by).length > 0;
    if (wasAttacked) continue;
    result.push({
      piece: target,
      attackers,
      gain: staticExchange(fenAfter, target.square, by),
      discovered: !attackers.some((a) => a.square === movedTo),
    });
  }
  return result.sort((a, b) => b.gain - a.gain);
}

/** The newly attacked pieces that are worth winning: capturing them would net material. */
export function winnableThreats(
  fenBefore: string,
  fenAfter: string,
  by: Color,
  movedTo: Square,
): NewAttack[] {
  return piecesNewlyAttacked(fenBefore, fenAfter, by, movedTo).filter((a) => a.gain > 0);
}

export interface DoubleAttack {
  /** The piece that moved. */
  attacker: PieceOnSquare;
  /** Pieces now under attack that are worth winning. */
  targets: PieceOnSquare[];
  /** The move also gives check, which has to be answered first. */
  givesCheck: boolean;
}

/**
 * Did the move make two separate threats at once (two winnable pieces, or check plus a
 * winnable piece), so the other side cannot answer both? Not when the moved piece can simply
 * be captured for a gain, because then one reply deals with everything.
 */
export function doubleAttack(
  fenBefore: string,
  fenAfter: string,
  by: Color,
  movedTo: Square,
): DoubleAttack | null {
  const attacker = pieceAt(fenAfter, movedTo);
  if (!attacker || attacker.color !== by) return null;
  if (staticExchange(fenAfter, movedTo, opposite(by)) > 0) return null;

  const targets = winnableThreats(fenBefore, fenAfter, by, movedTo).map((t) => t.piece);
  const enemyKing = kingSquare(fenAfter, opposite(by));
  const givesCheck = enemyKing !== null && attackersOf(fenAfter, enemyKing, by).length > 0;
  if (targets.length >= 2 || (givesCheck && targets.length >= 1)) {
    return { attacker, targets, givesCheck };
  }
  return null;
}

/** A capture the side to move can make that wins material. */
export interface WinningCapture {
  target: PieceOnSquare;
  /** The cheapest piece that can legally make the capture. */
  attacker: PieceOnSquare;
  /** Points netted after the other side's best recaptures. Above zero. */
  gain: number;
}

/**
 * The legal captures for the side to move that win material, best first (one per target
 * piece). Empty when nothing can be won right now.
 */
export function winningCaptures(fen: string): WinningCapture[] {
  const chess = new Chess(fen);
  const mover = chess.turn() === "w" ? "white" : "black";
  const best = new Map<string, WinningCapture>();

  for (const move of chess.moves({ verbose: true })) {
    if (!move.captured || move.flags.includes("e")) continue;
    const after = new Chess(fen);
    after.move(move.san);
    const recapture = Math.max(0, staticExchange(after.fen(), move.to, opposite(mover)));
    const gain = PIECE_VALUES[TYPE_BY_SYMBOL[move.captured]] - recapture;
    if (gain <= 0) continue;
    const attacker = pieceAt(fen, move.from);
    const target = pieceAt(fen, move.to);
    if (!attacker || !target) continue;
    const known = best.get(move.to);
    const notCheaper = !known || PIECE_VALUES[attacker.type] < PIECE_VALUES[known.attacker.type];
    if (!known || gain > known.gain || (gain === known.gain && notCheaper)) {
      best.set(move.to, { target, attacker, gain });
    }
  }
  return [...best.values()].sort((a, b) => b.gain - a.gain);
}

/** How many squares the piece on `square` attacks (a rough measure of how active it is). */
export function pieceMobility(fen: string, square: Square): number {
  const piece = pieceAt(fen, square);
  if (!piece) return 0;
  const chess = new Chess(fen);
  const side = piece.color === "white" ? "w" : "b";
  let count = 0;
  for (const file of "abcdefgh") {
    for (let rank = 1; rank <= 8; rank++) {
      const target = `${file}${rank}` as ChessSquare;
      if (target !== square && chess.attackers(target, side).includes(square as ChessSquare)) count++;
    }
  }
  return count;
}

const HOME_MINORS: Record<Color, readonly Square[]> = {
  white: ["b1", "c1", "f1", "g1"],
  black: ["b8", "c8", "f8", "g8"],
};

/** Knights and bishops of `color` still on their starting squares. */
export function undevelopedMinors(fen: string, color: Color): PieceOnSquare[] {
  return allPieces(fen).filter(
    (p) =>
      p.color === color &&
      (p.type === "knight" || p.type === "bishop") &&
      HOME_MINORS[color].includes(p.square),
  );
}

/** Is the square a starting square of a knight or bishop for `color`? */
export function isMinorHomeSquare(color: Color, square: Square): boolean {
  return HOME_MINORS[color].includes(square);
}

/** The king is still on its starting square and has not lost the right to castle on some side. */
export function canStillCastle(fen: string, color: Color): boolean {
  const rights = fen.split(" ")[2] ?? "-";
  const mine = color === "white" ? /[KQ]/ : /[kq]/;
  return mine.test(rights) && kingSquare(fen, color) === (color === "white" ? "e1" : "e8");
}

/** How many of `color`'s pawns stand on the given squares (used for the center). */
export function pawnsOn(fen: string, color: Color, squares: readonly Square[]): number {
  return allPieces(fen).filter((p) => p.color === color && p.type === "pawn" && squares.includes(p.square)).length;
}
