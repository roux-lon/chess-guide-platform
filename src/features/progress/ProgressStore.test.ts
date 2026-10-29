import { describe, expect, it, vi } from "vitest";
import {
  BrowserFallbackStorage,
  BrowserLegacy,
  DIARY_KEY,
  FileStorage,
  MemoryStorage,
  SmallStore,
  createEmptyDiary,
  serializeDiary,
} from "@/storage";
import type { Diary, StorageAdapter } from "@/storage";
import { MemoryHandleStore } from "@/storage/handleStore";
import { FakeFileHandle, FakeKeyValueStore, FakePicker, manualTimers } from "@/storage/testing";
import { EXPORT_REMINDER_AFTER_SESSIONS, ProgressStore } from "./ProgressStore";

const T1 = new Date("2026-03-01T10:00:00Z");
const T2 = new Date("2026-03-02T10:00:00Z");
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function diaryWith(...lessons: string[]): Diary {
  const diary = createEmptyDiary(T1);
  for (const id of lessons) diary.lessons[id] = { status: "done", completedAt: "2026-02-01T00:00:00.000Z" };
  return diary;
}

/** The pieces of a file-mode app: a fake disk, fake dialogs, fake browser storage. */
function fileApp(initialFile?: FakeFileHandle, existingKv?: FakeKeyValueStore) {
  const handles = new MemoryHandleStore(initialFile ?? null);
  const picker = new FakePicker();
  const kv = existingKv ?? new FakeKeyValueStore();
  const small = new SmallStore(kv);
  const clock = manualTimers();
  const storage = new FileStorage({ handles, picker, small, now: () => T1, timers: clock.timers });
  const legacy = new BrowserLegacy(kv, small);
  const store = new ProgressStore(storage, { now: () => T1, legacy, small });
  return { store, storage, handles, picker, kv, small, clock, legacy };
}

