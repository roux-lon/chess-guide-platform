import { describe, expect, it } from "vitest";
import { canCelebrate } from "./Confetti";
import { SOUND_NOTES, playSound } from "./sound";

describe("sounds", () => {
  it("are short, quiet, in a pleasant range, and every kind has some", () => {
    for (const [kind, notes] of Object.entries(SOUND_NOTES)) {
      expect(notes.length, kind).toBeGreaterThan(0);
      for (const note of notes) {
        expect(note.freq).toBeGreaterThan(100);
        expect(note.freq).toBeLessThan(2000);
        expect(note.duration).toBeLessThanOrEqual(0.4);
        expect(note.gain).toBeLessThanOrEqual(0.15);
        expect(note.start).toBeGreaterThanOrEqual(0);
      }
      const end = Math.max(...notes.map((n) => n.start + n.duration));
      expect(end, kind).toBeLessThan(1);
    }
  });

  it("do nothing, and never crash, when sound is off or there is no audio", () => {
    expect(() => playSound("win", false)).not.toThrow();
    expect(() => playSound("win", true)).not.toThrow(); // no window in this test environment
  });
});

describe("canCelebrate", () => {
  it("needs confetti switched on", () => {
    expect(canCelebrate({ confetti: true }, false)).toBe(true);
    expect(canCelebrate({ confetti: false }, false)).toBe(false);
  });

  it("never happens for people who prefer reduced motion, whatever the switch says", () => {
    expect(canCelebrate({ confetti: true }, true)).toBe(false);
    expect(canCelebrate({ confetti: false }, true)).toBe(false);
  });
});
