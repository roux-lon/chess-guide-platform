import type { CoachEvent, Who } from "@/coach";

/** One line of the coach log: a comment on one half-move, the player's or the bot's. */
export interface CoachLogEntry {
  /** 1-based half-move number: ply 1 is White's first move. */
  ply: number;
  moveSan: string;
  side: Who;
  events: CoachEvent[];
  text: string;
  /** Set when the player's move deserves a take-back offer. */
  warning?: "hanging" | "blunder";
}
