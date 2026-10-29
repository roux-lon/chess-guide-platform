import { hasProgress } from "./diary";
import type { Diary } from "./diary";
import { DIARY_KEY } from "./fallbackStorage";
import { readDiaryText } from "./read";
import type { KeyValueStore, SmallStore } from "./smallStore";

/**
 * Progress that an earlier version of the app kept in the browser. When the diary moves to a
 * file, the person is asked whether to bring it along.
 */
export interface LegacyPort {
  /** The old browser diary if there is one worth offering (readable, has progress, not declined). */
  peek(): Diary | null;
  /** Forget the old browser copy, once it is safely in the file. */
  discard(): void;
  /** The person said no thanks: leave the old copy alone and stop asking. */
  decline(): void;
}

export class BrowserLegacy implements LegacyPort {
  constructor(
    private readonly store: KeyValueStore | undefined,
    private readonly small: SmallStore,
  ) {}

  peek(): Diary | null {
    if (this.small.legacyDeclined()) return null;
    try {
      const text = this.store?.getItem(DIARY_KEY);
      if (!text) return null;
      const result = readDiaryText(text);
      return result.ok && hasProgress(result.diary) ? result.diary : null;
    } catch {
      return null;
    }
  }

  discard(): void {
    try {
      this.store?.removeItem(DIARY_KEY);
    } catch {
      // Could not remove it; it will simply be offered again next time.
    }
  }

  decline(): void {
    this.small.setLegacyDeclined();
  }
}

/** For places with no browser storage. */
export const noLegacy: LegacyPort = {
  peek: () => null,
  discard: () => {},
  decline: () => {},
};
