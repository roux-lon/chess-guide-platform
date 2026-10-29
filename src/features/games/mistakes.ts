import type { MistakeType } from "@/content";
import type { CoachEvent } from "@/coach";
import type { CoachLogEntry } from "@/features/coach";
import { pieceValue } from "@/rules";
import type { GameRecord, MistakeRecord } from "@/storage";

/** One of the player's moves that counts as a mistake, with how much it cost. */
export interface ClassifiedMistake {
  ply: number;
  type: MistakeType;
  lossCp: number;
}

/** Centipawns per point of piece value, used to guess the cost when the engine said nothing. */
const CP_PER_POINT = 100;

/**
 * Decides whether one comment from the coach log is a mistake by the player, and of which kind.
 * A move gets at most one type, the most specific one that applies:
 * hanging piece, then missed threat, then bad trade, then (from the engine's verdict) a big
 * slip or a weaker move. If the engine called the move good, the static findings are
 * overruled (for example a deliberate sacrifice), so nothing is counted.
 */
export function classifyMove(entry: CoachLogEntry): ClassifiedMistake | null {
  if (entry.side !== "you") return null;
  const events: readonly CoachEvent[] = entry.events;

  const quality = events.find((e) => e.kind === "move_quality" && e.actor === "you");
  const verdict = quality?.kind === "move_quality" ? quality : undefined;
  if (verdict?.quality === "good") return null;
  const engineLoss = verdict ? verdict.lossCp : undefined;

  const cost = (estimate: number) => Math.max(engineLoss ?? 0, estimate);

  const hung = events.find((e) => e.kind === "hanging_piece" && e.owner === "you" && e.actor === "you");
  if (hung?.kind === "hanging_piece") {
    return { ply: entry.ply, type: "hanging_piece", lossCp: cost(pieceValue(hung.piece.type) * CP_PER_POINT) };
  }

  const missed = events.find((e) => e.kind === "missed_threat");
  if (missed?.kind === "missed_threat") {
    return { ply: entry.ply, type: "missed_threat", lossCp: cost(pieceValue(missed.piece.type) * CP_PER_POINT) };
  }

  const trade = events.find((e) => e.kind === "capture_trade" && e.actor === "you" && e.verdict === "bad");
  if (trade?.kind === "capture_trade") {
    return { ply: entry.ply, type: "bad_trade", lossCp: cost(Math.abs(trade.netPoints) * CP_PER_POINT) };
  }

  if (verdict?.quality === "blunder") return { ply: entry.ply, type: "blunder", lossCp: verdict.lossCp };
  if (verdict?.quality === "mistake") return { ply: entry.ply, type: "mistake", lossCp: verdict.lossCp };
  return null;
}

/** Every mistake the player made in a game, in the order they happened. */
export function classifyGame(entries: readonly CoachLogEntry[]): ClassifiedMistake[] {
  return entries.flatMap((entry) => {
    const found = classifyMove(entry);
    return found ? [found] : [];
  });
}

export function toMistakeRecords(mistakes: readonly ClassifiedMistake[]): MistakeRecord[] {
  return mistakes.map(({ ply, type, lossCp }) => ({ ply, type, lossCp: Math.round(lossCp) }));
}

/**
 * Mistake totals per type across all saved games. The diary's `mistakeCounts` is recomputed
 * from this every time a game is saved, so saving the same game twice (leaving it, then
 * finishing it later) can never count its mistakes twice.
 */
export function countMistakes(games: readonly Pick<GameRecord, "mistakes">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const game of games) {
    for (const mistake of game.mistakes) counts[mistake.type] = (counts[mistake.type] ?? 0) + 1;
  }
  return counts;
}
