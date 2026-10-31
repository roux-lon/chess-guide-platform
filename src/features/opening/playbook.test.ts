import { describe, expect, it } from "vitest";
import { PLAYBOOK } from "@/content";
import type { Playbook } from "@/content";
import { createGame, unsafePieces } from "@/rules";
import type { Color } from "@/rules";
import { openingView } from "./openingView";
import { playbookProblems } from "./validate";

describe("the playbook data", () => {
  it("is valid", () => {
    expect(playbookProblems(PLAYBOOK)).toEqual([]);
  });

  it("teaches the five goals in the agreed order", () => {
    expect(PLAYBOOK.goals.map((g) => g.id)).toEqual(["center", "knights", "bishops", "castle", "rooks"]);
  });

  it("catches bad data", () => {
    const bad: Playbook = {
      ...PLAYBOOK,
      goals: [
        { ...PLAYBOOK.goals[0], id: "Center!" },
        { ...PLAYBOOK.goals[0], done: { type: "pawnOn", squares: ["e9"] } },
        { ...PLAYBOOK.goals[1], candidates: [] },
        { ...PLAYBOOK.goals[1] },
      ],
      blackReplies: [{ whiteMove: { from: "e2", to: "e4" }, reply: { from: "e7", to: "e3" }, reason: "x" }],
    };
    const problems = playbookProblems(bad).join("\n");
    expect(problems).toContain("kebab-case");
    expect(problems).toContain("duplicate id");
    expect(problems).toContain('"e9" is not a square');
    expect(problems).toContain("needs at least one candidate");
    expect(problems).toContain("is not legal after");
  });
});

const BLACK_WISHES = ["e7e5", "b8c6", "g8f6", "f8c5", "d7d6", "e8g8", "c8e6", "d8e7", "a7a6", "h7h6"];
const WHITE_WISHES = ["e2e4", "g1f3", "b1c3", "f1c4", "d2d3", "e1g1"];

/** A bot that plays the first of its wishes that is legal, else a harmless pawn move. */
function botMove(game: ReturnType<typeof createGame>, wishes: readonly string[]) {
  const legal = game.legalMoves();
  for (const wish of wishes) {
    const found = legal.find((l) => l.from === wish.slice(0, 2) && l.to === wish.slice(2, 4));
    if (found) return found;
  }
  // Out of wishes: an edge-pawn move that takes nothing and gives no check (it hangs nothing).
  const quiet = legal.filter((l) => !l.captured && !l.san.includes("+") && l.piece === "pawn");
  return quiet.find((l) => l.from[0] === "a" || l.from[0] === "h") ?? quiet[0] ?? legal[0];
}

/** Plays the coach's first suggestion each turn (any legal move when there is none) until the practice ends. */
function followThePlaybook(color: Color) {
  const game = createGame();
  const log: string[] = [];
  for (let guard = 0; guard < 80; guard++) {
    const view = openingView(game.fen(), color, game.history());
    if (view.ended) return { view, log };
    if (game.turn() === color) {
      // With nothing on the plan to play (a danger to handle first), pick the legal move that leaves least in danger.
      const safest = [...game.legalMoves()].sort(
        (a, b) => unsafePieces(a.fenAfter, color).length - unsafePieces(b.fenAfter, color).length,
      )[0];
      const pick =
        view.step.kind === "goal" ? view.step.moves[0] : view.step.kind === "chance" ? view.step.move : safest;
      const move = game.tryMove(pick.from, pick.to);
      if (!move) throw new Error("the coach suggested an illegal move");
      log.push(move.san);
    } else {
      const m = botMove(game, color === "white" ? BLACK_WISHES : WHITE_WISHES);
      game.tryMove(m.from, m.to, m.promotion);
    }
  }
  throw new Error("the practice never ended");
}

describe("following the playbook against a sensible bot", () => {
  for (const color of ["white", "black"] as const) {
    it(`gets a sound setup as ${color} within 12 moves`, () => {
      const { view, log } = followThePlaybook(color);
      expect(view.goals.filter((g) => !g.done).map((g) => g.id)).toEqual([]);
      expect(view.complete).toBe(true);
      expect(log.length).toBeLessThanOrEqual(12);
    });
  }
});
