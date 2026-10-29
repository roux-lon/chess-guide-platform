// What each kind of mistake is called, a kind explanation, and which lesson helps with it.
// The ids in `lessonId` are checked against the real lessons by a test.

export type MistakeType = "hanging_piece" | "missed_threat" | "bad_trade" | "blunder" | "mistake";

export interface MistakeInfo {
  label: string;
  /** One kind sentence about what happened. */
  explanation: string;
  /** The lesson to revisit. */
  lessonId: string;
}

export const MISTAKE_TYPES: Record<MistakeType, MistakeInfo> = {
  hanging_piece: {
    label: "Leaving a piece hanging",
    explanation: "A piece was left where it could be captured for free.",
    lessonId: "dont-hang-pieces",
  },
  missed_threat: {
    label: "Missing a threat",
    explanation: "The bot was attacking one of your pieces and the move did not deal with it.",
    lessonId: "whats-the-threat",
  },
  bad_trade: {
    label: "A trade that cost you",
    explanation: "You captured something but lost more than you won.",
    lessonId: "trading-fairly",
  },
  blunder: {
    label: "A big slip",
    explanation: "A move that threw away a lot of the advantage.",
    lessonId: "whats-the-threat",
  },
  mistake: {
    label: "A weaker move",
    explanation: "A move that gave the bot a better position.",
    lessonId: "whats-the-threat",
  },
};

export const MISTAKE_TYPE_IDS = Object.keys(MISTAKE_TYPES) as MistakeType[];

export const isMistakeType = (value: string): value is MistakeType => value in MISTAKE_TYPES;

/** A readable name for any type, including ones an older or hand-made diary may contain. */
export function mistakeLabel(type: string): string {
  if (isMistakeType(type)) return MISTAKE_TYPES[type].label;
  const words = type.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Unknown";
}
