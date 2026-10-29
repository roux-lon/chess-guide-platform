import {
  StorageUnavailableError,
  createEmptyDiary,
  exportFilename,
  hasProgress,
  mergeDiaries,
  noLegacy,
  readDiaryText,
  serializeDiary,
  summarizeDiary,
} from "@/storage";
import { localDay } from "@/lib/date";
import { countMistakes } from "../games/mistakes";
import { addActivity, xpForGame, xpForLesson } from "../rewards/rewards";
import type {
  ActiveGameRecord,
  Diary,
  DiarySettings,
  GameRecord,
  DiarySummary,
  LegacyPort,
  SaveOptions,
  SmallStore,
  StorageAdapter,
  StorageStatus,
} from "@/storage";

export interface ProgressSnapshot {
  /** False until the diary has been read. Pages should not show progress before then. */
  ready: boolean;
  diary: Diary;
  /** Where the diary lives and whether the person has to do something (choose a file, reconnect). */
  status: StorageStatus;
  storageKind: StorageAdapter["kind"];
  /** Set when saving failed, so the UI can say progress is not being kept. */
  saveError?: string;
  /** Old progress found in this browser that could be brought into the diary file. */
  legacyOffer?: DiarySummary;
  /** Browser-storage mode only: time to save a copy with Export. */
  exportReminder: boolean;
}

export type ImportPreview =
  | {
      ok: true;
      diary: Diary;
      summary: DiarySummary;
      /** Version the file was upgraded from, if it was an older one. */
      migratedFrom?: number;
      /** True when applying it would replace progress that exists now, so the person must confirm. */
      replacesProgress: boolean;
    }
  | { ok: false; message: string; details: string[] };

export interface ProgressStoreOptions {
  now?: () => Date;
  legacy?: LegacyPort;
  small?: SmallStore;
}

const SAVE_ERROR = "Your progress could not be saved in this browser, so it may be lost when you leave.";
/** After this many visits without an export, browser-storage mode nudges the person to export. */
export const EXPORT_REMINDER_AFTER_SESSIONS = 3;

/**
 * The diary as the rest of the app sees it: load it, change it, save it on meaningful moments.
 * It owns no storage details: a file, browser storage or memory sit behind StorageAdapter,
 * and the person's choices (pick a file, reconnect, import) come through here. No React.
 */
export class ProgressStore {
  private readonly now: () => Date;
  private readonly legacy: LegacyPort;
  private readonly small?: SmallStore;

  private ready = false;
  private diary: Diary;
  private persistError?: string;
  private legacyOffer?: DiarySummary;
  private exportReminder = false;

  private snapshot: ProgressSnapshot;
  /**
   * What server rendering and the first client render see, so they match. It is deliberately
   * neutral (not the real storage status): the server only has memory storage, and the real
   * status is not known until the diary has been read.
   */
  private readonly initial: ProgressSnapshot;
  private listeners = new Set<() => void>();
  private inflight?: Promise<void>;

