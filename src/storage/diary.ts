// The diary: everything the app remembers. Shape follows PLAN.md section 4 and is
// versioned so it can be migrated. Changing it needs a version bump and a migration.

export const DIARY_VERSION = 2;

/** How much the coach says during a game. */
export type CoachingMode = "full" | "quiet" | "off";

/** "abandoned" covers a game that was resigned or left before it ended. */
export type GameResult = "win" | "loss" | "draw" | "abandoned";

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
  /** How much the move cost, in centipawns, when the engine could tell (version 2). */
  lossCp?: number;
}

export interface GameRecord {
  id: string;
  playedAt: string;
  result: GameResult;
  /** Which side the person played (version 2). */
  playerColor: "white" | "black";
  /** The bot level at the end of the game (version 2). */
  botLevel: number;
  coachingMode: CoachingMode;
  pgn: string;
  coachLog: CoachLogRecord[];
  mistakes: MistakeRecord[];
}

/** A game that was left unfinished and can be continued (version 2). */
export interface ActiveGameRecord {
  /** Matches the id of the "abandoned" record saved when the game was left. */
  id: string;
  startedAt: string;
  playerColor: "white" | "black";
  botLevel: number;
  coachingMode: CoachingMode;
  /** The position now, for a quick check that the move list replays correctly. */
  fen: string;
  /** Moves so far in standard notation (SAN), oldest first. */
  moves: string[];
  coachLog: CoachLogRecord[];
  mistakes: MistakeRecord[];
}

export interface DiarySettings {
  botLevel: number;
  coachTone: string;
  coachingMode: CoachingMode;
}

export interface Diary {
  version: typeof DIARY_VERSION;
  /** ISO date of the last save. */
  updatedAt: string;
  settings: DiarySettings;
  lessons: Record<string, LessonRecord>;
  games: GameRecord[];
  /** Totals per mistake type, recomputed from `games` whenever a game is saved. */
  mistakeCounts: Record<string, number>;
  /** The unfinished game, if the person left one (version 2). */
  activeGame?: ActiveGameRecord;
}

export function createEmptyDiary(now: Date = new Date()): Diary {
  return {
    version: DIARY_VERSION,
    updatedAt: now.toISOString(),
    settings: { botLevel: 1, coachTone: "playful", coachingMode: "quiet" },
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
  return (
    lessons > 0 ||
    games > 0 ||
    Object.keys(diary.mistakeCounts).length > 0 ||
    diary.activeGame !== undefined
  );
}
