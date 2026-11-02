import { describe, expect, it } from "vitest";
import { MemoryStorage } from "@/storage";
import { ProgressStore } from "./ProgressStore";

const NOW = new Date("2026-04-02T12:00:00Z");

describe("ProgressStore think-first answers", () => {
  it("adds right and wrong answers per question kind, with no XP and no streak day", async () => {
    const store = new ProgressStore(new MemoryStorage(null), { now: () => NOW });
    await store.recordThinking([
      { type: "dangerPiece", correct: true },
      { type: "dangerPiece", correct: false },
      { type: "bestPlan", correct: true },
    ]);
    await store.recordThinking([{ type: "bestPlan", correct: false }]);
    const diary = store.getSnapshot().diary;
    expect(diary.thinking.byQuestion).toEqual({
      dangerPiece: { asked: 2, correct: 1 },
      bestPlan: { asked: 2, correct: 1 },
    });
    expect(diary.xp).toBe(0);
    expect(diary.streak.current).toBe(0);
  });

  it("does nothing for an empty list", async () => {
    const store = new ProgressStore(new MemoryStorage(null), { now: () => NOW });
    expect(await store.recordThinking([])).toBe(true);
    expect(store.getSnapshot().diary.thinking.byQuestion).toEqual({});
  });
});
