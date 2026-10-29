import { runDetectors } from "./detectors";
import type { CoachEvent } from "./events";
import { movePlayed } from "./movePlayed";
import type { MoveContext } from "./types";

/** All events for one move: the lead "move played" event first, then whatever the detectors found. */
export function analyzeMoveEvents(ctx: MoveContext): CoachEvent[] {
  return [movePlayed(ctx), ...runDetectors(ctx)];
}

/**
 * Events that should offer the player a take-back: they left a piece hanging, or the engine
 * called their move a blunder. Returns the reason, or null if no offer is warranted.
 */
export function takeBackReason(events: CoachEvent[]): "hanging" | "blunder" | null {
  const hung = events.some(
    (e) => e.kind === "hanging_piece" && e.owner === "you" && e.actor === "you",
  );
  if (hung) return "hanging";
  const blundered = events.some(
    (e) => e.kind === "move_quality" && e.actor === "you" && e.quality === "blunder",
  );
  return blundered ? "blunder" : null;
}
