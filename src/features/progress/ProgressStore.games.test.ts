import { describe, expect, it } from "vitest";
import type { CoachEvent } from "@/coach";
import type { CoachLogEntry } from "@/features/coach";
import { buildActiveGame, buildGameRecord } from "@/features/games";
import type { GameMeta } from "@/features/games";
import { createGameFromSan } from "@/rules";
import { FileStorage, MemoryStorage, SmallStore, serializeDiary, createEmptyDiary } from "@/storage";
import type { Diary, PlaybookCompletion, StorageAdapter } from "@/storage";
import { MemoryHandleStore } from "@/storage/handleStore";
import { FakeFileHandle, FakeKeyValueStore, FakePicker, manualTimers } from "@/storage/testing";
import { ProgressStore } from "./ProgressStore";

const T1 = new Date("2026-04-02T12:00:00Z");
const T2 = new Date("2026-04-03T12:00:00Z");
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const META: GameMeta = {
  id: "game-1",
  startedAt: "2026-04-02T11:00:00.000Z",
  playerColor: "white",
  botLevel: 2,
  coachingMode: "quiet",
};
const SCHOLARS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];

const knight = { type: "knight", square: "c3" } as const;
const bishop = { type: "bishop", square: "a5" } as const;
const missed: CoachEvent = { kind: "missed_threat", perspective: "user", nature: "info", piece: knight, attackers: [bishop], gain: 3 };
const played: CoachEvent = { kind: "move_played", perspective: "user", nature: "info", actor: "you", piece: "pawn", from: "e2", to: "e4", san: "e4" };

const entries = (...plies: number[]): CoachLogEntry[] =>
  plies.map((ply) => ({
    ply,
    moveSan: "x",
    side: "you",
    events: ply === 3 ? [played, missed] : [played],
    text: `comment ${ply}`,
  }));

const finished = (id = "game-1", result: "win" | "loss" | "abandoned" = "win", now = T1) =>
  buildGameRecord({
    meta: { ...META, id },
    sanMoves: SCHOLARS,
    result,
    entries: entries(1, 3),
    now,
  });

const active = (id = "game-1") =>
  buildActiveGame({
    meta: { ...META, id },
    fen: createGameFromSan(["e4", "e5", "Nf3"])?.fen() ?? "",
    sanMoves: ["e4", "e5", "Nf3"],
    entries: entries(1, 3),
  });

function memoryStore(initial?: Diary) {
  const storage = new MemoryStorage(initial ?? null);
  return { store: new ProgressStore(storage, { now: () => T1 }), storage };
}

function fileApp(file: FakeFileHandle) {
  const handles = new MemoryHandleStore(file);
  const clock = manualTimers();
  const kv = new FakeKeyValueStore();
  const storage = new FileStorage({
    handles,
    picker: new FakePicker(),
    small: new SmallStore(kv),
    now: () => T1,
    timers: clock.timers,
  });
  return { store: new ProgressStore(storage, { now: () => T1 }), clock, kv, handles };
}

