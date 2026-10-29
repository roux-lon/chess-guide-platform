// Helpers for tests in this folder.
import type { GameRecord } from "@/storage";

let counter = 0;

/** A finished game with sensible defaults. Games made later get later dates unless set. */
export function game(overrides: Partial<GameRecord> = {}): GameRecord {
  counter++;
  const day = String(((counter - 1) % 28) + 1).padStart(2, "0");
  return {
    id: `game-${counter}`,
    playedAt: `2026-03-${day}T10:00:00.000Z`,
    result: "win",
    playerColor: "white",
    botLevel: 1,
    coachingMode: "quiet",
    pgn: "",
    coachLog: [],
    mistakes: [],
    ...overrides,
  };
}

/** A game whose mistakes have the given types, one per move. */
export function gameWithMistakes(types: string[], overrides: Partial<GameRecord> = {}): GameRecord {
  return game({ mistakes: types.map((type, i) => ({ ply: 2 * i + 1, type })), ...overrides });
}

/** A series of games with increasing dates, in order. */
export function inOrder(games: GameRecord[]): GameRecord[] {
  return games.map((g, i) => ({ ...g, playedAt: `2026-03-${String(i + 1).padStart(2, "0")}T10:00:00.000Z` }));
}
