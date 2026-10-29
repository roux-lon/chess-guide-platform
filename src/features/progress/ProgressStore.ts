import { createEmptyDiary } from "@/storage";
import type { Diary, StorageAdapter } from "@/storage";

export interface ProgressSnapshot {
  /** False until the diary has been read. Pages should not show progress before then. */
  ready: boolean;
  diary: Diary;
  /** Set when saving failed, so the UI can say progress is not being kept. */
  saveError?: string;
}

const SAVE_ERROR = "Your progress could not be saved in this browser, so it may be lost when you leave.";

/**
 * Holds the diary and saves it on meaningful moments (finishing a lesson). The storage
 * behind it is swappable: browser now, a chosen file in phase 5. No React in here.
 */
export class ProgressStore {
  private snapshot: ProgressSnapshot;
  /** Server rendering and the first client render see this, so they match. */
  private readonly initial: ProgressSnapshot;
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;

  constructor(
    private readonly storage: StorageAdapter,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.initial = { ready: false, diary: createEmptyDiary(this.now()) };
    this.snapshot = this.initial;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ProgressSnapshot => this.snapshot;
  getServerSnapshot = (): ProgressSnapshot => this.initial;

  /** Reads the diary once. Safe to call from many places. */
  load(): Promise<void> {
    this.loading ??= this.storage.load().then(
      (diary) => this.set({ ready: true, diary }),
      () => this.set({ ready: true, diary: createEmptyDiary(this.now()), saveError: SAVE_ERROR }),
    );
    return this.loading;
  }

  isLessonDone = (id: string): boolean => this.snapshot.diary.lessons[id]?.status === "done";

  /** Marks a lesson done and saves. Finishing a lesson twice keeps the first date. */
  async completeLesson(id: string): Promise<void> {
    await this.load();
    const { diary } = this.snapshot;
    const when = this.now().toISOString();
    const next: Diary = {
      ...diary,
      updatedAt: when,
      lessons: {
        ...diary.lessons,
        [id]: diary.lessons[id] ?? { status: "done", completedAt: when },
      },
    };
    this.set({ ready: true, diary: next });
    try {
      await this.storage.save(next);
      if (this.snapshot.saveError) this.set({ ready: true, diary: next });
    } catch {
      this.set({ ready: true, diary: next, saveError: SAVE_ERROR });
    }
  }

  private set(snapshot: ProgressSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((l) => l());
  }
}
