// The diary: everything the app remembers. Shape follows PLAN.md section 4 and is
// versioned so it can be migrated. Changing it needs a version bump and a migration.

export const DIARY_VERSION = 5;

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

/** The daily streak: how many days in a row something was learned or played (version 3). */
export interface StreakRecord {
  /** Days in a row, counted up to `lastDay`. */
  current: number;
  /** The longest streak so far. */
  best: number;
  /** The last day with activity, as the person's own calendar day: YYYY-MM-DD. Null if none yet. */
  lastDay: string | null;
}

/** One finished run of opening practice (version 4). */
export interface PlaybookCompletion {
  /** When the practice ended, ISO date. */
  playedAt: string;
  color: "white" | "black";
  /** Ids of the playbook goals that were done at the end, in the order they are taught. */
  goalsDone: string[];
  /** True when every goal on the checklist was done. */
  complete: boolean;
  /** Full moves played by the person before the practice ended. */
  moves: number;
}

/** Opening practice history (version 4). */
export interface PlaybookRecord {
  completions: PlaybookCompletion[];
}

/** The gym keeps this many of the most recent mistake positions. */
export const MAX_MISTAKE_POSITIONS = 40;

/** How many questions were asked and how many were answered right (version 5). */
export interface AnswerCounts {
  asked: number;
  correct: number;
}

/** A position from one of the person's own games, kept so the gym can turn it into a drill (version 5). */
export interface MistakePosition {
  /** `${gameId}:${ply}`, so the same mistake is never kept twice. */
  id: string;
  gameId: string;
  /** The half-move number of the mistake (1 = White's first move). */
  ply: number;
  /** When the game was saved, ISO date. */
  playedAt: string;
  /** The position just BEFORE the mistaken move; the person is the side to move. */
  fen: string;
  /** The move that was played. */
  move: { from: string; to: string };
  /** The kind of mistake, as in the game's mistake list. */
  type: string;
}

/** Thinking Gym history (version 5). */
export interface GymRecord {
  /** Newest last; the app keeps only the most recent ones. */
  positions: MistakePosition[];
  /** Per drill type. */
  stats: Record<string, AnswerCounts>;
}

/** Think-first history (version 5; filled in by the think-first mode): per question type and per principle. */
export interface ThinkingRecord {
  byQuestion: Record<string, AnswerCounts>;
  byPrinciple: Record<string, AnswerCounts>;
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
  /** Experience points earned from lessons and games (version 3). */
  xp: number;
  streak: StreakRecord;
  /** Opening practice history (version 4). */
  playbook: PlaybookRecord;
  /** Thinking Gym history (version 5). */
  gym: GymRecord;
  /** Think-first history (version 5). */
  thinking: ThinkingRecord;
}

export const EMPTY_STREAK: StreakRecord = { current: 0, best: 0, lastDay: null };

export function createEmptyDiary(now: Date = new Date()): Diary {
  return {
    version: DIARY_VERSION,
    updatedAt: now.toISOString(),
    settings: { botLevel: 1, coachTone: "playful", coachingMode: "quiet" },
    lessons: {},
    games: [],
    mistakeCounts: {},
    xp: 0,
    streak: { ...EMPTY_STREAK },
    playbook: { completions: [] },
    gym: { positions: [], stats: {} },
    thinking: { byQuestion: {}, byPrinciple: {} },
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
