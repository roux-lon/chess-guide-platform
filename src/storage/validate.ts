import { DIARY_VERSION, createEmptyDiary } from "./diary";
import type {
  ActiveGameRecord,
  CoachLogRecord,
  CoachingMode,
  Diary,
  GameRecord,
  LessonRecord,
  MistakeRecord,
  StreakRecord,
} from "./diary";

export type ValidationResult = { ok: true; diary: Diary } | { ok: false; problems: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isColor = (value: unknown): value is "white" | "black" => value === "white" || value === "black";
const isCount = (value: unknown): value is number => isNumber(value) && Number.isInteger(value) && value >= 0;
const isDay = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isMode = (value: unknown): value is CoachingMode =>
  value === "full" || value === "quiet" || value === "off";

/**
 * Checks that `raw` is a current-version diary. It is strict on purpose: a file that looks
 * wrong is reported, never quietly repaired, because a repaired copy that gets saved would
 * destroy whatever the repair threw away. Missing optional parts get defaults.
 * Never throws. Run `migrate` first for data that may be from an older version.
 */
export function validateDiary(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { ok: false, problems: ["The diary is not an object."] };

  const problems: string[] = [];
  const empty = createEmptyDiary();

  if (raw.version !== DIARY_VERSION) {
    problems.push(`"version" should be ${DIARY_VERSION} but is ${JSON.stringify(raw.version)}.`);
  }

  const updatedAt = raw.updatedAt ?? empty.updatedAt;
  if (!isString(updatedAt)) problems.push('"updatedAt" should be text.');

  const settingsRaw = raw.settings ?? {};
  let botLevel = empty.settings.botLevel;
  let coachTone = empty.settings.coachTone;
  let coachingMode = empty.settings.coachingMode;
  if (!isRecord(settingsRaw)) {
    problems.push('"settings" should be an object.');
  } else {
    if (settingsRaw.botLevel !== undefined) {
      if (isNumber(settingsRaw.botLevel)) botLevel = settingsRaw.botLevel;
      else problems.push('"settings.botLevel" should be a number.');
    }
    if (settingsRaw.coachTone !== undefined) {
      if (isString(settingsRaw.coachTone)) coachTone = settingsRaw.coachTone;
      else problems.push('"settings.coachTone" should be text.');
    }
    if (settingsRaw.coachingMode !== undefined) {
      if (isMode(settingsRaw.coachingMode)) coachingMode = settingsRaw.coachingMode;
      else problems.push('"settings.coachingMode" should be "full", "quiet" or "off".');
    }
  }

  const lessons: Record<string, LessonRecord> = {};
  const lessonsRaw = raw.lessons ?? {};
  if (!isRecord(lessonsRaw)) {
    problems.push('"lessons" should be an object.');
  } else {
    for (const [id, record] of Object.entries(lessonsRaw)) {
      if (isRecord(record) && record.status === "done" && isString(record.completedAt)) {
        lessons[id] = { status: "done", completedAt: record.completedAt };
      } else {
        problems.push(`Lesson "${id}" should look like { "status": "done", "completedAt": "..." }.`);
      }
    }
  }

  const mistakeCounts: Record<string, number> = {};
  const countsRaw = raw.mistakeCounts ?? {};
  if (!isRecord(countsRaw)) {
    problems.push('"mistakeCounts" should be an object.');
  } else {
    for (const [type, count] of Object.entries(countsRaw)) {
      if (isNumber(count)) mistakeCounts[type] = count;
      else problems.push(`Mistake count "${type}" should be a number.`);
    }
  }

  const games: GameRecord[] = [];
  const gamesRaw = raw.games ?? [];
  if (!Array.isArray(gamesRaw)) {
    problems.push('"games" should be a list.');
  } else {
    gamesRaw.forEach((game, index) => {
      const parsed = parseGame(game);
      if (typeof parsed === "string") problems.push(`Game ${index + 1}: ${parsed}`);
      else games.push(parsed);
    });
  }

  let xp = empty.xp;
  if (raw.xp !== undefined) {
    if (isCount(raw.xp)) xp = raw.xp;
    else problems.push('"xp" should be a whole number, zero or more.');
  }

  let streak: StreakRecord = { ...empty.streak };
  if (raw.streak !== undefined) {
    const s = raw.streak;
    if (isRecord(s) && isCount(s.current) && isCount(s.best) && (s.lastDay === null || isDay(s.lastDay))) {
      streak = { current: s.current, best: s.best, lastDay: s.lastDay };
    } else {
      problems.push('"streak" should look like { "current": 0, "best": 0, "lastDay": null } (lastDay as YYYY-MM-DD).');
    }
  }

  let activeGame: ActiveGameRecord | undefined;
  if (raw.activeGame !== undefined) {
    const parsed = parseActiveGame(raw.activeGame);
    if (typeof parsed === "string") problems.push(`Unfinished game: ${parsed}`);
    else activeGame = parsed;
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    diary: {
      version: DIARY_VERSION,
      updatedAt: updatedAt as string,
      settings: { botLevel, coachTone, coachingMode },
      lessons,
      games,
      mistakeCounts,
      xp,
      streak,
      ...(activeGame ? { activeGame } : {}),
    },
  };
}

function parseCoachLog(raw: unknown): CoachLogRecord[] | string {
  if (!Array.isArray(raw ?? [])) return '"coachLog" should be a list.';
  const log: CoachLogRecord[] = [];
  for (const entry of (raw ?? []) as unknown[]) {
    if (!isRecord(entry) || !isNumber(entry.ply) || !isString(entry.event) || !isString(entry.text)) {
      return 'each "coachLog" entry needs "ply", "event" and "text".';
    }
    log.push({ ply: entry.ply, event: entry.event, text: entry.text });
  }
  return log;
}

function parseMistakes(raw: unknown): MistakeRecord[] | string {
  if (!Array.isArray(raw ?? [])) return '"mistakes" should be a list.';
  const mistakes: MistakeRecord[] = [];
  for (const entry of (raw ?? []) as unknown[]) {
    if (!isRecord(entry) || !isNumber(entry.ply) || !isString(entry.type)) {
      return 'each "mistakes" entry needs "ply" and "type".';
    }
    if (entry.lossCp !== undefined && !isNumber(entry.lossCp)) return '"lossCp" should be a number.';
    mistakes.push({
      ply: entry.ply,
      type: entry.type,
      ...(entry.lossCp !== undefined ? { lossCp: entry.lossCp as number } : {}),
    });
  }
  return mistakes;
}

/** A game record, or a message saying what is wrong with it. */
function parseGame(raw: unknown): GameRecord | string {
  if (!isRecord(raw)) return "should be an object.";
  if (!isString(raw.id)) return '"id" should be text.';
  if (!isString(raw.playedAt)) return '"playedAt" should be text.';
  if (
    raw.result !== "win" &&
    raw.result !== "loss" &&
    raw.result !== "draw" &&
    raw.result !== "abandoned"
  ) {
    return '"result" should be "win", "loss", "draw" or "abandoned".';
  }
  if (!isColor(raw.playerColor)) return '"playerColor" should be "white" or "black".';
  if (!isNumber(raw.botLevel)) return '"botLevel" should be a number.';
  if (!isMode(raw.coachingMode)) return '"coachingMode" should be "full", "quiet" or "off".';
  if (!isString(raw.pgn)) return '"pgn" should be text.';

  const coachLog = parseCoachLog(raw.coachLog);
  if (typeof coachLog === "string") return coachLog;
  const mistakes = parseMistakes(raw.mistakes);
  if (typeof mistakes === "string") return mistakes;

  return {
    id: raw.id,
    playedAt: raw.playedAt,
    result: raw.result,
    playerColor: raw.playerColor,
    botLevel: raw.botLevel,
    coachingMode: raw.coachingMode,
    pgn: raw.pgn,
    coachLog,
    mistakes,
  };
}

function parseActiveGame(raw: unknown): ActiveGameRecord | string {
  if (!isRecord(raw)) return "should be an object.";
  if (!isString(raw.id)) return '"id" should be text.';
  if (!isString(raw.startedAt)) return '"startedAt" should be text.';
  if (!isColor(raw.playerColor)) return '"playerColor" should be "white" or "black".';
  if (!isNumber(raw.botLevel)) return '"botLevel" should be a number.';
  if (!isMode(raw.coachingMode)) return '"coachingMode" should be "full", "quiet" or "off".';
  if (!isString(raw.fen)) return '"fen" should be text.';
  if (!Array.isArray(raw.moves) || !raw.moves.every(isString)) return '"moves" should be a list of text.';

  const coachLog = parseCoachLog(raw.coachLog);
  if (typeof coachLog === "string") return coachLog;
  const mistakes = parseMistakes(raw.mistakes);
  if (typeof mistakes === "string") return mistakes;

  return {
    id: raw.id,
    startedAt: raw.startedAt,
    playerColor: raw.playerColor,
    botLevel: raw.botLevel,
    coachingMode: raw.coachingMode,
    fen: raw.fen,
    moves: raw.moves as string[],
    coachLog,
    mistakes,
  };
}
