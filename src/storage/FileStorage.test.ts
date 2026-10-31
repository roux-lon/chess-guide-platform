import { describe, expect, it, vi } from "vitest";
import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import { serializeDiary } from "./exportImport";
import { FileStorage } from "./FileStorage";
import { MemoryHandleStore } from "./handleStore";
import { SmallStore } from "./smallStore";
import { StorageUnavailableError } from "./status";
import { FakeFileHandle, FakeKeyValueStore, FakePicker, domError, manualTimers } from "./testing";

const NOW = new Date("2026-04-01T09:00:00Z");
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function diaryWith(lessons: string[]): Diary {
  const diary = createEmptyDiary(NOW);
  for (const id of lessons) diary.lessons[id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
  return diary;
}

function setup(handle?: FakeFileHandle) {
  const handles = new MemoryHandleStore(handle ?? null);
  const picker = new FakePicker();
  const kv = new FakeKeyValueStore();
  const clock = manualTimers();
  const storage = new FileStorage({
    handles,
    picker,
    small: new SmallStore(kv),
    now: () => NOW,
    timers: clock.timers,
  });
  return { storage, handles, picker, kv, clock };
}

/** A fresh FileStorage over the same remembered file: what happens when the browser is reopened. */
function reopen(handles: MemoryHandleStore, picker = new FakePicker()) {
  return new FileStorage({ handles, picker, now: () => NOW, timers: manualTimers().timers });
}

describe("first run", () => {
  it("starts with no file chosen", async () => {
    const { storage } = setup();
    await expect(storage.load()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(storage.getStatus()).toEqual({ state: "unconfigured" });
  });

  it("creates a new diary file and writes a blank diary into it", async () => {
    const { storage, picker, handles, kv } = setup();
    const created = new FakeFileHandle("chess-progress.json", "");
    picker.next = created;

    await storage.file.chooseFile("create");

    expect(picker.calls).toEqual(["create"]);
    expect(storage.getStatus()).toEqual({ state: "connected", fileName: "chess-progress.json" });
    expect(JSON.parse(created.content)).toMatchObject({ version: 4, lessons: {} });
    expect(await handles.get()).toBe(created);
    // Only a tiny hint is kept in browser storage, never the diary.
    expect(Object.keys(kv.data)).toEqual(["chess-coach.small"]);
    expect(kv.data["chess-coach.small"]).not.toMatch(/lessons/);
  });

  it("writes a seed diary into a new file, so progress can move to a new place", async () => {
    const { storage, picker } = setup();
    const created = new FakeFileHandle("moved.json", "");
    picker.next = created;
    await storage.file.chooseFile("create", diaryWith(["pawn", "rook"]));
    expect(Object.keys(JSON.parse(created.content).lessons).sort()).toEqual(["pawn", "rook"]);
  });

  it("opens an existing diary file and reads it without writing to it", async () => {
    const { storage, picker } = setup();
    const existing = new FakeFileHandle("mine.json", serializeDiary(diaryWith(["pawn"])));
    picker.next = existing;

    await storage.file.chooseFile("open");

    expect(picker.calls).toEqual(["open"]);
    const diary = await storage.load();
    expect(Object.keys(diary.lessons)).toEqual(["pawn"]);
    expect(existing.writes).toEqual([]);
  });

  it("changes nothing when the person closes the file dialog", async () => {
    const { storage, picker, handles } = setup();
    picker.next = null;
    await storage.file.chooseFile("create");
    expect(storage.getStatus()).toEqual({ state: "unconfigured" });
    expect(await handles.get()).toBeNull();
  });
});

describe("coming back later", () => {
  it("asks to reconnect when the browser wants a click, then restores all progress", async () => {
    // Session 1: choose a file and save progress.
    const first = setup();
    const file = new FakeFileHandle();
    first.picker.next = file;
    await first.storage.file.chooseFile("create");
    await first.storage.save(diaryWith(["pawn", "rook", "knight"]), { immediate: true });

    // Browser closed and reopened: permission has to be granted again.
    file.permission = "prompt";
    const second = reopen(first.handles);
    await expect(second.load()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(second.getStatus()).toEqual({ state: "needs-reconnect", fileName: "chess-progress.json" });

    // The person clicks Reconnect and allows access.
    await second.file.reconnect();
    expect(second.getStatus()).toEqual({ state: "connected", fileName: "chess-progress.json" });
    const diary = await second.load();
    expect(Object.keys(diary.lessons).sort()).toEqual(["knight", "pawn", "rook"]);
  });

  it("skips the click when the browser still remembers permission", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith(["pawn"])));
    const storage = reopen(new MemoryHandleStore(file));
    expect(Object.keys((await storage.load()).lessons)).toEqual(["pawn"]);
    expect(storage.getStatus().state).toBe("connected");
  });

  it("explains kindly when permission is refused, and lets the person try again", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith(["pawn"])));
    file.permission = "prompt";
    file.requestAnswer = "denied";
    const storage = reopen(new MemoryHandleStore(file));
    await storage.file.reconnect();
    const status = storage.getStatus();
    expect(status).toMatchObject({ state: "problem", problem: "permission-denied" });
    if (status.state === "problem") expect(status.message).toMatch(/Reconnect/);

    file.requestAnswer = "granted";
    await storage.file.reconnect();
    expect(storage.getStatus().state).toBe("connected");
  });

  it("copes with the file store itself failing", async () => {
    const broken = {
      get: async () => {
        throw new Error("IndexedDB is blocked");
      },
      set: async () => {},
      clear: async () => {},
    };
    const storage = new FileStorage({ handles: broken, picker: new FakePicker() });
    await expect(storage.load()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(storage.getStatus()).toEqual({ state: "unconfigured" });
  });
});

