import { describe, expect, it } from "vitest";
import { analyzeMoveEvents } from "./analyze";
import type { CoachComment } from "./comment";
import { TemplateNarrator } from "./narrate";
import type { TermId } from "./narrate";
import { contextFor, contextsFromMoves } from "./testHelpers";
import type { MoveContext } from "./types";

// Regression tests from real play. Each one is a position where the old coach taught the
// wrong lesson. They run the whole chain: detectors, ranking, narration.

const none = new Set<TermId>();

function commentFor(ctx: MoveContext, pick = 0): CoachComment {
  const events = analyzeMoveEvents(ctx);
  const { comment } = new TemplateNarrator(() => pick).narrate({ events, explained: none });
  if (!comment) throw new Error("expected a comment");
  return comment;
}

const everything = (c: CoachComment) => [c.headline, c.why, c.watch, ...c.more].join(" ");

describe("(a) my move attacks a loose rook while the bot is to move: a threat, not a chance", () => {
  // Bg5-f6 attacks the undefended rook on e5. (The king is on h1 so the rook is not giving check.)
  const ctx = contextFor("4k3/8/8/4r1B1/8/8/8/7K w - - 0 1", "g5", "f6");

  it("is told as a threat that the bot has to answer", () => {
    expect(ctx.actor).toBe("you");
    expect(ctx.toMove).toBe("bot");
    for (const pick of [0, 0.99]) {
      const comment = commentFor(ctx, pick);
      expect(comment.kind).toBe("threat");
      expect(comment.toMove).toBe("bot");
      expect(comment.headline).toMatch(/rook on e5/);
      expect(comment.headline).toMatch(/(has to|must) (respond|answer)/);
    }
  });

  it("never invites the player to take the rook", () => {
    for (const pick of [0, 0.99]) {
      expect(everything(commentFor(ctx, pick))).not.toMatch(/can you take|you could capture|capture it next/i);
    }
  });

  it("does not make an opportunity event at all", () => {
    const events = analyzeMoveEvents(ctx);
    expect(events.some((e) => e.kind === "opportunity")).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ kind: "threat_created", nature: "threat", perspective: "user" }));
  });
});

describe("(b) the bot's move leaves a piece en prise and it is my turn: a chance", () => {
  // Black's queen lands on a5, where White's rook on a1 takes it for free.
  const ctx = contextFor("3qk3/8/8/8/8/8/8/R6K b - - 0 1", "d8", "a5");

  it("is an opportunity", () => {
    expect(ctx.actor).toBe("bot");
    expect(ctx.toMove).toBe("you");
    const comment = commentFor(ctx);
    expect(comment.kind).toBe("opportunity");
    expect(comment.toMove).toBe("you");
    expect(comment.headline).toMatch(/queen on a5/);
    expect(comment.watch).toMatch(/check/i); // look before you grab
  });

  it("is not a chance when it is the bot's turn", () => {
    // Same kind of position, but the player just moved: nothing is a "chance" for the player.
    const mine = contextFor("4k3/8/8/4r3/8/8/8/2B4K w - - 0 1", "c1", "f4");
    expect(commentFor(mine).kind).not.toBe("opportunity");
  });
});

describe("(c) a queen trade is one trade comment", () => {
  // Qh4-g5, the bot's queen takes it, and the bishop on f4 takes the bot's queen back.
  const [offer, take, retake] = contextsFromMoves("3qk3/p7/8/8/5B1Q/8/P7/6K1 w - - 0 1", [
    ["h4", "g5"],
    ["d8", "g5"],
    ["f4", "g5"],
  ]);

  it("tells the recapture as a queen trade, once", () => {
    const events = analyzeMoveEvents(retake);
    expect(events.filter((e) => e.kind === "trade_sequence")).toHaveLength(1);
    expect(events.some((e) => e.kind === "capture_trade")).toBe(false);

    for (const pick of [0, 0.99]) {
      const comment = commentFor(retake, pick);
      expect(comment.kind).toBe("trade");
      expect(comment.headline).toMatch(/queen/i);
      expect(comment.headline).toMatch(/trade|swap/i);
    }
  });

  it("does not describe the recapture as anyone leaving a queen unprotected", () => {
    for (const pick of [0, 0.99]) {
      expect(everything(commentFor(retake, pick))).not.toMatch(/unprotected|nothing protects|left its|hanging|for free/i);
    }
  });

  it("the offer is not called hanging, and the bot's capture points out the recapture", () => {
    expect(analyzeMoveEvents(offer).some((e) => e.kind === "hanging_piece")).toBe(false);
    const events = analyzeMoveEvents(take);
    expect(events).toContainEqual(expect.objectContaining({ kind: "capture_trade", verdict: "equal", actor: "bot" }));
    expect(events).toContainEqual(expect.objectContaining({ kind: "opportunity", target: { type: "queen", square: "g5" } }));
  });
});

describe("(d) double attacks (forks)", () => {
  it("positive: a knight that checks the king and attacks a rook", () => {
    const comment = commentFor(contextFor("r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5", "c7"));
    expect(comment.kind).toBe("threat");
    expect(comment.headline).toMatch(/^Double attack!/);
    expect(comment.headline).toMatch(/check/);
    expect(comment.why).toMatch(/\bfork\b/); // the term is explained the first time
  });

  it("positive: a knight that attacks two rooks", () => {
    const comment = commentFor(contextFor("4k3/8/r1r5/8/8/3N4/8/4K3 w - - 0 1", "d3", "b4"));
    expect(comment.headline).toMatch(/^Double attack!/);
    expect(comment.headline).toMatch(/only save one/);
  });

  it("positive: the bot's fork is told as a warning", () => {
    const comment = commentFor(contextFor("4k3/8/8/8/3n4/8/8/R3K3 b - - 0 1", "d4", "c2"));
    expect(comment.kind).toBe("threat");
    expect(comment.toMove).toBe("you");
    expect(comment.headline).toMatch(/^The bot's knight gives check and also attacks your rook on a1/);
  });

  it("negative: the forking piece can be captured", () => {
    const events = analyzeMoveEvents(contextFor("r2qk3/8/8/3N4/8/8/8/4K3 w - - 0 1", "d5", "c7"));
    expect(events.some((e) => e.kind === "double_attack")).toBe(false);
  });

  it("negative: only one of the two targets can be won", () => {
    // The knight attacks two pawns, but each is protected.
    const events = analyzeMoveEvents(contextFor("4k3/4p3/3p4/8/8/4N3/8/4K3 w - - 0 1", "e3", "f5"));
    expect(events.some((e) => e.kind === "double_attack" || e.kind === "threat_created")).toBe(false);
  });
});
