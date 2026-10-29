import { getStorageServices } from "@/storage";
import { ProgressStore } from "./ProgressStore";

export { EXPORT_REMINDER_AFTER_SESSIONS, ProgressStore } from "./ProgressStore";
export type { ImportPreview, ProgressSnapshot, ProgressStoreOptions } from "./ProgressStore";

let shared: ProgressStore | undefined;

/**
 * The app-wide progress store. Which storage sits behind it (a chosen file, browser storage, or
 * memory during server rendering) is decided once, by getStorage() in storage/.
 */
export function getProgressStore(): ProgressStore {
  if (!shared) {
    const { storage, legacy, small } = getStorageServices();
    shared = new ProgressStore(storage, { legacy, small });
  }
  return shared;
}
export { chipFor, waitingForPerson } from "./statusText";
export type { Chip } from "./statusText";
export { needsAttention } from "@/storage";
export type { StorageStatus } from "@/storage";
export type { Diary, DiarySummary } from "@/storage";
