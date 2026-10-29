// How many experience points (XP) things are worth, and the words for them. First guesses.
// XP is a friendly "you did something" counter. It never goes down and never gates anything.

export const XP_RULES = {
  /** Finishing a lesson for the first time. Replaying a lesson earns nothing more. */
  lesson: 50,
  /** Playing a game all the way to the end (not resigning or leaving). */
  gameFinished: 30,
  /** Extra for winning, and a little extra for a draw. */
  win: 20,
  draw: 10,
} as const;

/** Every this many XP is a new level. */
export const XP_PER_LEVEL = 100;

export const REWARD_TEXT = {
  streakNone: "Learn or play today to start a streak.",
  streakDays: "{days}-day streak",
  streakBest: "Best: {best}",
  xp: "{xp} XP",
  level: "Level {level}",
  toNext: "{needed} XP to level {next}",
} as const;
