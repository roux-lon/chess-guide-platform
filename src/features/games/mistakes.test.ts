import { describe, expect, it } from "vitest";
import type { CoachEvent } from "@/coach";
import type { CoachLogEntry } from "@/features/coach";
import type { GameRecord } from "@/storage";
import { classifyGame, classifyMove, countMistakes, toMistakeRecords } from "./mistakes";

const move: CoachEvent = { kind: "move_played", actor: "you", piece: "bishop", from: "f1", to: "b5", san: "Bb5" };
const knight = { type: "knight", square: "c3" } as const;
const bishop = { type: "bishop", square: "a5" } as const;

const entry = (events: CoachEvent[], overrides: Partial<CoachLogEntry> = {}): CoachLogEntry => ({
  ply: 5,
  moveSan: "Bb5",
  side: "you",
  events: [move, ...events],
  text: "",
  ...overrides,
});

const quality = (q: "good" | "mistake" | "blunder", lossCp: number): CoachEvent => ({
  kind: "move_quality",
  actor: "you",
  quality: q,
  lossCp,
});

describe("classifyMove", () => {
  it("calls a piece left hanging a hanging-piece mistake, priced by the piece", () => {
    const hung: CoachEvent = {
      kind: "hanging_piece",
      actor: "you",
      owner: "you",
      piece: { type: "queen", square: "d1" },
      attackers: [bishop],
      reason: "undefended",
    };
    expect(classifyMove(entry([hung]))).toEqual({ ply: 5, type: "hanging_piece", lossCp: 900 });
  });

  it("uses the engine's cost when it is larger than the guess", () => {
    const hung: CoachEvent = {
      kind: "hanging_piece",
      actor: "you",
      owner: "you",
      piece: { type: "pawn", square: "d4" },
      attackers: [bishop],
      reason: "undefended",
    };
    expect(classifyMove(entry([hung, quality("blunder", 650)]))).toMatchObject({
      type: "hanging_piece",
      lossCp: 650,
    });
  });

  it("calls an ignored attack a missed threat", () => {
    const missed: CoachEvent = { kind: "missed_threat", piece: knight, attackers: [bishop] };
    expect(classifyMove(entry([missed]))).toEqual({ ply: 5, type: "missed_threat", lossCp: 300 });
  });

  it("calls a losing capture a bad trade", () => {
    const trade: CoachEvent = {
      kind: "capture_trade",
      actor: "you",
      captured: "pawn",
      capturer: "queen",
      square: "d5",
      netPoints: -8,
      verdict: "bad",
    };
    expect(classifyMove(entry([trade]))).toEqual({ ply: 5, type: "bad_trade", lossCp: 800 });
  });

  it("falls back to the engine's verdict for blunders and mistakes", () => {
    expect(classifyMove(entry([quality("blunder", 520)]))).toEqual({ ply: 5, type: "blunder", lossCp: 520 });
    expect(classifyMove(entry([quality("mistake", 180)]))).toEqual({ ply: 5, type: "mistake", lossCp: 180 });
  });

  it("prefers the most specific type when several apply", () => {
    const hung: CoachEvent = {
      kind: "hanging_piece",
      actor: "you",
      owner: "you",
      piece: knight,
      attackers: [bishop],
      reason: "undefended",
    };
    const missed: CoachEvent = { kind: "missed_threat", piece: knight, attackers: [bishop] };
    expect(classifyMove(entry([missed, quality("blunder", 400), hung]))?.type).toBe("hanging_piece");
    expect(classifyMove(entry([quality("blunder", 400), missed]))?.type).toBe("missed_threat");
  });

  it("counts a missed threat even when the engine said nothing", () => {
    const missed: CoachEvent = { kind: "missed_threat", piece: knight, attackers: [bishop] };
    expect(classifyMove(entry([missed]))).not.toBeNull();
  });

  it("does NOT count a move the engine called good, even if it looks like a hanging piece", () => {
    const hung: CoachEvent = {
      kind: "hanging_piece",
      actor: "you",
      owner: "you",
      piece: knight,
      attackers: [bishop],
      reason: "undefended",
    };
    expect(classifyMove(entry([hung, quality("good", 5)]))).toBeNull();
  });

  it("does NOT count ordinary moves, the bot's moves, or the bot's own hanging pieces", () => {
    expect(classifyMove(entry([]))).toBeNull();
    const botHung: CoachEvent = {
      kind: "hanging_piece",
      actor: "you",
      owner: "bot",
      piece: knight,
      attackers: [bishop],
      reason: "undefended",
    };
    expect(classifyMove(entry([botHung]))).toBeNull();
    expect(classifyMove(entry([quality("blunder", 700)], { side: "bot" }))).toBeNull();
    const botSlip: CoachEvent = { kind: "move_quality", actor: "bot", quality: "blunder", lossCp: 700 };
    expect(classifyMove(entry([botSlip]))).toBeNull();
  });

  it("does NOT count an even or good trade", () => {
    const even: CoachEvent = {
      kind: "capture_trade",
      actor: "you",
      captured: "knight",
      capturer: "knight",
      square: "d5",
      netPoints: 0,
      verdict: "equal",
    };
    expect(classifyMove(entry([even]))).toBeNull();
  });

  it("finds nothing in comments restored from an earlier visit (they have no events)", () => {
    expect(classifyMove({ ply: 3, moveSan: "e4", side: "you", events: [], text: "You moved." })).toBeNull();
  });
});

describe("classifyGame and records", () => {
  it("lists a game's mistakes in order", () => {
    const missed: CoachEvent = { kind: "missed_threat", piece: knight, attackers: [bishop] };
    const entries = [
      entry([], { ply: 1 }),
      entry([missed], { ply: 3 }),
      entry([quality("blunder", 410)], { ply: 7 }),
      entry([quality("blunder", 999)], { ply: 8, side: "bot" }),
    ];
    expect(classifyGame(entries).map((m) => [m.ply, m.type])).toEqual([
      [3, "missed_threat"],
      [7, "blunder"],
    ]);
  });

  it("turns them into diary records with whole-number costs", () => {
    expect(toMistakeRecords([{ ply: 3, type: "blunder", lossCp: 410.6 }])).toEqual([
      { ply: 3, type: "blunder", lossCp: 411 },
    ]);
  });
});

describe("countMistakes", () => {
  const game = (types: string[]): Pick<GameRecord, "mistakes"> => ({
    mistakes: types.map((type, i) => ({ ply: i + 1, type })),
  });

  it("totals the types across games", () => {
    expect(countMistakes([game(["hanging_piece", "blunder"]), game(["hanging_piece"]), game([])])).toEqual({
      hanging_piece: 2,
      blunder: 1,
    });
  });

  it("gives nothing for no games", () => {
    expect(countMistakes([])).toEqual({});
  });
});
