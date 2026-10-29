export type StorageProblem =
  | "permission-denied"
  | "file-missing"
  | "invalid-file"
  | "write-failed"
  | "read-failed";

/** Where the diary stands. The UI shows this and offers the matching action. */
export type StorageStatus =
  /** File mode, and no file has been chosen yet. */
  | { state: "unconfigured" }
  /** A file was chosen in an earlier visit; the browser needs a click to allow access again. */
  | { state: "needs-reconnect"; fileName: string }
  | { state: "connected"; fileName: string }
  | {
      state: "problem";
      problem: StorageProblem;
      /** A kind sentence for the person. */
      message: string;
      fileName?: string;
      /** What exactly is wrong with an unreadable file, for anyone who wants to look. */
      details?: string[];
    }
  /** The browser cannot keep a file, so the diary lives in browser storage. */
  | { state: "fallback" }
  /** Memory only (server rendering, tests). */
  | { state: "memory" };

/** Sentences for each problem. Kept together so the tone stays kind and consistent. */
export const PROBLEM_MESSAGES: Record<StorageProblem, string> = {
  "permission-denied":
    "The browser did not allow access to your diary file. Press Reconnect and choose Allow when it asks.",
  "file-missing":
    "I cannot find your diary file. It may have been moved, renamed or deleted. You can point me to it again, or start a new one.",
  "invalid-file":
    "I could not read your diary file. To keep it safe, I have not changed it. You can save a copy of it and start a fresh diary, or choose a different file.",
  "write-failed":
    "I could not save to your diary file just now. Your progress is still here on screen. Check that the file is not open in another program or on a full disk, then try again.",
  "read-failed": "I could not read your diary file just now. Please try again.",
};

export const problemStatus = (
  problem: StorageProblem,
  fileName?: string,
  details?: string[],
  message: string = PROBLEM_MESSAGES[problem],
): StorageStatus => ({
  state: "problem",
  problem,
  message,
  ...(fileName ? { fileName } : {}),
  ...(details && details.length > 0 ? { details } : {}),
});

/** True when the person has to do something before progress can be shown or saved. */
export function needsAttention(status: StorageStatus): boolean {
  return status.state === "unconfigured" || status.state === "needs-reconnect" || status.state === "problem";
}

/** Thrown by load/save when the storage is not ready to use. `status` says why. */
export class StorageUnavailableError extends Error {
  constructor(readonly status: StorageStatus) {
    super(status.state === "problem" ? status.message : `Storage is not ready (${status.state}).`);
    this.name = "StorageUnavailableError";
  }
}
