import type { Diary } from "./diary";
import type { StorageStatus } from "./status";

export interface SaveOptions {
  /**
   * Write now. Use for meaningful moments (finishing a lesson or a game). Without it the save
   * is debounced: several quick saves become one write a moment later.
   */
  immediate?: boolean;
}

/** Actions only the file-based diary has. Each one needs a click, because browsers insist. */
export interface FileConnection {
  /**
   * Choose the diary file: "create" makes a new one, "open" picks an existing one. If the file is
   * new or empty, `seed` (when given) is written into it instead of a blank diary.
   */
  chooseFile(mode: "create" | "open", seed?: Diary): Promise<void>;
  /** Allow access again to the file chosen earlier. */
  reconnect(): Promise<void>;
  /**
   * For a file that could not be read: first save a copy of it (the person picks where), then
   * start a fresh diary in its place. Resolves false, changing nothing, if they cancel the copy.
   */
  startFreshKeepingCopy(): Promise<boolean>;
}

/**
 * Where the diary lives. The app only knows this interface; whether it is a file on the
 * person's disk, browser storage or memory is decided once, in getStorage().
 */
export interface StorageAdapter {
  readonly kind: "file" | "browser" | "memory";
  getStatus(): StorageStatus;
  /** Called whenever the status changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /**
   * Reads the diary, or a fresh one if nothing was saved yet. Throws StorageUnavailableError
   * when the person has to act first (choose a file, reconnect) or the file is unusable.
   */
  load(): Promise<Diary>;
  save(diary: Diary, options?: SaveOptions): Promise<void>;
  /** Writes any debounced save that has not happened yet. */
  flush(): Promise<void>;
  /** Present only for the file-based diary. */
  readonly file?: FileConnection;
}
