import type { FileHandleLike, HandleStore } from "./fsTypes";

/** Keeps the handle in memory only. For tests. */
export class MemoryHandleStore implements HandleStore {
  constructor(private handle: FileHandleLike | null = null) {}
  async get() {
    return this.handle;
  }
  async set(handle: FileHandleLike) {
    this.handle = handle;
  }
  async clear() {
    this.handle = null;
  }
}

const DB_NAME = "chess-coach";
const STORE = "handles";
const KEY = "diary";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Remembers the chosen file between visits. File handles can be stored in IndexedDB
 * (but not in localStorage). Thin on purpose: tested by hand, not in unit tests.
 */
export class IndexedDbHandleStore implements HandleStore {
  constructor(private readonly factory: IDBFactory) {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = this.factory.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    try {
      return await request(action(db.transaction(STORE, mode).objectStore(STORE)));
    } finally {
      db.close();
    }
  }

  async get(): Promise<FileHandleLike | null> {
    const value = await this.run("readonly", (store) => store.get(KEY));
    return (value as FileHandleLike | undefined) ?? null;
  }

  async set(handle: FileHandleLike): Promise<void> {
    await this.run("readwrite", (store) => store.put(handle, KEY));
  }

  async clear(): Promise<void> {
    await this.run("readwrite", (store) => store.delete(KEY));
  }
}
