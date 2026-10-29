import { DIARY_VERSION } from "./diary";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** One upgrade: takes data of version `from` and returns data of version `to`. */
export interface MigrationStep {
  from: number;
  to: number;
  run(raw: Record<string, unknown>): Record<string, unknown>;
}

/**
 * Every upgrade the app knows, oldest first. Add a step here (and bump DIARY_VERSION) when the
 * diary shape changes, so files written by older versions keep working.
 */
export const MIGRATION_STEPS: MigrationStep[] = [
  // A diary with no "version" at all (for example written by hand) is treated as version 0.
  // Its parts are the same as version 1, so the only change is stamping the version.
  { from: 0, to: 1, run: (raw) => ({ ...raw, version: 1 }) },

  // Version 2 (phase 6) adds what guided games need: player colour, bot level and coaching mode
  // on each game, a coaching-mode setting, and an optional unfinished game. Older games get
  // the defaults of the time: White, level 1, and the quiet mode.
  {
    from: 1,
    to: 2,
    run: (raw) => {
      const settings = isRecord(raw.settings) ? raw.settings : {};
      const games = Array.isArray(raw.games)
        ? raw.games.map((game) =>
            isRecord(game) ? { playerColor: "white", botLevel: 1, coachingMode: "quiet", ...game } : game,
          )
        : raw.games;
      return {
        ...raw,
        version: 2,
        settings: { ...settings, coachingMode: settings.coachingMode ?? "quiet" },
        ...(games !== undefined ? { games } : {}),
      };
    },
  },
];

export type MigrateResult =
  | { ok: true; raw: Record<string, unknown>; from: number; to: number }
  | {
      ok: false;
      reason: "not-an-object" | "future-version" | "unknown-version" | "step-failed";
      message: string;
    };


/**
 * Upgrades diary data from whatever version it is to the current one. Never throws:
 * data from a newer app, an unknown version, or a step that fails all come back as
 * `ok: false`, so a bad file can never crash the app.
 */
export function migrate(
  raw: unknown,
  steps: readonly MigrationStep[] = MIGRATION_STEPS,
  target: number = DIARY_VERSION,
): MigrateResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: "not-an-object", message: "This does not look like a chess diary." };
  }

  const rawVersion = raw.version === undefined ? 0 : raw.version;
  if (typeof rawVersion !== "number" || !Number.isInteger(rawVersion) || rawVersion < 0) {
    return {
      ok: false,
      reason: "unknown-version",
      message: `This diary has a version number I do not understand (${JSON.stringify(rawVersion)}).`,
    };
  }
  if (rawVersion > target) {
    return {
      ok: false,
      reason: "future-version",
      message: `This diary was saved by a newer version of the app (version ${rawVersion}). Please update the app first, so nothing gets lost.`,
    };
  }

  let current: Record<string, unknown> = raw;
  let version = rawVersion;
  while (version < target) {
    const step = steps.find((s) => s.from === version);
    if (!step) {
      return {
        ok: false,
        reason: "unknown-version",
        message: `I do not know how to upgrade a version ${version} diary.`,
      };
    }
    try {
      current = step.run(current);
    } catch {
      return {
        ok: false,
        reason: "step-failed",
        message: `Upgrading this diary from version ${version} did not work.`,
      };
    }
    version = step.to;
  }
  return { ok: true, raw: current, from: rawVersion, to: version };
}
