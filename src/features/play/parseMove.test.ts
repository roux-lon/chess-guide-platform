import { describe, expect, it } from "vitest";
import { parseSquares } from "./parseMove";

describe("parseSquares", () => {
  it.each(["e2e4", "e2 e4", "e2-e4", "E2 E4", "  e2   e4 ", "e2 to e4", "e2,e4", "e2>e4"])("reads %j", (text) => {
    expect(parseSquares(text)).toEqual({ ok: true, from: "e2", to: "e4" });
  });

  it("explains an empty box", () => {
    const r = parseSquares("   ");
    expect(!r.ok && r.message).toMatch(/e2 e4/);
  });

  it("explains too few or too many squares", () => {
    for (const text of ["e2", "e2e4e5", "knight f3"]) {
      const r = parseSquares(text);
      expect(r.ok, text).toBe(false);
    }
  });

  it("explains squares that do not exist", () => {
    for (const text of ["i2 e4", "e9 e4", "e2 e0", "22 44"]) {
      const r = parseSquares(text);
      expect(!r.ok && r.message, text).toMatch(/a to h/);
    }
  });

  it("refuses staying in place", () => {
    const r = parseSquares("e2 e2");
    expect(!r.ok && r.message).toMatch(/different square/);
  });

  it("never gives a message that blames the person", () => {
    for (const text of ["", "x", "zz zz", "e2 e2"]) {
      const r = parseSquares(text);
      expect(!r.ok && r.message).not.toMatch(/wrong|invalid|error|illegal/i);
    }
  });
});
