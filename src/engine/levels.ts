import type { BotLevel } from "./types";

export interface LevelPreset {
  level: BotLevel;
  /** Short name for the level picker. */
  label: string;
  /** One friendly line explaining who this level is for. */
  blurb: string;
  /** Stockfish "Skill Level" option, 0 (weakest) to 20 (full strength). */
  skill: number;
  /** Search depth limit (how many moves ahead it looks). */
  depth: number;
  /** Time limit per move in milliseconds. The search stops at depth or time, whichever comes first. */
  movetimeMs: number;
  /**
   * Chance (0 to 1) that the bot ignores its best move and plays one of its next-best
   * candidates instead. Only used on the weakest levels, so a beginner can win.
   */
  blunderChance: number;
  /** How many candidate lines to ask for. Needed for blunderChance; 1 otherwise. */
  multiPv: number;
}

/*
 * First guesses, to be tuned by playing.
 *
 * Skill Level makes Stockfish deliberately pick weaker moves, and a shallow depth
 * stops it seeing tactics. Together they are already weak, but a real beginner
 * still needs wins, so levels 1 and 2 also blunder on purpose some of the time.
 * Levels 3 to 5 are honest play with more thinking each step. Even level 5 is far
 * below what the engine can do; the cap is on purpose.
 */
export const LEVELS: Record<BotLevel, LevelPreset> = {
  1: {
    level: 1,
    label: "Level 1: Sleepy",
    blurb: "Very gentle. Makes lots of mistakes, perfect for your first games.",
    skill: 0,
    depth: 1,
    movetimeMs: 100,
    blunderChance: 0.4,
    multiPv: 4,
  },
  2: {
    level: 2,
    label: "Level 2: Beginner",
    blurb: "Still makes plenty of mistakes, but sometimes grabs a free piece.",
    skill: 3,
    depth: 2,
    movetimeMs: 150,
    blunderChance: 0.2,
    multiPv: 4,
  },
  3: {
    level: 3,
    label: "Level 3: Casual",
    blurb: "Plays sensible moves. Don't leave pieces hanging!",
    skill: 8,
    depth: 5,
    movetimeMs: 300,
    blunderChance: 0,
    multiPv: 1,
  },
  4: {
    level: 4,
    label: "Level 4: Club",
    blurb: "Spots most tricks. You will have to think.",
    skill: 14,
    depth: 8,
    movetimeMs: 500,
    blunderChance: 0,
    multiPv: 1,
  },
  5: {
    level: 5,
    label: "Level 5: Tough",
    blurb: "Plays carefully and punishes mistakes.",
    skill: 20,
    depth: 12,
    movetimeMs: 800,
    blunderChance: 0,
    multiPv: 1,
  },
};

export const BOT_LEVELS: BotLevel[] = [1, 2, 3, 4, 5];
export const DEFAULT_LEVEL: BotLevel = 1;
