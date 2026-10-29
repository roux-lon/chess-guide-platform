import { FileStorage } from "./FileStorage";
import { BrowserFallbackStorage } from "./fallbackStorage";
import { createBrowserFilePicker } from "./filePicker";
import type { PickerWindow } from "./filePicker";
import { IndexedDbHandleStore } from "./handleStore";
import { BrowserLegacy, noLegacy } from "./legacy";
import type { LegacyPort } from "./legacy";
import { MemoryStorage } from "./memoryStorage";
import { SmallStore } from "./smallStore";
import type { KeyValueStore } from "./smallStore";
import type { StorageAdapter } from "./StorageAdapter";

/** The parts of `window` that decide which storage to use. */
export interface BrowserLike {
  showOpenFilePicker?: unknown;
  showSaveFilePicker?: unknown;
  indexedDB?: IDBFactory;
  /** Reading this can throw when the browser blocks storage; see safeLocalStorage. */
  localStorage?: KeyValueStore;
}

/** Can this browser keep a diary in a file the person chooses? (Chrome and Edge on desktop.) */
export function supportsFileSystemAccess(win: BrowserLike): boolean {
  return (
    typeof win.showOpenFilePicker === "function" &&
    typeof win.showSaveFilePicker === "function" &&
    win.indexedDB !== undefined
  );
}

function safeLocalStorage(win: BrowserLike): KeyValueStore | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

export interface StorageServices {
  storage: StorageAdapter;
  /** Progress an earlier version kept in the browser, to offer to bring into the file. */
  legacy: LegacyPort;
  /** Tiny hints and counters in browser storage. */
  small: SmallStore;
}

/** Picks the diary storage for an environment. No window (server rendering) means memory only. */
export function createStorageServices(win?: BrowserLike): StorageServices {
  if (!win) {
    return { storage: new MemoryStorage(), legacy: noLegacy, small: new SmallStore(undefined) };
  }
  const local = safeLocalStorage(win);
  const small = new SmallStore(local);
  const legacy = new BrowserLegacy(local, small);

  if (supportsFileSystemAccess(win) && win.indexedDB) {
    return {
      storage: new FileStorage({
        handles: new IndexedDbHandleStore(win.indexedDB),
        picker: createBrowserFilePicker(win as unknown as PickerWindow),
        small,
        flushOnHide: true,
      }),
      legacy,
      small,
    };
  }
  return { storage: new BrowserFallbackStorage(local, small), legacy, small };
}

let shared: StorageServices | undefined;

export function getStorageServices(): StorageServices {
  shared ??= createStorageServices(
    typeof window === "undefined" ? undefined : (window as unknown as BrowserLike),
  );
  return shared;
}

/** The one place that decides file or browser storage. Everything else just uses StorageAdapter. */
export function getStorage(): StorageAdapter {
  return getStorageServices().storage;
}