describe("a file that goes missing", () => {
  it("says it cannot find the file, and lets the person start a new one with their progress", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith(["pawn"])));
    const { storage, picker } = setup(file);
    await storage.load();

    file.missing = true;
    await expect(storage.save(diaryWith(["pawn", "rook"]), { immediate: true })).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    const status = storage.getStatus();
    expect(status).toMatchObject({ state: "problem", problem: "file-missing" });
    if (status.state === "problem") expect(status.message).toMatch(/moved|deleted/);

    const replacement = new FakeFileHandle("new-place.json", "");
    picker.next = replacement;
    await storage.file.chooseFile("create", diaryWith(["pawn", "rook"]));
    expect(storage.getStatus()).toEqual({ state: "connected", fileName: "new-place.json" });
    expect(Object.keys(JSON.parse(replacement.content).lessons).sort()).toEqual(["pawn", "rook"]);
  });

  it("reports a missing file when loading", async () => {
    const file = new FakeFileHandle();
    file.missing = true;
    const { storage } = setup(file);
    await expect(storage.load()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(storage.getStatus()).toMatchObject({ problem: "file-missing" });
  });

  it("reports other read failures without crashing", async () => {
    const file = new FakeFileHandle();
    file.readError = new Error("disk on fire");
    const { storage } = setup(file);
    await expect(storage.load()).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(storage.getStatus()).toMatchObject({ problem: "read-failed" });
  });
});

