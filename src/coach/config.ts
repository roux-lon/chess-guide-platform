// Tunable numbers for the coach. First guesses: adjust by playing.

/**
 * How important each finding is when a move has several. The highest becomes the headline;
 * the rest go under "more". Keys come from `describeEvent` in narrate.ts.
 */
export const EVENT_PRIORITY = {
  game_over: 100,
  in_check_warning: 95,
  hanging_piece: 92,
  missed_threat: 90,
  double_attack: 96,
  threat_created: 86,
  opportunity: 85,
  trade_sequence: 80,
  move_quality_bad: 78,
  capture_trade_bad: 75,
  capture_trade: 70,
  check_given: 65,
  response_to_threat: 60,
  move_quality_bot_bad: 50,
  move_quality_good: 40,
  move_purpose: 30,
} as const;

export type PriorityKey = keyof typeof EVENT_PRIORITY;

export const COACH_CONFIG = {
  /** Evaluation loss (centipawns, mover's perspective) that counts as a mistake. 150 = about 1.5 pawns. */
  mistakeLossCp: 150,
  /** Loss that counts as a blunder. 300 = about a minor piece. */
  blunderLossCp: 300,
  /** A move that loses at most this much is called good. */
  goodMaxLossCp: 25,
  /**
   * Scores are clamped to this before comparing, so "still winning, just less so"
   * is not called a mistake. Mates count as the clamp value.
   */
  evalClampCp: 800,
  /** Center-control advice only applies up to this ply. 20 = ten moves each. */
  earlyGameMaxPly: 20,
  /** Most pieces reported as hanging after one move. */
  maxHangingPerMove: 2,
  /** Most targets listed in one threat. */
  maxThreatTargets: 2,
  /** Most extra findings listed under "more". */
  maxMoreItems: 3,
  /** A take-back is only offered for a piece worth at least this many points (3 = a knight or bishop). */
  takeBackMinPoints: 3,
  /** How hard the analysis engine thinks about each position. Lower is faster. */
  analysisSearch: { depth: 10, movetimeMs: 600 },
  /** Hint tiers, in the order they are revealed. */
  hintTierCount: 3,
} as const;

/** The titles of the three hint tiers, in order. */
export const HINT_TITLES = ["Safety check", "Plan check", "Best move"] as const;

/** The four middle squares of the board. */
export const CENTER_SQUARES = ["d4", "e4", "d5", "e5"] as const;
