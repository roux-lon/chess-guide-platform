// Smoke test for the coach drawer: a comment shows its headline prominently, why and watch
// smaller, extra findings collapsed, and chips for the kind and whose turn it is.
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CoachLogEntry } from "@/features/play";
import { CoachDrawer } from "./CoachDrawer";

const noop = () => {};
const text = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

function render(props: Partial<ComponentProps<typeof CoachDrawer>> = {}) {
  return text(
    renderToString(
      createElement(CoachDrawer, {
        open: true,
        onClose: noop,
        log: [],
        hints: [],
        canRequestHint: true,
        hintLoading: false,
        onRequestHint: noop,
        ...props,
      }),
    ),
  );
}

const entry = (overrides: Partial<CoachLogEntry> = {}): CoachLogEntry => ({
  ply: 3,
  moveSan: "Bf6",
  side: "you",
  events: [],
  text: "Old words.",
  comment: {
    kind: "threat",
    toMove: "bot",
    headline: "Your bishop on f6 now attacks the bot's rook on e5.",
    why: "Making threats forces the other side to react.",
    watch: "See how the bot answers.",
    more: ["Good habit: you are bringing your bishop into play."],
    events: [],
  },
  ...overrides,
});

describe("CoachDrawer comments", () => {
  it("shows the headline, why, watch and a collapsed 'more' with the two chips", () => {
    const html = render({ log: [entry()] });
    expect(html).toContain("Your bishop on f6 now attacks the bot's rook on e5.");
    expect(html).toContain("Why:");
    expect(html).toContain("Making threats forces the other side to react.");
    expect(html).toContain("Watch:");
    expect(html).toContain("See how the bot answers.");
    expect(html).toContain("1 more thing");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Threat");
    expect(html).toContain("Bot's turn");
  });

  it("uses a different chip for a chance, a trade and a tip", () => {
    const kinds = [
      ["opportunity", "Chance"],
      ["trade", "Trade"],
      ["info", "Tip"],
    ] as const;
    for (const [kind, label] of kinds) {
      const base = entry();
      const html = render({
        log: [entry({ comment: { ...base.comment!, kind, toMove: "you" } })],
      });
      expect(html, kind).toContain(label);
      expect(html, kind).toContain("Your turn");
    }
  });

  it("does not show an empty 'more' section or empty why/watch lines", () => {
    const base = entry();
    const html = render({
      log: [entry({ comment: { ...base.comment!, more: [], why: "", watch: "" } })],
    });
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Why:");
    expect(html).not.toContain("Watch:");
  });

  it("falls back to the plain text for comments restored from a saved game", () => {
    const html = render({ log: [entry({ comment: undefined, text: "Careful: nothing protects your knight." })] });
    expect(html).toContain("Careful: nothing protects your knight.");
    expect(html).not.toContain("Why:");
  });

  it("names each hint step", () => {
    const html = render({
      hints: [
        { tier: 1, title: "Safety check", text: "Nothing of yours can be won right now." },
        { tier: 2, title: "Plan check", text: "Bring out your knights." },
      ],
    });
    expect(html).toContain("Hint 1 of 3 · Safety check");
    expect(html).toContain("Hint 2 of 3 · Plan check");
  });
});
