import { describe, expect, it } from "vitest";
import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import { BrowserFallbackStorage, CORRUPT_KEY, DIARY_KEY } from "./fallbackStorage";
import { FileStorage } from "./FileStorage";
import { createStorageServices, supportsFileSystemAccess } from "./getStorage";
import type { BrowserLike } from "./getStorage";
import { BrowserLegacy, noLegacy } from "./legacy";
import { MemoryStorage } from "./memoryStorage";
import { SMALL_KEY, SmallStore } from "./smallStore";
import type { StorageAdapter } from "./StorageAdapter";
import { FakeKeyValueStore } from "./testing";

function diaryWith(...lessons: string[]): Diary {
  const diary = createEmptyDiary();
  for (const id of lessons) diary.lessons[id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
  return diary;
}

describe("BrowserFallbackStorage", () => {
  it("is the fallback mode, with no file", () => {
    const storage: StorageAdapter = new BrowserFallbackStorage(new FakeKeyValueStore());
    expect(storage.kind).toBe("browser");
    expect(storage.getStatus()).toEqual({ state: "fallback" });
    expect(storage.file).toBeUndefined();
  });

  it("starts empty, then saves and loads", async () => {
    const kv = new FakeKeyValueStore();
    const storage = new BrowserFallbackStorage(kv);
    expect((await storage.load()).lessons).toEqual({});
    await storage.save(diaryWith("pawn"));
    expect(kv.data[DIARY_KEY]).toBeDefined();
    expect(Object.keys((await new BrowserFallbackStorage(kv).load()).lessons)).toEqual(["pawn"]);
  });

  it("reads and upgrades a diary written by an older version", async () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, JSON.stringify({ lessons: { pawn: { status: "done", completedAt: "x" } } }));
    const diary = await new BrowserFallbackStorage(kv).load();
    expect(diary.version).toBe(2);
    expect(diary.lessons).toHaveProperty("pawn");
  });

  it("keeps a copy of unreadable data and starts fresh", async () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, "{not json");
    const diary = await new BrowserFallbackStorage(kv).load();
    expect(diary.lessons).toEqual({});
    expect(kv.data[CORRUPT_KEY]).toBe("{not json");
  });

  it("keeps a copy of a diary from a newer version rather than losing it", async () => {
    const kv = new FakeKeyValueStore();
    const text = JSON.stringify({ version: 99 });
    kv.setItem(DIARY_KEY, text);
    await new BrowserFallbackStorage(kv).load();
    expect(kv.data[CORRUPT_KEY]).toBe(text);
  });

  it("counts visits for the export reminder", async () => {
    const kv = new FakeKeyValueStore();
    const small = new SmallStore(kv);
    await new BrowserFallbackStorage(kv, small).load();
    await new BrowserFallbackStorage(kv, small).load();
    expect(small.sessionsSinceExport()).toBe(2);
    small.markExported();
    expect(small.sessionsSinceExport()).toBe(0);
  });
});

describe("SmallStore", () => {
  it("keeps only tiny hints", () => {
    const kv = new FakeKeyValueStore();
    const small = new SmallStore(kv);
    small.setConnectedFile("chess-progress.json");
    small.setLegacyDeclined();
    expect(small.getConnectedFile()).toBe("chess-progress.json");
    expect(small.legacyDeclined()).toBe(true);
    expect(Object.keys(kv.data)).toEqual([SMALL_KEY]);
  });

  it("survives broken or blocked storage", () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(SMALL_KEY, "{broken");
    expect(new SmallStore(kv).sessionsSinceExport()).toBe(0);
    expect(new SmallStore(kv).legacyDeclined()).toBe(false);

    const blocked = new SmallStore({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => blocked.setConnectedFile("x")).not.toThrow();
    expect(blocked.getConnectedFile()).toBeUndefined();
    expect(new SmallStore(undefined).noteSessionStart()).toBe(1);
  });
});

describe("BrowserLegacy (progress an earlier version kept in the browser)", () => {
  it("offers a readable diary that has progress", () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, JSON.stringify(diaryWith("pawn", "rook")));
    const legacy = new BrowserLegacy(kv, new SmallStore(kv));
    expect(Object.keys(legacy.peek()?.lessons ?? {}).sort()).toEqual(["pawn", "rook"]);
  });

  it("offers nothing when there is nothing there, it is empty, or it is unreadable", () => {
    const empty = new FakeKeyValueStore();
    expect(new BrowserLegacy(empty, new SmallStore(empty)).peek()).toBeNull();

    const blank = new FakeKeyValueStore();
    blank.setItem(DIARY_KEY, JSON.stringify(createEmptyDiary()));
    expect(new BrowserLegacy(blank, new SmallStore(blank)).peek()).toBeNull();

    const broken = new FakeKeyValueStore();
    broken.setItem(DIARY_KEY, "{nope");
    expect(new BrowserLegacy(broken, new SmallStore(broken)).peek()).toBeNull();
    expect(noLegacy.peek()).toBeNull();
  });

  it("stops offering after the person declines, but keeps their data", () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, JSON.stringify(diaryWith("pawn")));
    const legacy = new BrowserLegacy(kv, new SmallStore(kv));
    legacy.decline();
    expect(legacy.peek()).toBeNull();
    expect(kv.data[DIARY_KEY]).toBeDefined();
  });

  it("removes the old copy once it has been brought over", () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(DIARY_KEY, JSON.stringify(diaryWith("pawn")));
    const legacy = new BrowserLegacy(kv, new SmallStore(kv));
    legacy.discard();
    expect(kv.data[DIARY_KEY]).toBeUndefined();
    expect(legacy.peek()).toBeNull();
  });
});

describe("choosing the storage (feature detection)", () => {
  const fn = () => {};
  const withFiles: BrowserLike = {
    showOpenFilePicker: fn,
    showSaveFilePicker: fn,
    indexedDB: {} as IDBFactory,
    localStorage: new FakeKeyValueStore(),
  };

  it("detects the File System Access API", () => {
    expect(supportsFileSystemAccess(withFiles)).toBe(true);
    expect(supportsFileSystemAccess({ ...withFiles, showSaveFilePicker: undefined })).toBe(false);
    expect(supportsFileSystemAccess({ ...withFiles, showOpenFilePicker: undefined })).toBe(false);
    expect(supportsFileSystemAccess({ ...withFiles, indexedDB: undefined })).toBe(false);
    expect(supportsFileSystemAccess({ localStorage: new FakeKeyValueStore() })).toBe(false);
  });

  it("uses a file in Chrome and Edge", () => {
    const { storage } = createStorageServices(withFiles);
    expect(storage).toBeInstanceOf(FileStorage);
    expect(storage.kind).toBe("file");
    expect(storage.file).toBeDefined();
  });

  it("falls back to browser storage in Firefox and Safari", () => {
    const { storage } = createStorageServices({ localStorage: new FakeKeyValueStore() });
    expect(storage).toBeInstanceOf(BrowserFallbackStorage);
  });

  it("still works when the browser blocks localStorage", async () => {
    const blocked = {
      get localStorage(): never {
        throw new Error("SecurityError");
      },
    } as unknown as BrowserLike;
    const { storage } = createStorageServices(blocked);
    expect(storage).toBeInstanceOf(BrowserFallbackStorage);
  });

  it("uses memory only when there is no browser (server rendering)", () => {
    const { storage, legacy } = createStorageServices(undefined);
    expect(storage).toBeInstanceOf(MemoryStorage);
    expect(legacy.peek()).toBeNull();
  });
});
