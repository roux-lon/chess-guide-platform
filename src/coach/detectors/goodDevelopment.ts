import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import type { MoveContext } from "../types";

const HOME_SQUARES = {
  white: ["b1", "c1", "f1", "g1"],
  black: ["b8", "c8", "f8", "g8"],
} as const;

/** Early game: a knight or bishop stepped off its starting square. */
export function goodDevelopment(ctx: MoveContext): CoachEvent[] {
  const { move, ply, actor } = ctx;
  if (ply > COACH_CONFIG.earlyGameMaxPly) return [];
  if (move.piece !== "knight" && move.piece !== "bishop") return [];

  const home: readonly string[] = HOME_SQUARES[move.color];
  if (!home.includes(move.from) || home.includes(move.to)) return [];

  return [{ kind: "good_development", actor, piece: move.piece, from: move.from, to: move.to }];
}
