/** The slice of the Web Storage API we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SMALL_KEY = "chess-coach.small";

/** Per-device choices about the playful extras. Sound starts off; celebrations start on. */
export interface Prefs {
  sound: boolean;
  confetti: boolean;
}

export const DEFAULT_PREFS: Prefs = { sound: false, confetti: true };

interface SmallData {
  prefs?: Partial<Prefs>;
  /** Name of the diary file the person connected, so we can say so before the browser checks. */
  connectedFile?: string;
  /** The person said no to bringing old browser progress into the file. */
  legacyDeclined?: boolean;
  /** Visits since the last export, for the gentle "save a copy" reminder. */
  sessionsSinceExport?: number;
  lastExportAt?: string;
}

/**
 * The only things we keep in localStorage once the diary lives in a file: tiny hints and
 * counters. Never history or progress. Every read is guarded, because storage can be
 * blocked, full or hand-edited.
 */
export class SmallStore {
  constructor(private readonly store: KeyValueStore | undefined) {}

  private read(): SmallData {
    try {
      const text = this.store?.getItem(SMALL_KEY);
      if (!text) return {};
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as SmallData)
        : {};
    } catch {
      return {};
    }
  }

  private update(change: Partial<SmallData>): void {
    try {
      this.store?.setItem(SMALL_KEY, JSON.stringify({ ...this.read(), ...change }));
    } catch {
      // Storage is blocked or full: these are only hints, so carry on without them.
    }
  }

  getPrefs(): Prefs {
    const saved = this.read().prefs;
    return {
      sound: typeof saved?.sound === "boolean" ? saved.sound : DEFAULT_PREFS.sound,
      confetti: typeof saved?.confetti === "boolean" ? saved.confetti : DEFAULT_PREFS.confetti,
    };
  }
  setPrefs(patch: Partial<Prefs>): void {
    this.update({ prefs: { ...this.getPrefs(), ...patch } });
  }

  getConnectedFile(): string | undefined {
    const name = this.read().connectedFile;
    return typeof name === "string" ? name : undefined;
  }
  setConnectedFile(name: string | undefined): void {
    this.update({ connectedFile: name });
  }

  legacyDeclined(): boolean {
    return this.read().legacyDeclined === true;
  }
  setLegacyDeclined(): void {
    this.update({ legacyDeclined: true });
  }

  sessionsSinceExport(): number {
    const n = this.read().sessionsSinceExport;
    return typeof n === "number" && n >= 0 ? n : 0;
  }
  /** Call once per visit. Returns the new count. */
  noteSessionStart(): number {
    const next = this.sessionsSinceExport() + 1;
    this.update({ sessionsSinceExport: next });
    return next;
  }
  markExported(now: Date = new Date()): void {
    this.update({ sessionsSinceExport: 0, lastExportAt: now.toISOString() });
  }
}
