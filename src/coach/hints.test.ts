import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { buildHintEvents } from "./hints";

describe("buildHintEvents", () => {
  it("returns three tiers in order: focus, threats, suggestion", () => {
    const events = buildHintEvents({
      fen: START_FEN,
      playerColor: "white",
      bestMove: { from: "e2", to: "e4" },
    });
    expect(events.map((e) => e.kind)).toEqual(["hint_focus", "hint_threats", "hint_suggest"]);
  });

  it("points at the piece the engine wants to move, then suggests the move", () => {
    const [focus, , suggest] = buildHintEvents({
      fen: START_FEN,
      playerColor: "white",
      bestMove: { from: "g1", to: "f3" },
    });
    expect(focus).toEqual({ kind: "hint_focus", piece: { type: "knight", square: "g1" }, inCheck: false });
    expect(suggest).toEqual({
      kind: "hint_suggest",
      suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3", promotion: undefined },
    });
  });

  it("lists the player's pieces the bot is threatening", () => {
    // Black's bishop on a5 attacks the unprotected knight on c3.
    const [, threats] = buildHintEvents({
      fen: "4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1",
      playerColor: "white",
      bestMove: { from: "c3", to: "e4" },
    });
    expect(threats).toEqual({
      kind: "hint_threats",
      threatened: [{ type: "knight", square: "c3" }],
      inCheck: false,
    });
  });

  it("reports no threats when nothing is in danger", () => {
    const [, threats] = buildHintEvents({
      fen: START_FEN,
      playerColor: "white",
      bestMove: { from: "e2", to: "e4" },
    });
    expect(threats).toMatchObject({ threatened: [], inCheck: false });
  });

  it("does not list the bot's loose pieces as threats against the player", () => {
    const [, threats] = buildHintEvents({
      fen: "4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1",
      playerColor: "white",
      bestMove: { from: "d1", to: "d5" },
    });
    expect(threats).toMatchObject({ threatened: [] });
  });

  it("notes when the player is in check", () => {
    const events = buildHintEvents({
      fen: "4k3/8/8/8/8/8/8/4K2r w - - 0 1",
      playerColor: "white",
      bestMove: { from: "e1", to: "d2" },
    });
    expect(events[0]).toMatchObject({ inCheck: true });
    expect(events[1]).toMatchObject({ inCheck: true });
  });

  it("copes with no engine suggestion", () => {
    const events = buildHintEvents({ fen: START_FEN, playerColor: "white", bestMove: null });
    expect(events[0]).toMatchObject({ piece: null });
    expect(events[2]).toEqual({ kind: "hint_suggest", suggestion: null });
  });
});
