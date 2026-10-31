import { describe, expect, it, vi } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove } from "@/engine";
import { ProgressStore } from "@/features/progress/ProgressStore";
import { MemoryStorage } from "@/storage";
import { GameFlow } from "./GameFlow";
import type { GameConfig } from "./GameFlow";

const NOW = new Date("2026-05-01T12:00:00Z");
const CONFIG: GameConfig = { level: 1, playerColor: "white", coachingMode: "quiet" };

const BOT: EngineMove[] = [
  { from: "e7", to: "e5" },
  { from: "b8", to: "c6" },
  { from: "g8", to: "f6" },
  { from: "f8", to: "c5" },
  { from: "d7", to: "d6" },
  { from: "c8", to: "e6" },
  { from: "e8", to: "g8" },
  { from: "d8", to: "e7" },
];
/** A full setup for White: center, both knights, both bishops, castle, queen off the back row. */
const SETUP: [string, string][] = [
  ["e2", "e4"],
  ["g1", "f3"],
  ["b1", "c3"],
  ["f1", "c4"],
  ["d2", "d3"],
  ["c1", "e3"],
  ["e1", "g1"],
  ["d1", "e2"],
];

function setup(botMoves: EngineMove[] = BOT) {
  const progress = new ProgressStore(new MemoryStorage(), { now: () => NOW });
  const flow = new GameFlow({
    progress,
    now: () => NOW,
    createBotEngine: () => new FakeEngine([...botMoves]),
    createAnalysisEngine: () => new FakeEngine(),
    sessionDefaults: { botDelayMs: 0, coachWaitMs: 50 },
  });
  flow.connect();
  return { flow, progress };
}
type Parts = ReturnType<typeof setup>;

const session = (parts: Parts) => {
  const s = parts.flow.getSnapshot().session;
  if (!s) throw new Error("no game is being played");
  return s;
};
async function play(parts: Parts, from: string, to: string, expectReply = true) {
  const s = session(parts);
  const before = s.getSnapshot().sanMoves.length;
  s.attemptMove(from, to);
  await vi.waitFor(() => expect(s.getSnapshot().sanMoves.length).toBe(before + (expectReply ? 2 : 1)));
}

describe("opening practice", () => {
  it("starts as its own mode, with the checklist, and saves no game", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startOpening(CONFIG);

    const snap = parts.flow.getSnapshot();
    expect(snap).toMatchObject({ phase: "playing", opening: true, practice: false });
    const game = session(parts).getSnapshot();
    expect(game.coachingMode).toBe("quiet");
    expect(game.opening?.step).toMatchObject({ kind: "goal", goalId: "center" });

    await play(parts, "e2", "e4");
    expect(session(parts).getSnapshot().opening?.goals[0]).toMatchObject({ id: "center", done: true });
    await parts.flow.leave();
    const diary = parts.progress.getSnapshot().diary;
    expect(diary.games).toEqual([]);
    expect(diary.activeGame).toBeUndefined();
    expect(diary.playbook.completions).toEqual([]);
    expect(parts.flow.getSnapshot().opening).toBe(false);
  });

  it("does not touch a game that was waiting to be continued", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await play(parts, "e2", "e4");
    await parts.flow.leave();
    expect(parts.flow.getSnapshot().resume).not.toBeNull();

    await parts.flow.startOpening(CONFIG);
    await parts.flow.leave();
    expect(parts.flow.getSnapshot().resume).not.toBeNull();
  });

  it("writes one line in the diary when the checklist is complete", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startOpening(CONFIG);
    for (const [from, to] of SETUP.slice(0, -1)) await play(parts, from, to);
    expect(parts.progress.getSnapshot().diary.playbook.completions).toEqual([]);

    await play(parts, "d1", "e2", false);
    await vi.waitFor(() => expect(parts.progress.getSnapshot().diary.playbook.completions).toHaveLength(1));
    expect(parts.progress.getSnapshot().diary.playbook.completions[0]).toMatchObject({
      color: "white",
      complete: true,
      moves: 8,
      goalsDone: ["center", "knights", "bishops", "castle", "rooks"],
    });
    expect(session(parts).getSnapshot().opening?.ended).toBe(true);
    // Still not a saved game, and no XP for practice.
    expect(parts.progress.getSnapshot().diary.games).toEqual([]);
    expect(parts.progress.getSnapshot().diary.xp).toBe(0);
  });

  it("carries on as a normal guided game from the same position", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startOpening(CONFIG);
    for (const [from, to] of SETUP.slice(0, -1)) await play(parts, from, to);
    await play(parts, "d1", "e2", false);
    const openingId = session(parts).getSnapshot().gameId;
    const fen = session(parts).getSnapshot().fen;
    await vi.waitFor(() => expect(parts.progress.getSnapshot().diary.playbook.completions).toHaveLength(1));

    await parts.flow.continueOpeningAsGame();
    const snap = parts.flow.getSnapshot();
    expect(snap).toMatchObject({ phase: "playing", opening: false, practice: false });
    const game = session(parts).getSnapshot();
    expect(game.gameId).not.toBe(openingId);
    expect(game.fen).toBe(fen);
    expect(game.sanMoves).toHaveLength(15);
    expect(game.opening).toBeUndefined();

    // From here it is saved like any other game: leaving keeps it to continue.
    await parts.flow.leave();
    const diary = parts.progress.getSnapshot().diary;
    expect(diary.games).toHaveLength(1);
    expect(diary.games[0].result).toBe("abandoned");
    expect(diary.activeGame?.moves).toHaveLength(15);
  });

  it("ends after 12 moves even if the checklist is not done", async () => {
    // Twelve quiet pawn moves each way (no repeated positions, so the game cannot end as a draw).
    const mine = ["a2a3", "a3a4", "h2h3", "h3h4", "g2g3", "b2b3", "c2c3", "d2d3", "e2e3", "f2f3", "b3b4", "c3c4"];
    const bots = ["a7a6", "a6a5", "h7h6", "h6h5", "g7g6", "b7b6", "c7c6", "d7d6", "e7e6", "f7f6", "b6b5"];
    const parts = setup(bots.map((m) => ({ from: m.slice(0, 2), to: m.slice(2) })));
    await parts.progress.load();
    await parts.flow.startOpening(CONFIG);
    for (const m of mine.slice(0, 11)) await play(parts, m.slice(0, 2), m.slice(2));
    expect(session(parts).getSnapshot().opening?.ended).toBe(false);
    await play(parts, "c3", "c4", false);
    await vi.waitFor(() => expect(parts.progress.getSnapshot().diary.playbook.completions).toHaveLength(1));
    expect(parts.progress.getSnapshot().diary.playbook.completions[0]).toMatchObject({ complete: false, moves: 12 });
  });

  it("works as Black: the bot opens and the coach answers it", async () => {
    const parts = setup([{ from: "e2", to: "e4" }]);
    await parts.progress.load();
    await parts.flow.startOpening({ ...CONFIG, playerColor: "black" });
    await vi.waitFor(() => expect(session(parts).getSnapshot().sanMoves).toEqual(["e4"]));
    const step = session(parts).getSnapshot().opening?.step;
    expect(step).toMatchObject({ kind: "goal", goalId: "center" });
    if (step?.kind === "goal") expect(step.moves.map((m) => m.san)).toEqual(["e5"]);
  });

  it("does nothing to continue when no opening practice is running", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.continueOpeningAsGame();
    expect(parts.flow.getSnapshot().phase).toBe("menu");
  });
});
