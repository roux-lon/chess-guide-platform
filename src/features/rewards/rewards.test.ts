import { describe, expect, it } from "vitest";
import { XP_PER_LEVEL, XP_RULES } from "@/content";
import { dayBefore, localDay } from "@/lib/date";
import { createEmptyDiary } from "@/storage";
import type { StreakRecord } from "@/storage";
import { addActivity, levelOf, liveStreak, rewardsSummary, xpForGame, xpForLesson } from "./rewards";

const streak = (current: number, best: number, lastDay: string | null): StreakRecord => ({ current, best, lastDay });

describe("dates", () => {
  it("names the local calendar day", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDay(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
    expect(localDay(new Date(2026, 8, 9, 12))).toBe("2026-09-09");
  });

  it("finds the day before, across month, year and leap boundaries", () => {
    expect(dayBefore("2026-03-09")).toBe("2026-03-08");
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2024-03-01")).toBe("2024-02-29");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
  });
});

describe("addActivity", () => {
  it("starts a streak at 1 on the first day", () => {
    expect(addActivity(streak(0, 0, null), "2026-03-09")).toEqual(streak(1, 1, "2026-03-09"));
  });

  it("does nothing the second time on the same day", () => {
    const today = streak(3, 3, "2026-03-09");
    expect(addActivity(today, "2026-03-09")).toBe(today);
  });

  it("grows on consecutive days", () => {
    let s = streak(0, 0, null);
    for (const day of ["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]) s = addActivity(s, day);
    expect(s).toEqual(streak(4, 4, "2026-03-02"));
  });

  it("starts again at 1 after a missed day, but remembers the best", () => {
    expect(addActivity(streak(5, 5, "2026-03-05"), "2026-03-07")).toEqual(streak(1, 5, "2026-03-07"));
  });

  it("raises the best when the current streak passes it", () => {
    expect(addActivity(streak(5, 5, "2026-03-05"), "2026-03-06")).toEqual(streak(6, 6, "2026-03-06"));
  });

  it("ignores a clock that moved backwards", () => {
    const s = streak(3, 3, "2026-03-09");
    expect(addActivity(s, "2026-03-01")).toBe(s);
  });

  it("works across a year boundary", () => {
    expect(addActivity(streak(2, 2, "2025-12-31"), "2026-01-01")).toEqual(streak(3, 3, "2026-01-01"));
  });
});

describe("liveStreak", () => {
  it("shows the streak through today and the day after the last activity", () => {
    expect(liveStreak(streak(4, 4, "2026-03-09"), "2026-03-09")).toBe(4);
    expect(liveStreak(streak(4, 4, "2026-03-08"), "2026-03-09")).toBe(4);
  });

  it("shows zero once a whole day was missed, or when there never was one", () => {
    expect(liveStreak(streak(4, 4, "2026-03-07"), "2026-03-09")).toBe(0);
    expect(liveStreak(streak(0, 0, null), "2026-03-09")).toBe(0);
  });
});

describe("XP", () => {
  it("pays for a finished game, a little more for a win or a draw, nothing for leaving", () => {
    expect(xpForGame("loss")).toBe(XP_RULES.gameFinished);
    expect(xpForGame("win")).toBe(XP_RULES.gameFinished + XP_RULES.win);
    expect(xpForGame("draw")).toBe(XP_RULES.gameFinished + XP_RULES.draw);
    expect(xpForGame("abandoned")).toBe(0);
    expect(xpForLesson()).toBe(XP_RULES.lesson);
  });

  it("makes a win worth more than a draw, and a draw more than a loss", () => {
    expect(xpForGame("win")).toBeGreaterThan(xpForGame("draw"));
    expect(xpForGame("draw")).toBeGreaterThan(xpForGame("loss"));
  });
});

describe("levelOf", () => {
  it("starts at level 1 and shows how far to the next", () => {
    expect(levelOf(0)).toEqual({ level: 1, xpIntoLevel: 0, xpToNext: XP_PER_LEVEL, fraction: 0 });
    const info = levelOf(XP_PER_LEVEL + 25);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(25);
    expect(info.xpToNext).toBe(XP_PER_LEVEL - 25);
    expect(info.fraction).toBeCloseTo(0.25);
  });

  it("moves up exactly at the boundary, and copes with odd input", () => {
    expect(levelOf(XP_PER_LEVEL - 1).level).toBe(1);
    expect(levelOf(XP_PER_LEVEL).level).toBe(2);
    expect(levelOf(-40).level).toBe(1);
    expect(levelOf(12.9).xpIntoLevel).toBe(12);
  });
});

describe("rewardsSummary", () => {
  const now = new Date(2026, 2, 9, 15);

  it("is quiet for a new diary", () => {
    expect(rewardsSummary(createEmptyDiary(now), now)).toMatchObject({ xp: 0, streak: 0, doneToday: false });
  });

  it("shows a live streak, and whether today is already done", () => {
    const diary = { xp: 130, streak: streak(3, 8, "2026-03-09") };
    expect(rewardsSummary(diary, now)).toMatchObject({ xp: 130, streak: 3, bestStreak: 8, doneToday: true });
    expect(rewardsSummary(diary, now).level.level).toBe(2);

    const yesterday = { xp: 10, streak: streak(3, 8, "2026-03-08") };
    expect(rewardsSummary(yesterday, now)).toMatchObject({ streak: 3, doneToday: false });
  });

  it("shows a lapsed streak as zero but keeps the best", () => {
    expect(rewardsSummary({ xp: 10, streak: streak(3, 8, "2026-03-01") }, now)).toMatchObject({
      streak: 0,
      bestStreak: 8,
    });
  });
});
