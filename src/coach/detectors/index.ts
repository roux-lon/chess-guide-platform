import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";
import { captureTrade } from "./captureTrade";
import { checkGiven } from "./checkGiven";
import { doubleAttack } from "./doubleAttack";
import { gameOver } from "./gameOver";
import { hangingPiece } from "./hangingPiece";
import { inCheckWarning } from "./inCheckWarning";
import { missedThreat } from "./missedThreat";
import { moveQuality } from "./moveQuality";
import { movePurpose } from "./movePurpose";
import { opportunity } from "./opportunity";
import { responseToThreat } from "./responseToThreat";
import { threatCreated } from "./threatCreated";
import { tradeSequence } from "./tradeSequence";

export type Detector = (ctx: MoveContext) => CoachEvent[];

export const DETECTORS: Detector[] = [
  gameOver,
  checkGiven,
  inCheckWarning,
  hangingPiece,
  missedThreat,
  tradeSequence,
  captureTrade,
  doubleAttack,
  threatCreated,
  opportunity,
  responseToThreat,
  moveQuality,
  movePurpose,
];

/** Runs every detector. The narrator decides which events are worth saying. */
export function runDetectors(ctx: MoveContext): CoachEvent[] {
  return DETECTORS.flatMap((detect) => detect(ctx));
}

export {
  captureTrade,
  checkGiven,
  doubleAttack,
  gameOver,
  hangingPiece,
  inCheckWarning,
  missedThreat,
  movePurpose,
  moveQuality,
  opportunity,
  responseToThreat,
  threatCreated,
  tradeSequence,
};
export { classifyPurpose } from "./movePurpose";
