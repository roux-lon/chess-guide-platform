import { describe, expect, it } from "vitest";
import { MemoryStorage, createEmptyDiary } from "@/storage";
import type { StorageAdapter } from "@/storage";
import { ProgressStore } from "./ProgressStore";

const T1 = new Date("2026-03-01T10:00:00Z");
const T2 = new Date("2026-03-02T10:00:00Z");

describe("ProgressStore", () => {
  it("is not ready until it has loaded, then is", async () => {
    const store = new ProgressStore(new MemoryStorage());
    expect(store.getSnapshot().ready).toBe(false);
    await store.load();
    expect(store.getSnapshot().ready).toBe(true);
  });

  it("gives server rendering a steady, not-ready snapshot", async () => {
    const store = new ProgressStore(new MemoryStorage());
    const first = store.getServerSnapshot();
    await store.load();
    expect(store.getServerSnapshot()).toBe(first);
    expect(first.ready).toBe(false);
  });

  it("loads what was saved earlier", async () => {
    const saved = createEmptyDiary();
    saved.lessons.pawn = { status: "done", completedAt: T1.toISOString() };
    const store = new ProgressStore(new MemoryStorage(saved));
    await store.load();
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(store.isLessonDone("rook")).toBe(false);
  });

  it("marks a lesson done, saves it, and tells listeners", async () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage, () => T1);
    let calls = 0;
    store.subscribe(() => calls++);
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(calls).toBeGreaterThan(0);

    const reloaded = await storage.load();
    expect(reloaded.lessons.pawn).toEqual({ status: "done", completedAt: T1.toISOString() });
    expect(reloaded.updatedAt).toBe(T1.toISOString());
  });

  it("survives a page reload: a new store on the same storage sees the progress", async () => {
    const storage = new MemoryStorage();
    await new ProgressStore(storage).completeLesson("board-and-coordinates");
    const afterReload = new ProgressStore(storage);
    await afterReload.load();
    expect(afterReload.isLessonDone("board-and-coordinates")).toBe(true);
  });

  it("keeps the first completion date when a lesson is replayed", async () => {
    let now = T1;
    const store = new ProgressStore(new MemoryStorage(), () => now);
    await store.completeLesson("pawn");
    now = T2;
    await store.completeLesson("pawn");
    expect(store.getSnapshot().diary.lessons.pawn.completedAt).toBe(T1.toISOString());
    expect(store.getSnapshot().diary.updatedAt).toBe(T2.toISOString());
  });

  it("keeps other lessons when completing a new one", async () => {
    const store = new ProgressStore(new MemoryStorage());
    await store.completeLesson("pawn");
    await store.completeLesson("rook");
    expect(Object.keys(store.getSnapshot().diary.lessons).sort()).toEqual(["pawn", "rook"]);
  });

  it("still works in memory and says so when saving fails", async () => {
    const failing: StorageAdapter = {
      load: async () => createEmptyDiary(),
      save: async () => {
        throw new Error("storage full");
      },
    };
    const store = new ProgressStore(failing);
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(store.getSnapshot().saveError).toMatch(/could not be saved/);
  });

  it("starts empty, with a warning, when loading fails", async () => {
    const broken: StorageAdapter = {
      load: async () => {
        throw new Error("blocked");
      },
      save: async () => {},
    };
    const store = new ProgressStore(broken);
    await store.load();
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().saveError).toBeDefined();
    expect(store.getSnapshot().diary.lessons).toEqual({});
  });

  it("loads only once however many places ask", async () => {
    let loads = 0;
    const storage: StorageAdapter = {
      load: async () => {
        loads++;
        return createEmptyDiary();
      },
      save: async () => {},
    };
    const store = new ProgressStore(storage);
    await Promise.all([store.load(), store.load(), store.completeLesson("pawn")]);
    expect(loads).toBe(1);
  });
});
