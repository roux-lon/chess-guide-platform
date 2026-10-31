import { describe, expect, it } from "vitest";
import { createGameFromSan } from "@/rules";
import type { Color } from "@/rules";
import { nextStep, openingView, safeSuggestions } from "./openingView";

const play = (...san: string[]) => {
  const game = createGameFromSan(san);
  if (!game) throw new Error(`Test setup: ${san.join(" ")} is not legal`);
  return { fen: game.fen(), history: game.history() };
};
const viewOf = (color: Color, ...san: string[]) => {
  const { fen, history } = play(...san);
  return openingView(fen, color, history);
};
const sans = (step: ReturnType<typeof nextStep>) => (step.kind === "goal" ? step.moves.map((m) => m.san) : []);

const FULL_SETUP = ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bc4", "Bc5", "d3", "d6", "Be3", "Be6", "O-O", "O-O", "Qe2", "Qe7"];

describe("nextStep as White", () => {
  it("starts with the center", () => {
    const { fen, history } = play();
    const step = nextStep(fen, "white", history);
    expect(step).toMatchObject({ kind: "goal", goalId: "center" });
    expect(sans(step)).toEqual(["e4", "d4"]);
  });

  it("moves on to the knights once the center is claimed", () => {
    const { fen, history } = play("e4", "e5");
    const step = nextStep(fen, "white", history);
    expect(step).toMatchObject({ kind: "goal", goalId: "knights" });
    expect(sans(step)).toEqual(["Nf3", "Nc3"]);
  });

  it("then the bishops", () => {
    const { fen, history } = play("e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6");
    const step = nextStep(fen, "white", history);
    expect(step).toMatchObject({ kind: "goal", goalId: "bishops" });
    expect(sans(step)).toEqual(["Bc4", "Be2"]);
  });

  it("offers a pawn move to free the second bishop", () => {
    const { fen, history } = play("e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bc4", "Bc5");
    const step = nextStep(fen, "white", history);
    expect(step).toMatchObject({ kind: "goal", goalId: "bishops" });
    expect(sans(step)).toEqual(["d3"]); // d4 would just lose the pawn to the bishop and knight
  });

  it("then castling, then the rooks", () => {
    const castle = play(...FULL_SETUP.slice(0, 12));
    expect(nextStep(castle.fen, "white", castle.history)).toMatchObject({ kind: "goal", goalId: "castle" });
    expect(sans(nextStep(castle.fen, "white", castle.history))[0]).toBe("O-O");

    const rooks = play(...FULL_SETUP.slice(0, 14));
    expect(nextStep(rooks.fen, "white", rooks.history)).toMatchObject({ kind: "goal", goalId: "rooks" });
    expect(sans(nextStep(rooks.fen, "white", rooks.history))).toContain("Qe2");
  });

  it("is a free choice once every goal is done", () => {
    const { fen, history } = play(...FULL_SETUP);
    expect(nextStep(fen, "white", history)).toEqual({ kind: "free", allDone: true });
  });

  it("waits when it is the bot turn", () => {
    const { fen, history } = play("e4");
    expect(nextStep(fen, "white", history)).toEqual({ kind: "wait" });
  });
});

describe("safety beats the plan", () => {
  it("says to handle a piece in danger first, naming it", () => {
    // 1.e4 e5 2.Bc4 Qh4: the queen attacks the unguarded e4 pawn.
    const { fen, history } = play("e4", "e5", "Bc4", "Qh4");
    expect(nextStep(fen, "white", history)).toEqual({ kind: "safety", pieces: [{ type: "pawn", square: "e4" }] });
  });

  it("says check comes first when the king is attacked", () => {
    const { fen, history } = play("e4", "f6", "Qh5+");
    expect(nextStep(fen, "black", history)).toEqual({ kind: "check" });
  });

  it("returns to the plan once the danger is dealt with", () => {
    const { fen, history } = play("e4", "e5", "Bc4", "Qh4", "Qe2", "a6");
    expect(nextStep(fen, "white", history).kind).not.toBe("safety");
  });
});

