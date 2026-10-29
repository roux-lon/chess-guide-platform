import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import type { StorageAdapter } from "./StorageAdapter";
import type { StorageStatus } from "./status";

/** Keeps the diary in memory only. For tests, and for server rendering where there is no browser. */
export class MemoryStorage implements StorageAdapter {
  readonly kind = "memory";
  private readonly status: StorageStatus = { state: "memory" };
  private diary: Diary | null;

  constructor(initial: Diary | null = null) {
    this.diary = initial;
  }

  getStatus = (): StorageStatus => this.status;
  subscribe = (): (() => void) => () => {};

  async load(): Promise<Diary> {
    return this.diary ? structuredClone(this.diary) : createEmptyDiary();
  }

  async save(diary: Diary): Promise<void> {
    this.diary = structuredClone(diary);
  }

  async flush(): Promise<void> {}
}
