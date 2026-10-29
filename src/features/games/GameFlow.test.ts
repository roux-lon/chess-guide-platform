import { describe, expect, it, vi } from "vitest";
import { FakeEngine } from "@/engine";
import type { EngineMove, Evaluation } from "@/engine";
import { ProgressStore } from "@/features/progress/ProgressStore";
import { parsePgnMoves, createGameFromSan } from "@/rules";
import {
  FileStorage,
  MemoryStorage,
  SmallStore,
  createEmptyDiary,
  serializeDiary,
} from "@/storage";
import type { Diary, StorageAdapter } from "@/storage";
import { MemoryHandleStore } from "@/storage/handleStore";
import { FakeFileHandle, FakeKeyValueStore, FakePicker, manualTimers } from "@/storage/testing";
import { GameFlow } from "./GameFlow";
import type { GameConfig } from "./GameFlow";
import { buildActiveGame } from "./record";

const NOW = new Date("2026-05-01T12:00:00Z");
const SCHOLARS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];
const BOT_REPLIES: EngineMove[] = [
  { from: "e7", to: "e5" },
  { from: "b8", to: "c6" },
  { from: "g8", to: "f6" },
];
const CONFIG: GameConfig = { level: 2, playerColor: "white", coachingMode: "quiet" };

const cp = (cpWhite: number): Evaluation => ({ cpWhite, mateIn: null, bestMove: null, principalVariation: [] });
/** Calls Qh5 (ply 3) a blunder: the position after it is worse for White by 520 centipawns. */
const AFTER_QH5 = createGameFromSan(["e4", "e5", "Qh5"])?.fen();
const blunderAtPly3 = (fen: string) => (fen === AFTER_QH5 ? cp(-500) : cp(20));

interface Setup {
  storage?: StorageAdapter;
  botReplies?: EngineMove[][];
  evaluations?: (fen: string) => Evaluation;
}

function setup({ storage, botReplies, evaluations = blunderAtPly3 }: Setup = {}) {
  const store = storage ?? new MemoryStorage();
  const progress = new ProgressStore(store, { now: () => NOW });
  const bots: FakeEngine[] = [];
  const analysers: FakeEngine[] = [];
  const queue = botReplies ? [...botReplies] : [];
  const flow = new GameFlow({
    progress,
    now: () => NOW,
    createBotEngine: () => {
      const engine = new FakeEngine(queue.length > 0 ? (queue.shift() ?? []) : [...BOT_REPLIES]);
      bots.push(engine);
      return engine;
    },
    createAnalysisEngine: () => {
      const engine = new FakeEngine([], evaluations);
      analysers.push(engine);
      return engine;
    },
    sessionDefaults: { botDelayMs: 0, coachWaitMs: 100 },
  });
  flow.connect();
  return { flow, progress, bots, analysers };
}

type Parts = ReturnType<typeof setup>;
const diaryOf = (parts: Parts): Diary => parts.progress.getSnapshot().diary;
const session = (parts: Parts) => {
  const s = parts.flow.getSnapshot().session;
  if (!s) throw new Error("no game is being played");
  return s;
};

/** Plays the player's move and waits for the bot's reply (if the game is not over). */
async function play(parts: Parts, from: string, to: string, expectReply = true) {
  const s = session(parts);
  const before = s.getSnapshot().sanMoves.length;
  s.attemptMove(from, to);
  await vi.waitFor(() => expect(s.getSnapshot().sanMoves.length).toBe(before + (expectReply ? 2 : 1)));
}

async function playScholarsMate(parts: Parts) {
  await play(parts, "e2", "e4");
  await play(parts, "d1", "h5");
  await play(parts, "f1", "c4");
  await play(parts, "h5", "f7", false);
}

describe("starting a game", () => {
  it("starts with the chosen setup and remembers the choices for next time", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame({ level: 3, playerColor: "black", coachingMode: "off" });

    const snap = parts.flow.getSnapshot();
    expect(snap.phase).toBe("playing");
    expect(snap.session?.getSnapshot()).toMatchObject({ level: 3, playerColor: "black", coachingMode: "off" });
    await vi.waitFor(() => expect(diaryOf(parts).settings).toMatchObject({ botLevel: 3, coachingMode: "off" }));
    expect(parts.flow.getSnapshot().defaults).toMatchObject({ level: 3, coachingMode: "off" });
  });

  it("starts from the menu, quiet by default, with no unfinished game", async () => {
    const parts = setup();
    await parts.progress.load();
    const snap = parts.flow.getSnapshot();
    expect(snap).toMatchObject({ phase: "menu", resume: null, practice: false, reviewReady: false });
    expect(snap.defaults).toEqual({ level: 1, playerColor: "white", coachingMode: "quiet" });
    expect(snap.diaryReady).toBe(true);
  });

  it("does not create an analysis engine when coaching is off", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, coachingMode: "off" });
    expect(parts.analysers).toHaveLength(0);
    await parts.flow.startGame({ ...CONFIG, coachingMode: "quiet" });
    expect(parts.analysers).toHaveLength(1);
  });
});

