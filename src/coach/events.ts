import type { DrawReason, PieceType, PromotionPiece, Square } from "@/rules";
import type { PieceRef, Who } from "./types";

// Events carry the facts needed to narrate them (squares, pieces, values), never text.
// Turning an event into words is the Narrator's job.

/** Always emitted: what was played. The lead sentence of every comment. */
export interface MovePlayedEvent {
  kind: "move_played";
  actor: Who;
  piece: PieceType;
  from: Square;
  to: Square;
  san: string;
  captured?: PieceType;
  castle?: "kingside" | "queenside";
  promotion?: PromotionPiece;
}

/** A piece that became capturable for free (or for a gain) because of this move. */
export interface HangingPieceEvent {
  kind: "hanging_piece";
  /** Who just moved. */
  actor: Who;
  /** Whose piece is hanging. */
  owner: Who;
  piece: PieceRef;
  /** The enemy pieces that could take it, cheapest first. */
  attackers: PieceRef[];
  reason: "undefended" | "cheaper-attacker";
}

export interface CaptureTradeEvent {
  kind: "capture_trade";
  actor: Who;
  captured: PieceType;
  capturer: PieceType;
  square: Square;
  /** Material the capturer nets after the other side's best reply, in piece-value points. */
  netPoints: number;
  verdict: "good" | "equal" | "bad";
}

/**
 * The bot was attacking one of the player's pieces (it could be taken for free), and the
 * player's move did nothing about it, so it is still hanging.
 */
export interface MissedThreatEvent {
  kind: "missed_threat";
  piece: PieceRef;
  /** The enemy pieces that can still take it, cheapest first. */
  attackers: PieceRef[];
}

export interface CheckGivenEvent {
  kind: "check_given";
  actor: "you";
  by: PieceType;
}

export interface InCheckWarningEvent {
  kind: "in_check_warning";
  kingSquare: Square;
  checkers: PieceRef[];
  /** How many legal moves the player has to get out of check. */
  escapeMoves: number;
}

/** The bot's last move attacks a protected piece of the player's that is worth at least as much. */
export interface ThreatFromOpponentEvent {
  kind: "threat_from_opponent";
  attacker: PieceRef;
  targets: PieceRef[];
}

export interface GoodDevelopmentEvent {
  kind: "good_development";
  actor: Who;
  piece: PieceType;
  from: Square;
  to: Square;
}

export interface CenterControlEvent {
  kind: "center_control";
  actor: Who;
  how: "occupy" | "attack";
  piece: PieceType;
  squares: Square[];
}

export interface MoveQualityEvent {
  kind: "move_quality";
  actor: Who;
  quality: "good" | "mistake" | "blunder";
  /** Centipawns lost compared with the position before the move, from the mover's perspective. */
  lossCp: number;
}

export interface GameOverEvent {
  kind: "game_over";
  result: "you_win" | "bot_wins" | "draw";
  reason: "checkmate" | "stalemate" | DrawReason;
}

// Hints for the "I'm stuck" button. One event per tier.

export interface HintFocusEvent {
  kind: "hint_focus";
  /** The piece worth a look, or null if the engine had no suggestion. */
  piece: PieceRef | null;
  inCheck: boolean;
}

export interface HintThreatsEvent {
  kind: "hint_threats";
  /** The player's pieces the bot could win right now. */
  threatened: PieceRef[];
  inCheck: boolean;
}

export interface HintSuggestEvent {
  kind: "hint_suggest";
  suggestion: {
    piece: PieceType;
    from: Square;
    to: Square;
    san: string;
    promotion?: PromotionPiece;
  } | null;
}

export type CoachEvent =
  | MovePlayedEvent
  | HangingPieceEvent
  | CaptureTradeEvent
  | MissedThreatEvent
  | CheckGivenEvent
  | InCheckWarningEvent
  | ThreatFromOpponentEvent
  | GoodDevelopmentEvent
  | CenterControlEvent
  | MoveQualityEvent
  | GameOverEvent
  | HintFocusEvent
  | HintThreatsEvent
  | HintSuggestEvent;

export type CoachEventKind = CoachEvent["kind"];
