import { describe, expect, it } from "vitest";
import { analyzeMoveEvents } from "./analyze";
import { TemplateNarrator } from "./narrate";
import type { TermId } from "./narrate";
import { contextsFromSan } from "./testHelpers";

// Full games run through the whole chain (detectors, ranking, narration). Whatever happens
// in them, a comment has to teach something: it may never be empty or just say what was played.

const GAMES: Record<string, string[]> = {
  "Scholar's mate": ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"],
  "Fool's mate": ["f3", "e5", "g4", "Qh4#"],
  "Opera game": "e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#".split(" "),
  "Berlin (a queen trade)": "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8".split(" "),
  "Queen's Gambit (trades)": "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5".split(" "),
  "Scandinavian (early queen)": "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Nf6 Bc4 Bf5 Bd2 e6 Qe2 Bb4 O-O Nbd7".split(" "),
};

/** Sentences that only say which piece went where. The move log already shows that. */
const RESTATING = /\b(?:you|the bot)(?:'s)? (?:moved|played)\b|\bgoes to [a-h][1-8]|\bfrom [a-h][1-8] to [a-h][1-8]/i;

describe.each(Object.entries(GAMES))("%s", (_name, sans) => {
  for (const playerColor of ["white", "black"] as const) {
    it(`gives every move a real comment (player is ${playerColor})`, () => {
      const narrator = new TemplateNarrator(Math.random);
      const explained = new Set<TermId>();

      for (const ctx of contextsFromSan(sans, playerColor)) {
        const events = analyzeMoveEvents(ctx);
        const { comment, text, explainedTerms } = narrator.narrate({ events, explained });
        explainedTerms.forEach((t) => explained.add(t));
        const where = `ply ${ctx.ply} ${ctx.move.san}`;

        expect(comment, where).not.toBeNull();
        if (!comment) continue;

        // Never empty, never a bare restatement.
        expect(comment.headline.trim().length, `${where}: headline`).toBeGreaterThan(0);
        expect(comment.why.trim().length, `${where}: why`).toBeGreaterThan(0);
        expect(comment.watch.trim().length, `${where}: watch`).toBeGreaterThan(0);
        for (const part of [comment.headline, comment.why, comment.watch, ...comment.more]) {
          expect(part, `${where}: "${part}"`).not.toMatch(RESTATING);
          expect(part, where).not.toMatch(/[{}]|undefined|NaN/);
        }
        expect(comment.headline, where).not.toBe(ctx.move.san);
        expect(comment.headline, where).not.toBe(comment.why);
        expect(text, where).toContain(comment.headline);

        // Whose turn it is must match the board, and a chance only ever comes on the player's turn.
        expect(comment.toMove, where).toBe(ctx.toMove);
        if (comment.kind === "opportunity") expect(comment.toMove, where).toBe("you");
        // The user's own attack on the bot is never presented as something to grab.
        if (ctx.actor === "you") expect(text, where).not.toMatch(/can you take/i);
        // Every event carries who it is about and what it means.
        for (const event of events) {
          expect(["user", "bot"], where).toContain(event.perspective);
          expect(["threat", "opportunity", "trade", "info"], where).toContain(event.nature);
        }
        // At most one new term is explained per comment.
        expect(explainedTerms.length, where).toBeLessThanOrEqual(1);
      }
    });
  }
});

describe("sample games", () => {
  it("tell the Berlin queen swap as a trade", () => {
    const contexts = contextsFromSan(GAMES["Berlin (a queen trade)"], "white");
    const recapture = contexts[contexts.length - 1];
    const events = analyzeMoveEvents(recapture);
    expect(events).toContainEqual(expect.objectContaining({ kind: "trade_sequence", won: "queen", lost: "queen" }));
    const { comment } = new TemplateNarrator(() => 0).narrate({ events, explained: new Set() });
    expect(comment?.kind).toBe("trade");
    expect(comment?.headline).toMatch(/queen/i);
  });

  it("call the final moves of a checkmate game over, whoever plays", () => {
    for (const playerColor of ["white", "black"] as const) {
      const contexts = contextsFromSan(GAMES["Fool's mate"], playerColor);
      const last = contexts[contexts.length - 1];
      const { comment } = new TemplateNarrator(() => 0).narrate({ events: analyzeMoveEvents(last), explained: new Set() });
      expect(comment?.headline).toMatch(/Checkmate/);
    }
  });
});