describe("finishing a game", () => {
  it("saves the game, its coach log and the mistakes to the diary", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, coachingMode: "full" });
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));

    const diary = diaryOf(parts);
    expect(diary.games).toHaveLength(1);
    const game = diary.games[0];
    expect(game).toMatchObject({ result: "win", playerColor: "white", botLevel: 2, coachingMode: "full" });
    expect(parsePgnMoves(game.pgn)).toEqual(SCHOLARS);
    expect(game.coachLog.map((c) => c.ply)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(game.coachLog.find((c) => c.ply === 7)?.event).toBe("game_over");
    expect(game.mistakes).toMatchObject([{ ply: 3, type: "blunder", lossCp: 520 }]);
    expect(diary.mistakeCounts).toEqual({ blunder: 1 });
    expect(diary.activeGame).toBeUndefined();
  });

  it("prepares a review of that game with the real mistake", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));

    expect(parts.flow.getSnapshot().phase).toBe("playing"); // the board stays until the player asks
    parts.flow.openReview();
    const { review, phase } = parts.flow.getSnapshot();
    expect(phase).toBe("review");
    expect(review?.mistakes).toMatchObject([{ ply: 3, san: "Qh5", type: "blunder" }]);
    expect(review?.mistakes[0].fenBefore).toBe(createGameFromSan(["e4", "e5"])?.fen());
    expect(review?.mistakes[0].text.length).toBeGreaterThan(0);
  });

  it("saves it exactly once, straight away", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(NOW)));
    const clock = manualTimers();
    const storage = new FileStorage({
      handles: new MemoryHandleStore(file),
      picker: new FakePicker(),
      now: () => NOW,
      timers: clock.timers,
    });
    const parts = setup({ storage });
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);

    // Moves were played but the file was not touched for them: saves wait for a quiet moment.
    expect(file.writes).toEqual([]);

    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    expect(file.writes).toHaveLength(1);
    const saved = JSON.parse(file.content);
    expect(saved.games).toHaveLength(1);
    expect(saved.games[0].result).toBe("win");
    expect(saved.activeGame).toBeUndefined();
    expect(saved.mistakeCounts).toEqual({ blunder: 1 });
  });

  it("records a loss when the bot gives checkmate, with the player as Black", async () => {
    // The bot is White and plays Scholar's Mate; the player (Black) cannot stop it.
    const botMoves: EngineMove[] = [
      { from: "e2", to: "e4" },
      { from: "d1", to: "h5" },
      { from: "f1", to: "c4" },
      { from: "h5", to: "f7" },
    ];
    const parts = setup({ botReplies: [botMoves] });
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, playerColor: "black" });
    const s = session(parts);
    const waitForMoves = (n: number) => vi.waitFor(() => expect(s.getSnapshot().sanMoves.length).toBe(n));

    await waitForMoves(1); // the bot opens
    s.attemptMove("e7", "e5");
    await waitForMoves(3);
    s.attemptMove("b8", "c6");
    await waitForMoves(5);
    s.attemptMove("g8", "f6");
    await waitForMoves(7);

    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    const game = diaryOf(parts).games[0];
    expect(game).toMatchObject({ result: "loss", playerColor: "black" });
    expect(parsePgnMoves(game.pgn)).toEqual(SCHOLARS);
    expect(game.pgn).toContain('[Result "1-0"]');
  });

  it("with coaching off, saves the game with no log and no mistakes", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, coachingMode: "off" });
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    expect(diaryOf(parts).games[0]).toMatchObject({ coachingMode: "off", coachLog: [], mistakes: [], result: "win" });
    expect(diaryOf(parts).mistakeCounts).toEqual({});
  });
});

