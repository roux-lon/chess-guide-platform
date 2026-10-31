import { MAX_MISTAKE_POSITIONS } from "./diary";
import type { AnswerCounts, Diary } from "./diary";

function largerCounts(a: Record<string, AnswerCounts>, b: Record<string, AnswerCounts>): Record<string, AnswerCounts> {
  const result = { ...a };
  for (const [key, counts] of Object.entries(b)) {
    const known = result[key];
    result[key] = !known || counts.asked > known.asked ? counts : known;
  }
  return result;
}

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

  const activeGame = base.activeGame ?? incoming.activeGame;

  // Rewards: keep the larger XP, and the streak that was active more recently.
  const newer = (incoming.streak.lastDay ?? "") > (base.streak.lastDay ?? "") ? incoming.streak : base.streak;
  const streak = { ...newer, best: Math.max(base.streak.best, incoming.streak.best, newer.current) };
  // Opening practice: the union, keyed by when it ended and which side was played.
  const seen = new Set(base.playbook.completions.map((c) => `${c.playedAt}|${c.color}`));
  const completions = [
    ...base.playbook.completions,
    ...incoming.playbook.completions.filter((c) => !seen.has(`${c.playedAt}|${c.color}`)),
  ].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  // Thinking Gym: positions are the union by id (newest 40 kept); counts take the larger value
  // per key, so importing the same history twice does not double it.
  const knownPositions = new Set(base.gym.positions.map((p) => p.id));
  const positions = [...base.gym.positions, ...incoming.gym.positions.filter((p) => !knownPositions.has(p.id))]
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.ply - b.ply)
    .slice(-MAX_MISTAKE_POSITIONS);
  return {
    ...base,
    playbook: { completions },
    gym: { positions, stats: largerCounts(base.gym.stats, incoming.gym.stats) },
    thinking: {
      byQuestion: largerCounts(base.thinking.byQuestion, incoming.thinking.byQuestion),
      byPrinciple: largerCounts(base.thinking.byPrinciple, incoming.thinking.byPrinciple),
    },
    ...(activeGame ? { activeGame } : {}),
    updatedAt: base.updatedAt > incoming.updatedAt ? base.updatedAt : incoming.updatedAt,
    lessons,
    games,
    mistakeCounts,
    xp: Math.max(base.xp, incoming.xp),
    streak,
  };
}
