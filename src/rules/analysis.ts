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

const TYPE_BY_SYMBOL: Record<PieceSymbol, PieceType> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const colorOf = (c: ChessColor): Color => (c === "w" ? "white" : "black");
const chessColorOf = (c: Color): ChessColor => (c === "white" ? "w" : "b");
const opposite = (c: Color): Color => (c === "white" ? "black" : "white");

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
 * Static exchange: the material `by` nets (in piece-value points) by starting captures
 * on `square`, with both sides then recapturing with their cheapest piece for as long as
 * it pays. Positive means the exchange wins material for `by`. Ignores pins and hidden
 * attackers behind other pieces. Zero if there is nothing there to capture.
 */
export function staticExchange(fen: string, square: Square, by: Color): number {
  const target = pieceAt(fen, square);
  if (!target || target.color === by) return 0;

  const lists = [
    attackersOf(fen, square, by).map((p) => PIECE_VALUES[p.type]),
    attackersOf(fen, square, target.color).map((p) => PIECE_VALUES[p.type]),
  ];
  let attackerValue = lists[0].shift();
  if (attackerValue === undefined) return 0;

  const gain: number[] = [];
  let targetValue = PIECE_VALUES[target.type];
  let side = 0;
  let d = 0;
  do {
    gain[d] = targetValue - (d > 0 ? gain[d - 1] : 0);
    if (Math.max(d > 0 ? -gain[d - 1] : 0, gain[d]) < 0) break;
    targetValue = attackerValue;
    side ^= 1;
    attackerValue = lists[side].shift();
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
