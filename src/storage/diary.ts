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

export interface DiarySummary {
  lessons: number;
  games: number;
}

export function summarizeDiary(diary: Diary): DiarySummary {
  return { lessons: Object.keys(diary.lessons).length, games: diary.games.length };
}

/** Does the diary hold anything worth protecting? An empty one is safe to replace. */
export function hasProgress(diary: Diary): boolean {
  const { lessons, games } = summarizeDiary(diary);
  return lessons > 0 || games > 0 || Object.keys(diary.mistakeCounts).length > 0;
}
