// The named principles: short rules of thumb, each with one example position. Plain data: the
// coach, the gym, the games review and the "Rules I've learned" page all point at these ids.
// Short, kind, beginner words. A principle is advice, not a law.

import type { Arrow, Highlight } from "./types";

export type PrincipleId =
  | "check-threats"
  | "threat-is-a-question"
  | "dont-count-on-blunders"
  | "develop-first"
  | "keep-safe"
  | "control-center"
  | "castle-early"
  | "two-threats"
  | "trade-when-ahead"
  | "best-reply";

export interface PrincipleExample {
  /** The position. Both kings are always on the board. */
  fen: string;
  orientation?: "white" | "black";
  highlights?: Highlight[];
  arrows?: Arrow[];
  /** One sentence about what to notice on the board. */
  caption: string;
}

export interface Principle {
  id: PrincipleId;
  /** The rule, as a short sentence. */
  title: string;
  /** Two or three sentences in beginner words. */
  text: string;
  example: PrincipleExample;
}

export const PRINCIPLES: readonly Principle[] = [
  {
    id: "check-threats",
    title: "Check what they threaten before you move",
    text: "Before every move, ask: what did they just do? Look for any of your pieces they could win. It takes a few seconds and saves a lot of pieces.",
    example: {
      fen: "rnbqkbnr/ppp2ppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 3",
      highlights: [{ square: "e5", kind: "danger" }],
      arrows: [{ from: "d6", to: "e5", color: "red" }],
      caption: "The black pawn on d6 attacks your knight on e5, and nothing protects it.",
    },
  },
  {
    id: "threat-is-a-question",
    title: "A threat is a question, not a win",
    text: "When you attack a piece, the other side gets to answer. They can move it, protect it or hit back. A threat only wins something if they have no good answer.",
    example: {
      fen: "rnbqkb1r/pppppppp/5n2/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2",
      highlights: [{ square: "f6", kind: "warn" }],
      arrows: [{ from: "e5", to: "f6", color: "yellow" }],
      caption: "The pawn on e5 attacks the knight. Black simply moves it, so nothing is won yet.",
    },
  },
  {
    id: "dont-count-on-blunders",
    title: "Don't count on blunders",
    text: "Pick the move that is good even if the bot answers well. A plan that only works when the other side slips is a hope, not a plan.",
    example: {
      fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
      highlights: [{ square: "f7", kind: "warn" }],
      arrows: [
        { from: "h5", to: "f7", color: "yellow" },
        { from: "c4", to: "f7", color: "yellow" },
      ],
      caption: "White hopes Black misses the threat on f7. A good reply, like Qf6 or g6, and the plan is over.",
    },
  },
  {
    id: "develop-first",
    title: "Develop before you attack",
    text: "Bring your knights and bishops out first. Pieces that are still at home cannot help, and attacking with one lonely piece usually just wastes time.",
    example: {
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      highlights: [
        { square: "g1", kind: "good" },
        { square: "b1", kind: "good" },
        { square: "f1", kind: "good" },
      ],
      caption: "Nf3 or Nc3 or Bc4 each bring a piece into the game.",
    },
  },
  {
    id: "keep-safe",
    title: "Keep every piece safe or protected",
    text: "After you choose a move, check that nothing of yours can be taken for free. A piece is safe when nobody attacks it, or when taking it would cost them more than they win.",
    example: {
      fen: "rnbqkbnr/ppp1pppp/8/3p4/2B5/8/PPPP1PPP/RNBQK1NR w KQkq - 0 2",
      highlights: [{ square: "c4", kind: "danger" }],
      arrows: [{ from: "d5", to: "c4", color: "red" }],
      caption: "The bishop on c4 is attacked by a pawn and has no protector. Move it or protect it.",
    },
  },
  {
    id: "control-center",
    title: "Control the center",
    text: "The four middle squares (d4, e4, d5 and e5) are the best place for your pieces. From there they reach more of the board. Pawns in the middle help your pieces.",
    example: {
      fen: "rnbqkbnr/pppppppp/8/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1",
      highlights: [
        { square: "d4", kind: "good" },
        { square: "e4", kind: "good" },
      ],
      caption: "Two pawns in the center give White lots of room.",
    },
  },
  {
    id: "castle-early",
    title: "Castle early",
    text: "Castling tucks your king behind its pawns and wakes up a rook in one move. Do it soon, before the middle of the board gets busy.",
    example: {
      fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
      highlights: [
        { square: "e1", kind: "good" },
        { square: "g1", kind: "good" },
        { square: "h1", kind: "good" },
      ],
      caption: "The path between king and rook is clear, so White can castle now.",
    },
  },
  {
    id: "two-threats",
    title: "Two threats at once win material",
    text: "The other side can only answer one threat at a time. A move that attacks two things together, called a fork or double attack, usually wins one of them.",
    example: {
      fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
      highlights: [
        { square: "e8", kind: "danger" },
        { square: "a8", kind: "danger" },
      ],
      arrows: [{ from: "b5", to: "c7", color: "green" }],
      caption: "Nc7 attacks the king and the rook together.",
    },
  },
  {
    id: "trade-when-ahead",
    title: "Trade when you're ahead",
    text: "Each even trade makes your lead bigger compared with what is left on the board. When you are up material, swap pieces. When you are behind, avoid it.",
    example: {
      fen: "8/8/4k3/3q4/8/8/3Q4/R3K3 w Q - 0 1",
      highlights: [
        { square: "d2", kind: "info" },
        { square: "d5", kind: "info" },
      ],
      arrows: [{ from: "d2", to: "d5", color: "green" }],
      caption: "White has an extra rook. Trading queens leaves Black with almost nothing.",
    },
  },
  {
    id: "best-reply",
    title: "Look for the opponent's best reply",
    text: "Before you play, imagine the strongest answer the other side could give, not the answer you hope for. If that answer hurts, pick another move.",
    example: {
      fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
      orientation: "black",
      arrows: [{ from: "d8", to: "h4", color: "green" }],
      caption: "White's last two moves left the king open. Black's best reply, Qh4, is checkmate.",
    },
  },
];

