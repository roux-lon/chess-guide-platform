// The diary: everything the app remembers. Shape follows PLAN.md section 4 and is
// versioned so it can be migrated. Changing it needs a version bump and a migration.

export const DIARY_VERSION = 1;

export interface LessonRecord {
  status: "done";
  completedAt: string;
}

export interface CoachLogRecord {
  ply: number;
  event: string;
  text: string;
}

export interface MistakeRecord {
  ply: number;
  type: string;
}

export interface GameRecord {
  id: string;
  playedAt: string;
  result: "win" | "loss" | "draw";
  pgn: string;
  coachLog: CoachLogRecord[];
  mistakes: MistakeRecord[];
}

export interface DiarySettings {
  botLevel: number;
  coachTone: string;
}

export interface Diary {
  version: typeof DIARY_VERSION;
  /** ISO date of the last save. */
  updatedAt: string;
  settings: DiarySettings;
  lessons: Record<string, LessonRecord>;
  games: GameRecord[];
  mistakeCounts: Record<string, number>;
}

/** Thrown when stored data is not a diary this version understands. */
export class DiaryFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiaryFormatError";
  }
}

export function createEmptyDiary(now: Date = new Date()): Diary {
  return {
    version: DIARY_VERSION,
    updatedAt: now.toISOString(),
    settings: { botLevel: 1, coachTone: "playful" },
    lessons: {},
    games: [],
    mistakeCounts: {},
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Checks data read from storage and fills in anything missing with defaults, so an older or
 * hand-edited file still loads. Throws DiaryFormatError for data it cannot make sense of
 * (not an object, or a version from the future) rather than guessing, so a caller never
 * overwrites a file it did not understand.
 */
export function parseDiary(raw: unknown): Diary {
  if (!isRecord(raw)) throw new DiaryFormatError("The diary is not an object.");

  const version = raw.version ?? DIARY_VERSION;
  if (version !== DIARY_VERSION) {
    throw new DiaryFormatError(`This diary is version ${String(version)}, which this app cannot read.`);
  }

  const empty = createEmptyDiary();

  const lessons: Record<string, LessonRecord> = {};
  if (isRecord(raw.lessons)) {
    for (const [id, record] of Object.entries(raw.lessons)) {
      if (isRecord(record) && record.status === "done" && typeof record.completedAt === "string") {
        lessons[id] = { status: "done", completedAt: record.completedAt };
      }
    }
  }

  const mistakeCounts: Record<string, number> = {};
  if (isRecord(raw.mistakeCounts)) {
    for (const [type, count] of Object.entries(raw.mistakeCounts)) {
      if (typeof count === "number" && Number.isFinite(count)) mistakeCounts[type] = count;
    }
  }

  const settings = isRecord(raw.settings) ? raw.settings : {};

  return {
    version: DIARY_VERSION,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : empty.updatedAt,
    settings: {
      botLevel: typeof settings.botLevel === "number" ? settings.botLevel : empty.settings.botLevel,
      coachTone:
        typeof settings.coachTone === "string" ? settings.coachTone : empty.settings.coachTone,
    },
    lessons,
    games: Array.isArray(raw.games) ? (raw.games as GameRecord[]) : [],
    mistakeCounts,
  };
}
