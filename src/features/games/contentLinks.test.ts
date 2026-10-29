import { describe, expect, it } from "vitest";
import { LESSONS, MISTAKE_TYPES, MISTAKE_TYPE_IDS, mistakeLabel } from "@/content";

describe("mistake types", () => {
  it("each point to a lesson that really exists", () => {
    const lessonIds = new Set(LESSONS.map((l) => l.id));
    for (const type of MISTAKE_TYPE_IDS) {
      expect(lessonIds.has(MISTAKE_TYPES[type].lessonId), type).toBe(true);
    }
  });

  it("have friendly labels and explanations", () => {
    for (const type of MISTAKE_TYPE_IDS) {
      expect(MISTAKE_TYPES[type].label.length, type).toBeGreaterThan(3);
      expect(MISTAKE_TYPES[type].explanation.endsWith("."), type).toBe(true);
    }
  });

  it("name unknown types readably", () => {
    expect(mistakeLabel("missed_check_threat")).toBe("Missed check threat");
    expect(mistakeLabel("hanging_piece")).toBe("Leaving a piece hanging");
    expect(mistakeLabel("")).toBe("Unknown");
  });
});
