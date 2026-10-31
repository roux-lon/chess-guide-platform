import { describe, expect, it } from "vitest";
import { buildGameRecord } from "@/features/games";
import type { GameMeta } from "@/features/games";
import { MemoryStorage, createEmptyDiary } from "@/storage";
import type { Diary, MistakePosition } from "@/storage";
import { ProgressStore } from "./ProgressStore";

const T1 = new Date("2026-04-02T12:00:00Z");
const T2 = new Date("2026-04-03T12:00:00Z");

const META: GameMeta = {
  id: "game-1",
  startedAt: "2026-04-02T11:00:00.000Z",
  playerColor: "white",
  botLevel: 1,
  coachingMode: "quiet",
};

// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Nxe5? Nxe5: White's 4th move (ply 7) hangs a knight.
const MOVES = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "Nxe5", "Nxe5"];

const game = (id = "game-1", now = T1) => {
  const record = buildGameRecord({ meta: { ...META, id }, sanMoves: MOVES, result: "loss", entries: [], now });
  return { ...record, mistakes: [{ ply: 7, type: "hanging_piece" }] };
};

function memoryStore(initial?: Diary) {
  const storage = new MemoryStorage(initial ?? null);
  return { store: new ProgressStore(storage, { now: () => T1 }), storage };
}

describe("ProgressStore: Thinking Gym", () => {
  it("keeps the position before each mistake when a game is saved, and it survives a reload", async () => {
    const { store, storage } = memoryStore();
    await store.recordGame(game(), { activeGame: null });
    const [position] = store.getSnapshot().diary.gym.positions;
    expect(position).toMatchObject({ id: "game-1:7", ply: 7, move: { from: "f3", to: "e5" }, type: "hanging_piece" });

    const reloaded = new ProgressStore(storage, { now: () => T1 });
    await reloaded.load();
    expect(reloaded.getSnapshot().diary.gym.positions).toEqual([position]);
  });

  it("does not keep a second copy when the same game is saved again", async () => {
    const { store } = memoryStore();
    await store.recordGame(game("g", T1), { activeGame: null });
    await store.recordGame(game("g", T2), { activeGame: null });
    expect(store.getSnapshot().diary.gym.positions).toHaveLength(1);
  });

  it("keeps only the most recent forty positions", async () => {
    const old: MistakePosition[] = Array.from({ length: 40 }, (_, i) => ({
      id: `old-${i}:3`,
      gameId: `old-${i}`,
      ply: 3,
      playedAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1",
      move: { from: "e1", to: "e2" },
      type: "blunder",
    }));
    const diary: Diary = { ...createEmptyDiary(T1), gym: { positions: old, stats: {} } };
    const { store } = memoryStore(diary);
    await store.recordGame(game("new", T2), { activeGame: null });
    const { positions } = store.getSnapshot().diary.gym;
    expect(positions).toHaveLength(40);
    expect(positions.some((p) => p.gameId === "new")).toBe(true);
  });

  it("records a gym session: accuracy per kind, a streak day, no XP, written straight away", async () => {
    const { store, storage } = memoryStore();
    await store.recordGymSession([
      { drillId: "a", type: "isItSafe", correct: true },
      { drillId: "b", type: "isItSafe", correct: false },
      { drillId: "c", type: "spotThreat", correct: true },
    ]);
    let diary = store.getSnapshot().diary;
    expect(diary.gym.stats).toEqual({ isItSafe: { asked: 2, correct: 1 }, spotThreat: { asked: 1, correct: 1 } });
    expect(diary.xp).toBe(0);
    expect(diary.streak.current).toBe(1);

    await store.recordGymSession([{ drillId: "d", type: "isItSafe", correct: true }]);
    diary = store.getSnapshot().diary;
    expect(diary.gym.stats.isItSafe).toEqual({ asked: 3, correct: 2 });
    expect((await storage.load()).gym.stats.isItSafe).toEqual({ asked: 3, correct: 2 });
  });

  it("does nothing for an empty session", async () => {
    const { store } = memoryStore();
    expect(await store.recordGymSession([])).toBe(true);
    expect(store.getSnapshot().diary.gym.stats).toEqual({});
  });
});