describe("ProgressStore with simple storage", () => {
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
    const store = new ProgressStore(new MemoryStorage(diaryWith("pawn")));
    await store.load();
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(store.isLessonDone("rook")).toBe(false);
  });

  it("marks a lesson done, saves it, and tells listeners", async () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage, { now: () => T1 });
    let calls = 0;
    store.subscribe(() => calls++);
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(calls).toBeGreaterThan(0);
    const reloaded = await storage.load();
    expect(reloaded.lessons.pawn).toEqual({ status: "done", completedAt: T1.toISOString() });
    expect(reloaded.updatedAt).toBe(T1.toISOString());
  });

  it("saves lesson completion right away, not after a delay", async () => {
    const storage = new MemoryStorage();
    const save = vi.spyOn(storage, "save");
    const store = new ProgressStore(storage);
    await store.completeLesson("pawn");
    expect(save).toHaveBeenCalledWith(expect.anything(), { immediate: true });
  });

  it("survives a page reload: a new store on the same storage sees the progress", async () => {
    const storage = new MemoryStorage();
    await new ProgressStore(storage).completeLesson("board-and-coordinates");
    const afterReload = new ProgressStore(storage);
    await afterReload.load();
    expect(afterReload.isLessonDone("board-and-coordinates")).toBe(true);
  });

  it("keeps the first completion date when a lesson is replayed, and other lessons too", async () => {
    let now = T1;
    const store = new ProgressStore(new MemoryStorage(), { now: () => now });
    await store.completeLesson("pawn");
    now = T2;
    await store.completeLesson("pawn");
    await store.completeLesson("rook");
    const { diary } = store.getSnapshot();
    expect(diary.lessons.pawn.completedAt).toBe(T1.toISOString());
    expect(diary.updatedAt).toBe(T2.toISOString());
    expect(Object.keys(diary.lessons).sort()).toEqual(["pawn", "rook"]);
  });

  it("still works in memory and says so when saving fails", async () => {
    const failing: StorageAdapter = Object.assign(new MemoryStorage(), {
      save: async () => {
        throw new Error("storage full");
      },
    });
    const store = new ProgressStore(failing);
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(store.getSnapshot().saveError).toMatch(/could not be saved/);
  });

  it("starts empty, with a warning, when loading fails unexpectedly", async () => {
    const broken: StorageAdapter = Object.assign(new MemoryStorage(), {
      load: async () => {
        throw new Error("blocked");
      },
    });
    const store = new ProgressStore(broken);
    await store.load();
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().saveError).toBeDefined();
    expect(store.getSnapshot().diary.lessons).toEqual({});
  });

  it("loads only once however many places ask", async () => {
    const storage = new MemoryStorage();
    const load = vi.spyOn(storage, "load");
    const store = new ProgressStore(storage);
    await Promise.all([store.load(), store.load(), store.completeLesson("pawn")]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("ProgressStore with a diary file", () => {
  it("waits for the person to choose a file, then comes alive and keeps history in the file", async () => {
    const { store, picker, kv } = fileApp();
    await store.load();
    expect(store.getSnapshot().ready).toBe(false);
    expect(store.getSnapshot().status).toEqual({ state: "unconfigured" });

    const file = new FakeFileHandle("chess-progress.json", "");
    picker.next = file;
    await store.chooseFile("create");
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().status).toEqual({ state: "connected", fileName: "chess-progress.json" });

    await store.completeLesson("pawn");
    expect(JSON.parse(file.content).lessons).toHaveProperty("pawn");
    // Browser storage holds only a tiny hint, never the progress.
    expect(Object.keys(kv.data)).toEqual(["chess-coach.small"]);
    expect(kv.data[DIARY_KEY]).toBeUndefined();
  });

  it("restores all progress after the browser is closed and reopened and the person reconnects", async () => {
    const first = fileApp();
    const file = new FakeFileHandle();
    first.picker.next = file;
    await first.store.chooseFile("create");
    await first.store.completeLesson("pawn");
    await first.store.completeLesson("rook");

    // The browser is reopened: new app objects, same remembered file, permission needs a click.
    file.permission = "prompt";
    const second = fileApp(file);
    await second.store.load();
    expect(second.store.getSnapshot().ready).toBe(false);
    expect(second.store.getSnapshot().status).toEqual({ state: "needs-reconnect", fileName: "chess-progress.json" });

    await second.store.reconnect();
    expect(second.store.getSnapshot().ready).toBe(true);
    expect(second.store.isLessonDone("pawn")).toBe(true);
    expect(second.store.isLessonDone("rook")).toBe(true);
  });

  it("does not touch progress until a file is connected", async () => {
    const { store } = fileApp();
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(false);
  });

  it("does not overwrite a corrupted file, and offers a copy then a fresh start", async () => {
    const original = "{definitely not json";
    const file = new FakeFileHandle("chess-progress.json", original);
    const { store, picker } = fileApp(file);
    await store.load();
    expect(store.getSnapshot().ready).toBe(false);
    expect(store.getSnapshot().status).toMatchObject({ state: "problem", problem: "invalid-file" });

    await store.completeLesson("pawn");
    expect(file.content).toBe(original);

    expect(await store.startFreshKeepingCopy()).toBe(true);
    expect(picker.copies[0].text).toBe(original);
    expect(store.getSnapshot().ready).toBe(true);
    await store.completeLesson("pawn");
    expect(JSON.parse(file.content).lessons).toHaveProperty("pawn");
  });

  it("stays blocked if the person declines to keep a copy", async () => {
    const file = new FakeFileHandle("chess-progress.json", "garbage");
    const { store, picker } = fileApp(file);
    await store.load();
    picker.copyAccepted = false;
    expect(await store.startFreshKeepingCopy()).toBe(false);
    expect(file.content).toBe("garbage");
    expect(store.getSnapshot().ready).toBe(false);
  });

  it("shows a kind message when writing fails, keeps progress on screen, and recovers", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
    const { store } = fileApp(file);
    await store.load();

    file.writeError = new Error("locked");
    await store.completeLesson("pawn");
    expect(store.isLessonDone("pawn")).toBe(true);
    expect(store.getSnapshot().saveError).toMatch(/still here on screen/);

    file.writeError = null;
    await store.completeLesson("rook");
    expect(store.getSnapshot().saveError).toBeUndefined();
    expect(Object.keys(JSON.parse(file.content).lessons).sort()).toEqual(["pawn", "rook"]);
  });

  it("switches to a different existing file and shows its contents", async () => {
    const first = new FakeFileHandle("a.json", serializeDiary(diaryWith("pawn")));
    const { store, picker } = fileApp(first);
    await store.load();
    expect(store.isLessonDone("pawn")).toBe(true);

    picker.next = new FakeFileHandle("b.json", serializeDiary(diaryWith("rook", "knight")));
    await store.chooseFile("open");
    expect(store.getSnapshot().status).toEqual({ state: "connected", fileName: "b.json" });
    expect(store.isLessonDone("pawn")).toBe(false);
    expect(store.isLessonDone("knight")).toBe(true);
  });

  it("can move the diary to a new file, taking the current progress along", async () => {
    const first = new FakeFileHandle("a.json", serializeDiary(diaryWith("pawn", "rook")));
    const { store, picker } = fileApp(first);
    await store.load();

    const moved = new FakeFileHandle("moved.json", "");
    picker.next = moved;
    await store.chooseFile("create", true);
    expect(Object.keys(JSON.parse(moved.content).lessons).sort()).toEqual(["pawn", "rook"]);
    expect(store.isLessonDone("rook")).toBe(true);
  });

  it("starts a new file with the current progress after the old one went missing", async () => {
    const file = new FakeFileHandle("a.json", serializeDiary(diaryWith("pawn")));
    const { store, picker } = fileApp(file);
    await store.load();
    file.missing = true;
    await store.completeLesson("rook");
    expect(store.getSnapshot().status).toMatchObject({ problem: "file-missing" });
    expect(store.getSnapshot().saveError).toMatch(/cannot find/);

    const fresh = new FakeFileHandle("again.json", "");
    picker.next = fresh;
    await store.chooseFile("create", true);
    expect(Object.keys(JSON.parse(fresh.content).lessons).sort()).toEqual(["pawn", "rook"]);
    expect(store.getSnapshot().saveError).toBeUndefined();
  });

  describe("settings are saved after a quiet moment, not on every change", () => {
    it("writes the file once, however many changes there were", async () => {
      const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
      const { store, clock } = fileApp(file);
      await store.load();

      await store.updateSettings({ botLevel: 2 });
      await store.updateSettings({ botLevel: 3 });
      await store.updateSettings({ botLevel: 4 });
      expect(store.getSnapshot().diary.settings.botLevel).toBe(4);
      expect(file.writes).toEqual([]);

      clock.fire();
      await tick();
      expect(file.writes).toHaveLength(1);
      expect(JSON.parse(file.content).settings.botLevel).toBe(4);
    });

    it("ignores a change that changes nothing", async () => {
      const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
      const { store, clock } = fileApp(file);
      await store.load();
      await store.updateSettings({ botLevel: 1 });
      expect(clock.pending).toBe(0);
    });

    it("lets a lesson completion write at once, including waiting settings", async () => {
      const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
      const { store } = fileApp(file);
      await store.load();
      await store.updateSettings({ botLevel: 5 });
      await store.completeLesson("pawn");
      expect(file.writes).toHaveLength(1);
      const saved = JSON.parse(file.content);
      expect(saved.settings.botLevel).toBe(5);
      expect(saved.lessons).toHaveProperty("pawn");
    });
  });
});

describe("bringing over progress an earlier version kept in the browser", () => {
  function legacyKv(...lessons: string[]) {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, JSON.stringify(diaryWith(...lessons)));
    return kv;
  }

  it("offers it once a diary file is connected, and shows what was found", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith("pawn")));
    const { store } = fileApp(file, legacyKv("rook", "knight"));
    await store.load();
    expect(store.getSnapshot().legacyOffer).toEqual({ lessons: 2, games: 0 });
  });

  it("merges it into the file when accepted, and removes it from browser storage", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith("pawn")));
    const { store, kv } = fileApp(file, legacyKv("rook", "knight"));
    await store.load();

    await store.acceptLegacyImport();

    expect(Object.keys(JSON.parse(file.content).lessons).sort()).toEqual(["knight", "pawn", "rook"]);
    expect(store.isLessonDone("rook")).toBe(true);
    expect(store.getSnapshot().legacyOffer).toBeUndefined();
    expect(kv.data[DIARY_KEY]).toBeUndefined();
  });

  it("leaves the old copy alone and stops asking when declined", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
    const kv = legacyKv("rook");
    const { store } = fileApp(file, kv);
    await store.load();

    store.declineLegacyImport();
    expect(store.getSnapshot().legacyOffer).toBeUndefined();
    expect(kv.data[DIARY_KEY]).toBeDefined();

    const later = fileApp(file, kv);
    await later.store.load();
    expect(later.store.getSnapshot().legacyOffer).toBeUndefined();
  });

  it("keeps the old copy if saving it into the file fails", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
    const { store, kv } = fileApp(file, legacyKv("rook"));
    await store.load();
    file.writeError = new Error("locked");
    await store.acceptLegacyImport();
    expect(kv.data[DIARY_KEY]).toBeDefined();
  });

  it("offers nothing when there is no old progress", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith()));
    const { store } = fileApp(file);
    await store.load();
    expect(store.getSnapshot().legacyOffer).toBeUndefined();
  });

  it("does not offer it in browser-storage mode, where it is the diary", async () => {
    const kv = legacyKv("rook");
    const small = new SmallStore(kv);
    const store = new ProgressStore(new BrowserFallbackStorage(kv, small), {
      legacy: new BrowserLegacy(kv, small),
      small,
    });
    await store.load();
    expect(store.getSnapshot().legacyOffer).toBeUndefined();
    expect(store.isLessonDone("rook")).toBe(true);
  });
});

