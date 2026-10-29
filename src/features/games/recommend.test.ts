import { describe, expect, it } from "vitest";
import { game, gameWithMistakes, inOrder } from "./testHelpers";
import { repeatedMistake, suggestLesson, suggestLevel } from "./recommend";

const LESSONS = [
  { id: "dont-hang-pieces", title: "Don't hang your pieces" },
  { id: "whats-the-threat", title: "What is my opponent threatening?" },
  { id: "trading-fairly", title: "Trading fairly" },
];

describe("repeatedMistake", () => {
  it("is nothing without a repeat", () => {
    expect(repeatedMistake([])).toBeNull();
    expect(repeatedMistake([gameWithMistakes(["hanging_piece"])])).toBeNull();
    expect(repeatedMistake(inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["bad_trade"])]))).toBeNull();
  });

  it("finds a mistake that keeps coming back, across games", () => {
    const games = inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["hanging_piece", "bad_trade"])]);
    expect(repeatedMistake(games)).toEqual({ type: "hanging_piece", count: 2 });
  });

  it("looks at the latest games first, so it changes as habits change", () => {
    // Long ago: hanging pieces, three times. Lately: missed threats, three times.
    const old = Array.from({ length: 3 }, () => gameWithMistakes(["hanging_piece"]));
    const lately = Array.from({ length: 5 }, (_, i) => gameWithMistakes(i < 3 ? ["missed_threat"] : []));
    expect(repeatedMistake(inOrder([...old, ...lately]))).toEqual({ type: "missed_threat", count: 3 });
  });

  it("falls back to every game when the latest ones are clean", () => {
    const old = [gameWithMistakes(["bad_trade"]), gameWithMistakes(["bad_trade"])];
    const lately = Array.from({ length: 5 }, () => game());
    expect(repeatedMistake(inOrder([...old, ...lately]))).toEqual({ type: "bad_trade", count: 2 });
  });

  it("breaks a tie in favour of the more recent mistake", () => {
    const games = inOrder([
      gameWithMistakes(["hanging_piece", "hanging_piece"]),
      gameWithMistakes(["bad_trade", "bad_trade"]),
    ]);
    expect(repeatedMistake(games)?.type).toBe("bad_trade");
  });

  it("goes with the bigger count over the more recent one", () => {
    const games = inOrder([
      gameWithMistakes(["hanging_piece", "hanging_piece", "hanging_piece"]),
      gameWithMistakes(["bad_trade", "bad_trade"]),
    ]);
    expect(repeatedMistake(games)?.type).toBe("hanging_piece");
  });

  it("ignores types it does not know", () => {
    expect(repeatedMistake(inOrder([gameWithMistakes(["mystery", "mystery", "mystery"])]))).toBeNull();
  });

  it("counts mistakes from games that were left unfinished too", () => {
    const games = inOrder([
      gameWithMistakes(["blunder"], { result: "abandoned" }),
      gameWithMistakes(["blunder"]),
    ]);
    expect(repeatedMistake(games)?.type).toBe("blunder");
  });
});

describe("suggestLesson", () => {
  it("suggests the lesson that matches the repeated mistake, kindly", () => {
    const games = inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["hanging_piece"])]);
    const suggestion = suggestLesson(games, LESSONS);
    expect(suggestion).toMatchObject({ lessonId: "dont-hang-pieces", type: "hanging_piece", count: 2 });
    expect(suggestion?.message).toContain("2 times");
    expect(suggestion?.message).toContain("Don't hang your pieces");
    expect(suggestion?.message).toMatch(/Want to/);
    expect(suggestion?.message).not.toMatch(/[{}]/);
  });

  it("suggests a different lesson when a different mistake is repeated", () => {
    const hanging = inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["hanging_piece"])]);
    expect(suggestLesson(hanging, LESSONS)?.lessonId).toBe("dont-hang-pieces");

    const thenTrades = inOrder([
      ...hanging,
      gameWithMistakes(["bad_trade"]),
      gameWithMistakes(["bad_trade"]),
      gameWithMistakes(["bad_trade"]),
    ]);
    expect(suggestLesson(thenTrades, LESSONS)?.lessonId).toBe("trading-fairly");

    const thenThreats = inOrder([
      ...thenTrades,
      ...Array.from({ length: 5 }, () => gameWithMistakes(["missed_threat", "missed_threat"])),
    ]);
    expect(suggestLesson(thenThreats, LESSONS)?.lessonId).toBe("whats-the-threat");
  });

  it("suggests nothing when no mistake repeats, or the lesson is not available", () => {
    expect(suggestLesson(inOrder([gameWithMistakes(["bad_trade"])]), LESSONS)).toBeNull();
    const repeated = inOrder([gameWithMistakes(["bad_trade"]), gameWithMistakes(["bad_trade"])]);
    expect(suggestLesson(repeated, [])).toBeNull();
  });
});

describe("suggestLevel", () => {
  const at = (level: number, results: ("win" | "loss" | "draw" | "abandoned")[]) =>
    results.map((result) => game({ botLevel: level, result }));

  it("suggests the next level up after a winning streak", () => {
    const suggestion = suggestLevel(inOrder(at(2, ["win", "win", "win"])));
    expect(suggestion).toMatchObject({ kind: "raise", from: 2, to: 3 });
    expect(suggestion?.message).toMatch(/might like to try level 3/);
  });

  it("suggests the next level down after a losing streak", () => {
    const suggestion = suggestLevel(inOrder(at(3, ["loss", "loss", "loss"])));
    expect(suggestion).toMatchObject({ kind: "lower", from: 3, to: 2 });
    expect(suggestion?.message).toMatch(/might like to try level 2/);
  });

  it("needs a full streak, with nothing else mixed in", () => {
    expect(suggestLevel(inOrder(at(2, ["win", "win"])))).toBeNull();
    expect(suggestLevel(inOrder(at(2, ["win", "win", "draw"])))).toBeNull();
    expect(suggestLevel(inOrder(at(2, ["win", "win", "loss", "win"])))).toBeNull();
    expect(suggestLevel(inOrder(at(2, ["loss", "loss", "win"])))).toBeNull();
  });

  it("only looks at the latest streak", () => {
    expect(suggestLevel(inOrder(at(2, ["loss", "loss", "win", "win", "win"])))?.kind).toBe("raise");
  });

  it("does not suggest going past the ends", () => {
    expect(suggestLevel(inOrder(at(5, ["win", "win", "win"])))).toBeNull();
    expect(suggestLevel(inOrder(at(1, ["loss", "loss", "loss"])))).toBeNull();
  });

  it("starts counting again after the level changes", () => {
    const games = inOrder([...at(1, ["win", "win", "win"]), ...at(2, ["win"])]);
    expect(suggestLevel(games)).toBeNull();
  });

  it("ignores games that were left unfinished", () => {
    expect(suggestLevel(inOrder(at(2, ["win", "abandoned", "win", "win"])))?.kind).toBe("raise");
    expect(suggestLevel(inOrder(at(2, ["abandoned", "abandoned", "abandoned"])))).toBeNull();
  });

  it("has nothing to say with no games", () => {
    expect(suggestLevel([])).toBeNull();
  });
});
