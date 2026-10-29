import type { Diary } from "./diary";

/**
 * Combines two diaries without losing anything, for bringing progress from one place into
 * another. `base` wins for settings.
 * - Lessons: the union, keeping the earlier completion date.
 * - Games: the union by game id.
 * - Mistake counts: the larger of the two, so importing the same history twice does not double it.
 */
export function mergeDiaries(base: Diary, incoming: Diary): Diary {
  const lessons = { ...base.lessons };
  for (const [id, record] of Object.entries(incoming.lessons)) {
    const existing = lessons[id];
    if (!existing || record.completedAt < existing.completedAt) lessons[id] = record;
  }

  const known = new Set(base.games.map((g) => g.id));
  const games = [...base.games, ...incoming.games.filter((g) => !known.has(g.id))].sort((a, b) =>
    a.playedAt.localeCompare(b.playedAt),
  );

  const mistakeCounts = { ...base.mistakeCounts };
  for (const [type, count] of Object.entries(incoming.mistakeCounts)) {
    mistakeCounts[type] = Math.max(mistakeCounts[type] ?? 0, count);
  }

  return {
    ...base,
    updatedAt: base.updatedAt > incoming.updatedAt ? base.updatedAt : incoming.updatedAt,
    lessons,
    games,
    mistakeCounts,
  };
}
