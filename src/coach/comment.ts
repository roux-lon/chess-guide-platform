import type { CoachEvent } from "./events";
import type { EventNature, Who } from "./types";

/**
 * What the coach says about one move. One main idea: the headline is the most important
 * finding, `why` is what the move was for, `watch` is what to look at next (the opponent's
 * best reply or the main danger). Lesser findings wait in `more`, collapsed in the drawer.
 */
export interface CoachComment {
  /** Threat, chance, trade or tip: shown as a small label. */
  kind: EventNature;
  /** Whose turn it is after the move. */
  toMove: Who;
  headline: string;
  why: string;
  watch: string;
  more: string[];
  /** The facts the comment was built from. */
  events: CoachEvent[];
}

/** The comment as one piece of text, for the saved diary and the board's "latest comment". */
export function commentText({ headline, why, watch }: Pick<CoachComment, "headline" | "why" | "watch">): string {
  return [headline, why, watch].filter((part) => part.length > 0).join(" ");
}

/** A comment made from words alone, for a log entry restored from a saved game. */
export function commentFromText(text: string, toMove: Who): CoachComment {
  return { kind: "info", toMove, headline: text, why: "", watch: "", more: [], events: [] };
}
