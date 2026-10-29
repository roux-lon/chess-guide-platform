import { describe, expect, it } from "vitest";
import {
  mateToMoverPerspective,
  scoreToWhite,
  sideToMove,
  toMoverPerspective,
} from "./perspective";

describe("sideToMove", () => {
  it("reads the turn from a FEN", () => {
    expect(sideToMove("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe("white");
    expect(sideToMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")).toBe("black");
  });

  it("throws on nonsense", () => {
    expect(() => sideToMove("garbage")).toThrow();
  });
});

describe("toMoverPerspective", () => {
  it("keeps the sign for White", () => {
    expect(toMoverPerspective(300, "white")).toBe(300);
    expect(toMoverPerspective(-300, "white")).toBe(-300);
  });

  it("flips the sign for Black", () => {
    expect(toMoverPerspective(300, "black")).toBe(-300);
    expect(toMoverPerspective(-300, "black")).toBe(300);
  });

  it("keeps zero as zero", () => {
    expect(toMoverPerspective(0, "black")).toBe(0);
  });

  it("judges a move: an evaluation swing to +900 for White", () => {
    const before = 0;
    const after = 900; // always White's perspective
    // Good for White if White moved...
    expect(toMoverPerspective(after, "white") - toMoverPerspective(before, "white")).toBe(900);
    // ...and a blunder if Black was the one who moved.
    expect(toMoverPerspective(after, "black") - toMoverPerspective(before, "black")).toBe(-900);
  });
});

describe("mateToMoverPerspective", () => {
  it("positive means the mover delivers mate", () => {
    expect(mateToMoverPerspective(2, "white")).toBe(2);
    expect(mateToMoverPerspective(-2, "white")).toBe(-2);
    expect(mateToMoverPerspective(2, "black")).toBe(-2);
    expect(mateToMoverPerspective(-2, "black")).toBe(2);
  });

  it("leaves null and zero alone", () => {
    expect(mateToMoverPerspective(null, "black")).toBeNull();
    expect(mateToMoverPerspective(0, "black")).toBe(0);
  });
});

describe("scoreToWhite", () => {
  it("converts a side-to-move score into White's perspective", () => {
    expect(scoreToWhite(250, "white")).toBe(250);
    expect(scoreToWhite(250, "black")).toBe(-250);
  });
});
