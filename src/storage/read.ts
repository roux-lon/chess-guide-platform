import type { Diary } from "./diary";
import { migrate } from "./migrate";
import type { MigrationStep } from "./migrate";
import { validateDiary } from "./validate";

export type ReadResult =
  | {
      ok: true;
      diary: Diary;
      /** Set when the data was from an older version and has been upgraded. */
      migratedFrom?: number;
    }
  | {
      ok: false;
      /** "future-version": saved by a newer app. "corrupt": anything else that is wrong. */
      kind: "corrupt" | "future-version";
      message: string;
      /** Details for a "corrupt" file, so the person (or a helper) can see what is wrong. */
      problems: string[];
    };

/** Turns data of any age into a current diary, or says kindly why it cannot. Never throws. */
export function readDiary(raw: unknown, steps?: readonly MigrationStep[]): ReadResult {
  const migrated = migrate(raw, steps);
  if (!migrated.ok) {
    return {
      ok: false,
      kind: migrated.reason === "future-version" ? "future-version" : "corrupt",
      message: migrated.message,
      problems: [],
    };
  }
  const checked = validateDiary(migrated.raw);
  if (!checked.ok) {
    return {
      ok: false,
      kind: "corrupt",
      message: "Some parts of this diary are not in the shape I expect.",
      problems: checked.problems,
    };
  }
  return {
    ok: true,
    diary: checked.diary,
    ...(migrated.from !== migrated.to ? { migratedFrom: migrated.from } : {}),
  };
}

/** Same as readDiary, starting from the text of a JSON file. */
export function readDiaryText(text: string, steps?: readonly MigrationStep[]): ReadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      kind: "corrupt",
      message: "This file is not valid JSON, so I cannot read it.",
      problems: [],
    };
  }
  return readDiary(raw, steps);
}
