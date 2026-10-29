import { describe, expect, it } from "vitest";
import { createEmptyDiary, hasProgress, summarizeDiary } from "./diary";
import { migrate } from "./migrate";
import type { MigrationStep } from "./migrate";
import { readDiary, readDiaryText } from "./read";
import { validateDiary } from "./validate";

const DONE = { status: "done", completedAt: "2026-01-01T00:00:00.000Z" } as const;

const game = {
  id: "g1",
  playedAt: "2026-02-01T10:00:00.000Z",
  result: "win",
  playerColor: "white",
  botLevel: 2,
  coachingMode: "quiet",
  pgn: "1. e4 e5",
  coachLog: [{ ply: 5, event: "hanging_piece", text: "Careful!" }],
  mistakes: [{ ply: 12, type: "hanging_piece" }],
};

describe("createEmptyDiary", () => {
  it("matches the shape in the plan", () => {
    expect(createEmptyDiary(new Date("2026-01-02T03:04:05Z"))).toEqual({
      version: 2,
      updatedAt: "2026-01-02T03:04:05.000Z",
      settings: { botLevel: 1, coachTone: "playful", coachingMode: "quiet" },
      lessons: {},
      games: [],
      mistakeCounts: {},
    });
  });

  it("knows whether a diary holds anything", () => {
    const diary = createEmptyDiary();
    expect(hasProgress(diary)).toBe(false);
    expect(summarizeDiary(diary)).toEqual({ lessons: 0, games: 0 });
    diary.lessons.pawn = DONE;
    expect(hasProgress(diary)).toBe(true);
    expect(summarizeDiary(diary)).toEqual({ lessons: 1, games: 0 });
    expect(hasProgress({ ...createEmptyDiary(), mistakeCounts: { hanging_piece: 1 } })).toBe(true);
  });
});

