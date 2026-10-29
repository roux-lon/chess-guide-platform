import { describe, expect, it } from "vitest";
import { parseInline, stripEmphasis } from "./richText";

describe("parseInline", () => {
  it("returns plain text as one span", () => {
    expect(parseInline("Hello there")).toEqual([{ text: "Hello there", bold: false }]);
  });

  it("splits out bold parts", () => {
    expect(parseInline("A **bold** word")).toEqual([
      { text: "A ", bold: false },
      { text: "bold", bold: true },
      { text: " word", bold: false },
    ]);
  });

  it("handles bold at the start and end, and several in a row", () => {
    expect(parseInline("**one** and **two**")).toEqual([
      { text: "one", bold: true },
      { text: " and ", bold: false },
      { text: "two", bold: true },
    ]);
  });

  it("keeps an unmatched marker as text instead of losing words", () => {
    const spans = parseInline("Oops **forgot to close");
    expect(spans.map((s) => s.text).join("")).toBe("Oops **forgot to close");
    expect(spans.every((s) => !s.bold)).toBe(true);
  });

  it("returns nothing for empty text", () => {
    expect(parseInline("")).toEqual([]);
  });
});

describe("stripEmphasis", () => {
  it("removes the markers", () => {
    expect(stripEmphasis("Move to **e4** now")).toBe("Move to e4 now");
  });
});
