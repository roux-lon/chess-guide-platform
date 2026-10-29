// Tunable numbers for the coach. First guesses: adjust by playing.

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
  /** Opening-advice detectors (development, center) only fire up to this ply. 20 = ten moves each. */
  earlyGameMaxPly: 20,
  /** Most hanging pieces reported for one move. */
  maxHangingPerMove: 2,
  /** Most targets listed in one threat. */
  maxThreatTargets: 2,
  /** Sentences added after the lead sentence of a comment. */
  maxExtraSentences: 2,
  /** How hard the analysis engine thinks about each position. Lower is faster. */
  analysisSearch: { depth: 10, movetimeMs: 600 },
  /** Hint tiers, in the order they are revealed. */
  hintTierCount: 3,
} as const;

/** The four middle squares of the board. */
export const CENTER_SQUARES = ["d4", "e4", "d5", "e5"] as const;
