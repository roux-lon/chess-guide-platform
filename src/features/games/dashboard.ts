import { mistakeLabel } from "@/content";
import type { Stage } from "@/content";
import { principleById } from "@/content";
import { principleOfMistake } from "@/features/principles/principles";
import type { Diary } from "@/storage";
import { milestone } from "./milestone";
import type { Milestone } from "./milestone";
import { repeatedMistake, suggestLesson, suggestLevel } from "./recommend";
import type { LessonSuggestion, LevelSuggestion } from "./recommend";

export interface MistakeBar {
  type: string;
  label: string;
  count: number;
  /** 0 to 1, relative to the biggest bar, for drawing. */
  share: number;
}

export interface GameMistakes {
  id: string;
  playedAt: string;
  result: "win" | "loss" | "draw";
  botLevel: number;
  count: number;
}

export interface Dashboard {
  lessons: { done: number; total: number };
  games: { finished: number; wins: number; losses: number; draws: number; abandoned: number };
  mistakes: {
    total: number;
    /** Most frequent first. */
    byType: MistakeBar[];
    /** Mistakes in each of the latest finished games, oldest first, to show a trend. */
    recentGames: GameMistakes[];
    /** The mistake that keeps coming back, if one does. */
    repeated: { type: string; label: string; count: number; principle?: { id: string; title: string } } | null;
  };
  lessonSuggestion: LessonSuggestion | null;
  levelSuggestion: LevelSuggestion | null;
  milestone: Milestone;
  /** An unfinished game is waiting to be continued. */
  hasUnfinishedGame: boolean;
}

function repeatedPrinciple(type: string): { principle?: { id: string; title: string } } {
  const principle = principleById(principleOfMistake(type) ?? "");
  return principle ? { principle: { id: principle.id, title: principle.title } } : {};
}

/** How many recent games the trend shows. */
export const TREND_GAMES = 10;

/** Turns the diary into the numbers the progress page shows. Pure: no React, no storage. */
export function buildDashboard(
  diary: Diary,
  lessons: readonly { id: string; title: string; stage: Stage }[],
): Dashboard {
  const finishedGames = diary.games
    .filter((g): g is typeof g & { result: "win" | "loss" | "draw" } => g.result !== "abandoned")
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  const counts = Object.entries(diary.mistakeCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const biggest = counts[0]?.[1] ?? 0;
  const byType: MistakeBar[] = counts.map(([type, count]) => ({
    type,
    label: mistakeLabel(type),
    count,
    share: biggest > 0 ? count / biggest : 0,
  }));

  const repeated = repeatedMistake(diary.games);

  return {
    lessons: {
      done: lessons.filter((l) => diary.lessons[l.id]?.status === "done").length,
      total: lessons.length,
    },
    games: {
      finished: finishedGames.length,
      wins: finishedGames.filter((g) => g.result === "win").length,
      losses: finishedGames.filter((g) => g.result === "loss").length,
      draws: finishedGames.filter((g) => g.result === "draw").length,
      abandoned: diary.games.length - finishedGames.length,
    },
    mistakes: {
      total: counts.reduce((sum, [, n]) => sum + n, 0),
      byType,
      recentGames: finishedGames.slice(-TREND_GAMES).map((g) => ({
        id: g.id,
        playedAt: g.playedAt,
        result: g.result,
        botLevel: g.botLevel,
        count: g.mistakes.length,
      })),
      repeated: repeated
        ? {
            type: repeated.type,
            label: mistakeLabel(repeated.type),
            count: repeated.count,
            ...repeatedPrinciple(repeated.type),
          }
        : null,
    },
    lessonSuggestion: suggestLesson(diary.games, lessons),
    levelSuggestion: suggestLevel(diary.games),
    milestone: milestone(diary, lessons),
    hasUnfinishedGame: diary.activeGame !== undefined,
  };
}