  constructor(
    private readonly storage: StorageAdapter,
    { now = () => new Date(), legacy = noLegacy, small }: ProgressStoreOptions = {},
  ) {
    this.now = now;
    this.legacy = legacy;
    this.small = small;
    this.diary = createEmptyDiary(now());
    this.initial = {
      ready: false,
      diary: this.diary,
      status: { state: "memory" },
      storageKind: "memory",
      exportReminder: false,
    };
    this.snapshot = this.initial;
    // When the person connects a file or reconnects, the diary can finally be read.
    storage.subscribe(() => this.onStorageChanged());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ProgressSnapshot => this.snapshot;
  getServerSnapshot = (): ProgressSnapshot => this.initial;

  /**
   * Reads the diary. Safe to call from many places. If the storage needs the person to act
   * first, this returns with `ready` still false and the status saying what is needed.
   */
  load(): Promise<void> {
    if (this.ready) return Promise.resolve();
    this.inflight ??= this.readStorage().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  isLessonDone = (id: string): boolean => this.diary.lessons[id]?.status === "done";

  // ---- changing the diary ----

  /**
   * Marks a lesson done and saves right away. Finishing a lesson twice keeps the first date,
   * and only the first time earns XP. Either way it counts as a day of learning for the streak.
   */
  async completeLesson(id: string): Promise<void> {
    await this.load();
    if (!this.ready) return;
    const when = this.now().toISOString();
    const firstTime = this.diary.lessons[id]?.status !== "done";
    await this.commit(
      {
        ...this.diary,
        updatedAt: when,
        lessons: { ...this.diary.lessons, [id]: this.diary.lessons[id] ?? { status: "done", completedAt: when } },
        xp: this.diary.xp + (firstTime ? xpForLesson() : 0),
        streak: addActivity(this.diary.streak, localDay(this.now())),
      },
      { immediate: true },
    );
  }

  /** Changes settings. Saved after a quiet moment, not on every change. */
  async updateSettings(patch: Partial<DiarySettings>): Promise<void> {
    if (!this.ready) return;
    const next = { ...this.diary.settings, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.diary.settings)) return;
    await this.commit({ ...this.diary, updatedAt: this.now().toISOString(), settings: next }, {});
  }

  /**
   * Saves a game (finished, resigned or left early) and, in the same write, either keeps an
   * unfinished game to continue (`activeGame`) or clears it (`null`). A game is stored once
   * per id: saving it again replaces the earlier version, so an abandoned game that is later
   * resumed and finished becomes one finished game. Mistake counts are recomputed from the
   * saved games, so nothing is ever counted twice. Written straight away.
   * Returns false if the diary is not ready or the save failed.
   */
  async recordGame(record: GameRecord, options: { activeGame: ActiveGameRecord | null }): Promise<boolean> {
    await this.load();
    if (!this.ready) return false;
    const earlier = this.diary.games.find((g) => g.id === record.id);
    // XP is paid once, when a game becomes finished. An abandoned game that is later finished
    // pays then; saving a finished game again pays nothing more.
    const newlyFinished = record.result !== "abandoned" && (!earlier || earlier.result === "abandoned");
    const games = [...this.diary.games.filter((g) => g.id !== record.id), record].sort((a, b) =>
      a.playedAt.localeCompare(b.playedAt),
    );
    const { activeGame: _previous, ...rest } = this.diary;
    void _previous;
    return this.commit(
      {
        ...rest,
        updatedAt: this.now().toISOString(),
        games,
        mistakeCounts: countMistakes(games),
        xp: this.diary.xp + (newlyFinished ? xpForGame(record.result) : 0),
        streak: addActivity(this.diary.streak, localDay(this.now())),
        ...(options.activeGame ? { activeGame: options.activeGame } : {}),
      },
      { immediate: true },
    );
  }

  /**
   * Remembers the game in progress so it can be continued, or forgets it (`null`). Saved after a
   * quiet moment, never on every move.
   */
  async saveActiveGame(active: ActiveGameRecord | null): Promise<void> {
    if (!this.ready) return;
    if (!active && !this.diary.activeGame) return;
    const { activeGame: _previous, ...rest } = this.diary;
    void _previous;
    await this.commit(
      { ...rest, updatedAt: this.now().toISOString(), ...(active ? { activeGame: active } : {}) },
      {},
    );
  }

  /** After a failed save: try writing what is on screen again. True if it worked. */
  retrySave(): Promise<boolean> {
    if (!this.ready) return Promise.resolve(false);
    return this.commit(this.diary, { immediate: true });
  }

  /** Writes anything still waiting. Call when the person is leaving. */
  flush(): Promise<void> {
    return this.storage.flush();
  }

  // ---- choosing where the diary lives (file mode) ----

  /**
   * Pick the diary file. "create" makes a new file, "open" uses an existing one.
   * `keepCurrent` puts what is on screen into a new file (moving the diary somewhere else).
   */
  async chooseFile(mode: "create" | "open", keepCurrent = false): Promise<void> {
    if (!this.storage.file) return;
    const seed = keepCurrent && this.ready ? this.diary : undefined;
    await this.storage.file.chooseFile(mode, seed);
    await this.refreshAfterAction();
  }

  /** Allow access again to the file chosen in an earlier visit. */
  async reconnect(): Promise<void> {
    if (!this.storage.file) return;
    await this.storage.file.reconnect();
    await this.refreshAfterAction();
  }

  /** For an unreadable file: save a copy of it, then start a fresh diary. False if cancelled. */
  async startFreshKeepingCopy(): Promise<boolean> {
    if (!this.storage.file) return false;
    const started = await this.storage.file.startFreshKeepingCopy();
    if (started) await this.refreshAfterAction();
    return started;
  }

  // ---- progress an earlier version kept in this browser ----

  /** Bring the old browser progress into the diary, then forget the old copy. */
  async acceptLegacyImport(): Promise<void> {
    const old = this.legacy.peek();
    if (!old || !this.ready) return;
    const saved = await this.commit(mergeDiaries(this.diary, old), { immediate: true });
    if (saved) this.legacy.discard();
    this.legacyOffer = undefined;
    this.emit();
  }

  /** The person said no thanks. The old copy stays where it is, and we stop asking. */
  declineLegacyImport(): void {
    this.legacy.decline();
    this.legacyOffer = undefined;
    this.emit();
  }

  // ---- export and import ----

  /** The diary as a JSON file to download. Counts as having saved a copy. */
  exportDiary(): { filename: string; text: string } {
    this.small?.markExported(this.now());
    this.exportReminder = false;
    this.emit();
    return { filename: exportFilename(this.now()), text: serializeDiary(this.diary) };
  }

  /** Checks the text of a diary file and says what importing it would do. Changes nothing. */
  prepareImport(text: string): ImportPreview {
    const result = readDiaryText(text);
    if (!result.ok) return { ok: false, message: result.message, details: result.problems };
    return {
      ok: true,
      diary: result.diary,
      summary: summarizeDiary(result.diary),
      replacesProgress: hasProgress(this.diary),
      ...(result.migratedFrom !== undefined ? { migratedFrom: result.migratedFrom } : {}),
    };
  }

  /** Replace the diary with an imported one (the person has already confirmed). */
  async applyImport(diary: Diary): Promise<boolean> {
    if (!this.ready) return false;
    return this.commit({ ...diary, updatedAt: this.now().toISOString() }, { immediate: true });
  }

  // ---- internals ----

  private async readStorage(): Promise<void> {
    try {
      this.becomeReady(await this.storage.load());
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        // The person has to act first (choose a file, reconnect). The status says what.
        this.emit();
        return;
      }
      // Something unexpected, such as blocked browser storage: carry on in memory and say so.
      this.diary = createEmptyDiary(this.now());
      this.ready = true;
      this.persistError = SAVE_ERROR;
      this.emit();
    }
  }

