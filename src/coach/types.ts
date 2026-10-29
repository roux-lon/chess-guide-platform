import type { Color, MoveInfo, PieceType, Square } from "@/rules";

/** Who made a move or owns a piece, from the human player's point of view. */
export type Who = "you" | "bot";

export interface PieceRef {
  type: PieceType;
  square: Square;
}

/** An engine evaluation in White's perspective, as returned by EngineAdapter.evaluate. */
export interface MoveEvaluation {
  cpWhite: number | null;
  /** Positive: White mates in N. Negative: Black mates in N. */
  mateIn: number | null;
}

/** Everything a detector needs to judge one move. Detectors never reach outside it. */
export interface MoveContext {
  /** 1-based half-move number: ply 1 is White's first move. */
  ply: number;
  playerColor: Color;
  /** Who played this move. */
  actor: Who;
  move: MoveInfo;
  /** Evaluation of the position before the move, if the engine could provide one. */
  evalBefore?: MoveEvaluation | null;
  /** Evaluation of the position after the move. */
  evalAfter?: MoveEvaluation | null;
}

export const whoIs = (color: Color, playerColor: Color): Who => (color === playerColor ? "you" : "bot");
