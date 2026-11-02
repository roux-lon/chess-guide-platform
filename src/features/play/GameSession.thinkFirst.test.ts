import { describe, expect, it, vi } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove, Evaluation } from "@/engine";
import { GameSession } from "./GameSession";
import type { GameSessionOptions } from "./GameSession";

/** White's knight on e5 can be taken by the d6 pawn and nothing protects it. */
const THREAT = "rnbqkbnr/ppp2ppp/3p4/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 3";

const quiet: Evaluation = { cpWhite: 0, mateIn: null, bestMove: null, principalVariation: [] };
const REPLY: EngineMove = { from: "g8", to: "f6" };

function setup(extra: Partial<GameSessionOptions> = {}) {
  const answers: { type: string; correct: boolean }[] = [];
  const session = new GameSession({
    engine: new FakeEngine([REPLY]),
    analysisEngine: new FakeEngine([], () => quiet),
    botDelayMs: 0,
    coachWaitMs: 0,
    startFen: THREAT,
    thinkFirst: "every",
    random: () => 0,
    onThinkingAnswer: (a) => answers.push(a),
    ...extra,
  });
  return { session, answers };
}

describe("GameSession think-first", () => {
  it("asks a question when my turn starts, and never locks the board", () => {
    const { session } = setup();
    session.start();
    const snap = session.getSnapshot();
    expect(snap.thinking?.type).toBe("dangerPiece");
    expect(snap.legalDests.size).toBeGreaterThan(0);
  });

  it("judges an answer once, reports it, and keeps the board playable", () => {
    const { session, answers } = setup();
    session.start();
    const view = session.getSnapshot().thinking;
    const right = view?.options.findIndex((o) => o.label.endsWith("e5")) ?? -1;
    expect(right).toBeGreaterThanOrEqual(0);
    session.answerThinking(right);
    session.answerThinking(right);
    expect(answers).toEqual([{ type: "dangerPiece", correct: true, principleId: "check-threats" }]);
    const after = session.getSnapshot();
    expect(after.thinking?.verdict?.correct).toBe(true);
    expect(after.thinking?.dangerSquares).toEqual(["e5"]);
    expect(after.legalDests.size).toBeGreaterThan(0);
  });

  it("a wrong answer is reported as wrong with a reason", () => {
    const { session, answers } = setup();
    session.start();
    const none = session.getSnapshot().thinking?.options.findIndex((o) => !o.label.includes(" on ")) ?? -1;
    session.answerThinking(none);
    expect(answers).toEqual([{ type: "dangerPiece", correct: false, principleId: "check-threats" }]);
    expect(session.getSnapshot().thinking?.verdict?.reason.length).toBeGreaterThan(0);
  });

  it("skip puts the question away without counting it", () => {
    const { session, answers } = setup();
    session.start();
    session.skipThinking();
    expect(session.getSnapshot().thinking).toBeUndefined();
    expect(answers).toEqual([]);
  });

  it("clears the question when I move", () => {
    const { session } = setup();
    session.start();
    session.attemptMove("a2", "a3");
    expect(session.getSnapshot().thinking).toBeUndefined();
  });

  it("asks nothing when off, with coaching off, or in practice", () => {
    for (const extra of [{ thinkFirst: "off" as const }, { coachingMode: "off" as const }, { practice: true }]) {
      const { session } = setup(extra);
      session.start();
      expect(session.getSnapshot().thinking).toBeUndefined();
    }
  });

  it("does not ask the same kind twice in a row", async () => {
    const { session } = setup();
    session.start();
    const first = session.getSnapshot().thinking?.type;
    expect(first).toBe("dangerPiece");
    session.attemptMove("e5", "f3");
    await vi.waitFor(() => expect(session.getSnapshot().moves).toHaveLength(2));
    const second = session.getSnapshot().thinking?.type;
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });
});
