import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import type { StorageAdapter } from "./StorageAdapter";

/** Keeps the diary in memory only. For tests, and as a fallback when browser storage is blocked. */
export class MemoryStorage implements StorageAdapter {
  private diary: Diary | null;

  constructor(initial: Diary | null = null) {
    this.diary = initial;
  }

  async load(): Promise<Diary> {
    return this.diary ? structuredClone(this.diary) : createEmptyDiary();
  }

  async save(diary: Diary): Promise<void> {
    this.diary = structuredClone(diary);
  }
}