export const PRINCIPLE_IDS: readonly PrincipleId[] = PRINCIPLES.map((p) => p.id);

export const isPrincipleId = (value: string): value is PrincipleId => PRINCIPLE_IDS.includes(value as PrincipleId);

export const principleById = (id: string): Principle | undefined => PRINCIPLES.find((p) => p.id === id);

// ---- Tags: which principle each kind of thing belongs to. Plain data. ----

/** A saved mistake type, by the principle it breaks. */
export const MISTAKE_PRINCIPLE: Record<string, PrincipleId> = {
  hanging_piece: "keep-safe",
  missed_threat: "check-threats",
  bad_trade: "trade-when-ahead",
  blunder: "best-reply",
  mistake: "best-reply",
};

/** A coach event kind on one of my own moves that shows I followed a principle. */
export const FOLLOWED_EVENT_PRINCIPLE: Record<string, PrincipleId> = {
  double_attack: "two-threats",
  threat_created: "threat-is-a-question",
  "move_purpose:develop": "develop-first",
  "move_purpose:controlCenter": "control-center",
  "move_purpose:castle": "castle-early",
};

/** What the coach is talking about, for the chip on a comment. Covers the kinds above and a few more. */
export const COMMENT_EVENT_PRINCIPLE: Record<string, PrincipleId> = {
  ...FOLLOWED_EVENT_PRINCIPLE,
  hanging_piece: "keep-safe",
  missed_threat: "check-threats",
  opportunity: "dont-count-on-blunders",
  trade_sequence: "trade-when-ahead",
  capture_trade: "trade-when-ahead",
  move_quality: "best-reply",
};

/** A think-first question or gym drill kind, by the principle it trains. */
export const QUESTION_PRINCIPLE = {
  dangerPiece: "check-threats",
  safestMove: "keep-safe",
  spotThreat: "check-threats",
  isItSafe: "keep-safe",
  pickOfThree: "keep-safe",
  spotDoubleAttack: "two-threats",
} as const satisfies Record<string, PrincipleId>;

/** A plan (what the position needs most), by the principle it follows. */
export const PLAN_PRINCIPLE = {
  defend: "keep-safe",
  attack: "two-threats",
  center: "control-center",
  develop: "develop-first",
  castle: "castle-early",
} as const satisfies Record<string, PrincipleId>;

export const PRINCIPLES_TEXT = {
  navLabel: "Rules I've learned",
  pageTitle: "Rules I've learned",
  blurb:
    "Ten simple rules of thumb. Each one shows how often you followed it in your games and how often it slipped, taken from your own diary.",
  followed: (n: number) => (n === 1 ? "Followed 1 time" : `Followed ${n} times`),
  broken: (n: number) => (n === 1 ? "Slipped 1 time" : `Slipped ${n} times`),
  quiz: (correct: number, asked: number) => `Quick questions: ${correct} of ${asked} right`,
  practising: (title: string) => `Practising first: "${title}"`,
  noHistory: "Nothing yet. Play a game and this fills in.",
  practice: "Practice this rule",
  chipLabel: "Rule",
  reviewGroup: (title: string, count: number) =>
    count === 1 ? `You slipped on "${title}" once.` : `You slipped on "${title}" ${count} times.`,
  repeated: (title: string) => `This is the rule that slips most: "${title}".`,
} as const;
