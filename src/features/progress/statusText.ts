import { needsAttention } from "@/storage";
import type { StorageStatus } from "@/storage";
import type { ProgressSnapshot } from "./ProgressStore";

export interface Chip {
  label: string;
  tone: "good" | "warn" | "bad" | "info";
}

/** The small "Diary" label in the top bar. */
export function chipFor(status: StorageStatus): Chip {
  switch (status.state) {
    case "connected":
      return { label: `Diary: ${status.fileName}`, tone: "good" };
    case "unconfigured":
      return { label: "Diary: choose a file", tone: "warn" };
    case "needs-reconnect":
      return { label: "Diary: reconnect", tone: "warn" };
    case "problem":
      return { label: "Diary: needs attention", tone: "bad" };
    case "fallback":
      return { label: "Diary: saved in this browser", tone: "info" };
    case "memory":
      return { label: "Diary: not saved", tone: "info" };
  }
}

/** Progress cannot be shown yet because the person has to do something first. */
export function waitingForPerson(snapshot: ProgressSnapshot): boolean {
  return !snapshot.ready && needsAttention(snapshot.status);
}
