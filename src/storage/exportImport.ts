import type { Diary } from "./diary";

/** The name suggested for the diary file, and for downloads. */
export const DIARY_FILENAME = "chess-progress.json";

/** Pretty JSON, so the file is pleasant to open and easy to read. */
export function serializeDiary(diary: Diary): string {
  return `${JSON.stringify(diary, null, 2)}\n`;
}

/** A dated name for a downloaded copy, like chess-progress-2026-03-01.json. */
export function exportFilename(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return DIARY_FILENAME.replace(".json", `-${day}.json`);
}