describe("a chance to win a piece", () => {
  it("comes before the plan when the bot leaves a piece to be won", () => {
    // A black knight on a3 can be taken by the b2 pawn, and nothing can take back.
    const fen = "rnbqkbnr/pppppppp/8/8/8/n7/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const step = nextStep(fen, "white", []);
    expect(step).toMatchObject({
      kind: "chance",
      target: { type: "knight", square: "a3" },
      attacker: { type: "pawn", square: "b2" },
      move: { from: "b2", to: "a3", san: "bxa3" },
    });
  });

  it("counts a trade that wins material: a pawn takes a knight and is taken back", () => {
    // 1.c4 e5 2.Nf3 e4 3.g3: the e4 pawn can take the knight on f3; it is taken back, but Black is ahead.
    const { fen, history } = play("c4", "e5", "Nf3", "e4", "g3");
    expect(nextStep(fen, "black", history)).toMatchObject({ kind: "chance", move: { san: "exf3" } });
  });

  it("does not interrupt the plan for a single free pawn", () => {
    // The black pawn on b3 can be taken for free, but a pawn is not worth leaving the plan for.
    const fen = "rnbqkbnr/pppppppp/8/8/8/1p6/P1PPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(nextStep(fen, "white", [])).toMatchObject({ kind: "goal", goalId: "center" });
  });

  it("safety still comes first", () => {
    // 1.e4 e5 2.Bc4 Qh4: the e4 pawn is attacked; the queen is not capturable for free.
    const { fen, history } = play("e4", "e5", "Bc4", "Qh4");
    expect(nextStep(fen, "white", history).kind).toBe("safety");
  });
});

describe("safeSuggestions", () => {
  it("drops a move that is not legal", () => {
    const { fen } = play();
    expect(safeSuggestions(fen, "white", [{ from: "e2", to: "e5", reason: "x" }])).toEqual([]);
  });

  it("drops a move that loses the moved piece", () => {
    // The black pawn on e4 attacks f3, so a knight there would be won for a pawn.
    const fen = "rnbqkbnr/pppp1ppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const result = safeSuggestions(fen, "white", [
      { from: "g1", to: "f3", reason: "x" },
      { from: "b1", to: "c3", reason: "y" },
    ]);
    expect(result.map((r) => r.san)).toEqual(["Nc3"]);
  });

  it("drops a move that leaves another piece to be won", () => {
    // After 1.e4 e5 2.Bc4 Qh4 the e4 pawn is attacked; moving the a-pawn leaves it hanging.
    const { fen } = play("e4", "e5", "Bc4", "Qh4");
    const result = safeSuggestions(fen, "white", [
      { from: "a2", to: "a3", reason: "leaves e4 hanging" },
      { from: "d2", to: "d3", reason: "guards e4" },
    ]);
    expect(result.map((r) => r.san)).toEqual(["d3"]);
  });
});

describe("playing Black", () => {
  it("answers 1.e4 with ...e5", () => {
    const { fen, history } = play("e4");
    const step = nextStep(fen, "black", history);
    expect(sans(step)).toEqual(["e5"]);
    expect(step).toMatchObject({ kind: "goal", goalId: "center" });
  });

  it("answers 1.d4 with ...d5", () => {
    const { fen, history } = play("d4");
    expect(sans(nextStep(fen, "black", history))).toEqual(["d5"]);
  });

  it("otherwise offers safe pawn moves your own way", () => {
    const { fen, history } = play("Nf3");
    const step = nextStep(fen, "black", history);
    expect(sans(step)).toEqual(["d5", "c5"]); // ...e5 would lose a pawn to the knight
    if (step.kind === "goal") expect(step.why).toContain("your own way");
  });

  it("uses the same goals as White after the first move, with mirrored squares", () => {
    const { fen, history } = play("e4", "e5", "Nf3", "Nc6", "Nc3");
    const step = nextStep(fen, "black", history);
    expect(step).toMatchObject({ kind: "goal", goalId: "knights" });
    expect(sans(step)).toEqual(["Nf6"]);
  });
});

