import type { Caution } from "@/content";
import type { Color, PieceType, Square } from "@/rules";

export interface GoalStatus {
  id: string;
  /** Short name for the checklist. */
  label: string;
  done: boolean;
}

/** A move the coach suggests, already checked: legal and safe. */
export interface Suggestion {
  from: Square;
  to: Square;
  /** Standard notation for this position, such as "Nf3". */
  san: string;
  reason: string;
  /** Only for a capture that promotes a pawn: always a queen. */
  promotion?: "queen";
}

export interface EndangeredPiece {
  type: PieceType;
  square: Square;
}

export type NextStep =
  /** It is not the person's turn. */
  | { kind: "wait" }
  /** The king is in check: that has to be answered before any plan. */
  | { kind: "check" }
  /** One of my pieces can be won. Handle that first, then go back to the plan. */
  | { kind: "safety"; pieces: EndangeredPiece[] }
  /** The bot left a piece to be won for free. Take it (safely), then go back to the plan. */
  | { kind: "chance"; target: EndangeredPiece; attacker: EndangeredPiece; move: Suggestion }
  /** The first unmet goal that has at least one safe move. */
  | { kind: "goal"; goalId: string; title: string; why: string; moves: Suggestion[] }
  /** Every goal is done, or no goal has a safe move right now. */
  | { kind: "free"; allDone: boolean };

/** What the person's last move did for the plan. */
export interface MoveNote {
  /** The move, for example "Nf3". */
  san: string;
  /** Goals this move completed. */
  advanced: GoalStatus[];
  /** The move is one the playbook suggested for the current goal. */
  onPlan: boolean;
  /** A habit worth a gentle word, if the move showed one. */
  caution?: Caution;
}

export interface OpeningView {
  color: Color;
  goals: GoalStatus[];
  /** Every goal is done. */
  complete: boolean;
  /** How many moves the person has made. */
  myMoves: number;
  /** The practice is over: the checklist is complete or the move limit is reached. */
  ended: boolean;
  step: NextStep;
  /** About the person's last move. Missing before they have moved. */
  lastMove?: MoveNote;
}
