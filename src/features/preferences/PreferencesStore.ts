import { DEFAULT_PREFS, SmallStore, getStorageServices } from "@/storage";
import type { Prefs } from "@/storage";

/**
 * The playful extras a person can switch: sound (off by default) and celebrations such as confetti.
 * Kept per device in browser storage. People who ask their system for less motion never see
 * confetti whatever this says; that is decided where it is drawn.
 */
export class PreferencesStore {
  private prefs: Prefs;
  private snapshot: Prefs;
  private listeners = new Set<() => void>();

  constructor(private readonly small: SmallStore) {
    this.prefs = small.getPrefs();
    this.snapshot = this.prefs;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Prefs => this.snapshot;

  /** What server rendering sees, so it always matches the first client render. */
  getServerSnapshot = (): Prefs => DEFAULT_PREFS;

  /** Reads the saved choices (the first client render used the defaults). */
  load(): void {
    const saved = this.small.getPrefs();
    if (
      saved.sound !== this.prefs.sound ||
      saved.confetti !== this.prefs.confetti ||
      saved.thinkFirst !== this.prefs.thinkFirst
    ) {
      this.set(saved);
    }
  }

  update(patch: Partial<Prefs>): void {
    this.small.setPrefs(patch);
    this.set({ ...this.prefs, ...patch });
  }

  private set(next: Prefs): void {
    this.prefs = next;
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }
}

let shared: PreferencesStore | undefined;

export function getPreferencesStore(): PreferencesStore {
  shared ??= new PreferencesStore(getStorageServices().small);
  return shared;
}
