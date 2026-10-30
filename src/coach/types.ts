import type { Color, MoveInfo, PieceType, Square } from "@/rules";

/** Who made a move or owns a piece, from the human player's point of view. */
export type Who = "you" | "bot";

/** The same two sides, in the words the teaching rules use: the person at the board, or the bot. */
export type Perspective = "user" | "bot";

/**
 * What an event is about for the person learning:
 * - threat: something is attacked and the other side gets to answer (or a check has to be answered);
 * - opportunity: it is the player's turn and they can win material right now;
 * - trade: pieces were exchanged;
 * - info: everything else (purpose of a move, praise, how the bot answered a threat).
 */
export type EventNature = "threat" | "opportunity" | "trade" | "info";

/** The two facts every event carries, so the narrator never has to guess whose turn it is. */
export interface EventMeta {
  /** Whose side the event is about: the mover for most events, the piece's owner for hanging pieces, the player for chances. */
  perspective: Perspective;
  nature: EventNature;
}

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
  /** Who just moved. */
  actor: Who;
  /** Who is to move next. Always the other side, but spelled out so no detector has to work it out. */
  toMove: Who;
  move: MoveInfo;
  /** The move played just before this one (by the other side), if any. Lets a recapture be seen as part of a trade. */
  previousMove?: MoveInfo;
  /** Evaluation of the position before the move, if the engine could provide one. */
  evalBefore?: MoveEvaluation | null;
  /** Evaluation of the position after the move. */
  evalAfter?: MoveEvaluation | null;
}

export const whoIs = (color: Color, playerColor: Color): Who => (color === playerColor ? "you" : "bot");

export const otherWho = (who: Who): Who => (who === "you" ? "bot" : "you");

export const perspectiveOf = (who: Who): Perspective => (who === "you" ? "user" : "bot");

export const meta = (perspective: Perspective, nature: EventNature): EventMeta => ({ perspective, nature });