describe("resigning", () => {
  it("saves the game as abandoned, clears the unfinished game and opens the review", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await play(parts, "e2", "e4");
    await parts.flow.resign();

    expect(session(parts).getSnapshot().resigned).toBe(true);
    expect(diaryOf(parts).games).toHaveLength(1);
    expect(diaryOf(parts).games[0]).toMatchObject({ result: "abandoned", id: session(parts).gameId });
    expect(parsePgnMoves(diaryOf(parts).games[0].pgn)).toEqual(["e4", "e5"]);
    expect(diaryOf(parts).activeGame).toBeUndefined();
    expect(parts.flow.getSnapshot().reviewReady).toBe(true);
  });

  it("does not count as a finished game for the history of results", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await parts.flow.resign();
    expect(diaryOf(parts).games.every((g) => g.result === "abandoned")).toBe(true);
  });
});

describe("leaving a game early, and continuing it", () => {
  async function leaveAfterTwoMoves(parts: Parts) {
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, coachingMode: "full" });
    await play(parts, "e2", "e4");
    await session(parts).coachSettled();
    const id = session(parts).gameId;
    await parts.flow.leave();
    return id;
  }

  it("saves it as abandoned and keeps it so it can be continued", async () => {
    const parts = setup();
    const id = await leaveAfterTwoMoves(parts);

    expect(parts.flow.getSnapshot().phase).toBe("menu");
    expect(diaryOf(parts).games).toHaveLength(1);
    expect(diaryOf(parts).games[0]).toMatchObject({ id, result: "abandoned" });
    expect(diaryOf(parts).activeGame).toMatchObject({ id, moves: ["e4", "e5"], playerColor: "white", botLevel: 2 });
    expect(parts.flow.getSnapshot().resume).toMatchObject({ moveCount: 2 });
  });

  it("offers to continue next time, restores the game and finishes it as ONE game", async () => {
    const parts = setup();
    const id = await leaveAfterTwoMoves(parts);

    // A new visit: a fresh flow over the same diary.
    const revisit = new GameFlow({
      progress: parts.progress,
      now: () => NOW,
      createBotEngine: () => new FakeEngine([...BOT_REPLIES.slice(1)]),
      createAnalysisEngine: () => new FakeEngine([], blunderAtPly3),
      sessionDefaults: { botDelayMs: 0, coachWaitMs: 100 },
    });
    revisit.connect();
    expect(revisit.getSnapshot().resume).toMatchObject({ moveCount: 2 });

    expect(await revisit.resumeGame()).toBe(true);
    const resumed = revisit.getSnapshot().session;
    expect(resumed?.gameId).toBe(id);
    expect(resumed?.getSnapshot().sanMoves).toEqual(["e4", "e5"]);
    expect(resumed?.getSnapshot().coachLog.map((e) => e.ply)).toEqual([1, 2]);

    const move = async (from: string, to: string, reply: boolean) => {
      const before = resumed!.getSnapshot().sanMoves.length;
      resumed!.attemptMove(from, to);
      await vi.waitFor(() => expect(resumed!.getSnapshot().sanMoves.length).toBe(before + (reply ? 2 : 1)));
    };
    await move("d1", "h5", true);
    await move("f1", "c4", true);
    await move("h5", "f7", false);
    await vi.waitFor(() => expect(revisit.getSnapshot().reviewReady).toBe(true));

    const diary = parts.progress.getSnapshot().diary;
    expect(diary.games).toHaveLength(1); // replaced, not added
    expect(diary.games[0]).toMatchObject({ id, result: "win" });
    expect(parsePgnMoves(diary.games[0].pgn)).toEqual(SCHOLARS);
    expect(diary.games[0].coachLog.map((c) => c.ply)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(diary.activeGame).toBeUndefined();
    expect(diary.mistakeCounts).toEqual({ blunder: 1 });
  });

  it("keeps mistakes made before leaving when the resumed game ends", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame({ ...CONFIG, coachingMode: "full" });
    await play(parts, "e2", "e4");
    await play(parts, "d1", "h5"); // the "blunder" at ply 3
    await session(parts).coachSettled();
    await parts.flow.leave();
    expect(diaryOf(parts).activeGame?.mistakes).toMatchObject([{ ply: 3, type: "blunder" }]);

    expect(await parts.flow.resumeGame()).toBe(true);
    await parts.flow.resign();
    expect(diaryOf(parts).games).toHaveLength(1);
    expect(diaryOf(parts).games[0].mistakes).toMatchObject([{ ply: 3, type: "blunder" }]);
    expect(diaryOf(parts).mistakeCounts).toEqual({ blunder: 1 });
  });

  it("drops a game nobody moved in, saving nothing", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await parts.flow.leave();
    expect(diaryOf(parts).games).toEqual([]);
    expect(diaryOf(parts).activeGame).toBeUndefined();
  });

  it("saves nothing extra when leaving a game that already ended", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    await parts.flow.leave();
    expect(diaryOf(parts).games).toHaveLength(1);
    expect(diaryOf(parts).games[0].result).toBe("win");
  });

  it("leaving twice does nothing the second time", async () => {
    const parts = setup();
    await leaveAfterTwoMoves(parts);
    const before = diaryOf(parts);
    await parts.flow.leave();
    expect(diaryOf(parts)).toBe(before);
  });
});

