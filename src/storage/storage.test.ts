import { describe, expect, it } from "vitest";
import {
  BrowserStorage,
  CORRUPT_KEY,
  DIARY_KEY,
  DiaryFormatError,
  MemoryStorage,
  createEmptyDiary,
  parseDiary,
} from "./index";
import type { KeyValueStore } from "./index";

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("createEmptyDiary", () => {
  it("matches the shape in the plan", () => {
    const diary = createEmptyDiary(new Date("2026-01-02T03:04:05Z"));
    expect(diary).toEqual({
      version: 1,
      updatedAt: "2026-01-02T03:04:05.000Z",
      settings: { botLevel: 1, coachTone: "playful" },
      lessons: {},
      games: [],
      mistakeCounts: {},
    });
  });
});

describe("parseDiary", () => {
  it("round-trips a diary", () => {
    const diary = createEmptyDiary();
    diary.lessons["pawn-moves"] = { status: "done", completedAt: "2026-01-01T00:00:00.000Z" };
    diary.mistakeCounts.hanging_piece = 7;
    expect(parseDiary(JSON.parse(JSON.stringify(diary)))).toEqual(diary);
  });

  it("fills in missing parts with defaults", () => {
    const diary = parseDiary({ version: 1 });
    expect(diary.settings).toEqual({ botLevel: 1, coachTone: "playful" });
    expect(diary.lessons).toEqual({});
    expect(diary.games).toEqual([]);
  });

  it("drops malformed lesson records but keeps good ones", () => {
    const diary = parseDiary({
      version: 1,
      lessons: {
        good: { status: "done", completedAt: "2026-01-01T00:00:00.000Z" },
        bad: { status: "weird" },
        worse: 5,
      },
    });
    expect(Object.keys(diary.lessons)).toEqual(["good"]);
  });

  it("refuses data it cannot understand instead of guessing", () => {
    expect(() => parseDiary(null)).toThrow(DiaryFormatError);
    expect(() => parseDiary("hello")).toThrow(DiaryFormatError);
    expect(() => parseDiary([])).toThrow(DiaryFormatError);
    expect(() => parseDiary({ version: 2 })).toThrow(/version 2/);
  });
});

describe("BrowserStorage", () => {
  it("starts empty when nothing was saved", async () => {
    const storage = new BrowserStorage(fakeStore());
    expect((await storage.load()).lessons).toEqual({});
  });

  it("saves and loads", async () => {
    const store = fakeStore();
    const storage = new BrowserStorage(store);
    const diary = createEmptyDiary();
    diary.lessons.rook = { status: "done", completedAt: "2026-01-01T00:00:00.000Z" };
    await storage.save(diary);
    expect(store.data[DIARY_KEY]).toBeDefined();
    expect(await new BrowserStorage(store).load()).toEqual(diary);
  });

  it("keeps a copy of unreadable data and starts fresh", async () => {
    const store = fakeStore({ [DIARY_KEY]: "{not json" });
    const diary = await new BrowserStorage(store).load();
    expect(diary.lessons).toEqual({});
    expect(store.data[CORRUPT_KEY]).toBe("{not json");
  });

  it("keeps a copy of a diary from a newer version", async () => {
    const text = JSON.stringify({ version: 99, lessons: {} });
    const store = fakeStore({ [DIARY_KEY]: text });
    await new BrowserStorage(store).load();
    expect(store.data[CORRUPT_KEY]).toBe(text);
  });
});

describe("MemoryStorage", () => {
  it("returns a copy, so callers cannot change what is stored", async () => {
    const storage = new MemoryStorage();
    const diary = await storage.load();
    diary.lessons.x = { status: "done", completedAt: "now" };
    expect((await storage.load()).lessons).toEqual({});
    await storage.save(diary);
    expect((await storage.load()).lessons).toHaveProperty("x");
  });
});
