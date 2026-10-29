import { createGame } from "@/rules";
import { mateToMoverPerspective, toMoverPerspective } from "@/lib/perspective";
import type { Side } from "@/lib/perspective";
import { COACH_CONFIG } from "../config";
import type { CoachEvent } from "../events";
import type { MoveContext, MoveEvaluation } from "../types";

/** Score for the mover in centipawns, clamped. Null if the evaluation says nothing usable. */
export function moverScore(evaluation: MoveEvaluation, mover: Side): number | null {
  const clamp = COACH_CONFIG.evalClampCp;
  if (evaluation.mateIn !== null) {
    const mate = mateToMoverPerspective(evaluation.mateIn, mover);
    if (mate === null || mate === 0) return null;
    return mate > 0 ? clamp : -clamp;
  }
  if (evaluation.cpWhite === null) return null;
  const cp = toMoverPerspective(evaluation.cpWhite, mover);
  return Math.max(-clamp, Math.min(clamp, cp));
}

/**
 * Compares the evaluation before and after the move, from the mover's perspective
 * (engine scores are in White's perspective, so they are converted first).
 * Praise is only given to the player; the bot is only noted when it slips.
 */
export function moveQuality(ctx: MoveContext): CoachEvent[] {
  const { move, actor, evalBefore, evalAfter } = ctx;
  if (!evalBefore || !evalAfter) return [];
  if (createGame(move.fenAfter).status().isGameOver) return [];

  const before = moverScore(evalBefore, move.color);
  const after = moverScore(evalAfter, move.color);
  if (before === null || after === null) return [];

  const lossCp = before - after;
  if (lossCp >= COACH_CONFIG.blunderLossCp) {
    return [{ kind: "move_quality", actor, quality: "blunder", lossCp }];
  }
  if (lossCp >= COACH_CONFIG.mistakeLossCp) {
    return [{ kind: "move_quality", actor, quality: "mistake", lossCp }];
  }
  if (lossCp <= COACH_CONFIG.goodMaxLossCp && actor === "you") {
    return [{ kind: "move_quality", actor, quality: "good", lossCp }];
  }
  return [];
}
