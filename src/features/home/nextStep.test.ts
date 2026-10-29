import { describe, expect, it } from "vitest";
import type { Stage } from "@/content";
import { LESSONS } from "@/content";
import { buildActiveGame } from "@/features/games";
import { game } from "@/features/games/testHelpers";
import { createGameFromSan } from "@/rules";
import { createEmptyDiary } from "@/storage";
import type { Diary } from "@/storage";
import { nextStep } from "./nextStep";

const lessons = LESSONS.map((l) => ({ id: l.id, title: l.title, stage: l.stage as Stage }));

function diaryWith(doneCount: number, games: Diary["games"] = []): Diary {
  const diary = createEmptyDiary();
  lessons.slice(0, doneCount).forEach((l) => {
    diary.lessons[l.id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
  });
  diary.games = games;
  return diary;
}

describe("nextStep", () => {
  it("sends a brand new learner to lesson 1", () => {
    const step = nextStep(diaryWith(0), lessons);
    expect(step).toMatchObject({ kind: "first-lesson", href: `/learn/${lessons[0].id}` });
    expect(step.title).toBe(`Start with lesson 1: ${lessons[0].title}`);
    expect(step.title).not.toMatch(/[{}]/);
  });

  it("continues with the next lesson that is not done, with its number", () => {
    const step = nextStep(diaryWith(6), lessons);
    expect(step).toMatchObject({ kind: "lesson", href: `/learn/${lessons[6].id}` });
    expect(step.title).toBe(`Continue lesson 7: ${lessons[6].title}`);
    expect(step.detail).toContain(`6 of ${lessons.length}`);
  });

  it("goes by the first lesson that is NOT done, even if a later one is", () => {
    const diary = diaryWith(0);
    diary.lessons[lessons[3].id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
    expect(nextStep(diary, lessons).href).toBe(`/learn/${lessons[0].id}`);
  });

  it("offers an unfinished game before anything else", () => {
    const diary = diaryWith(3);
    diary.activeGame = buildActiveGame({
      meta: { id: "x", startedAt: "2026-03-01T10:00:00.000Z", playerColor: "white", botLevel: 1, coachingMode: "quiet" },
      fen: createGameFromSan(["e4", "e5"])?.fen() ?? "",
      sanMoves: ["e4", "e5"],
      entries: [],
    });
    const step = nextStep(diary, lessons);
    expect(step).toMatchObject({ kind: "continue-game", href: "/play", cta: "Continue" });
    expect(step.detail).toContain("2 moves");
  });

  it("ignores an unfinished game that cannot be resumed", () => {
    const diary = diaryWith(3);
    diary.activeGame = {
      id: "x",
      startedAt: "2026-03-01T10:00:00.000Z",
      playerColor: "white",
      botLevel: 1,
      coachingMode: "quiet",
      fen: "nonsense",
      moves: ["e4", "e4"],
      coachLog: [],
      mistakes: [],
    };
    expect(nextStep(diary, lessons).kind).toBe("lesson");
  });

  it("suggests a first game once every lesson is done", () => {
    expect(nextStep(diaryWith(lessons.length), lessons)).toMatchObject({ kind: "first-game", href: "/play" });
    // A game that was only left does not count as played.
    const left = diaryWith(lessons.length, [game({ result: "abandoned" })]);
    expect(nextStep(left, lessons).kind).toBe("first-game");
  });

  it("then asks for a game with coaching off, which is what 'ready' needs", () => {
    const coached = diaryWith(lessons.length, [game({ botLevel: 3, coachingMode: "quiet" })]);
    expect(nextStep(coached, lessons)).toMatchObject({ kind: "game-on-your-own" });
    const easy = diaryWith(lessons.length, [game({ botLevel: 1, coachingMode: "off" })]);
    expect(nextStep(easy, lessons).kind).toBe("game-on-your-own");
  });

  it("simply suggests more games once everything is done", () => {
    const ready = diaryWith(lessons.length, [game({ botLevel: 2, coachingMode: "off" })]);
    expect(nextStep(ready, lessons)).toMatchObject({ kind: "another-game", href: "/play" });
  });
});