describe("checklist and ending", () => {
  it("ticks goals as they are done", () => {
    const view = viewOf("white", "e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6");
    expect(view.goals.map((g) => [g.id, g.done])).toEqual([
      ["center", true],
      ["knights", true],
      ["bishops", false],
      ["castle", false],
      ["rooks", false],
    ]);
    expect(view.complete).toBe(false);
    expect(view.ended).toBe(false);
    expect(view.myMoves).toBe(3);
  });

  it("ends when the checklist is complete", () => {
    const view = viewOf("white", ...FULL_SETUP);
    expect(view.complete).toBe(true);
    expect(view.ended).toBe(true);
  });

  it("ends after 12 of my moves even if the checklist is not done", () => {
    const there = ["Nf3", "Nf6", "Ng1", "Ng8"];
    const shuffle = Array.from({ length: 6 }, () => there).flat(); // 12 moves each
    expect(viewOf("white", ...shuffle.slice(0, 22)).ended).toBe(false);
    const view = viewOf("white", ...shuffle.slice(0, 23));
    expect(view.myMoves).toBe(12);
    expect(view.complete).toBe(false);
    expect(view.ended).toBe(true);
  });

  it("counts only my moves when I am Black", () => {
    expect(viewOf("black", "e4", "e5", "Nf3").myMoves).toBe(1);
  });
});

describe("the note about my last move", () => {
  it("names the goal a move completed", () => {
    const view = viewOf("white", "e4", "e5");
    expect(view.lastMove).toMatchObject({ san: "e4", onPlan: true });
    expect(view.lastMove?.advanced.map((g) => g.id)).toEqual(["center"]);
  });

  it("calls a suggested move on-plan even when it completes nothing", () => {
    const view = viewOf("white", "e4", "e5", "Nf3", "Nc6");
    expect(view.lastMove).toMatchObject({ san: "Nf3", onPlan: true, advanced: [] });
  });

  it("is gentle with a move that is not on the plan, and blocks nothing", () => {
    const view = viewOf("white", "e4", "e5", "Na3", "Nc6");
    expect(view.lastMove).toMatchObject({ san: "Na3", onPlan: false, advanced: [] });
  });

  it("is missing before I have moved", () => {
    expect(viewOf("black", "e4").lastMove).toBeUndefined();
    expect(viewOf("white").lastMove).toBeUndefined();
  });

  it("adds a caution for an edge pawn before the center is claimed", () => {
    expect(viewOf("white", "a3", "e5").lastMove?.caution?.id).toBe("edge-pawn");
  });

  it("adds a caution for an early queen", () => {
    expect(viewOf("white", "e4", "e5", "Qh5", "Nc6").lastMove?.caution?.id).toBe("early-queen");
  });

  it("adds a caution for moving the same piece twice", () => {
    expect(viewOf("white", "Nf3", "d5", "Ng5", "e5").lastMove?.caution?.id).toBe("same-piece-twice");
  });

  it("adds a caution for an early f-pawn", () => {
    expect(viewOf("white", "f4", "e5").lastMove?.caution?.id).toBe("early-f-pawn");
  });

  it("gives no caution for a good move, or for a capture", () => {
    expect(viewOf("white", "e4", "e5").lastMove?.caution).toBeUndefined();
    expect(viewOf("white", "e4", "d5", "exd5", "Qxd5").lastMove?.caution).toBeUndefined();
  });

  it("gives no same-piece caution when the piece was in danger", () => {
    // 1.Nf3 d5 2.Ne5 f6: the knight on e5 is attacked, so moving it again is a fair retreat.
    expect(viewOf("white", "Nf3", "d5", "Ne5", "f6", "Nf3", "e5").lastMove?.caution?.id).not.toBe("same-piece-twice");
  });
});
