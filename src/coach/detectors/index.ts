import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";
import { captureTrade } from "./captureTrade";
import { centerControl } from "./centerControl";
import { checkGiven } from "./checkGiven";
import { gameOver } from "./gameOver";
import { goodDevelopment } from "./goodDevelopment";
import { hangingPiece } from "./hangingPiece";
import { inCheckWarning } from "./inCheckWarning";
import { moveQuality } from "./moveQuality";
import { threatFromOpponent } from "./threatFromOpponent";

export type Detector = (ctx: MoveContext) => CoachEvent[];

export const DETECTORS: Detector[] = [
  gameOver,
  checkGiven,
  inCheckWarning,
  hangingPiece,
  captureTrade,
  threatFromOpponent,
  moveQuality,
  goodDevelopment,
  centerControl,
];

/** Runs every detector. The narrator decides which events are worth saying. */
export function runDetectors(ctx: MoveContext): CoachEvent[] {
  return DETECTORS.flatMap((detect) => detect(ctx));
}

export {
  captureTrade,
  centerControl,
  checkGiven,
  gameOver,
  goodDevelopment,
  hangingPiece,
  inCheckWarning,
  moveQuality,
  threatFromOpponent,
};
