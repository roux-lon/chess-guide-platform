import { mistakeLabel } from "@/content";
import { createGameFromSan, parsePgnMoves } from "@/rules";
import type { GameRecord } from "@/storage";
import type { Principle } from "@/content";
import { brokenInGame, principleOfMistake } from "@/features/principles/principles";

export interface ReviewMistake {
  /** Half-move number in the game. */
  ply: number;
  /** Move number as players count it: 1 for the first move of each side. */
  moveNumber: number;
  type: string;
  label: string;
  /** What the move cost, in centipawns. */
  lossCp: number;
  /** The move that was played, in standard notation. */
  san: string;
  from: string;
  to: string;
  /** The position just before the mistake, to look at or to play again from. */
  fenBefore: string;
  /** What the coach said about the move at the time. */
  text: string;
  /** The rule of thumb this mistake broke, if it maps to one. */
  principleId?: string;
}

export interface Review {
  record: GameRecord;
  /** The biggest mistakes, biggest first. */
  mistakes: ReviewMistake[];
  /** How many mistakes the game had in all. */
  totalMistakes: number;
  /** How many moves the player made. */
  playerMoves: number;
  /** All of the player's mistakes grouped by the rule of thumb they broke, most first. */
  byPrinciple: { principle: Principle; count: number }[];
}

/** Used for ordering when a mistake was saved without a cost. */
const DEFAULT_LOSS_CP = 300;

/**
 * Looks back at a saved game: its biggest mistakes, each with the position before it (replayed
 * from the PGN) and the coach's words from that moment. Only the player's own moves count.
 */
export function buildReview(record: GameRecord, limit = 3): Review {
  const sanMoves = parsePgnMoves(record.pgn) ?? [];
  const history = createGameFromSan(sanMoves)?.history() ?? [];

  const mistakes: ReviewMistake[] = [];
  for (const mistake of record.mistakes) {
    const move = history[mistake.ply - 1];
    if (!move || move.color !== record.playerColor) continue;
    mistakes.push({
      ply: mistake.ply,
      moveNumber: Math.ceil(mistake.ply / 2),
      type: mistake.type,
      label: mistakeLabel(mistake.type),
      lossCp: mistake.lossCp ?? DEFAULT_LOSS_CP,
      san: move.san,
      from: move.from,
      to: move.to,
      fenBefore: move.fenBefore,
      text: record.coachLog.find((entry) => entry.ply === mistake.ply)?.text ?? "",
      ...(principleOfMistake(mistake.type) ? { principleId: principleOfMistake(mistake.type) } : {}),
    });
  }

  mistakes.sort((a, b) => b.lossCp - a.lossCp || a.ply - b.ply);
  return {
    record,
    mistakes: mistakes.slice(0, limit),
    totalMistakes: mistakes.length,
    playerMoves: history.filter((m) => m.color === record.playerColor).length,
    byPrinciple: brokenInGame(mistakes),
  };
}