describe("recording a game", () => {
  it("adds the game, its coach log and the mistake counts to the diary", async () => {
    const { store, storage } = memoryStore();
    expect(await store.recordGame(finished(), { activeGame: null })).toBe(true);

    const { diary } = store.getSnapshot();
    expect(diary.games).toHaveLength(1);
    expect(diary.games[0]).toMatchObject({ id: "game-1", result: "win", botLevel: 2, coachingMode: "quiet" });
    expect(diary.games[0].coachLog.map((c) => c.ply)).toEqual([1, 3]);
    expect(diary.games[0].mistakes).toEqual([{ ply: 3, type: "missed_threat", lossCp: 300 }]);
    expect(diary.mistakeCounts).toEqual({ missed_threat: 1 });

    const saved = await storage.load();
    expect(saved.games[0].id).toBe("game-1");
    expect(saved.mistakeCounts).toEqual({ missed_threat: 1 });
  });

  it("writes straight away", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const { store } = fileApp(file);
    await store.load();
    await store.recordGame(finished(), { activeGame: null });
    expect(file.writes).toHaveLength(1);
    const saved = JSON.parse(file.content);
    expect(saved.version).toBe(5);
    expect(saved.games[0]).toMatchObject({ id: "game-1", result: "win", playerColor: "white" });
    expect(saved.games[0].coachLog).toHaveLength(2);
    expect(saved.mistakeCounts).toEqual({ missed_threat: 1 });
  });

  it("keeps games in order of when they were played", async () => {
    const { store } = memoryStore();
    await store.recordGame(finished("later", "win", T2), { activeGame: null });
    await store.recordGame(finished("earlier", "loss", T1), { activeGame: null });
    expect(store.getSnapshot().diary.games.map((g) => g.id)).toEqual(["earlier", "later"]);
  });

  it("stores a game once: saving it again replaces it instead of adding a second copy", async () => {
    const { store } = memoryStore();
    await store.recordGame(finished("g", "abandoned"), { activeGame: active("g") });
    await store.recordGame(finished("g", "win", T2), { activeGame: null });
    const { diary } = store.getSnapshot();
    expect(diary.games).toHaveLength(1);
    expect(diary.games[0].result).toBe("win");
    expect(diary.games[0].playedAt).toBe(T2.toISOString());
  });

  it("never counts the same mistakes twice when a game is saved more than once", async () => {
    const { store } = memoryStore();
    await store.recordGame(finished("g", "abandoned"), { activeGame: active("g") });
    expect(store.getSnapshot().diary.mistakeCounts).toEqual({ missed_threat: 1 });
    await store.recordGame(finished("g", "win", T2), { activeGame: null });
    expect(store.getSnapshot().diary.mistakeCounts).toEqual({ missed_threat: 1 });
    await store.recordGame(finished("other"), { activeGame: null });
    expect(store.getSnapshot().diary.mistakeCounts).toEqual({ missed_threat: 2 });
  });

  it("counts mistakes from games that were left unfinished, as part of the totals", async () => {
    const { store } = memoryStore();
    await store.recordGame(finished("g", "abandoned"), { activeGame: null });
    expect(store.getSnapshot().diary.mistakeCounts).toEqual({ missed_threat: 1 });
  });

  it("keeps lessons and settings untouched", async () => {
    const { store } = memoryStore();
    await store.completeLesson("pawn");
    await store.updateSettings({ botLevel: 3 });
    await store.recordGame(finished(), { activeGame: null });
    const { diary } = store.getSnapshot();
    expect(diary.lessons).toHaveProperty("pawn");
    expect(diary.settings.botLevel).toBe(3);
  });

  it("does nothing, and says so, when the diary is not ready", async () => {
    const file = new FakeFileHandle("x.json", "");
    file.permission = "prompt";
    const { store } = fileApp(file);
    await store.load();
    expect(await store.recordGame(finished(), { activeGame: null })).toBe(false);
  });

  it("reports a failed save, keeping the game on screen", async () => {
    const failing: StorageAdapter = Object.assign(new MemoryStorage(), {
      save: async () => {
        throw new Error("full");
      },
    });
    const store = new ProgressStore(failing);
    expect(await store.recordGame(finished(), { activeGame: null })).toBe(false);
    expect(store.getSnapshot().diary.games).toHaveLength(1);
    expect(store.getSnapshot().saveError).toBeDefined();
  });
});