describe("validateDiary", () => {
  it("accepts a full diary and gives back the same thing", () => {
    const raw = {
      version: 2,
      updatedAt: "2026-02-01T00:00:00.000Z",
      settings: { botLevel: 3, coachTone: "playful", coachingMode: "off" },
      lessons: { pawn: DONE },
      games: [game],
      mistakeCounts: { hanging_piece: 7, missed_check_threat: 3 },
    };
    const result = validateDiary(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.diary).toEqual(raw);
  });

  it("fills in missing optional parts with defaults", () => {
    const result = validateDiary({ version: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diary.settings).toEqual({ botLevel: 1, coachTone: "playful", coachingMode: "quiet" });
      expect(result.diary.lessons).toEqual({});
      expect(result.diary.games).toEqual([]);
      expect(result.diary.mistakeCounts).toEqual({});
    }
  });

  it("reports problems instead of repairing them", () => {
    const result = validateDiary({
      version: 2,
      lessons: { good: DONE, bad: { status: "weird" } },
      mistakeCounts: { a: "lots" },
      settings: { botLevel: "high" },
      games: [{ id: "g1" }, 5],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.problems.join("\n");
      expect(text).toMatch(/Lesson "bad"/);
      expect(text).toMatch(/Mistake count "a"/);
      expect(text).toMatch(/botLevel/);
      expect(text).toMatch(/Game 1/);
      expect(text).toMatch(/Game 2/);
    }
  });

  it("rejects things that are not diaries", () => {
    for (const raw of [null, undefined, 5, "text", [], true]) {
      expect(validateDiary(raw).ok).toBe(false);
    }
  });

  it("insists on the current version", () => {
    expect(validateDiary({ version: 1 }).ok).toBe(false);
    expect(validateDiary({ version: 3 }).ok).toBe(false);
    expect(validateDiary({}).ok).toBe(false);
  });

  it("checks games closely", () => {
    const bad = (change: object) => validateDiary({ version: 2, games: [{ ...game, ...change }] }).ok;
    expect(bad({})).toBe(true);
    expect(bad({ result: "won" })).toBe(false);
    expect(bad({ result: "abandoned" })).toBe(true);
    expect(bad({ playerColor: "green" })).toBe(false);
    expect(bad({ botLevel: "two" })).toBe(false);
    expect(bad({ coachingMode: "loud" })).toBe(false);
    expect(bad({ mistakes: [{ ply: 3, type: "x", lossCp: 250 }] })).toBe(true);
    expect(bad({ mistakes: [{ ply: 3, type: "x", lossCp: "lots" }] })).toBe(false);
    expect(bad({ pgn: 5 })).toBe(false);
    expect(bad({ coachLog: [{ ply: "x", event: "e", text: "t" }] })).toBe(false);
    expect(bad({ mistakes: [{ ply: 1 }] })).toBe(false);
  });
});

describe("migrate", () => {
  it("leaves a current diary alone", () => {
    const raw = { version: 2, lessons: {} };
    expect(migrate(raw)).toEqual({ ok: true, raw, from: 2, to: 2 });
  });

  it("upgrades a diary with no version (written by hand) all the way to the current version", () => {
    const result = migrate({ lessons: { pawn: DONE } });
    expect(result).toMatchObject({ ok: true, from: 0, to: 2 });
    if (result.ok) {
      expect(result.raw).toMatchObject({ version: 2, lessons: { pawn: DONE }, settings: { coachingMode: "quiet" } });
    }
  });

  describe("version 1 to 2 (phase 6)", () => {
    const v1game = {
      id: "g1",
      playedAt: "2026-02-01T10:00:00.000Z",
      result: "win",
      pgn: "1. e4 e5",
      coachLog: [],
      mistakes: [{ ply: 5, type: "hanging_piece" }],
    };

    it("gives old games the defaults of the time and keeps everything else", () => {
      const result = readDiary({
        version: 1,
        updatedAt: "2026-02-01T00:00:00.000Z",
        settings: { botLevel: 3, coachTone: "playful" },
        lessons: { pawn: DONE },
        games: [v1game],
        mistakeCounts: { hanging_piece: 1 },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.migratedFrom).toBe(1);
        expect(result.diary.version).toBe(2);
        expect(result.diary.settings).toEqual({ botLevel: 3, coachTone: "playful", coachingMode: "quiet" });
        expect(result.diary.games[0]).toMatchObject({
          id: "g1",
          result: "win",
          playerColor: "white",
          botLevel: 1,
          coachingMode: "quiet",
          mistakes: [{ ply: 5, type: "hanging_piece" }],
        });
        expect(result.diary.lessons.pawn).toEqual(DONE);
        expect(result.diary.mistakeCounts).toEqual({ hanging_piece: 1 });
        expect(result.diary.activeGame).toBeUndefined();
      }
    });

    it("does not overwrite values a game already has", () => {
      const result = migrate({ version: 1, games: [{ ...v1game, playerColor: "black", botLevel: 4 }] });
      expect(result.ok && (result.raw.games as unknown[])[0]).toMatchObject({ playerColor: "black", botLevel: 4 });
    });

    it("copes with a diary that has no games or settings at all", () => {
      const result = readDiary({ version: 1 });
      expect(result.ok && result.diary.settings.coachingMode).toBe("quiet");
    });

    it("still reports a game that is broken in other ways", () => {
      expect(readDiary({ version: 1, games: [{ id: 5 }] }).ok).toBe(false);
    });
  });

  describe("an unfinished game", () => {
    const active = {
      id: "g9",
      startedAt: "2026-03-01T10:00:00.000Z",
      playerColor: "black",
      botLevel: 2,
      coachingMode: "off",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      moves: ["e4"],
      coachLog: [{ ply: 1, event: "move_played", text: "x" }],
      mistakes: [{ ply: 1, type: "blunder", lossCp: 400 }],
    };

    it("is read when present and absent when not", () => {
      const withGame = validateDiary({ version: 2, activeGame: active });
      expect(withGame.ok && withGame.diary.activeGame).toEqual(active);
      const without = validateDiary({ version: 2 });
      expect(without.ok && "activeGame" in without.diary).toBe(false);
    });

    it("is checked closely", () => {
      const bad = (change: object) => validateDiary({ version: 2, activeGame: { ...active, ...change } }).ok;
      expect(bad({})).toBe(true);
      expect(bad({ moves: "e4" })).toBe(false);
      expect(bad({ moves: [1, 2] })).toBe(false);
      expect(bad({ fen: 5 })).toBe(false);
      expect(bad({ playerColor: "red" })).toBe(false);
      expect(bad({ coachLog: [{ ply: 1 }] })).toBe(false);
      const problems = validateDiary({ version: 2, activeGame: { ...active, fen: 5 } });
      expect(!problems.ok && problems.problems.join(" ")).toMatch(/Unfinished game/);
    });

    it("counts as progress worth protecting", () => {
      const diary = createEmptyDiary();
      diary.activeGame = active as never;
      expect(hasProgress(diary)).toBe(true);
    });
  });

  it("does not change the data it was given", () => {
    const raw = { lessons: {} };
    migrate(raw);
    expect(raw).toEqual({ lessons: {} });
  });

  it("walks through several steps in order", () => {
    const steps: MigrationStep[] = [
      { from: 1, to: 2, run: (raw) => ({ ...raw, version: 2, renamed: raw.old }) },
      { from: 2, to: 3, run: (raw) => ({ ...raw, version: 3, extra: true }) },
    ];
    const result = migrate({ version: 1, old: "value" }, steps, 3);
    expect(result).toMatchObject({ ok: true, from: 1, to: 3 });
    if (result.ok) expect(result.raw).toMatchObject({ version: 3, renamed: "value", extra: true });
  });

  it("refuses a diary from a newer app, so it is never overwritten", () => {
    const result = migrate({ version: 99 });
    expect(result).toMatchObject({ ok: false, reason: "future-version" });
    if (!result.ok) expect(result.message).toMatch(/newer version/);
  });

  it("refuses version numbers that make no sense", () => {
    for (const version of ["1", -1, 1.5, null, {}]) {
      expect(migrate({ version })).toMatchObject({ ok: false, reason: "unknown-version" });
    }
  });

  it("reports a missing step, and a step that crashes", () => {
    expect(migrate({ version: 1 }, [], 3)).toMatchObject({ ok: false, reason: "unknown-version" });
    const broken: MigrationStep[] = [
      {
        from: 1,
        to: 2,
        run: () => {
          throw new Error("boom");
        },
      },
    ];
    expect(migrate({ version: 1 }, broken, 2)).toMatchObject({ ok: false, reason: "step-failed" });
  });

  it("never throws, whatever it is given", () => {
    for (const raw of [null, undefined, 0, "x", [], [1, 2], {}, { version: NaN }, { version: Infinity }]) {
      expect(() => migrate(raw)).not.toThrow();
    }
  });
});

describe("readDiary", () => {
  it("reads a current diary", () => {
    const result = readDiary(createEmptyDiary());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.migratedFrom).toBeUndefined();
  });

  it("says when it upgraded something", () => {
    const result = readDiary({ lessons: { pawn: DONE } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migratedFrom).toBe(0);
      expect(result.diary.version).toBe(2);
      expect(result.diary.lessons.pawn).toEqual(DONE);
    }
  });

  it("calls broken data corrupt, with details", () => {
    const result = readDiary({ version: 2, lessons: { x: 1 } });
    expect(result).toMatchObject({ ok: false, kind: "corrupt" });
    if (!result.ok) expect(result.problems.length).toBeGreaterThan(0);
  });

  it("tells a newer-version diary apart from a corrupt one", () => {
    expect(readDiary({ version: 5 })).toMatchObject({ ok: false, kind: "future-version" });
  });

  it("reads text, and survives text that is not JSON", () => {
    expect(readDiaryText(JSON.stringify(createEmptyDiary())).ok).toBe(true);
    expect(readDiaryText("{nope")).toMatchObject({ ok: false, kind: "corrupt" });
    expect(readDiaryText("")).toMatchObject({ ok: false });
    expect(readDiaryText("null")).toMatchObject({ ok: false });
  });
});
