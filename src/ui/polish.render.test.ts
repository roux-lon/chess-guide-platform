import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MOODS, moodLabel } from "@/features/mascot";
import { ErrorScreen } from "./ErrorScreen";
import { Mascot } from "./Mascot";
import { MoveInput } from "./MoveInput";

const html = (element: Parameters<typeof renderToString>[0]) =>
  renderToString(element).replace(/&#x27;/g, "'").replace(/<!-- -->/g, "");

describe("Mascot", () => {
  it("draws every mood as an SVG, and each one looks different", () => {
    const drawings = MOODS.map((mood) => html(createElement(Mascot, { mood })));
    for (const drawing of drawings) expect(drawing).toMatch(/^<svg/);
    expect(new Set(drawings).size).toBe(MOODS.length);
  });

  it("is hidden from screen readers unless given a label", () => {
    expect(html(createElement(Mascot, {}))).toContain('aria-hidden="true"');
    const labelled = html(createElement(Mascot, { mood: "cheering", label: moodLabel("cheering") }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="Pip is cheering"');
    expect(labelled).not.toContain("aria-hidden");
  });

  it("scales with its size", () => {
    expect(html(createElement(Mascot, { size: 200 }))).toContain('width="200"');
  });
});

describe("ErrorScreen", () => {
  it("explains a problem kindly and offers a retry and a way home", () => {
    const out = html(createElement(ErrorScreen, { kind: "error", onRetry: () => {} }));
    expect(out).toContain("Oops, something went wrong");
    expect(out).toContain("Your saved progress is safe");
    expect(out).toContain("Try again");
    expect(out).toContain('href="/"');
    expect(out).not.toMatch(/stack|undefined|\[object/i);
  });

  it("says a page was not found without blaming anyone", () => {
    const out = html(createElement(ErrorScreen, { kind: "not-found" }));
    expect(out).toContain("I can't find that page");
    expect(out).toContain('href="/"');
    expect(out).not.toContain("Try again");
  });
});

describe("MoveInput", () => {
  it("has a label, a hint and an example, so it can be used without a mouse or by a screen reader", () => {
    const out = html(createElement(MoveInput, { onMove: () => {} }));
    expect(out).toContain('for="move-input"');
    expect(out).toContain('id="move-input"');
    expect(out).toContain("e2 e4");
    expect(out).toContain('aria-describedby="move-input-help"');
  });

  it("is switched off while it is not your turn", () => {
    expect(html(createElement(MoveInput, { onMove: () => {}, disabled: true }))).toContain("disabled");
  });
});
