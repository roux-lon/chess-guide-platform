import { createEmptyDiary, parseDiary } from "./diary";
import type { Diary } from "./diary";
import type { StorageAdapter } from "./StorageAdapter";

/** The slice of the Web Storage API we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const DIARY_KEY = "chess-coach-diary";
export const CORRUPT_KEY = "chess-coach-diary.corrupt";

/** Keeps the diary in the browser's localStorage. Simple, but only on this browser and this device. */
export class BrowserStorage implements StorageAdapter {
  /**
   * @param store defaults to window.localStorage, looked up lazily so that creating this
   *   object during server rendering is harmless
   */
  constructor(private readonly store?: KeyValueStore) {}

  private resolve(): KeyValueStore {
    return this.store ?? window.localStorage;
  }

  async load(): Promise<Diary> {
    const store = this.resolve();
    const text = store.getItem(DIARY_KEY);
    if (text === null) return createEmptyDiary();
    try {
      return parseDiary(JSON.parse(text));
    } catch {
      // Do not lose what we could not read: keep a copy, then start fresh.
      store.setItem(CORRUPT_KEY, text);
      return createEmptyDiary();
    }
  }

  async save(diary: Diary): Promise<void> {
    this.resolve().setItem(DIARY_KEY, JSON.stringify(diary));
  }
}