describe("an unfinished game waiting to be continued", () => {
  const unfinished = () =>
    buildActiveGame({
      meta: { id: "old", startedAt: "2026-04-30T10:00:00.000Z", playerColor: "white", botLevel: 1, coachingMode: "quiet" },
      fen: createGameFromSan(["e4", "e5"])?.fen() ?? "",
      sanMoves: ["e4", "e5"],
      entries: [],
    });

  function withActive(active = unfinished()) {
    const diary = createEmptyDiary(NOW);
    diary.activeGame = active;
    return setup({ storage: new MemoryStorage(diary) });
  }

  it("is offered on the menu", async () => {
    const parts = withActive();
    await parts.progress.load();
    expect(parts.flow.getSnapshot().resume).toMatchObject({ moveCount: 2, active: { id: "old" } });
  });

  it("can be given up: kept in the history as abandoned, and no longer offered", async () => {
    const parts = withActive();
    await parts.progress.load();
    await parts.flow.discardResume();
    expect(diaryOf(parts).games).toMatchObject([{ id: "old", result: "abandoned" }]);
    expect(diaryOf(parts).activeGame).toBeUndefined();
    expect(parts.flow.getSnapshot().resume).toBeNull();
  });

  it("is given up automatically when a new game is started", async () => {
    const parts = withActive();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    expect(diaryOf(parts).games.map((g) => [g.id, g.result])).toEqual([["old", "abandoned"]]);
    expect(diaryOf(parts).activeGame).toBeUndefined();
    expect(session(parts).gameId).not.toBe("old");
  });

  it("is dropped, not offered, if its moves cannot be replayed", async () => {
    const parts = withActive({ ...unfinished(), moves: ["e4", "e4"] });
    await parts.progress.load();
    expect(parts.flow.getSnapshot().resume).toBeNull();
    expect(await parts.flow.resumeGame()).toBe(false);
    expect(diaryOf(parts).activeGame).toBeUndefined();
    expect(parts.flow.getSnapshot().phase).toBe("menu");
  });

  it("cannot be resumed when there is nothing to resume", async () => {
    const parts = setup();
    await parts.progress.load();
    expect(await parts.flow.resumeGame()).toBe(false);
  });
});

describe("saving while a game is in progress", () => {
  it("waits for a quiet moment instead of writing on every move", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(NOW)));
    const clock = manualTimers();
    const storage = new FileStorage({
      handles: new MemoryHandleStore(file),
      picker: new FakePicker(),
      small: new SmallStore(new FakeKeyValueStore()),
      now: () => NOW,
      timers: clock.timers,
    });
    const parts = setup({ storage });
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await play(parts, "e2", "e4");
    await play(parts, "d1", "h5");
    await session(parts).coachSettled();
    expect(file.writes).toEqual([]);

    clock.fire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(file.writes).toHaveLength(1);
    const saved = JSON.parse(file.content);
    expect(saved.activeGame.moves).toEqual(["e4", "e5", "Qh5", "Nc6"]);
    expect(saved.games).toEqual([]);
  });
});

