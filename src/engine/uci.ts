import type { EngineMove } from "./types";

/** One parsed `info` line. Scores are from the side to move's perspective, as UCI sends them. */
export interface UciInfo {
  depth?: number;
  /** Candidate line number, 1 = best. Defaults to 1 when MultiPV is off. */
  multipv: number;
  scoreCp?: number;
  /** Moves until mate for the side to move; negative if the side to move gets mated. */
  scoreMate?: number;
  /** Moves in UCI form, e.g. ["e2e4", "e7e5"]. */
  pv: string[];
}

const PROMOTIONS = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
} as const;

const PROMOTION_LETTERS = {
  queen: "q",
  rook: "r",
  bishop: "b",
  knight: "n",
} as const;

const SQUARE = /^[a-h][1-8]$/;

/** "e7e8q" -> { from: "e7", to: "e8", promotion: "queen" }. Null if not a move (e.g. "(none)"). */
export function uciToMove(uci: string): EngineMove | null {
  if (uci.length < 4 || uci.length > 5) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  if (!SQUARE.test(from) || !SQUARE.test(to)) return null;
  if (uci.length === 4) return { from, to };
  const promotion = PROMOTIONS[uci[4] as keyof typeof PROMOTIONS];
  return promotion ? { from, to, promotion } : null;
}

export function moveToUci(move: EngineMove): string {
  return `${move.from}${move.to}${move.promotion ? PROMOTION_LETTERS[move.promotion] : ""}`;
}

/** Parses `info ...` lines. Returns null for lines with no score and no principal variation. */
export function parseInfo(line: string): UciInfo | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "info") return null;

  const info: UciInfo = { multipv: 1, pv: [] };
  let sawUseful = false;

  for (let i = 1; i < tokens.length; i++) {
    switch (tokens[i]) {
      case "depth":
        info.depth = Number(tokens[++i]);
        break;
      case "multipv":
        info.multipv = Number(tokens[++i]);
        break;
      case "score": {
        const kind = tokens[++i];
        const value = Number(tokens[++i]);
        if (Number.isNaN(value)) break;
        if (kind === "cp") info.scoreCp = value;
        else if (kind === "mate") info.scoreMate = value;
        sawUseful = true;
        // A bound marker may follow; it is not part of the exact score.
        if (tokens[i + 1] === "lowerbound" || tokens[i + 1] === "upperbound") i++;
        break;
      }
      case "pv":
        info.pv = tokens.slice(i + 1);
        sawUseful = true;
        i = tokens.length;
        break;
    }
  }
  return sawUseful ? info : null;
}

export interface BestMoveLine {
  /** Null when the engine has no move ("bestmove (none)"). */
  move: EngineMove | null;
}

/** Parses `bestmove e2e4 ponder e7e5`. Returns null if the line is not a bestmove line. */
export function parseBestMove(line: string): BestMoveLine | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "bestmove" || tokens.length < 2) return null;
  return { move: uciToMove(tokens[1]) };
}