describe("browser-storage mode: export and import", () => {
  function browserApp(kv = new FakeKeyValueStore(), now = () => T1) {
    const small = new SmallStore(kv);
    const store = new ProgressStore(new BrowserFallbackStorage(kv, small), { now, small });
    return { store, kv, small };
  }

  it("works without a file: ready straight away, saving to the browser", async () => {
    const { store, kv } = browserApp();
    await store.load();
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().status).toEqual({ state: "fallback" });
    await store.completeLesson("pawn");
    expect(JSON.parse(kv.data[DIARY_KEY]).lessons).toHaveProperty("pawn");
  });

  it("does nothing, and does not crash, when asked to pick a file", async () => {
    const { store } = browserApp();
    await store.load();
    await expect(store.chooseFile("create")).resolves.toBeUndefined();
    await expect(store.reconnect()).resolves.toBeUndefined();
    expect(await store.startFreshKeepingCopy()).toBe(false);
  });

  it("exports a dated JSON copy that reads back", async () => {
    const { store } = browserApp(undefined, () => new Date("2026-03-09T12:00:00Z"));
    await store.completeLesson("pawn");
    const exported = store.exportDiary();
    expect(exported.filename).toBe("chess-progress-2026-03-09.json");
    const preview = store.prepareImport(exported.text);
    expect(preview.ok && preview.summary).toEqual({ lessons: 1, games: 0 });
  });

  it("nudges to export after a few visits with progress, and stops after an export", async () => {
    const kv = new FakeKeyValueStore();
    for (let visit = 1; visit < EXPORT_REMINDER_AFTER_SESSIONS; visit++) {
      const { store } = browserApp(kv);
      await store.completeLesson("pawn");
      expect(store.getSnapshot().exportReminder).toBe(false);
    }
    const { store } = browserApp(kv);
    await store.load();
    expect(store.getSnapshot().exportReminder).toBe(true);

    store.exportDiary();
    expect(store.getSnapshot().exportReminder).toBe(false);
    const next = browserApp(kv);
    await next.store.load();
    expect(next.store.getSnapshot().exportReminder).toBe(false);
  });

  it("does not nag someone with nothing to lose", async () => {
    const kv = new FakeKeyValueStore();
    for (let visit = 0; visit < 5; visit++) await browserApp(kv).store.load();
    expect(browserApp(kv).store.getSnapshot().exportReminder).toBe(false);
  });

  describe("import", () => {
    it("explains kindly when the file is not usable", async () => {
      const { store } = browserApp();
      await store.load();
      const notJson = store.prepareImport("hello");
      expect(notJson).toMatchObject({ ok: false });
      expect(!notJson.ok && notJson.message).toMatch(/not valid JSON/);

      const wrong = store.prepareImport(JSON.stringify({ version: 1, lessons: { pawn: 5 } }));
      expect(!wrong.ok && wrong.details.join(" ")).toMatch(/Lesson "pawn"/);

      const newer = store.prepareImport(JSON.stringify({ version: 77 }));
      expect(!newer.ok && newer.message).toMatch(/newer version/);
    });

    it("says an older file was upgraded", async () => {
      const { store } = browserApp();
      await store.load();
      const preview = store.prepareImport(JSON.stringify({ lessons: {} }));
      expect(preview).toMatchObject({ ok: true, migratedFrom: 0 });
    });

    it("asks before replacing existing progress, but not when there is none", async () => {
      const { store } = browserApp();
      await store.load();
      const text = serializeDiary(diaryWith("rook"));
      expect(store.prepareImport(text)).toMatchObject({ ok: true, replacesProgress: false });

      await store.completeLesson("pawn");
      expect(store.prepareImport(text)).toMatchObject({ ok: true, replacesProgress: true });
    });

    it("does not change anything just by checking a file", async () => {
      const { store } = browserApp();
      await store.completeLesson("pawn");
      store.prepareImport(serializeDiary(diaryWith("rook")));
      expect(store.isLessonDone("pawn")).toBe(true);
      expect(store.isLessonDone("rook")).toBe(false);
    });

    it("replaces the diary when applied, and saves it", async () => {
      const { store, kv } = browserApp();
      await store.completeLesson("pawn");
      const preview = store.prepareImport(serializeDiary(diaryWith("rook", "queen")));
      if (!preview.ok) throw new Error("setup");

      expect(await store.applyImport(preview.diary)).toBe(true);
      expect(store.isLessonDone("pawn")).toBe(false);
      expect(store.isLessonDone("queen")).toBe(true);
      expect(Object.keys(JSON.parse(kv.data[DIARY_KEY]).lessons).sort()).toEqual(["queen", "rook"]);
    });

    it("cannot apply before the diary has loaded", async () => {
      const file = new FakeFileHandle("x.json", "");
      file.permission = "prompt";
      const { store } = fileApp(file);
      await store.load();
      expect(await store.applyImport(diaryWith("pawn"))).toBe(false);
    });
  });
});
