import { pieceValue } from "@/rules";
import { COACH_CONFIG } from "./config";
import { runDetectors } from "./detectors";
import type { CoachEvent } from "./events";
import { movePlayed } from "./movePlayed";
import type { MoveContext } from "./types";

/** All events for one move: the "move played" event first, then whatever the detectors found. */
export function analyzeMoveEvents(ctx: MoveContext): CoachEvent[] {
  return [movePlayed(ctx), ...runDetectors(ctx)];
}

/**
 * Events that should offer the player a take-back: they put a real piece (a knight or more)
 * where it can be won, or the engine called their move a blunder. Returns the reason, or
 * null if no offer is warranted. Small things, such as a loose pawn, are not worth an offer.
 */
export function takeBackReason(events: CoachEvent[]): "hanging" | "blunder" | null {
  const min = COACH_CONFIG.takeBackMinPoints;
  const hung = events.some(
    (e) =>
      (e.kind === "hanging_piece" && e.actor === "you" && pieceValue(e.piece.type) >= min && e.gain >= min) ||
      (e.kind === "missed_threat" && pieceValue(e.piece.type) >= min && e.gain >= min),
  );
  if (hung) return "hanging";
  const blundered = events.some(
    (e) => e.kind === "move_quality" && e.actor === "you" && e.quality === "blunder",
  );
  return blundered ? "blunder" : null;
}
