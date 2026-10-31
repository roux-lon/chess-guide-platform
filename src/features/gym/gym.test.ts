import { describe, expect, it } from "vitest";
import { GYM_DRILLS } from "@/content";
import type { Drill } from "@/content";
import { createGameFromSan, movesToPgn } from "@/rules";
import type { GameRecord, MistakePosition } from "@/storage";
import { addAnswers, percent } from "./accuracy";
import { SESSION_SIZE, buildSessionDrills, similarDrill } from "./buildSession";
import { positionsFromGame } from "./fromGames";
import { drillsFromPosition } from "./fromMistakes";
import { GymSession } from "./GymSession";
import { drillProblems } from "./solve";

const byId = (id: string): Drill => {
  const found = GYM_DRILLS.find((d) => d.id === id);
  if (!found) throw new Error(`no drill ${id}`);
  return found;
};

/** A repeatable random number source. */
function seeded(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("GymSession", () => {
  it("judges spot the threat by the rules: right set, a missed piece, a wrong extra piece", () => {
    const drill = byId("threat-8"); // f7 and g4 are in danger
    const right = new GymSession({ drills: [drill] });
    right.toggleSquare("f7");
    right.toggleSquare("g4");
    right.submitThreat();
    expect(right.getSnapshot().verdict?.correct).toBe(true);

    const wrong = new GymSession({ drills: [drill] });
    wrong.toggleSquare("f7");
    wrong.toggleSquare("a7");
    wrong.submitThreat();
    const verdict = wrong.getSnapshot().verdict;
    expect(verdict?.correct).toBe(false);
    expect(verdict?.detail).toContain("g4");
    expect(verdict?.detail).toContain("a7");
  });

  it("accepts 'nothing is in danger' when that is true, and only then", () => {
    const calm = new GymSession({ drills: [byId("threat-4")] });
    calm.submitThreat();
    expect(calm.getSnapshot().verdict?.correct).toBe(true);

    const danger = new GymSession({ drills: [byId("threat-1")] });
    danger.submitThreat();
    expect(danger.getSnapshot().verdict?.correct).toBe(false);
  });

  it("only lets the player pick their own pieces, not the king or the other side", () => {
    const session = new GymSession({ drills: [byId("threat-1")] });
    session.toggleSquare("e1"); // own king
    session.toggleSquare("e5"); // the other side's pawn
    session.toggleSquare("e4");
    expect(session.getSnapshot().selected).toEqual(["e4"]);
    session.toggleSquare("e4");
    expect(session.getSnapshot().selected).toEqual([]);
  });

  it("answers 'is it safe' from the rules, even if the drill data said otherwise", () => {
    const real = byId("safe-1"); // Nxe5 is NOT safe
    const lying = { ...real, safe: true, loses: undefined } as Drill;
    const session = new GymSession({ drills: [lying] });
    session.answerSafe(false);
    expect(session.getSnapshot().verdict?.correct).toBe(true);
  });

  it("marks the safe move green and the others red after 'pick the best move'", () => {
    const session = new GymSession({ drills: [byId("pick-1")] });
    session.pick(0); // Nxe5 hangs the knight
    const snap = session.getSnapshot();
    expect(snap.verdict?.correct).toBe(false);
    expect(snap.verdict?.detail).toContain("O-O");
    expect(snap.choices?.map((c) => c.state)).toEqual(["wrong", "right", "idle"]);
    expect(snap.arrows.map((a) => a.color)).toEqual(["red", "green", "red"]);

    const good = new GymSession({ drills: [byId("pick-1")] });
    good.pick(1);
    expect(good.getSnapshot().verdict?.correct).toBe(true);
  });

  it("judges the plan from the position", () => {
    const session = new GymSession({ drills: [byId("plan-5")] });
    session.choosePlan("develop");
    expect(session.getSnapshot().verdict?.correct).toBe(false);
    expect(session.getSnapshot().choices?.map((c) => c.state)).toEqual(["right", "wrong", "idle"]);

    const right = new GymSession({ drills: [byId("plan-5")] });
    right.choosePlan("castle");
    expect(right.getSnapshot().verdict?.correct).toBe(true);
  });

  it("judges a double attack by what the move really attacks, and ignores an illegal drop", () => {
    const drill = byId("fork-1"); // Nb5-c7+ forks the king and the rook
    const session = new GymSession({ drills: [drill, byId("fork-2")] });

    session.attemptMove("b5", "b6"); // a knight cannot go there
    let snap = session.getSnapshot();
    expect(snap.phase).toBe("question");
    expect(snap.notice).toMatch(/not allowed/);
    expect(snap.answers).toHaveLength(0);

    session.attemptMove("b5", "d4"); // legal, but attacks nothing
    snap = session.getSnapshot();
    expect(snap.verdict?.correct).toBe(false);
    expect(snap.arrows.map((a) => a.color)).toEqual(["red", "green"]);

    const right = new GymSession({ drills: [drill] });
    right.attemptMove("b5", "c7");
    expect(right.getSnapshot().verdict?.correct).toBe(true);
  });

  it("moves through the drills, finishes once and reports every answer", () => {
    const finishes: number[] = [];
    const session = new GymSession({
      drills: [byId("threat-4"), byId("safe-1")],
      onFinish: (answers) => finishes.push(answers.length),
    });
    session.submitThreat();
    expect(session.getSnapshot().number).toBe(1);
    session.next();
    expect(session.getSnapshot().number).toBe(2);
    session.answerSafe(true); // wrong
    session.next();

    const snap = session.getSnapshot();
    expect(snap.phase).toBe("summary");
    expect(snap.summary).toMatchObject({ correct: 1, total: 2 });
    expect(snap.summary?.perType).toEqual([
      { type: "spotThreat", counts: { asked: 1, correct: 1 } },
      { type: "isItSafe", counts: { asked: 1, correct: 0 } },
    ]);
    session.next();
    expect(finishes).toEqual([2]);
  });

  it("offers a similar drill after a wrong answer and inserts it next", () => {
    const pool = GYM_DRILLS;
    const session = new GymSession({ drills: [byId("safe-1"), byId("plan-1")], pool, random: seeded(3) });
    session.answerSafe(true); // wrong
    expect(session.getSnapshot().canSimilar).toBe(true);
    session.similar();
    const snap = session.getSnapshot();
    expect(snap.total).toBe(3);
    expect(snap.drill?.type).toBe("isItSafe");
    expect(snap.drill?.id).not.toBe("safe-1");
  });

  it("does not offer a similar drill after a right answer", () => {
    const session = new GymSession({ drills: [byId("safe-1")], pool: GYM_DRILLS });
    session.answerSafe(false);
    expect(session.getSnapshot().canSimilar).toBe(false);
    session.similar();
    expect(session.getSnapshot().total).toBe(1);
  });

  it("ignores answers of the wrong kind and answers after the drill is settled", () => {
    const session = new GymSession({ drills: [byId("safe-1")] });
    session.pick(0);
    session.submitThreat();
    expect(session.getSnapshot().answers).toHaveLength(0);
    session.answerSafe(false);
    session.answerSafe(true);
    expect(session.getSnapshot().answers).toHaveLength(1);
  });

  it("finishes straight away with no drills", () => {
    const finishes: number[] = [];
    const session = new GymSession({ drills: [], onFinish: (a) => finishes.push(a.length) });
    expect(session.getSnapshot().phase).toBe("summary");
    expect(finishes).toEqual([0]);
  });
});

describe("buildSessionDrills", () => {
  it("makes five different drills of mixed kinds", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const drills = buildSessionDrills({ builtIn: GYM_DRILLS, random: seeded(seed) });
      expect(drills).toHaveLength(SESSION_SIZE);
      expect(new Set(drills.map((d) => d.id)).size).toBe(SESSION_SIZE);
      expect(new Set(drills.map((d) => d.type)).size).toBe(5);
    }
  });

  it("puts up to two drills from the person's own games in, when asked", () => {
    const position: MistakePosition = {
      id: "g:7",
      gameId: "g",
      ply: 7,
      playedAt: "2026-01-01T00:00:00Z",
      fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      move: { from: "f3", to: "e5" },
      type: "hanging_piece",
    };
    const mine = drillsFromPosition(position);
    expect(mine.length).toBe(2);
    const withMine = buildSessionDrills({ builtIn: GYM_DRILLS, mine, includeMine: true, random: seeded(2) });
    expect(withMine.filter((d) => d.id.startsWith("mine-"))).toHaveLength(2);
    expect(withMine).toHaveLength(SESSION_SIZE);
    const without = buildSessionDrills({ builtIn: GYM_DRILLS, mine, includeMine: false, random: seeded(2) });
    expect(without.some((d) => d.id.startsWith("mine-"))).toBe(false);
  });

  it("finds a similar drill of the same kind that is not in the session", () => {
    const current = byId("fork-1");
    const found = similarDrill(current, GYM_DRILLS, new Set(["fork-1"]), () => 0);
    expect(found?.type).toBe("spotDoubleAttack");
    expect(found?.id).not.toBe("fork-1");
    const all = new Set(GYM_DRILLS.filter((d) => d.type === "spotDoubleAttack").map((d) => d.id));
    expect(similarDrill(current, GYM_DRILLS, all)).toBeUndefined();
  });
});

