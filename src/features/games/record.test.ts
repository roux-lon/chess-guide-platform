import { describe, expect, it } from "vitest";
import type { CoachEvent } from "@/coach";
import type { CoachLogEntry } from "@/features/coach";
import { createGame, createGameFromSan, parsePgnMoves } from "@/rules";
import type { ActiveGameRecord } from "@/storage";
import {
  buildActiveGame,
  buildGameRecord,
  checkActiveGame,
  coachLogRecords,
  mistakeRecords,
  primaryEventKind,
  resultFromStatus,
  resumeOffer,
} from "./record";
import type { GameMeta } from "./record";

const NOW = new Date("2026-04-02T12:00:00Z");
const META: GameMeta = {
  id: "game-1",
  startedAt: "2026-04-02T11:00:00.000Z",
  playerColor: "white",
  botLevel: 2,
  coachingMode: "quiet",
};
const SCHOLARS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];

const knight = { type: "knight", square: "c3" } as const;
const attacker = { type: "bishop", square: "a5" } as const;
const played: CoachEvent = { kind: "move_played", actor: "you", piece: "pawn", from: "e2", to: "e4", san: "e4" };
const missed: CoachEvent = { kind: "missed_threat", piece: knight, attackers: [attacker] };

const entry = (ply: number, events: CoachEvent[] = [], text = `comment ${ply}`): CoachLogEntry => ({
  ply,
  moveSan: "x",
  side: ply % 2 === 1 ? "you" : "bot",
  events: [played, ...events],
  text,
});

describe("resultFromStatus", () => {
  it("maps outcomes to the player's result", () => {
    const mate = createGameFromSan(SCHOLARS)?.status();
    if (!mate) throw new Error("setup");
    expect(resultFromStatus(mate, "white")).toBe("win");
    expect(resultFromStatus(mate, "black")).toBe("loss");
    expect(resultFromStatus(createGame("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1").status(), "white")).toBe("draw");
    expect(resultFromStatus(createGame().status(), "white")).toBeNull();
  });
});

describe("primaryEventKind", () => {
  it("picks the event that best describes the move", () => {
    expect(primaryEventKind([played])).toBe("move_played");
    expect(primaryEventKind([played, missed])).toBe("missed_threat");
    expect(primaryEventKind([played, { kind: "game_over", result: "you_win", reason: "checkmate" }, missed])).toBe(
      "game_over",
    );
    expect(primaryEventKind([played, { kind: "move_quality", actor: "you", quality: "good", lossCp: 0 }])).toBe(
      "move_played",
    );
    expect(primaryEventKind([played, { kind: "move_quality", actor: "you", quality: "blunder", lossCp: 500 }])).toBe(
      "move_quality",
    );
  });
});

describe("mistakeRecords", () => {
  it("combines mistakes from earlier visits with new ones, in move order, without repeats", () => {
    const restored = [{ ply: 3, type: "missed_threat", lossCp: 300 }];
    const entries = [entry(1), entry(3, [missed]), entry(7, [{ kind: "move_quality", actor: "you", quality: "blunder", lossCp: 400 }])];
    expect(mistakeRecords(entries, restored)).toEqual([
      { ply: 3, type: "missed_threat", lossCp: 300 },
      { ply: 7, type: "blunder", lossCp: 400 },
    ]);
  });

  it("is empty for a game with nothing wrong", () => {
    expect(mistakeRecords([entry(1), entry(3)])).toEqual([]);
  });
});

