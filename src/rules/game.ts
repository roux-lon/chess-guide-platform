import { Chess, type Move as ChessMove, type PieceSymbol, type Square as ChessSquare } from "chess.js";
import type {
  Color,
  DrawReason,
  GameStatus,
  MoveInfo,
  MoveKind,
  PieceType,
  PromotionPiece,
  Square,
} from "./types";

const PIECE_BY_SYMBOL: Record<PieceSymbol, PieceType> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const SYMBOL_BY_PROMOTION: Record<PromotionPiece, PieceSymbol> = {
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
};

const colorOf = (c: "w" | "b"): Color => (c === "w" ? "white" : "black");

function kindOf(m: ChessMove): MoveKind {
  if (m.isKingsideCastle()) return "castle-kingside";
  if (m.isQueensideCastle()) return "castle-queenside";
  if (m.isEnPassant()) return "en-passant";
  if (m.isPromotion()) return "promotion";
  if (m.isCapture()) return "capture";
  return "normal";
}

function toMoveInfo(m: ChessMove): MoveInfo {
  return {
    from: m.from,
    to: m.to,
    color: colorOf(m.color),
    piece: PIECE_BY_SYMBOL[m.piece],
    captured: m.captured ? PIECE_BY_SYMBOL[m.captured] : undefined,
    promotion: m.promotion
      ? (PIECE_BY_SYMBOL[m.promotion] as PromotionPiece)
      : undefined,
    san: m.san,
    kind: kindOf(m),
    fenBefore: m.before,
    fenAfter: m.after,
  };
}

export interface Game {
  fen(): string;
  turn(): Color;
  /** Squares the piece on `from` can legally move to (empty if none). */
  legalMovesFrom(from: Square): Square[];
  /** Every legal destination, keyed by origin square. Ready to hand to a board. */
  legalDests(): Map<Square, Square[]>;
  /** Every legal move, with each promotion choice listed separately. */
  legalMoves(): MoveInfo[];
  /** True when moving `from` -> `to` is legal but needs a promotion piece. */
  needsPromotion(from: Square, to: Square): boolean;
  /** Plays the move if legal and returns it, otherwise returns null and changes nothing. */
  tryMove(from: Square, to: Square, promotion?: PromotionPiece): MoveInfo | null;
  status(): GameStatus;
  history(): MoveInfo[];
  /** Takes back the last move, or returns null if there is none. */
  undo(): MoveInfo | null;
}

export function createGame(fen?: string): Game {
  // chess.js throws on an invalid FEN; that surfaces as a normal Error.
  return wrap(fen ? new Chess(fen) : new Chess());
}

/**
 * A game with these moves already played from the standard start, in standard notation
 * (SAN, like "Nf3"). Returns null if any move is not legal. Undo works through all of them.
 */
export function createGameFromSan(sanMoves: readonly string[]): Game | null {
  const chess = new Chess();
  try {
    for (const san of sanMoves) chess.move(san);
  } catch {
    return null;
  }
  return wrap(chess);
}

function wrap(chess: Chess): Game {

  const verboseMoves = (square?: Square) =>
    chess.moves({ verbose: true, ...(square ? { square: square as ChessSquare } : {}) });

  return {
    fen: () => chess.fen(),
    turn: () => colorOf(chess.turn()),

    legalMovesFrom: (from) => [...new Set(verboseMoves(from).map((m) => m.to))],

    legalDests() {
      const dests = new Map<Square, Square[]>();
      for (const m of verboseMoves()) {
        const list = dests.get(m.from);
        if (!list) dests.set(m.from, [m.to]);
        else if (!list.includes(m.to)) list.push(m.to);
      }
      return dests;
    },

    legalMoves: () => verboseMoves().map(toMoveInfo),

    needsPromotion: (from, to) =>
      verboseMoves(from).some((m) => m.to === to && m.isPromotion()),

    tryMove(from, to, promotion) {
      try {
        const m = chess.move({
          from,
          to,
          promotion: promotion ? SYMBOL_BY_PROMOTION[promotion] : undefined,
        });
        return toMoveInfo(m);
      } catch {
        return null;
      }
    },

    status() {
      const turn = colorOf(chess.turn());
      const inCheck = chess.inCheck();
      const base = { turn, inCheck };
      if (chess.isCheckmate()) {
        return {
          ...base,
          isGameOver: true,
          outcome: "checkmate",
          winner: turn === "white" ? "black" : "white",
        };
      }
      if (chess.isStalemate()) {
        return { ...base, isGameOver: true, outcome: "stalemate" };
      }
      let drawReason: DrawReason | undefined;
      if (chess.isInsufficientMaterial()) drawReason = "insufficient-material";
      else if (chess.isThreefoldRepetition()) drawReason = "threefold-repetition";
      else if (chess.isDrawByFiftyMoves()) drawReason = "fifty-move-rule";
      if (drawReason) {
        return { ...base, isGameOver: true, outcome: "draw", drawReason };
      }
      return { ...base, isGameOver: false };
    },

    history: () => chess.history({ verbose: true }).map(toMoveInfo),

    undo() {
      const m = chess.undo();
      return m ? toMoveInfo(m) : null;
    },
  };
}