describe("the unfinished game", () => {
  it("is kept with an abandoned record when a game is left, in one write", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const { store } = fileApp(file);
    await store.load();
    await store.recordGame(finished("g", "abandoned"), { activeGame: active("g") });
    expect(file.writes).toHaveLength(1);
    const saved = JSON.parse(file.content);
    expect(saved.games[0]).toMatchObject({ id: "g", result: "abandoned" });
    expect(saved.activeGame).toMatchObject({ id: "g", moves: ["e4", "e5", "Nf3"] });
  });

  it("is cleared when the game is finished or given up", async () => {
    const { store } = memoryStore();
    await store.recordGame(finished("g", "abandoned"), { activeGame: active("g") });
    expect(store.getSnapshot().diary.activeGame).toBeDefined();
    await store.recordGame(finished("g", "win", T2), { activeGame: null });
    expect(store.getSnapshot().diary.activeGame).toBeUndefined();
  });

  it("is saved after a quiet moment, not on every move", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const { store, clock } = fileApp(file);
    await store.load();

    await store.saveActiveGame(active());
    await store.saveActiveGame({ ...active(), moves: ["e4", "e5", "Nf3", "Nc6"] });
    await store.saveActiveGame({ ...active(), moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] });
    expect(file.writes).toEqual([]);
    expect(store.getSnapshot().diary.activeGame?.moves).toHaveLength(5);

    clock.fire();
    await tick();
    expect(file.writes).toHaveLength(1);
    expect(JSON.parse(file.content).activeGame.moves).toHaveLength(5);
  });

  it("can be cleared quietly, and clearing nothing writes nothing", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const { store, clock } = fileApp(file);
    await store.load();
    await store.saveActiveGame(null);
    expect(clock.pending).toBe(0);

    await store.saveActiveGame(active());
    await store.saveActiveGame(null);
    clock.fire();
    await tick();
    expect(JSON.parse(file.content).activeGame).toBeUndefined();
  });

  it("survives a reload: a new store reads it back", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const first = fileApp(file);
    await first.store.load();
    await first.store.recordGame(finished("g", "abandoned"), { activeGame: active("g") });

    const second = fileApp(file);
    await second.store.load();
    expect(second.store.getSnapshot().diary.activeGame).toMatchObject({ id: "g" });
    expect(second.store.getSnapshot().diary.games).toHaveLength(1);
  });

  it("is not saved before the diary is ready", async () => {
    const file = new FakeFileHandle("x.json", "");
    file.permission = "prompt";
    const { store } = fileApp(file);
    await store.load();
    await store.saveActiveGame(active());
    expect(store.getSnapshot().diary.activeGame).toBeUndefined();
  });
});

describe("the game history after reloading the app and reconnecting", () => {
  it("is all still there, so the dashboard has something to show", async () => {
    const file = new FakeFileHandle("chess-progress.json", "");
    const picker = new FakePicker();
    picker.next = file;
    const handles = new MemoryHandleStore(null);
    const make = () =>
      new ProgressStore(
        new FileStorage({ handles, picker, now: () => T1, timers: manualTimers().timers }),
        { now: () => T1 },
      );

    const first = make();
    await first.load();
    await first.chooseFile("create");
    await first.recordGame(finished("a", "win", T1), { activeGame: null });
    await first.recordGame(finished("b", "loss", T2), { activeGame: null });

    file.permission = "prompt"; // the browser was closed and reopened
    const second = make();
    await second.load();
    expect(second.getSnapshot().ready).toBe(false);
    await second.reconnect();
    const { diary } = second.getSnapshot();
    expect(diary.games.map((g) => [g.id, g.result])).toEqual([
      ["a", "win"],
      ["b", "loss"],
    ]);
    expect(diary.mistakeCounts).toEqual({ missed_threat: 2 });
  });
});

describe("recordPlaybook", () => {
  const completion: PlaybookCompletion = {
    playedAt: "2026-04-02T12:00:00.000Z",
    color: "white",
    goalsDone: ["center", "knights"],
    complete: false,
    moves: 12,
  };

  it("saves the practice straight away, counts a day for the streak, and pays no XP", async () => {
    const { store, storage } = memoryStore();
    await store.load();
    expect(await store.recordPlaybook(completion)).toBe(true);
    const diary = store.getSnapshot().diary;
    expect(diary.playbook.completions).toEqual([completion]);
    expect(diary.xp).toBe(0);
    expect(diary.streak.current).toBe(1);
    const saved = await storage.load();
    expect(saved.playbook.completions).toEqual([completion]);
  });

  it("keeps every practice, in order", async () => {
    const { store } = memoryStore();
    await store.load();
    await store.recordPlaybook(completion);
    await store.recordPlaybook({ ...completion, color: "black", complete: true, moves: 8 });
    expect(store.getSnapshot().diary.playbook.completions.map((c) => c.color)).toEqual(["white", "black"]);
  });

  it("writes straight away to the diary file", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(T1)));
    const { store } = fileApp(file);
    await store.load();
    await store.recordPlaybook(completion);
    expect(file.writes).toHaveLength(1);
    expect(JSON.parse(file.content).playbook.completions).toEqual([completion]);
  });
});
