import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import { readDiaryText } from "./read";
import { SmallStore } from "./smallStore";
import type { KeyValueStore } from "./smallStore";
import type { StorageAdapter } from "./StorageAdapter";
import type { StorageStatus } from "./status";

export const DIARY_KEY = "chess-coach-diary";
export const CORRUPT_KEY = "chess-coach-diary.corrupt";

/**
 * For browsers that cannot keep a file (Firefox, Safari): the whole diary lives in
 * localStorage, and the person is nudged to export a copy now and then.
 */
export class BrowserFallbackStorage implements StorageAdapter {
  readonly kind = "browser";
  private readonly status: StorageStatus = { state: "fallback" };
  private readonly small: SmallStore;

  /**
   * @param store defaults to window.localStorage, looked up lazily so that creating this object
   *   during server rendering is harmless
   */
  constructor(
    private readonly store?: KeyValueStore,
    small?: SmallStore,
  ) {
    this.small = small ?? new SmallStore(store);
  }

  private resolve(): KeyValueStore {
    return this.store ?? window.localStorage;
  }

  getStatus = (): StorageStatus => this.status;
  subscribe = (): (() => void) => () => {};

  async load(): Promise<Diary> {
    const store = this.resolve();
    this.small.noteSessionStart();

    const text = store.getItem(DIARY_KEY);
    if (text === null) return createEmptyDiary();

    const result = readDiaryText(text);
    if (result.ok) return result.diary;

    // Do not lose what we could not read: keep a copy, then start fresh.
    store.setItem(CORRUPT_KEY, text);
    return createEmptyDiary();
  }

  async save(diary: Diary): Promise<void> {
    // localStorage writes are instant and small, so there is nothing to debounce here.
    this.resolve().setItem(DIARY_KEY, JSON.stringify(diary));
  }

  async flush(): Promise<void> {}
}