describe("buildGameRecord", () => {
  it("records a finished game with everything the diary needs", () => {
    const record = buildGameRecord({
      meta: META,
      sanMoves: SCHOLARS,
      result: "win",
      entries: [entry(1), entry(3, [missed], "Careful!")],
      now: NOW,
    });
    expect(record).toMatchObject({
      id: "game-1",
      playedAt: NOW.toISOString(),
      result: "win",
      playerColor: "white",
      botLevel: 2,
      coachingMode: "quiet",
    });
    expect(parsePgnMoves(record.pgn)).toEqual(SCHOLARS);
    expect(record.pgn).toContain('[White "You"]');
    expect(record.pgn).toContain('[Black "Bot (level 2)"]');
    expect(record.pgn).toContain('[Result "1-0"]');
    expect(record.pgn).toContain('[Date "2026.04.02"]');
    expect(record.coachLog).toEqual([
      { ply: 1, event: "move_played", text: "comment 1" },
      { ply: 3, event: "missed_threat", text: "Careful!" },
    ]);
    expect(record.mistakes).toEqual([{ ply: 3, type: "missed_threat", lossCp: 300 }]);
  });

  it("writes the PGN result from the right side's point of view", () => {
    const asBlack = { ...META, playerColor: "black" as const };
    const loss = buildGameRecord({ meta: asBlack, sanMoves: SCHOLARS, result: "loss", entries: [], now: NOW });
    expect(loss.pgn).toContain('[Result "1-0"]');
    expect(loss.pgn).toContain('[White "Bot (level 2)"]');
    expect(loss.pgn).toContain('[Black "You"]');
    const draw = buildGameRecord({ meta: META, sanMoves: ["e4"], result: "draw", entries: [], now: NOW });
    expect(draw.pgn).toContain('[Result "1/2-1/2"]');
  });

  it("marks a game that was left or resigned as abandoned, with an unfinished result tag", () => {
    const record = buildGameRecord({ meta: META, sanMoves: ["e4", "e5"], result: "abandoned", entries: [], now: NOW });
    expect(record.result).toBe("abandoned");
    expect(record.pgn).toContain('[Result "*"]');
    expect(parsePgnMoves(record.pgn)).toEqual(["e4", "e5"]);
  });

  it("keeps mistakes from an earlier visit when a resumed game ends", () => {
    const record = buildGameRecord({
      meta: META,
      sanMoves: SCHOLARS,
      result: "win",
      entries: [entry(1)],
      restoredMistakes: [{ ply: 5, type: "hanging_piece", lossCp: 300 }],
      now: NOW,
    });
    expect(record.mistakes).toEqual([{ ply: 5, type: "hanging_piece", lossCp: 300 }]);
  });
});

describe("coachLogRecords", () => {
  it("keeps the ply, a short label and the words", () => {
    expect(coachLogRecords([entry(5, [missed], "Look out")])).toEqual([
      { ply: 5, event: "missed_threat", text: "Look out" },
    ]);
  });
});

describe("saving and resuming an unfinished game", () => {
  const moves = ["e4", "e5", "Nf3"];
  const fen = createGameFromSan(moves)?.fen() ?? "";

  const active = (): ActiveGameRecord =>
    buildActiveGame({ meta: META, fen, sanMoves: moves, entries: [entry(1), entry(3, [missed])] });

  it("keeps what is needed to continue", () => {
    expect(active()).toMatchObject({
      id: "game-1",
      startedAt: META.startedAt,
      playerColor: "white",
      botLevel: 2,
      coachingMode: "quiet",
      fen,
      moves,
    });
    expect(active().coachLog).toHaveLength(2);
    expect(active().mistakes).toEqual([{ ply: 3, type: "missed_threat", lossCp: 300 }]);
  });

  it("can be resumed when the moves replay to the saved position", () => {
    expect(checkActiveGame(active())).toEqual({ ok: true });
    expect(resumeOffer(active())).toMatchObject({ moveCount: 3 });
  });

  it("is refused when the moves are illegal, the position does not match, or the game is over", () => {
    expect(checkActiveGame({ ...active(), moves: ["e4", "e4"] })).toMatchObject({ ok: false });
    expect(checkActiveGame({ ...active(), fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1" })).toMatchObject({ ok: false });
    const over = createGameFromSan(SCHOLARS);
    expect(checkActiveGame({ ...active(), moves: SCHOLARS, fen: over?.fen() ?? "" })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/over/),
    });
  });

  it("is refused when the bot level makes no sense", () => {
    expect(checkActiveGame({ ...active(), botLevel: 9 })).toMatchObject({ ok: false });
    expect(checkActiveGame({ ...active(), botLevel: 2.5 })).toMatchObject({ ok: false });
  });

  it("offers nothing when there is no saved game or it cannot be resumed", () => {
    expect(resumeOffer(undefined)).toBeNull();
    expect(resumeOffer({ ...active(), moves: ["zzz"] })).toBeNull();
  });
});
