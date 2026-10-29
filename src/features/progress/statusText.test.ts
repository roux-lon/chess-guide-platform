import { describe, expect, it } from "vitest";
import { createEmptyDiary, problemStatus } from "@/storage";
import type { StorageStatus } from "@/storage";
import type { ProgressSnapshot } from "./ProgressStore";
import { chipFor, waitingForPerson } from "./statusText";

const snapshot = (status: StorageStatus, ready: boolean): ProgressSnapshot => ({
  ready,
  diary: createEmptyDiary(),
  status,
  storageKind: "file",
  exportReminder: false,
});

describe("chipFor", () => {
  it("names the connected file", () => {
    expect(chipFor({ state: "connected", fileName: "chess-progress.json" })).toEqual({
      label: "Diary: chess-progress.json",
      tone: "good",
    });
  });

  it("has a friendly label for every state", () => {
    const states: StorageStatus[] = [
      { state: "unconfigured" },
      { state: "needs-reconnect", fileName: "x.json" },
      problemStatus("write-failed", "x.json"),
      { state: "fallback" },
      { state: "memory" },
    ];
    for (const status of states) {
      const chip = chipFor(status);
      expect(chip.label.startsWith("Diary:")).toBe(true);
    }
    expect(chipFor({ state: "needs-reconnect", fileName: "x.json" }).tone).toBe("warn");
    expect(chipFor(problemStatus("invalid-file")).tone).toBe("bad");
    expect(chipFor({ state: "fallback" }).tone).toBe("info");
  });
});

describe("waitingForPerson", () => {
  it("is true when the diary cannot load until the person acts", () => {
    expect(waitingForPerson(snapshot({ state: "unconfigured" }, false))).toBe(true);
    expect(waitingForPerson(snapshot({ state: "needs-reconnect", fileName: "x" }, false))).toBe(true);
    expect(waitingForPerson(snapshot(problemStatus("invalid-file", "x"), false))).toBe(true);
  });

  it("is false once the diary is loaded, or when it is still just loading", () => {
    expect(waitingForPerson(snapshot({ state: "connected", fileName: "x" }, true))).toBe(false);
    expect(waitingForPerson(snapshot(problemStatus("write-failed", "x"), true))).toBe(false);
    expect(waitingForPerson(snapshot({ state: "fallback" }, false))).toBe(false);
  });
});
