import type { DrawReason, PieceType, PromotionPiece, Square } from "@/rules";
import type { EventMeta, PieceRef, Who } from "./types";

// Events carry the facts needed to narrate them (squares, pieces, values), never text.
// Turning an event into words is the Narrator's job. Every event also carries its
// `perspective` and `nature` (see types.ts) so a threat is never told as a chance.

/** Why a move was played, in the beginner's words. */
export type Purpose =
  | "develop"
  | "controlCenter"
  | "castle"
  | "attack"
  | "defend"
  | "retreat"
  | "capture"
  | "trade"
  | "pawnAdvance"
  | "kingSafety"
  | "improvePiece"
  | "other";

/** Always emitted: what was played. It is kept for the log and the games review, not narrated. */
export interface MovePlayedEvent extends EventMeta {
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

/** The player's own move put (or left) one of their pieces where the bot wins material by taking it. */
export interface HangingPieceEvent extends EventMeta {
  kind: "hanging_piece";
  actor: "you";
  owner: "you";
  piece: PieceRef;
  /** The enemy pieces that could take it, cheapest first. */
  attackers: PieceRef[];
  reason: "undefended" | "cheaper-attacker" | "outnumbered";
  /** Points the bot nets by capturing, after recaptures. */
  gain: number;
}

export interface CaptureTradeEvent extends EventMeta {
  kind: "capture_trade";
  actor: Who;
  captured: PieceType;
  capturer: PieceType;
  square: Square;
  /** Material the capturer nets after the other side's best reply, in piece-value points. */
  netPoints: number;
  verdict: "good" | "equal" | "bad";
}

/** A capture and its recapture on the same square: one story, judged by the material. */
export interface TradeSequenceEvent extends EventMeta {
  kind: "trade_sequence";
  /** Who captured first. */
  opener: Who;
  /** What the first capture took. */
  firstCaptured: PieceType;
  /** What the recapture took (the opener's piece). */
  recaptured: PieceType;
  square: Square;
  /** The piece the player won and the piece the player gave up in this exchange. */
  won: PieceType;
  lost: PieceType;
  /** Points the player gained (negative: lost) over the whole exchange. */
  netForYou: number;
  verdict: "good" | "equal" | "bad";
}

/**
 * The bot was attacking one of the player's pieces (it could be won), and the
 * player's move did nothing about it, so it is still in danger.
 */
export interface MissedThreatEvent extends EventMeta {
  kind: "missed_threat";
  piece: PieceRef;
  /** The enemy pieces that can still take it, cheapest first. */
  attackers: PieceRef[];
  gain: number;
}

export interface CheckGivenEvent extends EventMeta {
  kind: "check_given";
  actor: "you";
  by: PieceType;
}

export interface InCheckWarningEvent extends EventMeta {
  kind: "in_check_warning";
  kingSquare: Square;
  checkers: PieceRef[];
  /** How many legal moves the player has to get out of check. */
  escapeMoves: number;
}

/** The move attacks something worth winning. The other side has to answer it. */
export interface ThreatCreatedEvent extends EventMeta {
  kind: "threat_created";
  /** Who made the move (and the threat). */
  actor: Who;
  attacker: PieceRef;
  /** The pieces now worth winning, most valuable first. */
  targets: PieceRef[];
  /** Points the attacker would net by taking the first target. */
  gain: number;
  /** The attack was uncovered by moving a different piece out of the way. */
  discovered: boolean;
}

/** It is the player's turn and a capture wins material right now. Only ever after the bot's move. */
export interface OpportunityEvent extends EventMeta {
  kind: "opportunity";
  target: PieceRef;
  attacker: PieceRef;
  gain: number;
  /** How many different pieces could be won. */
  count: number;
}

/** One move that makes two threats at once, so the other side can only answer one. */
export interface DoubleAttackEvent extends EventMeta {
  kind: "double_attack";
  actor: Who;
  attacker: PieceRef;
  targets: PieceRef[];
  givesCheck: boolean;
}

/** How the bot dealt with a piece of its that the player was threatening. */
export interface ResponseToThreatEvent extends EventMeta {
  kind: "response_to_threat";
  actor: "bot";
  how: "moved" | "defended" | "captured_attacker" | "counterattack";
  /** The threatened piece, on its square after the bot's move. */
  piece: PieceRef;
}

/** The job the move does. Always emitted, so a comment always has a reason to give. */
export interface MovePurposeEvent extends EventMeta {
  kind: "move_purpose";
  actor: Who;
  purpose: Purpose;
  piece: PieceType;
  to: Square;
}

export interface MoveQualityEvent extends EventMeta {
  kind: "move_quality";
  actor: Who;
  quality: "good" | "mistake" | "blunder";
  /** Centipawns lost compared with the position before the move, from the mover's perspective. */
  lossCp: number;
}

export interface GameOverEvent extends EventMeta {
  kind: "game_over";
  result: "you_win" | "bot_wins" | "draw";
  reason: "checkmate" | "stalemate" | DrawReason;
}

// Hints for the "I'm stuck" button. One event per tier: safety check, plan check, best move.

export interface HintSafetyEvent extends EventMeta {
  kind: "hint_safety";
  /** The player's pieces the bot could win right now, most valuable first. */
  unsafe: PieceRef[];
  inCheck: boolean;
}

export interface HintPlanEvent extends EventMeta {
  kind: "hint_plan";
  /**
   * The biggest job still undone: get out of check, save the threatened piece, bring out the knights and bishops
   * still at home, castle, take space in the center, or (when all of that is done) look to attack.
   */
  plan: "check" | "threat" | "develop" | "castle" | "center" | "free";
  /** The threatened piece (plan "threat") or the pieces still at home (plan "develop"). */
  pieces: PieceRef[];
}

export interface HintSuggestEvent extends EventMeta {
  kind: "hint_suggest";
  suggestion: {
    piece: PieceType;
    from: Square;
    to: Square;
    san: string;
    promotion?: PromotionPiece;
  } | null;
  /** What the suggested move is for. "other" means the engine likes it but no simple reason shows. */
  purpose: Purpose;
  /** After the move, none of the player's pieces can be won. */
  safeAfter: boolean;
}

export type CoachEvent =
  | MovePlayedEvent
  | HangingPieceEvent
  | CaptureTradeEvent
  | TradeSequenceEvent
  | MissedThreatEvent
  | CheckGivenEvent
  | InCheckWarningEvent
  | ThreatCreatedEvent
  | OpportunityEvent
  | DoubleAttackEvent
  | ResponseToThreatEvent
  | MovePurposeEvent
  | MoveQualityEvent
  | GameOverEvent
  | HintSafetyEvent
  | HintPlanEvent
  | HintSuggestEvent;

export type CoachEventKind = CoachEvent["kind"];
