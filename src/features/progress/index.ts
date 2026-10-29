import { BrowserStorage, MemoryStorage } from "@/storage";
import { ProgressStore } from "./ProgressStore";

export { ProgressStore } from "./ProgressStore";
export type { ProgressSnapshot } from "./ProgressStore";

let shared: ProgressStore | undefined;

/**
 * The app-wide progress store. Server rendering (the static build) gets a memory-only one,
 * because there is no browser storage there; it is never asked to load.
 */
export function getProgressStore(): ProgressStore {
  shared ??= new ProgressStore(typeof window === "undefined" ? new MemoryStorage() : new BrowserStorage());
  return shared;
}
