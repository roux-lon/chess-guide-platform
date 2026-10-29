// Smoke tests for the diary prompts: every status shows the right help and nothing crashes.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { problemStatus } from "@/storage";
import type { StorageStatus } from "@/storage";
import { DiaryBanner } from "./DiaryBanner";
import { ExportReminder, LegacyOfferCard } from "./DiaryNotices";
import { DiaryPrompt } from "./DiaryPrompt";
import type { DiaryActions } from "./DiaryPrompt";
import { DiarySettings } from "./DiarySettings";

const noop = () => {};
const actions: DiaryActions = { onChoose: noop, onReconnect: noop, onStartFresh: noop, onRetrySave: noop };

/** React escapes quotes in HTML; undo that so text can be compared. */
const decode = (html: string) => html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const prompt = (status: StorageStatus, busy = false) =>
  decode(renderToString(createElement(DiaryPrompt, { status, actions, busy })));

describe("DiaryPrompt", () => {
  it("asks first-time visitors to choose a file, with both ways of doing it", () => {
    const html = prompt({ state: "unconfigured" });
    expect(html).toContain("Choose where to keep your chess diary");
    expect(html).toContain("Create a new diary file");
    expect(html).toContain("Use an existing diary file");
  });

  it("offers a friendly reconnect button on a new visit", () => {
    const html = prompt({ state: "needs-reconnect", fileName: "chess-progress.json" });
    expect(html).toContain("Welcome back!");
    expect(html).toContain("chess-progress.json");
    expect(html).toContain("Reconnect my diary");
  });

  it("helps with each kind of problem", () => {
    expect(prompt(problemStatus("permission-denied", "x.json"))).toContain("Reconnect my diary");
    expect(prompt(problemStatus("write-failed", "x.json"))).toContain("Try saving again");
    expect(prompt(problemStatus("read-failed", "x.json"))).toContain("Try again");

    const missing = prompt(problemStatus("file-missing", "x.json"));
    expect(missing).toContain("Start a new diary file");
    expect(missing).toContain("Choose a different file");

    const invalid = prompt(problemStatus("invalid-file", "x.json", ["Lesson \"pawn\" looks wrong."]));
    expect(invalid).toContain("Save a copy, then start fresh");
    expect(invalid).toContain("Choose a different file");
    expect(invalid).toContain("What exactly is wrong?");
    expect(invalid).toContain('Lesson "pawn" looks wrong.');
  });

  it("shows the problem's kind message", () => {
    expect(prompt(problemStatus("file-missing"))).toMatch(/moved, renamed or deleted/);
  });

  it("shows nothing when the diary is fine", () => {
    for (const status of [
      { state: "connected", fileName: "x.json" },
      { state: "fallback" },
      { state: "memory" },
    ] as StorageStatus[]) {
      expect(prompt(status)).toBe("");
    }
  });

  it("disables the buttons while an action is running", () => {
    const html = prompt({ state: "unconfigured" }, true);
    expect(html.match(/disabled=""/g)?.length).toBe(2);
  });
});

describe("notices", () => {
  const render = (element: ReturnType<typeof createElement>) => decode(renderToString(element));

  it("describes what was found in the browser, in singular and plural", () => {
    const many = render(
      createElement(LegacyOfferCard, { offer: { lessons: 3, games: 1 }, onAccept: noop, onDecline: noop }),
    );
    expect(many).toContain("3 finished lessons and 1 game");
    expect(many).toContain("Yes, bring it over");
    expect(many).toContain("No thanks");

    const one = render(
      createElement(LegacyOfferCard, { offer: { lessons: 1, games: 0 }, onAccept: noop, onDecline: noop }),
    );
    expect(one).toContain("1 finished lesson");
    expect(one).toContain("There is 1 finished lesson");
  });

  it("shows a gentle export reminder", () => {
    const html = render(createElement(ExportReminder, { onExport: noop }));
    expect(html).toContain("Time to save a copy?");
    expect(html).toContain("Export my diary");
  });
});

describe("pages", () => {
  it("renders the banner and the settings page before the diary has loaded, without crashing", () => {
    expect(renderToString(createElement(DiaryBanner))).toBe("");
    const html = decode(renderToString(createElement(DiarySettings)));
    expect(html).toContain("Your diary");
    expect(html).toContain("Export JSON");
    expect(html).toContain("Import JSON");
  });
});
