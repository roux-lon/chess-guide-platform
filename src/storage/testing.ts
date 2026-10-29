// Fakes for tests: an in-memory file handle, file dialogs and browser storage.
import type { Timers } from "./debounce";
import type { FileHandleLike, FilePicker, PermissionResult } from "./fsTypes";
import type { KeyValueStore } from "./smallStore";

/** An error like the ones browsers throw, with the same `name`. */
export function domError(name: string, message = name): Error {
  return Object.assign(new Error(message), { name });
}

/** A file on a pretend disk, with switches to make things go wrong. */
export class FakeFileHandle implements FileHandleLike {
  /** What is in the file right now. */
  content: string;
  /** What queryPermission reports. */
  permission: PermissionResult = "granted";
  /** What requestPermission answers (and becomes the permission when granted). */
  requestAnswer: PermissionResult = "granted";
  /** The file has been moved or deleted. */
  missing = false;
  readError: Error | null = null;
  writeError: Error | null = null;
  /** The text of every completed write, oldest first. */
  writes: string[] = [];

  constructor(
    readonly name = "chess-progress.json",
    content = "",
  ) {
    this.content = content;
  }

  async getFile() {
    if (this.missing) throw domError("NotFoundError");
    if (this.readError) throw this.readError;
    return { text: async () => this.content };
  }

  async createWritable() {
    if (this.missing) throw domError("NotFoundError");
    if (this.writeError) throw this.writeError;
    let buffer = "";
    return {
      write: async (data: string) => {
        buffer = data;
      },
      close: async () => {
        this.content = buffer;
        this.writes.push(buffer);
      },
    };
  }

  async queryPermission() {
    return this.permission;
  }

  async requestPermission() {
    if (this.requestAnswer === "granted") this.permission = "granted";
    return this.requestAnswer;
  }
}

/** File dialogs the test controls. Set `next` to the handle the "person" picks, or null to cancel. */
export class FakePicker implements FilePicker {
  next: FileHandleLike | null = null;
  /** Whether the person agrees to save a copy. */
  copyAccepted = true;
  copies: { name: string; text: string }[] = [];
  calls: string[] = [];

  async pickExisting() {
    this.calls.push("open");
    return this.next;
  }
  async pickNew() {
    this.calls.push("create");
    return this.next;
  }
  async saveCopy(name: string, text: string) {
    this.calls.push("copy");
    if (!this.copyAccepted) return false;
    this.copies.push({ name, text });
    return true;
  }
}

/** Browser storage in a plain object. */
export class FakeKeyValueStore implements KeyValueStore {
  data: Record<string, string> = {};
  getItem(key: string) {
    return this.data[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.data[key] = value;
  }
  removeItem(key: string) {
    delete this.data[key];
  }
}

/** Timers that only fire when the test says so. */
export function manualTimers() {
  let next = 1;
  const scheduled = new Map<number, () => void>();
  const timers: Timers = {
    set(callback) {
      const id = next++;
      scheduled.set(id, callback);
      return id;
    },
    clear(handle) {
      scheduled.delete(handle as number);
    },
  };
  return {
    timers,
    get pending() {
      return scheduled.size;
    },
    /** Let the quiet moment pass: runs everything that was scheduled. */
    fire() {
      const callbacks = [...scheduled.values()];
      scheduled.clear();
      callbacks.forEach((cb) => cb());
    },
  };
}