describe("a file that cannot be read", () => {
  const bad = [
    ["not JSON", "{this is not json"],
    ["wrong shape", JSON.stringify({ version: 1, lessons: { pawn: 5 } })],
    ["from a newer app", JSON.stringify({ version: 42 })],
    ["not a diary at all", JSON.stringify([1, 2, 3])],
  ] as const;

  for (const [name, text] of bad) {
    it(`never overwrites a diary that is ${name}`, async () => {
      const file = new FakeFileHandle("chess-progress.json", text);
      const { storage } = setup(file);

      await expect(storage.load()).rejects.toBeInstanceOf(StorageUnavailableError);
      expect(storage.getStatus()).toMatchObject({ state: "problem", problem: "invalid-file" });

      // Nothing can write to it, now or later.
      await expect(storage.save(diaryWith(["pawn"]), { immediate: true })).rejects.toBeInstanceOf(
        StorageUnavailableError,
      );
      await expect(storage.save(diaryWith(["pawn"]))).rejects.toBeInstanceOf(StorageUnavailableError);
      await storage.flush();
      expect(file.writes).toEqual([]);
      expect(file.content).toBe(text);
    });
  }

  it("says what is wrong with a diary that has the wrong shape", async () => {
    const file = new FakeFileHandle("chess-progress.json", JSON.stringify({ version: 1, lessons: { pawn: 5 } }));
    const { storage } = setup(file);
    await storage.load().catch(() => {});
    const status = storage.getStatus();
    expect(status.state === "problem" && status.details?.join(" ")).toMatch(/Lesson "pawn"/);
  });

  it("tells a newer-version file apart", async () => {
    const file = new FakeFileHandle("chess-progress.json", JSON.stringify({ version: 42 }));
    const { storage } = setup(file);
    await storage.load().catch(() => {});
    const status = storage.getStatus();
    expect(status.state === "problem" && status.message).toMatch(/newer version/);
  });

  it("keeps a copy first, then starts fresh", async () => {
    const original = "{this is not json";
    const file = new FakeFileHandle("chess-progress.json", original);
    const { storage, picker } = setup(file);
    await storage.load().catch(() => {});

    const result = await storage.file.startFreshKeepingCopy();

    expect(result).toBe(true);
    expect(picker.copies).toEqual([{ name: "chess-progress.backup.json", text: original }]);
    expect(JSON.parse(file.content)).toMatchObject({ version: 4, lessons: {} });
    expect(storage.getStatus()).toEqual({ state: "connected", fileName: "chess-progress.json" });
    // And saving works again.
    await storage.save(diaryWith(["pawn"]), { immediate: true });
    expect(JSON.parse(file.content).lessons).toHaveProperty("pawn");
  });

  it("leaves the file alone if the person does not save the copy", async () => {
    const original = "{this is not json";
    const file = new FakeFileHandle("chess-progress.json", original);
    const { storage, picker } = setup(file);
    await storage.load().catch(() => {});
    picker.copyAccepted = false;

    expect(await storage.file.startFreshKeepingCopy()).toBe(false);
    expect(file.content).toBe(original);
    expect(file.writes).toEqual([]);
    expect(storage.getStatus()).toMatchObject({ problem: "invalid-file" });
  });

  it("has nothing to start fresh from when the file was fine", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const { storage } = setup(file);
    await storage.load();
    expect(await storage.file.startFreshKeepingCopy()).toBe(false);
  });

  it("lets the person choose a different file instead", async () => {
    const file = new FakeFileHandle("chess-progress.json", "garbage");
    const { storage, picker } = setup(file);
    await storage.load().catch(() => {});
    picker.next = new FakeFileHandle("other.json", serializeDiary(diaryWith(["rook"])));
    await storage.file.chooseFile("open");
    expect(storage.getStatus()).toEqual({ state: "connected", fileName: "other.json" });
    expect(file.content).toBe("garbage");
  });
});

describe("older files", () => {
  it("reads a diary with no version number and upgrades it in memory, without rewriting the file", async () => {
    const text = JSON.stringify({ lessons: { pawn: { status: "done", completedAt: "2026-01-01T00:00:00.000Z" } } });
    const file = new FakeFileHandle("chess-progress.json", text);
    const { storage } = setup(file);

    const diary = await storage.load();
    expect(diary.version).toBe(4);
    expect(Object.keys(diary.lessons)).toEqual(["pawn"]);
    expect(file.writes).toEqual([]);
    expect(file.content).toBe(text);

    await storage.save(diary, { immediate: true });
    expect(JSON.parse(file.content).version).toBe(4);
  });
});

