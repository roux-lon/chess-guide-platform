import { describe, expect, it } from "vitest";
import { TemplateNarrator, commentText } from "@/coach";
import type { Evaluation } from "@/engine";
import { START_FEN } from "@/rules";
import { analyzeMove } from "./analyzeMove";

const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

const evaluation = (cpWhite: number): Evaluation => ({
  cpWhite,
  mateIn: null,
  bestMove: null,
  principalVariation: [],
});

/** An evaluate() that answers from a map and records what it was asked. */
function fakeEvaluate(answers: Record<string, Evaluation | null>) {
  const asked: string[] = [];
  return {
    asked,
    evaluate: async (fen: string) => {
      asked.push(fen);
      return answers[fen] ?? null;
    },
  };
}

const narrator = () => new TemplateNarrator(() => 0);
const base = { ply: 1, playerColor: "white" as const, explained: new Set<never>() };

describe("analyzeMove", () => {
  it("rejects an illegal move", async () => {
    const { evaluate } = fakeEvaluate({});
    await expect(
      analyzeMove({ evaluate, narrator: narrator() }, { ...base, fenBefore: START_FEN, from: "e2", to: "e5" }),
    ).rejects.toThrow(/illegal/i);
  });

  it("evaluates before and after, then writes a log entry", async () => {
    const { evaluate, asked } = fakeEvaluate({
      [START_FEN]: evaluation(20),
      [AFTER_E4]: evaluation(30),
    });
    const { entry, evalBefore, evalAfter } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, fenBefore: START_FEN, from: "e2", to: "e4" },
    );
    expect(asked).toEqual([START_FEN, AFTER_E4]);
    expect(evalBefore?.cpWhite).toBe(20);
    expect(evalAfter?.cpWhite).toBe(30);
    expect(entry).toMatchObject({ ply: 1, moveSan: "e4", side: "you" });
    // The comment teaches (why the move was good) instead of repeating where the pawn went.
    expect(entry.comment).toMatchObject({ kind: "info", toMove: "bot" });
    expect(entry.comment?.headline).toMatch(/middle|center/i);
    expect(entry.comment?.why).not.toBe("");
    expect(entry.comment?.watch).not.toBe("");
    expect(entry.text).toBe(commentText(entry.comment!));
    expect(entry.text).not.toMatch(/moved your pawn from e2 to e4/);
    expect(entry.events[0]).toMatchObject({ kind: "move_played" });
    expect(entry.warning).toBeUndefined();
  });

  it("flags a blunder with a take-back warning", async () => {
    const { evaluate } = fakeEvaluate({
      [START_FEN]: evaluation(20),
      [AFTER_E4]: evaluation(-500),
    });
    const { entry } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, fenBefore: START_FEN, from: "e2", to: "e4" },
    );
    expect(entry.warning).toBe("blunder");
    expect(entry.text).toMatch(/blunder/i);
  });

  it("sends the bot's moves through the same pipeline", async () => {
    const { evaluate } = fakeEvaluate({ [AFTER_E4]: evaluation(30) });
    const { entry } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, ply: 2, fenBefore: AFTER_E4, from: "e7", to: "e5" },
    );
    expect(entry).toMatchObject({ ply: 2, moveSan: "e5", side: "bot" });
    expect(entry.text).toMatch(/^The bot/);
    expect(entry.warning).toBeUndefined();
  });

  it("never offers a take-back for the bot's slips", async () => {
    const { evaluate } = fakeEvaluate({
      [AFTER_E4]: evaluation(-20),
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": evaluation(600),
    });
    const { entry } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, ply: 2, fenBefore: AFTER_E4, from: "e7", to: "e5" },
    );
    expect(entry.events).toContainEqual(expect.objectContaining({ quality: "blunder", actor: "bot" }));
    expect(entry.warning).toBeUndefined();
  });

  it("does not evaluate a finished game", async () => {
    const mateIn1 = "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1";
    const { evaluate, asked } = fakeEvaluate({ [mateIn1]: evaluation(900) });
    const { entry, evalAfter } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, fenBefore: mateIn1, from: "a1", to: "a8" },
    );
    expect(asked).toEqual([mateIn1]);
    expect(evalAfter).toBeNull();
    expect(entry.text).toMatch(/checkmate/i);
  });

  it("still comments when the engine gives nothing", async () => {
    const { evaluate } = fakeEvaluate({});
    const { entry } = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, fenBefore: START_FEN, from: "g1", to: "f3" },
    );
    expect(entry.text.length).toBeGreaterThan(0);
    expect(entry.events.some((e) => e.kind === "move_quality")).toBe(false);
  });

  it("reports which terms it explained", async () => {
    const { evaluate } = fakeEvaluate({});
    const first = await analyzeMove(
      { evaluate, narrator: narrator() },
      { ...base, fenBefore: START_FEN, from: "g1", to: "f3" },
    );
    expect(first.explainedTerms.length).toBeGreaterThan(0);
  });
});
