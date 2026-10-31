import { createGameFromSan, parsePgnMoves } from "@/rules";
import type { GameRecord, MistakePosition } from "@/storage";

/**
 * The position just before each mistake in a saved game, so the gym can ask about it later.
 * The mistakes list holds half-move numbers; the moves come from replaying the game's PGN.
 * A mistake whose move cannot be found, or that was not the person's own move, is skipped.
 */
export function positionsFromGame(record: GameRecord): MistakePosition[] {
  if (record.mistakes.length === 0) return [];
  const sanMoves = parsePgnMoves(record.pgn);
  if (!sanMoves) return [];
  const history = createGameFromSan(sanMoves)?.history() ?? [];

  const seen = new Set<number>();
  const positions: MistakePosition[] = [];
  for (const mistake of record.mistakes) {
    const move = history[mistake.ply - 1];
    if (!move || move.color !== record.playerColor || seen.has(mistake.ply)) continue;
    seen.add(mistake.ply);
    positions.push({
      id: `${record.id}:${mistake.ply}`,
      gameId: record.id,
      ply: mistake.ply,
      playedAt: record.playedAt,
      fen: move.fenBefore,
      move: { from: move.from, to: move.to },
      type: mistake.type,
    });
  }
  return positions;
}
