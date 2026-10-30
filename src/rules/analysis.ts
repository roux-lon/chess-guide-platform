import { Chess } from "chess.js";
import type { Color as ChessColor, PieceSymbol, Square as ChessSquare } from "chess.js";
import type { Color, PieceType, PromotionPiece, Square } from "./types";

// Position questions the coach asks. Every function takes a FEN so it is easy to
// test on a fixed position. These look at the board's geometry only: a piece that is
// pinned to its king still counts as attacking (good enough for beginner coaching).

/**
 * Trade values by piece type. The king gets a huge number so it is never counted as a
 * "cheap" attacker: a king cannot take a protected piece.
 */
export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100,
};

export interface PieceOnSquare {
  type: PieceType;
  color: Color;
  square: Square;
}

export interface HangingInfo {
  piece: PieceOnSquare;
  /** Enemy pieces attacking it, cheapest first. */
  attackers: PieceOnSquare[];
  /** Friendly pieces protecting it, cheapest first. */
  defenders: PieceOnSquare[];
  /** "undefended": nothing protects it. "cheaper-attacker": an enemy piece worth less can take it. */
  reason: "undefended" | "cheaper-attacker";
}

export const TYPE_BY_SYMBOL: Record<PieceSymbol, PieceType> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export const colorOf = (c: ChessColor): Color => (c === "w" ? "white" : "black");
const chessColorOf = (c: Color): ChessColor => (c === "white" ? "w" : "b");
export const opposite = (c: Color): Color => (c === "white" ? "black" : "white");

export function pieceValue(type: PieceType): number {
  return PIECE_VALUES[type];
}

const byValue = (a: PieceOnSquare, b: PieceOnSquare) =>
  PIECE_VALUES[a.type] - PIECE_VALUES[b.type];

export function pieceAt(fen: string, square: Square): PieceOnSquare | null {
  const piece = new Chess(fen).get(square as ChessSquare);
  return piece ? { type: TYPE_BY_SYMBOL[piece.type], color: colorOf(piece.color), square } : null;
}

export function allPieces(fen: string): PieceOnSquare[] {
  const pieces: PieceOnSquare[] = [];
  for (const row of new Chess(fen).board()) {
    for (const cell of row) {
      if (cell) {
        pieces.push({
          type: TYPE_BY_SYMBOL[cell.type],
          color: colorOf(cell.color),
          square: cell.square,
        });
      }
    }
  }
  return pieces;
}

export function kingSquare(fen: string, color: Color): Square | null {
  return allPieces(fen).find((p) => p.type === "king" && p.color === color)?.square ?? null;
}

/** Pieces of colour `by` that attack `square` (whatever stands on it), cheapest first. */
export function attackersOf(fen: string, square: Square, by: Color): PieceOnSquare[] {
  const chess = new Chess(fen);
  const attackers: PieceOnSquare[] = [];
  for (const from of chess.attackers(square as ChessSquare, chessColorOf(by))) {
    const piece = chess.get(from);
    if (piece) {
      attackers.push({ type: TYPE_BY_SYMBOL[piece.type], color: colorOf(piece.color), square: from });
    }
  }
  return attackers.sort(byValue);
}

/** Pieces that protect the piece on `square` (same colour, attacking its square). Empty if the square is empty. */
export function defendersOf(fen: string, square: Square): PieceOnSquare[] {
  const piece = pieceAt(fen, square);
  return piece ? attackersOf(fen, square, piece.color) : [];
}

/** Enemy pieces that the piece on `square` attacks. */
export function piecesAttackedBy(fen: string, square: Square): PieceOnSquare[] {
  const piece = pieceAt(fen, square);
  if (!piece) return [];
  return allPieces(fen).filter(
    (target) =>
      target.color !== piece.color &&
      attackersOf(fen, target.square, piece.color).some((a) => a.square === square),
  );
}

/**
 * Is the piece on `square` hanging? It is when an enemy piece attacks it and either
 * nothing protects it or the cheapest attacker is worth less than it. Kings never hang.
 */
export function hangingInfo(fen: string, square: Square): HangingInfo | null {
  const piece = pieceAt(fen, square);
  if (!piece || piece.type === "king") return null;
  const attackers = attackersOf(fen, square, opposite(piece.color));
  if (attackers.length === 0) return null;
  const defenders = defendersOf(fen, square);
  if (defenders.length === 0) return { piece, attackers, defenders, reason: "undefended" };
  if (PIECE_VALUES[attackers[0].type] < PIECE_VALUES[piece.type]) {
    return { piece, attackers, defenders, reason: "cheaper-attacker" };
  }
  return null;
}

/** Every hanging piece on the board, optionally only one colour's. */
export function allHangingPieces(fen: string, color?: Color): HangingInfo[] {
  const result: HangingInfo[] = [];
  for (const piece of allPieces(fen)) {
    if (color && piece.color !== color) continue;
    const info = hangingInfo(fen, piece.square);
    if (info) result.push(info);
  }
  return result;
}

/**
 * Plays the cheapest capture on `square` by `side` on a scratch board, so the next capture
 * sees the new position (a rook hiding behind the first capturer joins in). Returns the
 * value of the piece that captured, or undefined if `side` has nothing that can capture.
 */
function captureWithCheapest(chess: Chess, square: Square, side: ChessColor): number | undefined {
  let best: { from: ChessSquare; type: PieceSymbol } | undefined;
  for (const from of chess.attackers(square as ChessSquare, side)) {
    const piece = chess.get(from);
    if (!piece) continue;
    if (!best || PIECE_VALUES[TYPE_BY_SYMBOL[piece.type]] < PIECE_VALUES[TYPE_BY_SYMBOL[best.type]]) {
      best = { from, type: piece.type };
    }
  }
  if (!best) return undefined;
  chess.remove(best.from);
  chess.remove(square as ChessSquare);
  chess.put({ type: best.type, color: side }, square as ChessSquare);
  return PIECE_VALUES[TYPE_BY_SYMBOL[best.type]];
}

/**
 * Static exchange evaluation (SEE): the material `by` nets (in piece-value points) by starting
 * captures on `square`, with both sides then recapturing with their cheapest piece for as long
 * as it pays. Positive means the exchange wins material for `by`. Pieces hiding behind other
 * attackers (a battery of rooks, a queen behind a bishop) join in when the front one has
 * captured. Ignores pins. Zero if there is nothing there to capture.
 */
export function staticExchange(fen: string, square: Square, by: Color): number {
  const chess = new Chess(fen);
  const target = chess.get(square as ChessSquare);
  if (!target || colorOf(target.color) === by) return 0;

  let side: ChessColor = chessColorOf(by);
  let attackerValue = captureWithCheapest(chess, square, side);
  if (attackerValue === undefined) return 0;

  const gain: number[] = [];
  let targetValue = PIECE_VALUES[TYPE_BY_SYMBOL[target.type]];
  let d = 0;
  do {
    gain[d] = targetValue - (d > 0 ? gain[d - 1] : 0);
    targetValue = attackerValue;
    side = side === "w" ? "b" : "w";
    attackerValue = captureWithCheapest(chess, square, side);
    d++;
  } while (attackerValue !== undefined);
  while (--d > 0) gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
  return gain[0] || 0; // avoid -0
}

/** Standard notation for a move in this position (for example "Nf3"), or null if it is illegal. */
export function moveToSan(
  fen: string,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
): string | null {
  try {
    const promo = promotion ? ({ queen: "q", rook: "r", bishop: "b", knight: "n" } as const)[promotion] : undefined;
    return new Chess(fen).move({ from, to, promotion: promo }).san;
  } catch {
    return null;
  }
}