describe("saving", () => {
  it("is debounced: many quick saves become one write after a quiet moment", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const { storage, clock } = setup(file);
    await storage.load();

    await storage.save(diaryWith(["a"]));
    await storage.save(diaryWith(["a", "b"]));
    await storage.save(diaryWith(["a", "b", "c"]));
    expect(file.writes).toEqual([]);

    clock.fire();
    await tick();
    expect(file.writes).toHaveLength(1);
    expect(Object.keys(JSON.parse(file.content).lessons)).toEqual(["a", "b", "c"]);
  });

  it("writes straight away when asked (finishing a lesson or a game)", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const { storage, clock } = setup(file);
    await storage.load();

    await storage.save(diaryWith(["a"]));
    await storage.save(diaryWith(["a", "b"]), { immediate: true });
    expect(file.writes).toHaveLength(1);
    expect(Object.keys(JSON.parse(file.content).lessons)).toEqual(["a", "b"]);
    // The older waiting save is gone, so nothing more is written later.
    clock.fire();
    await tick();
    expect(file.writes).toHaveLength(1);
  });

  it("flush writes a waiting save", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const { storage } = setup(file);
    await storage.load();
    await storage.save(diaryWith(["a"]));
    await storage.flush();
    expect(file.writes).toHaveLength(1);
  });

  it("writes pretty JSON that reads back", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const { storage } = setup(file);
    await storage.load();
    await storage.save(diaryWith(["a"]), { immediate: true });
    expect(file.content).toContain("\n  ");
    expect(JSON.parse(file.content).lessons.a.status).toBe("done");
  });

  it("refuses to save before a file is connected", async () => {
    const { storage } = setup();
    await expect(storage.save(diaryWith([]), { immediate: true })).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it("flushes a waiting save to the old file before switching files", async () => {
    const oldFile = new FakeFileHandle("old.json", serializeDiary(diaryWith([])));
    const { storage, picker } = setup(oldFile);
    await storage.load();
    await storage.save(diaryWith(["a"]));

    picker.next = new FakeFileHandle("new.json", serializeDiary(diaryWith([])));
    await storage.file.chooseFile("open");
    expect(Object.keys(JSON.parse(oldFile.content).lessons)).toEqual(["a"]);
    expect(storage.getStatus()).toEqual({ state: "connected", fileName: "new.json" });
  });
});

describe("when writing fails", () => {
  async function connected() {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(diaryWith([])));
    const parts = setup(file);
    await parts.storage.load();
    return { file, ...parts };
  }

  it("keeps going: tells the caller, shows a kind message, and recovers on the next try", async () => {
    const { storage, file } = await connected();
    file.writeError = new Error("file is locked");

    await expect(storage.save(diaryWith(["a"]), { immediate: true })).rejects.toBeInstanceOf(StorageUnavailableError);
    const status = storage.getStatus();
    expect(status).toMatchObject({ state: "problem", problem: "write-failed" });
    if (status.state === "problem") expect(status.message).toMatch(/still here on screen/);

    file.writeError = null;
    await storage.save(diaryWith(["a"]), { immediate: true });
    expect(storage.getStatus().state).toBe("connected");
    expect(JSON.parse(file.content).lessons).toHaveProperty("a");
  });

  it("reports a failed background save through the status, without an unhandled error", async () => {
    const { storage, file, clock } = await connected();
    file.writeError = new Error("disk full");
    await storage.save(diaryWith(["a"]));
    clock.fire();
    await tick();
    expect(storage.getStatus()).toMatchObject({ problem: "write-failed" });
  });

  it("tells permission problems and missing files apart from other failures", async () => {
    const { storage, file } = await connected();
    file.writeError = domError("NotAllowedError");
    await storage.save(diaryWith(["a"]), { immediate: true }).catch(() => {});
    expect(storage.getStatus()).toMatchObject({ problem: "permission-denied" });
  });
});

describe("status", () => {
  it("tells listeners about changes, but not about a repeat of the same status", async () => {
    const { storage, picker } = setup();
    const listener = vi.fn();
    const stop = storage.subscribe(listener);

    await storage.load().catch(() => {});
    expect(listener).not.toHaveBeenCalled(); // already "unconfigured"

    picker.next = new FakeFileHandle();
    await storage.file.chooseFile("create");
    expect(listener).toHaveBeenCalled();

    const calls = listener.mock.calls.length;
    await storage.load();
    expect(listener).toHaveBeenCalledTimes(calls);

    stop();
    picker.next = new FakeFileHandle("another.json");
    await storage.file.chooseFile("create");
    expect(listener).toHaveBeenCalledTimes(calls);
  });
});
