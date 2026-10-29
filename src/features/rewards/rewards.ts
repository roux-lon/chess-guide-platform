import { XP_PER_LEVEL, XP_RULES } from "@/content";
import { dayBefore, localDay } from "@/lib/date";
import type { Diary, GameResult, StreakRecord } from "@/storage";

/** The streak after something was learned or played on `today` (a YYYY-MM-DD day). */
export function addActivity(streak: StreakRecord, today: string): StreakRecord {
  // The clock moved backwards, or it is the same day: nothing changes.
  if (streak.lastDay !== null && streak.lastDay >= today) return streak;

  const continues = streak.lastDay === dayBefore(today);
  const current = continues ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}

/**
 * The streak to show right now. A streak survives until the end of the day after the last
 * activity; after that it has lapsed and shows as zero until the next activity.
 */
export function liveStreak(streak: StreakRecord, today: string): number {
  if (streak.lastDay === null) return 0;
  return streak.lastDay === today || streak.lastDay === dayBefore(today) ? streak.current : 0;
}

/** XP for a game that has just been saved. Unfinished games earn nothing. */
export function xpForGame(result: GameResult): number {
  switch (result) {
    case "win":
      return XP_RULES.gameFinished + XP_RULES.win;
    case "draw":
      return XP_RULES.gameFinished + XP_RULES.draw;
    case "loss":
      return XP_RULES.gameFinished;
    case "abandoned":
      return 0;
  }
}

export const xpForLesson = (): number => XP_RULES.lesson;

export interface LevelInfo {
  /** 1 to start with. */
  level: number;
  /** XP earned since this level began. */
  xpIntoLevel: number;
  /** XP still needed for the next level. */
  xpToNext: number;
  /** 0 to 1, how far through this level. */
  fraction: number;
}

export function levelOf(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp));
  const xpIntoLevel = safe % XP_PER_LEVEL;
  return {
    level: Math.floor(safe / XP_PER_LEVEL) + 1,
    xpIntoLevel,
    xpToNext: XP_PER_LEVEL - xpIntoLevel,
    fraction: xpIntoLevel / XP_PER_LEVEL,
  };
}

export interface RewardsSummary {
  xp: number;
  level: LevelInfo;
  /** Days in a row, as of today. */
  streak: number;
  bestStreak: number;
  /** Something has already been done today, so the streak is safe for now. */
  doneToday: boolean;
}

/** What the home screen shows about XP and the streak. */
export function rewardsSummary(diary: Pick<Diary, "xp" | "streak">, now: Date): RewardsSummary {
  const today = localDay(now);
  return {
    xp: diary.xp,
    level: levelOf(diary.xp),
    streak: liveStreak(diary.streak, today),
    bestStreak: Math.max(diary.streak.best, liveStreak(diary.streak, today)),
    doneToday: diary.streak.lastDay === today,
  };
}
