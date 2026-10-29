import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { contextFor } from "../testHelpers";
import { centerControl } from "./centerControl";
import { goodDevelopment } from "./goodDevelopment";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2";

describe("goodDevelopment", () => {
  it("fires when a knight leaves its starting square early", () => {
    expect(goodDevelopment(contextFor(START_FEN, "g1", "f3"))).toEqual([
      { kind: "good_development", actor: "you", piece: "knight", from: "g1", to: "f3" },
    ]);
  });

  it("fires for a bishop and for the bot's pieces too", () => {
    expect(goodDevelopment(contextFor(AFTER_E4_E5, "f1", "c4", { ply: 5 }))).toHaveLength(1);
    const bot = goodDevelopment(contextFor(AFTER_E4, "b8", "c6", { ply: 2 }));
    expect(bot).toMatchObject([{ actor: "bot", piece: "knight" }]);
  });

  it("does NOT fire for pawn or queen moves", () => {
    expect(goodDevelopment(contextFor(START_FEN, "e2", "e4"))).toEqual([]);
    expect(goodDevelopment(contextFor(AFTER_E4_E5, "d1", "h5", { ply: 5 }))).toEqual([]);
  });

  it("does NOT fire for a piece that has already left home", () => {
    expect(goodDevelopment(contextFor("4k3/8/8/8/8/5N2/8/4K3 w - - 0 1", "f3", "g1"))).toEqual([]);
    expect(goodDevelopment(contextFor("4k3/8/8/8/8/5N2/8/4K3 w - - 0 1", "f3", "e5"))).toEqual([]);
  });

  it("does NOT fire late in the game", () => {
    expect(goodDevelopment(contextFor(START_FEN, "g1", "f3", { ply: 31 }))).toEqual([]);
  });
});

describe("centerControl", () => {
  it("fires when a pawn takes a center square", () => {
    expect(centerControl(contextFor(START_FEN, "e2", "e4"))).toEqual([
      { kind: "center_control", actor: "you", how: "occupy", piece: "pawn", squares: ["e4"] },
    ]);
  });

  it("fires when a knight starts eyeing the center", () => {
    expect(centerControl(contextFor(START_FEN, "g1", "f3"))).toEqual([
      { kind: "center_control", actor: "you", how: "attack", piece: "knight", squares: ["d4", "e5"] },
    ]);
  });

  it("does NOT fire for a pawn move on the edge", () => {
    expect(centerControl(contextFor(START_FEN, "a2", "a3"))).toEqual([]);
  });

  it("does NOT fire when the knight gains no new center squares", () => {
    expect(centerControl(contextFor("4k3/8/8/8/8/5N2/8/4K3 w - - 0 1", "f3", "h4"))).toEqual([]);
  });

  it("does NOT fire late in the game", () => {
    expect(centerControl(contextFor(START_FEN, "e2", "e4", { ply: 31 }))).toEqual([]);
  });
});
