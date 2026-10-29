import { describe, expect, it } from "vitest";
import { createGameFromSan } from "@/rules";
import { buildGameRecord } from "./record";
import type { GameMeta } from "./record";
import { buildReview } from "./review";
import { game } from "./testHelpers";

const META: GameMeta = {
  id: "g",
  startedAt: "2026-04-02T11:00:00.000Z",
  playerColor: "white",
  botLevel: 2,
  coachingMode: "full",
};
const SCHOLARS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];

const record = (overrides = {}) => ({
  ...buildGameRecord({ meta: META, sanMoves: SCHOLARS, result: "win", entries: [], now: new Date("2026-04-02T12:00:00Z") }),
  coachLog: [
    { ply: 3, event: "missed_threat", text: "Watch the queen." },
    { ply: 5, event: "hanging_piece", text: "The bishop is loose." },
    { ply: 7, event: "game_over", text: "Checkmate!" },
  ],
  mistakes: [
    { ply: 3, type: "missed_threat", lossCp: 300 },
    { ply: 5, type: "hanging_piece", lossCp: 600 },
    { ply: 7, type: "blunder", lossCp: 100 },
  ],
  ...overrides,
});

describe("buildReview", () => {
  it("lists the biggest mistakes first, with the move, the position before it and the coach's words", () => {
    const review = buildReview(record());
    expect(review.totalMistakes).toBe(3);
    expect(review.mistakes.map((m) => m.ply)).toEqual([5, 3, 7]);

    const [first] = review.mistakes;
    expect(first).toMatchObject({
      ply: 5,
      moveNumber: 3,
      type: "hanging_piece",
      label: "Leaving a piece hanging",
      lossCp: 600,
      san: "Bc4",
      from: "f1",
      to: "c4",
      text: "The bishop is loose.",
    });
    // The position before the move really is the position before it.
    expect(first.fenBefore).toBe(createGameFromSan(SCHOLARS.slice(0, 4))?.fen());
  });

  it("shows only the biggest few", () => {
    expect(buildReview(record(), 2).mistakes.map((m) => m.ply)).toEqual([5, 3]);
    expect(buildReview(record(), 2).totalMistakes).toBe(3);
    expect(buildReview(record()).mistakes).toHaveLength(3);
  });

  it("only looks at the player's own moves", () => {
    const withBotPly = record({
      mistakes: [
        { ply: 4, type: "blunder", lossCp: 900 },
        { ply: 3, type: "mistake", lossCp: 200 },
      ],
    });
    expect(buildReview(withBotPly).mistakes.map((m) => m.ply)).toEqual([3]);
  });

  it("follows the player's colour", () => {
    const asBlack = record({ playerColor: "black", mistakes: [{ ply: 4, type: "blunder", lossCp: 400 }, { ply: 3, type: "mistake", lossCp: 900 }] });
    expect(buildReview(asBlack).mistakes.map((m) => m.ply)).toEqual([4]);
  });

  it("orders mistakes with no recorded cost after the clearly costly ones, by default value", () => {
    const review = buildReview(record({ mistakes: [{ ply: 3, type: "hanging_piece" }, { ply: 5, type: "blunder", lossCp: 800 }] }));
    expect(review.mistakes.map((m) => m.ply)).toEqual([5, 3]);
    expect(review.mistakes[1].lossCp).toBe(300);
  });

  it("skips mistakes that point at a move the game never had, and survives a broken PGN", () => {
    expect(buildReview(record({ mistakes: [{ ply: 99, type: "blunder", lossCp: 500 }] })).mistakes).toEqual([]);
    const broken = buildReview(record({ pgn: "not a game" }));
    expect(broken.mistakes).toEqual([]);
    expect(broken.record.pgn).toBe("not a game");
  });

  it("counts the player's own moves", () => {
    expect(buildReview(record()).playerMoves).toBe(4); // e4, Qh5, Bc4, Qxf7
    expect(buildReview(record({ playerColor: "black" })).playerMoves).toBe(3);
    expect(buildReview(record({ pgn: "nope" })).playerMoves).toBe(0);
  });

  it("has nothing to review for a clean game", () => {
    const review = buildReview(game());
    expect(review.mistakes).toEqual([]);
    expect(review.totalMistakes).toBe(0);
  });

  it("falls back to an empty text when the coach log has no entry", () => {
    expect(buildReview(record({ coachLog: [] })).mistakes[0].text).toBe("");
  });
});
