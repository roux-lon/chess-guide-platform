import { MISTAKE_TYPES, SUGGESTION_TEXT, isMistakeType } from "@/content";
import type { MistakeType } from "@/content";
import { fillTemplate } from "@/lib/template";
import type { GameRecord } from "@/storage";

/** How many of the latest games decide what you are working on right now. */
export const RECENT_GAMES = 5;
/** A mistake only counts as "repeated" once it has happened this many times. */
export const REPEAT_AT = 2;
/** How many wins (or losses) in a row make a level suggestion. */
export const STREAK = 3;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

const byDate = (a: GameRecord, b: GameRecord) => a.playedAt.localeCompare(b.playedAt);

export interface RepeatedMistake {
  type: MistakeType;
  count: number;
}

function topRepeated(games: readonly GameRecord[]): RepeatedMistake | null {
  const counts = new Map<MistakeType, { count: number; lastGame: number }>();
  games.forEach((game, index) => {
    for (const { type } of game.mistakes) {
      if (!isMistakeType(type)) continue;
      const seen = counts.get(type) ?? { count: 0, lastGame: -1 };
      counts.set(type, { count: seen.count + 1, lastGame: index });
    }
  });

  let best: (RepeatedMistake & { lastGame: number }) | null = null;
  for (const [type, { count, lastGame }] of counts) {
    if (count < REPEAT_AT) continue;
    // The biggest count wins; on a tie, the one that happened most recently.
    if (!best || count > best.count || (count === best.count && lastGame > best.lastGame)) {
      best = { type, count, lastGame };
    }
  }
  return best ? { type: best.type, count: best.count } : null;
}

/**
 * The mistake you keep repeating. It looks at your most recent games first, so the answer
 * changes as your habits change; if nothing repeats there, it looks at every game.
 */
export function repeatedMistake(games: readonly GameRecord[]): RepeatedMistake | null {
  const ordered = [...games].sort(byDate);
  return topRepeated(ordered.slice(-RECENT_GAMES)) ?? topRepeated(ordered);
}

export interface LessonSuggestion {
  lessonId: string;
  type: MistakeType;
  count: number;
  /** A kind sentence to show. */
  message: string;
}

/** A lesson to revisit for the mistake you repeat, or null if nothing repeats. A suggestion only. */
export function suggestLesson(
  games: readonly GameRecord[],
  lessons: readonly { id: string; title: string }[],
): LessonSuggestion | null {
  const top = repeatedMistake(games);
  if (!top) return null;
  const info = MISTAKE_TYPES[top.type];
  const lesson = lessons.find((l) => l.id === info.lessonId);
  if (!lesson) return null;
  return {
    lessonId: lesson.id,
    type: top.type,
    count: top.count,
    message: fillTemplate(SUGGESTION_TEXT.lesson, {
      count: String(top.count),
      times: top.count === 1 ? "time" : "times",
      mistake: info.label.toLowerCase(),
      lesson: lesson.title,
    }),
  };
}

export interface LevelSuggestion {
  kind: "raise" | "lower";
  from: number;
  to: number;
  message: string;
}

const isFinished = (game: GameRecord) => game.result !== "abandoned";

/**
 * After a streak of wins at a level, suggest the next one up; after a streak of losses,
 * one down. Only finished games count, and only the games at the level you played last.
 * You stay in control: this is only ever a suggestion.
 */
export function suggestLevel(games: readonly GameRecord[]): LevelSuggestion | null {
  const finished = games.filter(isFinished).sort(byDate);
  const last = finished[finished.length - 1];
  if (!last) return null;

  const level = last.botLevel;
  const streak: GameRecord[] = [];
  for (let i = finished.length - 1; i >= 0 && finished[i].botLevel === level; i--) {
    streak.push(finished[i]);
  }
  const recent = streak.slice(0, STREAK);
  if (recent.length < STREAK) return null;

  if (recent.every((g) => g.result === "win") && level < MAX_LEVEL) {
    return {
      kind: "raise",
      from: level,
      to: level + 1,
      message: fillTemplate(SUGGESTION_TEXT.raiseLevel, {
        streak: String(STREAK),
        from: String(level),
        to: String(level + 1),
      }),
    };
  }
  if (recent.every((g) => g.result === "loss") && level > MIN_LEVEL) {
    return {
      kind: "lower",
      from: level,
      to: level - 1,
      message: fillTemplate(SUGGESTION_TEXT.lowerLevel, {
        streak: String(STREAK),
        from: String(level),
        to: String(level - 1),
      }),
    };
  }
  return null;
}
