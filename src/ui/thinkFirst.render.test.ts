// Smoke tests for the think-first card: it shows the question with a Skip button, then the answer.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { THINK_FIRST_TEXT } from "@/content";
import type { ThinkingView } from "@/features/play";
import { ThinkFirstCard } from "./ThinkFirstCard";

const noop = () => {};
const text = (html: string) => html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

const asking: ThinkingView = {
  type: "bestPlan",
  prompt: THINK_FIRST_TEXT.prompt.bestPlan,
  trains: THINK_FIRST_TEXT.trains.bestPlan,
  options: [
    { label: "Claim the center", state: "idle" },
    { label: "Castle", state: "idle" },
  ],
  dangerSquares: [],
  arrows: [],
};

describe("ThinkFirstCard", () => {
  it("shows the question, the options and a Skip button", () => {
    const html = text(renderToString(createElement(ThinkFirstCard, { thinking: asking, onAnswer: noop, onSkip: noop })));
    expect(html).toContain(THINK_FIRST_TEXT.prompt.bestPlan);
    expect(html).toContain("Claim the center");
    expect(html).toContain(THINK_FIRST_TEXT.skip);
  });

  it("after an answer shows the reason and the options can no longer be pressed", () => {
    const answered: ThinkingView = {
      ...asking,
      options: [
        { label: "Claim the center", state: "right" },
        { label: "Castle", state: "wrong" },
      ],
      verdict: { correct: false, headline: THINK_FIRST_TEXT.wrong, reason: "The biggest thing to do here is: claim the center." },
    };
    const html = text(renderToString(createElement(ThinkFirstCard, { thinking: answered, onAnswer: noop, onSkip: noop })));
    expect(html).toContain("The biggest thing to do here is");
    expect(html).toContain(THINK_FIRST_TEXT.gotIt);
    expect(html).toContain("disabled");
  });
});
