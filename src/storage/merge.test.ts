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
  playerColor: "white",
  botLevel: 1,
  coachingMode: "quiet",
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
    const base = diary({ settings: { botLevel: 4, coachTone: "playful", coachingMode: "quiet" }, updatedAt: "2026-05-01T00:00:00.000Z" });
    const incoming = diary({ settings: { botLevel: 1, coachTone: "calm", coachingMode: "off" }, updatedAt: "2026-06-01T00:00:00.000Z" });
    const merged = mergeDiaries(base, incoming);
    expect(merged.settings.botLevel).toBe(4);
    expect(merged.updatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("keeps the larger XP and the streak that was active more recently", () => {
    const base = diary({ xp: 100, streak: { current: 2, best: 4, lastDay: "2026-03-01" } });
    const incoming = diary({ xp: 250, streak: { current: 5, best: 5, lastDay: "2026-03-09" } });
    const merged = mergeDiaries(base, incoming);
    expect(merged.xp).toBe(250);
    expect(merged.streak).toEqual({ current: 5, best: 5, lastDay: "2026-03-09" });

    const reverse = mergeDiaries(incoming, base);
    expect(reverse.streak.lastDay).toBe("2026-03-09");
    // The best streak is never lost, whichever diary it came from.
    const withBigBest = mergeDiaries(
      diary({ streak: { current: 1, best: 12, lastDay: "2026-03-02" } }),
      diary({ streak: { current: 3, best: 3, lastDay: "2026-03-09" } }),
    );
    expect(withBigBest.streak).toEqual({ current: 3, best: 12, lastDay: "2026-03-09" });
  });

  it("keeps an unfinished game, preferring the base one", () => {
    const active = (id: string) => ({
      id,
      startedAt: "2026-01-01T00:00:00.000Z",
      playerColor: "white" as const,
      botLevel: 1,
      coachingMode: "quiet" as const,
      fen: "x",
      moves: ["e4"],
      coachLog: [],
      mistakes: [],
    });
    expect(mergeDiaries(diary({ activeGame: active("a") }), diary({ activeGame: active("b") })).activeGame?.id).toBe("a");
    expect(mergeDiaries(diary({}), diary({ activeGame: active("b") })).activeGame?.id).toBe("b");
    expect(mergeDiaries(diary({}), diary({})).activeGame).toBeUndefined();
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

describe("mergeDiaries: gym history", () => {
  const pos = (id: string, playedAt: string) => ({
    id,
    gameId: id.split(":")[0],
    ply: 3,
    playedAt,
    fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
    move: { from: "e1", to: "e2" },
    type: "blunder",
  });

  it("joins positions by id and takes the larger counts, so importing twice does not double", () => {
    const a = diary({
      gym: { positions: [pos("a:3", "2026-01-01T00:00:00Z")], stats: { isItSafe: { asked: 4, correct: 2 } } },
    });
    const b = diary({
      gym: {
        positions: [pos("a:3", "2026-01-01T00:00:00Z"), pos("b:3", "2026-01-02T00:00:00Z")],
        stats: { isItSafe: { asked: 6, correct: 5 }, pickOfThree: { asked: 1, correct: 1 } },
      },
    });
    const merged = mergeDiaries(a, b);
    expect(merged.gym.positions.map((p) => p.id)).toEqual(["a:3", "b:3"]);
    expect(merged.gym.stats).toEqual({ isItSafe: { asked: 6, correct: 5 }, pickOfThree: { asked: 1, correct: 1 } });
    expect(mergeDiaries(merged, b).gym).toEqual(merged.gym);
  });
});