describe("practising a mistake again", () => {
  async function finishedWithMistake() {
    const parts = setup({ botReplies: [BOT_REPLIES, [{ from: "b8", to: "c6" }]] });
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    parts.flow.openReview();
    return parts;
  }

  it("loads the position before the mistake, as the right side, and lets the move be retried", async () => {
    const parts = await finishedWithMistake();
    const mistake = parts.flow.getSnapshot().review!.mistakes[0];
    parts.flow.startPractice(mistake);

    const snap = parts.flow.getSnapshot();
    expect(snap).toMatchObject({ phase: "playing", practice: true });
    expect(snap.session?.getSnapshot()).toMatchObject({
      fen: mistake.fenBefore,
      playerColor: "white",
      practice: true,
      coachingMode: "full",
    });
    expect(snap.session?.gameId).not.toBe(diaryOf(parts).games[0].id);

    await play(parts, "g1", "f3"); // a different, better try
    expect(session(parts).getSnapshot().sanMoves).toEqual(["Nf3", "Nc6"]);
  });

  it("saves nothing, and goes back to the review afterwards", async () => {
    const parts = await finishedWithMistake();
    const gamesBefore = diaryOf(parts).games;
    parts.flow.startPractice(parts.flow.getSnapshot().review!.mistakes[0]);
    await play(parts, "g1", "f3");
    await session(parts).coachSettled();
    expect(diaryOf(parts).games).toBe(gamesBefore);
    expect(diaryOf(parts).activeGame).toBeUndefined();

    parts.flow.endPractice();
    expect(parts.flow.getSnapshot()).toMatchObject({ phase: "review", practice: false });
    expect(parts.flow.getSnapshot().review?.mistakes).toHaveLength(1);
  });

  it("leaving a practice position saves nothing", async () => {
    const parts = await finishedWithMistake();
    const gamesBefore = diaryOf(parts).games;
    parts.flow.startPractice(parts.flow.getSnapshot().review!.mistakes[0]);
    await play(parts, "g1", "f3");
    await parts.flow.leave();
    expect(diaryOf(parts).games).toBe(gamesBefore);
  });

  it("does nothing without a review, or to end a practice that is not running", async () => {
    const parts = setup();
    await parts.progress.load();
    parts.flow.startPractice({} as never);
    expect(parts.flow.getSnapshot().practice).toBe(false);
    parts.flow.endPractice();
    expect(parts.flow.getSnapshot().phase).toBe("menu");
  });
});

describe("when the diary is not connected", () => {
  it("keeps a finished game and saves it as soon as the diary is reconnected", async () => {
    const file = new FakeFileHandle("chess-progress.json", serializeDiary(createEmptyDiary(NOW)));
    file.permission = "prompt";
    const storage = new FileStorage({
      handles: new MemoryHandleStore(file),
      picker: new FakePicker(),
      now: () => NOW,
      timers: manualTimers().timers,
    });
    const parts = setup({ storage });
    await parts.progress.load();
    expect(parts.flow.getSnapshot().diaryReady).toBe(false);

    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    expect(parts.flow.getSnapshot().unsaved).toBe(true);
    expect(file.writes).toEqual([]);

    await parts.progress.reconnect();
    await vi.waitFor(() => expect(parts.flow.getSnapshot().unsaved).toBe(false));
    expect(JSON.parse(file.content).games).toHaveLength(1);
  });
});

describe("tidying up", () => {
  it("goes back to the menu cleanly", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await playScholarsMate(parts);
    await vi.waitFor(() => expect(parts.flow.getSnapshot().reviewReady).toBe(true));
    parts.flow.backToMenu();
    expect(parts.flow.getSnapshot()).toMatchObject({ phase: "menu", reviewReady: false, session: undefined });
    expect(parts.flow.getSnapshot().review).toBeUndefined();
  });

  it("stops listening when disposed, and saves a game in progress", async () => {
    const parts = setup();
    await parts.progress.load();
    await parts.flow.startGame(CONFIG);
    await play(parts, "e2", "e4");
    await parts.flow.dispose();
    expect(diaryOf(parts).games[0]).toMatchObject({ result: "abandoned" });
    expect(diaryOf(parts).activeGame?.moves).toEqual(["e4", "e5"]);
  });

  it("can be connected twice (as React's development mode does) and then disconnected", async () => {
    const parts = setup();
    await parts.progress.load();
    const disconnect = parts.flow.connect(); // setup() already connected once
    await parts.flow.startGame(CONFIG);
    await play(parts, "e2", "e4");
    disconnect();
    await vi.waitFor(() => expect(parts.flow.getSnapshot().phase).toBe("menu"));
    await vi.waitFor(() => expect(diaryOf(parts).activeGame?.moves).toEqual(["e4", "e5"]));
    expect(() => disconnect()).not.toThrow();
  });

  it("tells listeners about changes", async () => {
    const parts = setup();
    await parts.progress.load();
    const listener = vi.fn();
    parts.flow.subscribe(listener);
    await parts.flow.startGame(CONFIG);
    expect(listener).toHaveBeenCalled();
  });
});
