import { createEmptyDiary } from "./diary";
import type { Diary } from "./diary";
import { DebouncedWriter } from "./debounce";
import type { Timers } from "./debounce";
import { DIARY_FILENAME, serializeDiary } from "./exportImport";
import type { FileHandleLike, FilePicker, HandleStore, PermissionResult } from "./fsTypes";
import { readDiaryText } from "./read";
import { SmallStore } from "./smallStore";
import type { FileConnection, SaveOptions, StorageAdapter } from "./StorageAdapter";
import { StorageUnavailableError, problemStatus } from "./status";
import type { StorageProblem, StorageStatus } from "./status";

export interface FileStorageOptions {
  handles: HandleStore;
  picker: FilePicker;
  /** Tiny hints kept in browser storage, such as the name of the connected file. */
  small?: SmallStore;
  now?: () => Date;
  /** How long a routine save waits for quiet before it is written. */
  saveDelayMs?: number;
  timers?: Timers;
  /** Write any waiting save when the page is hidden or closed (best effort). */
  flushOnHide?: boolean;
}

const BACKUP_NAME = "chess-progress.backup.json";

const errorName = (error: unknown): string =>
  typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";

function problemFor(error: unknown, otherwise: StorageProblem): StorageProblem {
  const name = errorName(error);
  if (name === "NotFoundError") return "file-missing";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-denied";
  return otherwise;
}

/**
 * The diary as a JSON file the person chose on their own computer, using the File System
 * Access API (Chrome and Edge on desktop). The chosen file is remembered in IndexedDB; in a
 * new visit the browser needs one click ("Reconnect") before it lets us touch the file again.
 *
 * Safety rules: a file we cannot read is never overwritten (we offer to save a copy first),
 * and routine saves are debounced so the file is not rewritten for every little change.
 */
export class FileStorage implements StorageAdapter {
  readonly kind = "file";

  private status: StorageStatus = { state: "unconfigured" };
  private listeners = new Set<() => void>();
  private handle: FileHandleLike | null = null;
  /** Text of a file we could not read, kept so a copy can be offered. */
  private unreadableText: string | null = null;
  private readonly writer: DebouncedWriter<Diary>;
  private readonly handles: HandleStore;
  private readonly picker: FilePicker;
  private readonly small: SmallStore;
  private readonly now: () => Date;
  private stopHideListener?: () => void;

  readonly file: FileConnection = {
    chooseFile: (mode, seed) => this.chooseFile(mode, seed),
    reconnect: () => this.reconnect(),
    startFreshKeepingCopy: () => this.startFreshKeepingCopy(),
  };

  constructor({
    handles,
    picker,
    small = new SmallStore(undefined),
    now = () => new Date(),
    saveDelayMs = 2000,
    timers,
    flushOnHide = false,
  }: FileStorageOptions) {
    this.handles = handles;
    this.picker = picker;
    this.small = small;
    this.now = now;
    this.writer = new DebouncedWriter((diary) => this.writeDiary(diary), saveDelayMs, timers);
    if (flushOnHide && typeof document !== "undefined") {
      const onHide = () => {
        if (document.visibilityState === "hidden") void this.flush().catch(() => {});
      };
      document.addEventListener("visibilitychange", onHide);
      this.stopHideListener = () => document.removeEventListener("visibilitychange", onHide);
    }
  }

  getStatus = (): StorageStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async load(): Promise<Diary> {
    const handle = await this.rememberedHandle();
    if (!handle) {
      this.setStatus({ state: "unconfigured" });
      throw new StorageUnavailableError(this.status);
    }
    if ((await this.permissionOf(handle)) !== "granted") {
      this.setStatus({ state: "needs-reconnect", fileName: handle.name });
      throw new StorageUnavailableError(this.status);
    }
    return this.readFrom(handle);
  }

  async save(diary: Diary, options: SaveOptions = {}): Promise<void> {
    if (!this.canWrite()) throw new StorageUnavailableError(this.status);
    if (options.immediate) return this.writer.writeNow(diary);
    this.writer.schedule(diary);
  }

  flush(): Promise<void> {
    return this.writer.flush();
  }

  dispose(): void {
    this.stopHideListener?.();
    this.writer.cancel();
  }

  // ---- actions that need a click ----

  private async chooseFile(mode: "create" | "open", seed?: Diary): Promise<void> {
    const picked = mode === "create" ? await this.picker.pickNew(DIARY_FILENAME) : await this.picker.pickExisting();
    if (!picked) return; // the person closed the dialog

    // Anything still waiting belongs to the file we are leaving.
    if (this.canWrite()) await this.flush().catch(() => {});

    await this.handles.set(picked).catch(() => {
      // Not remembered for next time, but it still works for this visit.
    });
    await this.readFromQuietly(picked, seed);
  }

