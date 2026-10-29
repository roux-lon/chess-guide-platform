import { describe, expect, it } from "vitest";
import type { Stage } from "@/content";
import { createEmptyDiary } from "@/storage";
import type { Diary } from "@/storage";
import { milestone } from "./milestone";
import { game } from "./testHelpers";

const LESSONS: { id: string; stage: Stage }[] = [
  { id: "a1", stage: 1 },
  { id: "a2", stage: 1 },
  { id: "b1", stage: 2 },
  { id: "c1", stage: 3 },
];

function diaryWith(lessonIds: string[], games = [] as Diary["games"]): Diary {
  const diary = createEmptyDiary();
  for (const id of lessonIds) diary.lessons[id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
  diary.games = games;
  return diary;
}

const ALL = LESSONS.map((l) => l.id);
const ownGame = game({ botLevel: 2, coachingMode: "off", result: "loss" });

describe("milestone", () => {
  it("starts with everything still to do, and says so honestly", () => {
    const m = milestone(createEmptyDiary(), LESSONS);
    expect(m.ready).toBe(false);
    expect(m.remaining).toBe(4);
    expect(m.items.map((i) => i.done)).toEqual([false, false, false, false]);
    expect(m.summary).toMatch(/Not there yet/);
    expect(m.summary).toContain("4 steps");
  });

  it("shows how far along each stage is", () => {
    const m = milestone(diaryWith(["a1", "b1"]), LESSONS);
    expect(m.items.map((i) => [i.id, i.done, i.progress])).toEqual([
      ["stage-1", false, "1 of 2 lessons"],
      ["stage-2", true, "1 of 1 lessons"],
      ["stage-3", false, "0 of 1 lessons"],
      ["game", false, "Not yet"],
    ]);
  });

  it("is not ready with all the lessons but no game played on your own", () => {
    const m = milestone(diaryWith(ALL), LESSONS);
    expect(m.ready).toBe(false);
    expect(m.remaining).toBe(1);
    expect(m.summary).toContain("1 step");
    expect(m.items.find((i) => i.id === "game")?.hint).toMatch(/coaching to Off/);
  });

  it("is not ready with the game but not all the lessons", () => {
    const m = milestone(diaryWith(["a1", "a2", "b1"], [ownGame]), LESSONS);
    expect(m.ready).toBe(false);
    expect(m.items.find((i) => i.id === "game")?.done).toBe(true);
  });

  it("is ready only when both parts are really done, and says so plainly", () => {
    const m = milestone(diaryWith(ALL, [ownGame]), LESSONS);
    expect(m.ready).toBe(true);
    expect(m.remaining).toBe(0);
    expect(m.summary).toMatch(/You have done both/);
  });

  it("counts a win, a loss and a draw alike: the game just has to be finished", () => {
    for (const result of ["win", "loss", "draw"] as const) {
      expect(milestone(diaryWith(ALL, [game({ botLevel: 3, coachingMode: "off", result })]), LESSONS).ready).toBe(true);
    }
  });

  it("does not count a game that is too easy, coached, or left unfinished", () => {
    for (const g of [
      game({ botLevel: 1, coachingMode: "off" }),
      game({ botLevel: 3, coachingMode: "quiet" }),
      game({ botLevel: 3, coachingMode: "full" }),
      game({ botLevel: 3, coachingMode: "off", result: "abandoned" }),
    ]) {
      expect(milestone(diaryWith(ALL, [g]), LESSONS).ready).toBe(false);
    }
  });

  it("does not call an empty stage done", () => {
    const m = milestone(diaryWith([]), [{ id: "only", stage: 1 }]);
    expect(m.items.find((i) => i.id === "stage-2")?.done).toBe(false);
  });
});