  /** Reads the diary again even if one is loaded, for after switching files. */
  private async forceLoad(): Promise<void> {
    try {
      this.becomeReady(await this.storage.load());
    } catch (error) {
      if (!(error instanceof StorageUnavailableError)) throw error;
      this.emit();
    }
  }

  private async refreshAfterAction(): Promise<void> {
    if (this.storage.getStatus().state !== "connected") return this.emit();
    if (this.ready) await this.forceLoad();
    else await this.load();
  }

  private becomeReady(diary: Diary): void {
    this.diary = diary;
    this.ready = true;
    this.persistError = undefined;
    this.legacyOffer = this.storage.kind === "file" ? this.offerFromLegacy() : undefined;
    this.exportReminder =
      this.storage.kind === "browser" &&
      (this.small?.sessionsSinceExport() ?? 0) >= EXPORT_REMINDER_AFTER_SESSIONS &&
      hasProgress(diary);
    this.emit();
  }

  private offerFromLegacy(): DiarySummary | undefined {
    const old = this.legacy.peek();
    return old ? summarizeDiary(old) : undefined;
  }

  /** Keeps the new diary on screen, and saves it. True if the save worked. */
  private async commit(next: Diary, options: SaveOptions): Promise<boolean> {
    this.diary = next;
    this.emit();
    try {
      await this.storage.save(next, options);
      if (this.persistError) {
        this.persistError = undefined;
        this.emit();
      }
      return true;
    } catch {
      // For files, the status explains the problem. Otherwise use a general message.
      this.persistError = this.storage.getStatus().state === "problem" ? undefined : SAVE_ERROR;
      this.emit();
      return false;
    }
  }

  private onStorageChanged(): void {
    if (!this.ready && this.storage.getStatus().state === "connected") void this.load();
    else this.emit();
  }

  private emit(): void {
    const status = this.storage.getStatus();
    const statusProblem = status.state === "problem" ? status.message : undefined;
    this.snapshot = {
      ready: this.ready,
      diary: this.diary,
      status,
      storageKind: this.storage.kind,
      exportReminder: this.exportReminder,
      ...(this.legacyOffer ? { legacyOffer: this.legacyOffer } : {}),
      ...(this.ready && (statusProblem ?? this.persistError)
        ? { saveError: statusProblem ?? this.persistError }
        : {}),
    };
    this.listeners.forEach((l) => l());
  }
}
