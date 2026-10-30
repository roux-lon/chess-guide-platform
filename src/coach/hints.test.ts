import { describe, expect, it } from "vitest";
import { START_FEN } from "@/rules";
import { buildHintEvents } from "./hints";

// The black bishop on a5 attacks the white knight on c3, and nothing protects the knight.
const KNIGHT_ATTACKED = "4k3/8/8/b7/8/2N5/8/4K3 w - - 0 1";

const hintsFor = (fen: string, bestMove: { from: string; to: string } | null = null) =>
  buildHintEvents({ fen, playerColor: "white", bestMove });

describe("buildHintEvents: the thinking routine", () => {
  it("returns three tiers in order: safety check, plan check, suggestion", () => {
    const events = hintsFor(START_FEN, { from: "g1", to: "f3" });
    expect(events.map((e) => e.kind)).toEqual(["hint_safety", "hint_plan", "hint_suggest"]);
  });

  describe("tier 1: safety check", () => {
    it("names the player's pieces that could be won", () => {
      const [safety] = hintsFor(KNIGHT_ATTACKED, { from: "e1", to: "d2" });
      expect(safety).toMatchObject({
        kind: "hint_safety",
        unsafe: [{ type: "knight", square: "c3" }],
        inCheck: false,
      });
    });

    it("says plainly that nothing is in danger", () => {
      const [safety] = hintsFor(START_FEN, { from: "e2", to: "e4" });
      expect(safety).toMatchObject({ unsafe: [], inCheck: false });
    });

    it("does not count the bot's loose pieces as danger for the player", () => {
      const [safety] = hintsFor("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1", { from: "d1", to: "d5" });
      expect(safety).toMatchObject({ unsafe: [] });
    });

    it("counts a protected piece that a cheaper piece attacks", () => {
      // The black pawn on e5 attacks the rook on d4, which the queen protects: still a loss.
      const [safety] = hintsFor("4k3/8/8/4p3/3R4/8/8/3QK3 w - - 0 1");
      expect(safety).toMatchObject({ unsafe: [{ type: "rook", square: "d4" }] });
    });

    it("notes when the player is in check", () => {
      const [safety] = hintsFor("4k3/8/8/8/8/8/8/4K2r w - - 0 1", { from: "e1", to: "d2" });
      expect(safety).toMatchObject({ inCheck: true });
    });
  });

  describe("tier 2: plan check", () => {
    const planOf = (fen: string) => hintsFor(fen)[1];

    it("starts with getting out of check", () => {
      expect(planOf("4k3/8/8/8/8/8/8/4K2r w - - 0 1")).toMatchObject({ plan: "check" });
    });

    it("then the bot's main threat", () => {
      expect(planOf(KNIGHT_ATTACKED)).toMatchObject({
        plan: "threat",
        pieces: [{ type: "knight", square: "c3" }],
      });
    });

    it("then the pieces still at home", () => {
      const plan = planOf(START_FEN);
      expect(plan).toMatchObject({ plan: "develop" });
      expect(plan.kind === "hint_plan" && plan.pieces).toHaveLength(4);
    });

    it("then castling, once the knights and bishops are out", () => {
      expect(planOf("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1")).toMatchObject({ plan: "castle" });
    });

    it("then the center, when no pawn stands there", () => {
      expect(planOf("4k3/pppp1ppp/8/8/8/8/PPPP1PPP/4K3 w - - 0 1")).toMatchObject({ plan: "center" });
    });

    it("and says nothing is urgent when all of that is done", () => {
      expect(planOf("4k3/8/8/8/4P3/8/8/4K3 w - - 0 1")).toMatchObject({ plan: "free" });
    });
  });

  describe("tier 3: the move, with its purpose", () => {
    it("suggests the move and says what it is for", () => {
      const [, , suggest] = hintsFor(START_FEN, { from: "g1", to: "f3" });
      expect(suggest).toMatchObject({
        kind: "hint_suggest",
        suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" },
        purpose: "develop",
        safeAfter: true,
      });
    });

    it("says 'other' when the move has no simple purpose, so the narrator can be honest", () => {
      const [, , suggest] = buildHintEvents({
        fen: "4k3/8/8/8/8/R7/8/4K3 w - - 0 1",
        playerColor: "white",
        bestMove: { from: "a3", to: "b3" },
        ply: 30,
      });
      expect(suggest).toMatchObject({ purpose: "other", safeAfter: true });
    });

    it("notes when the suggested move still leaves something in danger", () => {
      // Kf1 does nothing about the knight on c3.
      const [, , suggest] = hintsFor(KNIGHT_ATTACKED, { from: "e1", to: "f1" });
      expect(suggest).toMatchObject({ safeAfter: false });
    });

    it("copes with no engine suggestion", () => {
      const events = hintsFor(START_FEN, null);
      expect(events[2]).toMatchObject({ kind: "hint_suggest", suggestion: null, purpose: "other", safeAfter: false });
    });

    it("copes with an engine suggestion that is not legal", () => {
      const events = hintsFor(START_FEN, { from: "e2", to: "e5" });
      expect(events[2]).toMatchObject({ suggestion: null });
    });
  });
});
