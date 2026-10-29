import { describe, expect, it } from "vitest";
import { createEmptyDiary } from "./diary";
import type { Diary, GameRecord } from "./diary";
import { DIARY_FILENAME, exportFilename, serializeDiary } from "./exportImport";
import { mergeDiaries } from "./merge";
import { readDiaryText } from "./read";

const game = (id: string, playedAt: string): GameRecord => ({
  id,
  playedAt,
  result: "win",
  pgn: "",
  coachLog: [],
  mistakes: [],
});

function diary(change: Partial<Diary>): Diary {
  return { ...createEmptyDiary(new Date("2026-01-01T00:00:00Z")), ...change };
}

describe("mergeDiaries", () => {
  it("keeps everything from both, with the earlier completion date", () => {
    const base = diary({ lessons: { pawn: { status: "done", completedAt: "2026-03-01T00:00:00.000Z" } } });
    const incoming = diary({
      lessons: {
        pawn: { status: "done", completedAt: "2026-02-01T00:00:00.000Z" },
        rook: { status: "done", completedAt: "2026-02-02T00:00:00.000Z" },
      },
    });
    const merged = mergeDiaries(base, incoming);
    expect(Object.keys(merged.lessons).sort()).toEqual(["pawn", "rook"]);
    expect(merged.lessons.pawn.completedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("joins games by id, oldest first, without duplicates", () => {
    const base = diary({ games: [game("b", "2026-02-02T00:00:00Z"), game("a", "2026-02-01T00:00:00Z")] });
    const incoming = diary({ games: [game("a", "2026-02-01T00:00:00Z"), game("c", "2026-01-15T00:00:00Z")] });
    expect(mergeDiaries(base, incoming).games.map((g) => g.id)).toEqual(["c", "a", "b"]);
  });

  it("takes the larger mistake count, so the same history twice does not double", () => {
    const base = diary({ mistakeCounts: { hanging_piece: 3, fork: 1 } });
    const incoming = diary({ mistakeCounts: { hanging_piece: 5, pin: 2 } });
    expect(mergeDiaries(base, incoming).mistakeCounts).toEqual({ hanging_piece: 5, fork: 1, pin: 2 });
    expect(mergeDiaries(base, base).mistakeCounts).toEqual(base.mistakeCounts);
  });

  it("keeps the base settings and the newer date", () => {
    const base = diary({ settings: { botLevel: 4, coachTone: "playful" }, updatedAt: "2026-05-01T00:00:00.000Z" });
    const incoming = diary({ settings: { botLevel: 1, coachTone: "calm" }, updatedAt: "2026-06-01T00:00:00.000Z" });
    const merged = mergeDiaries(base, incoming);
    expect(merged.settings.botLevel).toBe(4);
    expect(merged.updatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("does not change its inputs", () => {
    const base = diary({ lessons: { a: { status: "done", completedAt: "x" } } });
    const incoming = diary({ lessons: { b: { status: "done", completedAt: "y" } } });
    mergeDiaries(base, incoming);
    expect(Object.keys(base.lessons)).toEqual(["a"]);
  });
});

describe("export helpers", () => {
  it("writes pretty JSON that reads back the same", () => {
    const original = diary({ lessons: { pawn: { status: "done", completedAt: "2026-01-01T00:00:00.000Z" } } });
    const text = serializeDiary(original);
    expect(text).toContain("\n  ");
    expect(text.endsWith("\n")).toBe(true);
    const back = readDiaryText(text);
    expect(back.ok && back.diary).toEqual(original);
  });

  it("names downloads with the date", () => {
    expect(DIARY_FILENAME).toBe("chess-progress.json");
    expect(exportFilename(new Date("2026-03-09T12:00:00Z"))).toBe("chess-progress-2026-03-09.json");
  });
});
