import { describe, expect, it } from "vitest";
import { XP_RULES } from "@/content";
import { buildGameRecord } from "@/features/games";
import type { GameMeta } from "@/features/games";
import { FileStorage, MemoryStorage, createEmptyDiary, serializeDiary } from "@/storage";
import { MemoryHandleStore } from "@/storage/handleStore";
import { FakeFileHandle, FakePicker, manualTimers } from "@/storage/testing";
import { ProgressStore } from "./ProgressStore";

// Local times, so the streak's "day" is the same on any machine.
const day = (d: number, hour = 12) => new Date(2026, 2, d, hour);

function store(startAt = day(9)) {
  let now = startAt;
  const progress = new ProgressStore(new MemoryStorage(), { now: () => now });
  return {
    progress,
    setNow: (d: Date) => {
      now = d;
    },
    diary: () => progress.getSnapshot().diary,
  };
}

const META: GameMeta = {
  id: "g",
  startedAt: "2026-03-09T11:00:00.000Z",
  playerColor: "white",
  botLevel: 2,
  coachingMode: "quiet",
};
const record = (id: string, result: "win" | "loss" | "draw" | "abandoned", at = day(9)) =>
  buildGameRecord({ meta: { ...META, id }, sanMoves: ["e4", "e5"], result, entries: [], now: at });

describe("XP for lessons", () => {
  it("is earned the first time a lesson is finished, and not again on a replay", async () => {
    const s = store();
    await s.progress.completeLesson("pawn");
    expect(s.diary().xp).toBe(XP_RULES.lesson);
    await s.progress.completeLesson("pawn");
    expect(s.diary().xp).toBe(XP_RULES.lesson);
    await s.progress.completeLesson("rook");
    expect(s.diary().xp).toBe(XP_RULES.lesson * 2);
  });
});

describe("XP for games", () => {
  it("is paid for a finished game, by result", async () => {
    const s = store();
    await s.progress.recordGame(record("a", "win"), { activeGame: null });
    await s.progress.recordGame(record("b", "draw"), { activeGame: null });
    await s.progress.recordGame(record("c", "loss"), { activeGame: null });
    expect(s.diary().xp).toBe(
      XP_RULES.gameFinished * 3 + XP_RULES.win + XP_RULES.draw,
    );
  });

  it("is not paid for a game that was resigned or left", async () => {
    const s = store();
    await s.progress.recordGame(record("a", "abandoned"), { activeGame: null });
    expect(s.diary().xp).toBe(0);
  });

  it("is paid once when an abandoned game is resumed and finished", async () => {
    const s = store();
    await s.progress.recordGame(record("g", "abandoned"), { activeGame: null });
    await s.progress.recordGame(record("g", "win"), { activeGame: null });
    expect(s.diary().xp).toBe(XP_RULES.gameFinished + XP_RULES.win);
    expect(s.diary().games).toHaveLength(1);
  });

  it("is not paid again if the same finished game is saved twice", async () => {
    const s = store();
    await s.progress.recordGame(record("g", "win"), { activeGame: null });
    await s.progress.recordGame(record("g", "win"), { activeGame: null });
    expect(s.diary().xp).toBe(XP_RULES.gameFinished + XP_RULES.win);
  });
});

describe("the daily streak", () => {
  it("starts with the first lesson or game, and grows on consecutive days", async () => {
    const s = store(day(9));
    expect(s.diary().streak).toEqual({ current: 0, best: 0, lastDay: null });
    await s.progress.completeLesson("pawn");
    expect(s.diary().streak).toEqual({ current: 1, best: 1, lastDay: "2026-03-09" });

    s.setNow(day(10));
    await s.progress.recordGame(record("a", "loss", day(10)), { activeGame: null });
    expect(s.diary().streak).toEqual({ current: 2, best: 2, lastDay: "2026-03-10" });

    s.setNow(day(11, 23));
    await s.progress.completeLesson("rook");
    expect(s.diary().streak).toEqual({ current: 3, best: 3, lastDay: "2026-03-11" });
  });

  it("does not grow twice on the same day", async () => {
    const s = store();
    await s.progress.completeLesson("pawn");
    await s.progress.completeLesson("rook");
    await s.progress.recordGame(record("a", "win"), { activeGame: null });
    expect(s.diary().streak.current).toBe(1);
  });

  it("starts over after a missed day, keeping the best", async () => {
    const s = store(day(9));
    await s.progress.completeLesson("a");
    s.setNow(day(10));
    await s.progress.completeLesson("b");
    s.setNow(day(13));
    await s.progress.completeLesson("c");
    expect(s.diary().streak).toEqual({ current: 1, best: 2, lastDay: "2026-03-13" });
  });

  it("counts a replayed lesson and a left game as a day of activity (but they earn no XP)", async () => {
    const s = store(day(9));
    await s.progress.completeLesson("pawn");
    s.setNow(day(10));
    await s.progress.completeLesson("pawn"); // replay
    expect(s.diary().streak.current).toBe(2);
    s.setNow(day(11));
    await s.progress.recordGame(record("a", "abandoned", day(11)), { activeGame: null });
    expect(s.diary().streak.current).toBe(3);
    expect(s.diary().xp).toBe(XP_RULES.lesson);
  });
});

describe("saving rewards", () => {
  it("writes XP and the streak into the diary file", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(day(9))));
    const storage = new FileStorage({
      handles: new MemoryHandleStore(file),
      picker: new FakePicker(),
      now: () => day(9),
      timers: manualTimers().timers,
    });
    const progress = new ProgressStore(storage, { now: () => day(9) });
    await progress.load();
    await progress.completeLesson("pawn");
    const saved = JSON.parse(file.content);
    expect(saved.version).toBe(3);
    expect(saved.xp).toBe(XP_RULES.lesson);
    expect(saved.streak).toEqual({ current: 1, best: 1, lastDay: "2026-03-09" });
  });
});
