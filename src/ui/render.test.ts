// Smoke test: server-render every lesson's explanation and every exercise's first screen.
// It cannot click anything, but it catches components that crash on real content.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LESSONS } from "@/content";
import { ExerciseRunner } from "@/features/lessons";
import { ExerciseView } from "./ExerciseView";
import { Inline, RichText } from "./RichText";

const noop = () => {};

/** React escapes quotes and ampersands in HTML; undo that so text can be compared. */
const decode = (html: string) =>
  html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("lesson rendering", () => {
  it("renders every lesson's explanation", () => {
    for (const lesson of LESSONS) {
      const html = renderToString(createElement(RichText, { blocks: lesson.body }));
      expect(html.length, lesson.id).toBeGreaterThan(50);
      expect(html, lesson.id).not.toMatch(/\*\*/);
      expect(html, lesson.id).not.toMatch(/undefined|NaN/);
    }
  });

  it("renders the first screen of every exercise", () => {
    for (const lesson of LESSONS) {
      for (const exercise of lesson.exercises) {
        const runner = new ExerciseRunner(exercise);
        const html = decode(
          renderToString(
            createElement(ExerciseView, {
              runner: runner.getSnapshot(),
              onMove: noop,
              onAnswer: noop,
              onChoosePromotion: noop,
              onCancelPromotion: noop,
            }),
          ),
        );
        expect(html, exercise.id).toContain(exercise.prompt.replace(/\*\*/g, "").slice(0, 12));
        expect(html, exercise.id).not.toMatch(/undefined|NaN/);
        if (exercise.type === "quiz") {
          for (const choice of exercise.choices) expect(html, exercise.id).toContain(choice.text.slice(0, 8));
        }
      }
    }
  });

  it("renders emphasis as bold", () => {
    expect(renderToString(createElement(Inline, { text: "Go to **e4**" }))).toContain("<strong");
  });
});
