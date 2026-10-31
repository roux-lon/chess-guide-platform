// The opening playbook as data: a short list of setup goals, in the order to aim for them.
// Plain TypeScript, no React, no browser APIs, no chess library.
//
// Every square in this file is written from WHITE's side. For Black the squares are mirrored
// (rank 1 <-> 8, so e4 becomes e5 and g1 becomes g8), which is why one list serves both colours.
// A "condition" is a declarative question about the position; features/opening/conditions.ts
// knows how to answer each kind. There is no code in this file.

export type PlaybookSquare = string;

export type Condition =
  /** At least `min` (default 1) of my pawns stand on these squares. */
  | { type: "pawnOn"; squares: PlaybookSquare[]; min?: number }
  /** At least `min` (default 1) of my pieces of this kind stand on these squares. */
  | { type: "pieceOn"; piece: "knight" | "bishop" | "rook" | "queen"; squares: PlaybookSquare[]; min?: number }
  /** None of my knights (or bishops) is left on a starting square. */
  | { type: "developed"; piece: "knight" | "bishop" }
  /** Every one of these squares is empty. */
  | { type: "squareEmpty"; squares: PlaybookSquare[] }
  /** My king has castled. */
  | { type: "castled" }
  /** My two rooks stand on the back row with nothing between them. */
  | { type: "rooksConnected" }
  | { type: "all"; of: Condition[] }
  | { type: "any"; of: Condition[] };

/** One move worth suggesting. It is only offered when it is legal and safe in the position. */
export interface Candidate {
  from: PlaybookSquare;
  to: PlaybookSquare;
  /** Offered only while this is true. Leave out for "always". */
  when?: Condition;
  /** Why this move helps, in plain words that fit both colours. */
  reason: string;
}

export interface Goal {
  /** Kebab-case and unique. Kept in the diary. */
  id: string;
  /** Short name on the checklist, such as "Center". */
  label: string;
  /** Longer title for the coach, such as "Claim the center". */
  title: string;
  /** Why this goal matters, for a beginner. */
  why: string;
  /** The goal is finished when this is true. */
  done: Condition;
  /** Said when the goal ticks off. */
  doneText: string;
  /** Best first. */
  candidates: Candidate[];
}

/** Advice about habits. Each `rule` is a named check that features/opening knows how to run. */
export type CautionRule = "same-piece-twice" | "early-queen" | "edge-pawn" | "early-f-pawn";

export interface Caution {
  id: string;
  rule: CautionRule;
  title: string;
  text: string;
}

/** What Black plays against White's first move. */
export interface BlackReply {
  /** White's first move. */
  whiteMove: { from: PlaybookSquare; to: PlaybookSquare };
  /** Black's answer, written with real squares (not mirrored). */
  reply: { from: PlaybookSquare; to: PlaybookSquare };
  reason: string;
}

export interface Playbook {
  goals: Goal[];
  cautions: Caution[];
  /** Black's simple answers to White's first move. */
  blackReplies: BlackReply[];
  /** Black's safe pawn moves when White's first move is not in the list. Real squares. */
  blackOwnWay: { text: string; candidates: { from: PlaybookSquare; to: PlaybookSquare }[] };
  /** The practice ends after this many of my own moves, even if the checklist is not done. */
  maxMoves: number;
}
