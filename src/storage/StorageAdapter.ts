import type { Diary } from "./diary";

/**
 * Where the diary lives. Phase 4 has a browser version; the file version (File System
 * Access API) arrives in phase 5. Everything above storage/ only knows this interface.
 */
export interface StorageAdapter {
  /** Reads the diary, or a fresh empty one if nothing has been saved yet. */
  load(): Promise<Diary>;
  /** Writes the whole diary. Callers save on meaningful moments, not on every move. */
  save(diary: Diary): Promise<void>;
}
