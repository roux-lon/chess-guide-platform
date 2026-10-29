import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio } from "@/lib/contrast";
import { board, colors } from "./theme";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const theme = css.slice(css.indexOf("@theme"), css.indexOf("}", css.indexOf("@theme")));

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const AA = 4.5; // normal text
const LARGE = 3; // large text and graphics

const { ink, surface, page, brand, brandDark, good, goodDark, warn, danger, info } = colors;

describe("tokens", () => {
  it("are the same in CSS and TypeScript", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(theme, `--color-${kebab(name)}`).toContain(`--color-${kebab(name)}: ${value};`);
    }
    expect(theme).toContain(`--board-light: ${board.light};`);
    expect(theme).toContain(`--board-dark: ${board.dark};`);
  });
});

describe("text contrast (WCAG AA)", () => {
  /** [description, text colour, background colour, needed ratio] */
  const pairs: [string, string, string, number][] = [
    ["ink on the page", ink, page, AA],
    ["ink on cards", ink, surface, AA],
    ["white on brand buttons", surface, brand, AA],
    ["white on dark brand buttons", surface, brandDark, AA],
    ["white on blue buttons", surface, info, AA],
    ["white on red buttons", surface, danger, AA],
    ["ink on warning buttons", ink, warn, AA],
    ["brand links on cards", brand, surface, AA],
    ["brand headings on the page", brand, page, AA],
    ["error text on cards", danger, surface, AA],
    ["success text on cards", goodDark, surface, AA],
    ["success text on the page", goodDark, page, AA],
    ["muted text on cards", blend(ink, surface, 0.7), surface, AA],
    ["muted text on the page", blend(ink, page, 0.7), page, AA],
  ];

  for (const [name, text, background, needed] of pairs) {
    it(`${name}`, () => {
      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(needed);
    });
  }

  it("ink stays readable on every tinted card", () => {
    const tints = [good, warn, danger, info, brand];
    for (const base of [surface, page]) {
      for (const tint of tints) {
        for (const alpha of [0.1, 0.15, 0.2, 0.25, 0.3]) {
          const background = blend(tint, base, alpha);
          expect(contrastRatio(ink, background), `ink on ${tint}/${alpha} over ${base}`).toBeGreaterThanOrEqual(AA);
          expect(
            contrastRatio(blend(ink, background, 0.7), background),
            `muted ink on ${tint}/${alpha} over ${base}`,
          ).toBeGreaterThanOrEqual(AA);
        }
      }
    }
  });
});

describe("board colours", () => {
  it("keep the two kinds of square easy to tell apart", () => {
    expect(contrastRatio(board.light, board.dark)).toBeGreaterThanOrEqual(2);
  });

  it("keep both colours of piece clearly visible on both kinds of square", () => {
    for (const square of [board.light, board.dark]) {
      expect(contrastRatio("#000000", square), `black piece on ${square}`).toBeGreaterThanOrEqual(LARGE);
    }
    // White pieces have a dark outline, but their fill should still stand out from the dark squares.
    expect(contrastRatio("#ffffff", board.dark)).toBeGreaterThanOrEqual(LARGE);
  });
});

describe("contrast maths", () => {
  it("gives 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#6d4aff", "#6d4aff")).toBe(1);
  });
});
