import { DIARY_VERSION, createEmptyDiary } from "./diary";
import type { CoachLogRecord, Diary, GameRecord, LessonRecord, MistakeRecord } from "./diary";

export type ValidationResult = { ok: true; diary: Diary } | { ok: false; problems: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    diary: {
      version: DIARY_VERSION,
      updatedAt: updatedAt as string,
      settings: { botLevel, coachTone },
      lessons,
      games,
      mistakeCounts,
    },
  };
}

/** A game record, or a message saying what is wrong with it. */
function parseGame(raw: unknown): GameRecord | string {
  if (!isRecord(raw)) return "should be an object.";
  if (!isString(raw.id)) return '"id" should be text.';
  if (!isString(raw.playedAt)) return '"playedAt" should be text.';
  if (raw.result !== "win" && raw.result !== "loss" && raw.result !== "draw") {
    return '"result" should be "win", "loss" or "draw".';
  }
  if (!isString(raw.pgn)) return '"pgn" should be text.';

  const coachLog: CoachLogRecord[] = [];
  if (!Array.isArray(raw.coachLog ?? [])) return '"coachLog" should be a list.';
  for (const entry of (raw.coachLog ?? []) as unknown[]) {
    if (!isRecord(entry) || !isNumber(entry.ply) || !isString(entry.event) || !isString(entry.text)) {
      return 'each "coachLog" entry needs "ply", "event" and "text".';
    }
    coachLog.push({ ply: entry.ply, event: entry.event, text: entry.text });
  }

  const mistakes: MistakeRecord[] = [];
  if (!Array.isArray(raw.mistakes ?? [])) return '"mistakes" should be a list.';
  for (const entry of (raw.mistakes ?? []) as unknown[]) {
    if (!isRecord(entry) || !isNumber(entry.ply) || !isString(entry.type)) {
      return 'each "mistakes" entry needs "ply" and "type".';
    }
    mistakes.push({ ply: entry.ply, type: entry.type });
  }

  return { id: raw.id, playedAt: raw.playedAt, result: raw.result, pgn: raw.pgn, coachLog, mistakes };
}