describe("accuracy", () => {
  it("adds a session to the totals without changing the old object", () => {
    const before = { isItSafe: { asked: 2, correct: 1 } };
    const after = addAnswers(before, [
      { drillId: "a", type: "isItSafe", correct: true },
      { drillId: "b", type: "spotThreat", correct: false },
    ]);
    expect(after).toEqual({ isItSafe: { asked: 3, correct: 2 }, spotThreat: { asked: 1, correct: 0 } });
    expect(before).toEqual({ isItSafe: { asked: 2, correct: 1 } });
  });

  it("gives a whole-number percent, or nothing when nothing was asked", () => {
    expect(percent({ asked: 3, correct: 2 })).toBe(67);
    expect(percent({ asked: 0, correct: 0 })).toBeNull();
    expect(percent(undefined)).toBeNull();
  });
});

describe("drills from my own mistakes", () => {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Nxe5? Nxe5 loses a knight for a pawn (White's 7th half-move).
  const moves = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "Nxe5", "Nxe5"];
  const record = (change: Partial<GameRecord> = {}): GameRecord => ({
    id: "game-x",
    playedAt: "2026-05-01T10:00:00.000Z",
    result: "loss",
    playerColor: "white",
    botLevel: 1,
    coachingMode: "quiet",
    pgn: movesToPgn(moves, { event: "t", date: "2026.05.01", white: "You", black: "Bot", result: "0-1" }) ?? "",
    coachLog: [],
    mistakes: [{ ply: 7, type: "hanging_piece" }],
    ...change,
  });

  it("keeps the position just before the mistake, with the move that was played", () => {
    const [position] = positionsFromGame(record());
    expect(position).toMatchObject({
      id: "game-x:7",
      gameId: "game-x",
      ply: 7,
      type: "hanging_piece",
      move: { from: "f3", to: "e5" },
    });
    expect(position.fen).toBe(createGameFromSan(moves.slice(0, 6))?.fen());
  });

  it("skips mistakes that are not the person's own move, or not in the game", () => {
    const skipped = positionsFromGame(record({ mistakes: [{ ply: 8, type: "blunder" }, { ply: 99, type: "blunder" }] }));
    expect(skipped).toEqual([]);
    expect(positionsFromGame(record({ mistakes: [] }))).toEqual([]);
    expect(positionsFromGame(record({ pgn: "not a game" }))).toEqual([]);
  });

  it("turns the position into an 'is it safe' drill and a 'pick of three' drill that the rules agree with", () => {
    const [position] = positionsFromGame(record());
    const drills = drillsFromPosition(position);
    expect(drills.map((d) => d.type)).toEqual(["isItSafe", "pickOfThree"]);
    for (const drill of drills) {
      expect(drillProblems(drill)).toEqual([]);
      expect(drill.intro).toMatch(/your own games/);
    }
    const safe = drills[0];
    if (safe.type !== "isItSafe") throw new Error("expected isItSafe");
    expect(safe).toMatchObject({ safe: false, loses: "e5", move: { from: "f3", to: "e5" } });
    expect(safe.explanation).toContain("Nxe5");
    expect(safe.explanation).toContain("knight");
  });

  it("makes nothing from a mistake the rules cannot explain (the played move was safe)", () => {
    const position: MistakePosition = {
      id: "g:7",
      gameId: "g",
      ply: 7,
      playedAt: "2026-05-01T10:00:00.000Z",
      fen: createGameFromSan(moves.slice(0, 6))?.fen() ?? "",
      move: { from: "e1", to: "g1" }, // castling is safe
      type: "blunder",
    };
    expect(drillsFromPosition(position)).toEqual([]);
  });

  it("can be played in a session", () => {
    const [position] = positionsFromGame(record());
    const session = new GymSession({ drills: drillsFromPosition(position) });
    expect(session.getSnapshot().drill?.type).toBe("isItSafe");
    session.answerSafe(false);
    expect(session.getSnapshot().verdict?.correct).toBe(true);
    session.next();
    const pick = session.getSnapshot();
    expect(pick.drill?.type).toBe("pickOfThree");
    const best = pick.drill?.type === "pickOfThree" ? pick.drill.best : -1;
    session.pick(best);
    expect(session.getSnapshot().verdict?.correct).toBe(true);
  });
});
