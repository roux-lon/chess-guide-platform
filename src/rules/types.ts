// Our own chess types. Nothing from chess.js is exported from this folder.

export type Color = "white" | "black";
export type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
export type PromotionPiece = "queen" | "rook" | "bishop" | "knight";

/** Algebraic square name such as "e4". */
export type Square = string;

export type MoveKind =
  | "normal"
  | "capture"
  | "castle-kingside"
  | "castle-queenside"
  | "en-passant"
  | "promotion";

export interface MoveInfo {
  from: Square;
  to: Square;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PromotionPiece;
  /** Standard notation, for example "Nf3" or "exd5". */
  san: string;
  kind: MoveKind;
  /** FEN before and after the move. */
  fenBefore: string;
  fenAfter: string;
}

export type DrawReason =
  | "insufficient-material"
  | "threefold-repetition"
  | "fifty-move-rule";

export interface GameStatus {
  turn: Color;
  inCheck: boolean;
  isGameOver: boolean;
  /** Only set when the game is over. */
  outcome?: "checkmate" | "stalemate" | "draw";
  /** Set on checkmate. */
  winner?: Color;
  /** Set when outcome is "draw". */
  drawReason?: DrawReason;
}

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