  private async reconnect(): Promise<void> {
    const handle = await this.rememberedHandle();
    if (!handle) {
      this.setStatus({ state: "unconfigured" });
      return;
    }
    let permission: PermissionResult;
    try {
      permission = handle.requestPermission ? await handle.requestPermission({ mode: "readwrite" }) : "granted";
    } catch {
      permission = "denied";
    }
    if (permission !== "granted") {
      this.setStatus(problemStatus("permission-denied", handle.name));
      return;
    }
    await this.readFromQuietly(handle);
  }

  private async startFreshKeepingCopy(): Promise<boolean> {
    const handle = this.handle;
    const text = this.unreadableText;
    if (!handle || text === null) return false;

    // The old file is only replaced after a copy of it is safely saved somewhere else.
    let copied = false;
    try {
      copied = await this.picker.saveCopy(BACKUP_NAME, text);
    } catch {
      copied = false;
    }
    if (!copied) return false;

    const fresh = createEmptyDiary(this.now());
    try {
      await this.writeToHandle(handle, fresh);
    } catch {
      return false; // writeToHandle has already set the status
    }
    this.unreadableText = null;
    this.adopt(handle);
    return true;
  }

  // ---- reading and writing ----

  /** Reads the file. For a new, empty file, writes `seed` (or a blank diary) into it first. */
  private async readFrom(handle: FileHandleLike, seed?: Diary): Promise<Diary> {
    let text: string;
    try {
      text = await (await handle.getFile()).text();
    } catch (error) {
      this.setStatus(problemStatus(problemFor(error, "read-failed"), handle.name));
      throw new StorageUnavailableError(this.status);
    }

    if (text.trim() === "") {
      const diary = seed ?? createEmptyDiary(this.now());
      await this.writeToHandle(handle, diary);
      this.adopt(handle);
      return diary;
    }

    const result = readDiaryText(text);
    if (!result.ok) {
      this.handle = handle;
      this.unreadableText = text;
      this.writer.cancel();
      this.setStatus(
        problemStatus(
          "invalid-file",
          handle.name,
          result.problems,
          result.kind === "future-version" ? result.message : undefined,
        ),
      );
      throw new StorageUnavailableError(this.status);
    }

    this.unreadableText = null;
    this.adopt(handle);
    return result.diary;
  }

  /** readFrom for actions: a problem is shown through the status instead of thrown. */
  private async readFromQuietly(handle: FileHandleLike, seed?: Diary): Promise<void> {
    try {
      await this.readFrom(handle, seed);
    } catch (error) {
      if (!(error instanceof StorageUnavailableError)) throw error;
    }
  }

  private async writeDiary(diary: Diary): Promise<void> {
    const handle = this.handle;
    if (!handle) throw new StorageUnavailableError(this.status);
    await this.writeToHandle(handle, diary);
    if (this.status.state !== "connected") this.adopt(handle);
  }

  private async writeToHandle(handle: FileHandleLike, diary: Diary): Promise<void> {
    try {
      const writable = await handle.createWritable();
      await writable.write(serializeDiary(diary));
      await writable.close();
    } catch (error) {
      this.setStatus(problemStatus(problemFor(error, "write-failed"), handle.name));
      throw new StorageUnavailableError(this.status);
    }
  }

  // ---- bookkeeping ----

  private adopt(handle: FileHandleLike): void {
    this.handle = handle;
    this.small.setConnectedFile(handle.name);
    this.setStatus({ state: "connected", fileName: handle.name });
  }

  /** A failed write does not stop later tries; an unreadable or unconnected file does. */
  private canWrite(): boolean {
    if (!this.handle) return false;
    return (
      this.status.state === "connected" ||
      (this.status.state === "problem" && this.status.problem === "write-failed")
    );
  }

  private async rememberedHandle(): Promise<FileHandleLike | null> {
    if (this.handle) return this.handle;
    try {
      this.handle = await this.handles.get();
    } catch {
      this.handle = null;
    }
    return this.handle;
  }

  private async permissionOf(handle: FileHandleLike): Promise<PermissionResult> {
    try {
      return handle.queryPermission ? await handle.queryPermission({ mode: "readwrite" }) : "granted";
    } catch {
      return "prompt";
    }
  }

  private setStatus(next: StorageStatus): void {
    if (JSON.stringify(next) === JSON.stringify(this.status)) return;
    this.status = next;
    this.listeners.forEach((l) => l());
  }
}
