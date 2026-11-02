import { describe, expect, it } from "vitest";
import {
  COMMENT_EVENT_PRINCIPLE,
  FOLLOWED_EVENT_PRINCIPLE,
  GYM_DRILLS,
  MISTAKE_PRINCIPLE,
  MISTAKE_TYPE_IDS,
  PLAN_PRINCIPLE,
  PRINCIPLES,
  PRINCIPLE_IDS,
  QUESTION_PRINCIPLE,
  isPrincipleId,
} from "@/content";
import type { CoachEvent } from "@/coach";
import { buildSessionDrills } from "@/features/gym";
import { createGame } from "@/rules";
import type { GameRecord } from "@/storage";
import { createEmptyDiary } from "@/storage";
import {
  brokenInGame,
  drillsForPrinciple,
  eventLabel,
  principleOfDrill,
  principleOfEvents,
  principleOfMistake,
  principleOfQuestion,
  principleRows,
} from "./principles";

const SQUARE = /^[a-h][1-8]$/;

describe("the principles", () => {
  it("are ten, with unique ids and real text", () => {
    expect(PRINCIPLES).toHaveLength(10);
    expect(new Set(PRINCIPLE_IDS).size).toBe(10);
    for (const p of PRINCIPLES) {
      expect(p.title.length).toBeGreaterThan(5);
      expect(p.text.length).toBeGreaterThan(30);
      expect(p.example.caption.length).toBeGreaterThan(10);
    }
  });

  it.each(PRINCIPLES.map((p) => [p.id, p] as const))("%s has a legal example position with both kings", (_id, p) => {
    const game = createGame(p.example.fen);
    expect(game.status().isGameOver).toBe(false);
    expect(p.example.fen.split(" ")[0]).toMatch(/k/);
    expect(p.example.fen.split(" ")[0]).toMatch(/K/);
    for (const h of p.example.highlights ?? []) expect(h.square).toMatch(SQUARE);
    for (const a of p.example.arrows ?? []) {
      expect(a.from).toMatch(SQUARE);
      expect(a.to).toMatch(SQUARE);
    }
  });

  it("are all the targets the tag tables point at", () => {
    const targets = [
      ...Object.values(MISTAKE_PRINCIPLE),
      ...Object.values(FOLLOWED_EVENT_PRINCIPLE),
      ...Object.values(COMMENT_EVENT_PRINCIPLE),
      ...Object.values(QUESTION_PRINCIPLE),
      ...Object.values(PLAN_PRINCIPLE),
    ];
    for (const id of targets) expect(isPrincipleId(id)).toBe(true);
  });

  it("tag every kind of mistake", () => {
    for (const type of MISTAKE_TYPE_IDS) expect(principleOfMistake(type)).toBeDefined();
  });

  it("have a gym drill each, and drill tags name real principles", () => {
    for (const drill of GYM_DRILLS) {
      if (drill.principleId) expect(isPrincipleId(drill.principleId)).toBe(true);
      expect(isPrincipleId(principleOfDrill(drill))).toBe(true);
    }
    for (const id of PRINCIPLE_IDS) {
      expect(drillsForPrinciple(GYM_DRILLS, id).length, `no drill for ${id}`).toBeGreaterThan(0);
    }
  });
});

describe("tagging comments", () => {
  const base = { perspective: "user", nature: "info" } as const;
  const purpose = (p: "develop" | "castle" | "controlCenter" | "other"): CoachEvent => ({
    kind: "move_purpose",
    actor: "you",
    purpose: p,
    piece: "knight",
    to: "f3",
    ...base,
  });

  it("keeps the purpose in the saved label, so developing can be counted later", () => {
    expect(eventLabel("move_purpose", [purpose("develop")])).toBe("move_purpose:develop");
    expect(eventLabel("hanging_piece", [])).toBe("hanging_piece");
  });

  it("names the principle a comment is about", () => {
    expect(principleOfEvents([purpose("develop")])).toBe("develop-first");
    expect(principleOfEvents([purpose("castle")])).toBe("castle-early");
    expect(principleOfEvents([purpose("controlCenter")])).toBe("control-center");
    expect(principleOfEvents([purpose("other")])).toBeUndefined();
    expect(principleOfEvents([])).toBeUndefined();
  });

  it("works out which principle a think-first question trains", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(principleOfQuestion("dangerPiece", start)).toBe("check-threats");
    expect(principleOfQuestion("safestMove", start)).toBe("keep-safe");
    expect(principleOfQuestion("bestPlan", start)).toBe("control-center");
  });
});

function game(over: Partial<GameRecord>): GameRecord {
  return {
    id: "g",
    playedAt: "2026-04-02T12:00:00.000Z",
    result: "loss",
    playerColor: "white",
    botLevel: 1,
    coachingMode: "quiet",
    pgn: "",
    coachLog: [],
    mistakes: [],
    ...over,
  } as GameRecord;
}

describe("principleRows", () => {
  it("counts only my own plies: followed from tagged events, broken from mistakes", () => {
    const diary = createEmptyDiary();
    diary.games = [
      game({
        coachLog: [
          { ply: 1, event: "move_purpose:controlCenter", text: "" }, // mine (white)
          { ply: 2, event: "move_purpose:controlCenter", text: "" }, // the bot's
          { ply: 3, event: "move_purpose:develop", text: "" },
          { ply: 5, event: "double_attack", text: "" },
        ],
        mistakes: [
          { ply: 7, type: "hanging_piece" },
          { ply: 8, type: "hanging_piece" }, // the bot's ply: not counted
          { ply: 9, type: "missed_threat" },
        ],
      }),
      game({
        id: "h",
        playerColor: "black",
        coachLog: [{ ply: 2, event: "move_purpose:castle", text: "" }],
        mistakes: [{ ply: 4, type: "blunder" }],
      }),
    ];
    diary.thinking.byPrinciple = { "check-threats": { asked: 3, correct: 2 } };
    const rows = Object.fromEntries(principleRows(diary).map((r) => [r.principle.id, r]));
    expect(rows["control-center"].followed).toBe(1);
    expect(rows["develop-first"].followed).toBe(1);
    expect(rows["two-threats"].followed).toBe(1);
    expect(rows["castle-early"].followed).toBe(1);
    expect(rows["keep-safe"].broken).toBe(1);
    expect(rows["check-threats"].broken).toBe(1);
    expect(rows["best-reply"].broken).toBe(1);
    expect(rows["check-threats"].quiz).toEqual({ asked: 3, correct: 2 });
    expect(Object.values(rows)).toHaveLength(10);
  });

  it("is all zeros for an empty diary", () => {
    for (const row of principleRows(createEmptyDiary())) {
      expect(row.followed).toBe(0);
      expect(row.broken).toBe(0);
    }
  });
});

describe("brokenInGame", () => {
  it("groups mistakes by the rule they broke, most first", () => {
    const groups = brokenInGame([
      { type: "missed_threat" },
      { type: "hanging_piece" },
      { type: "missed_threat" },
      { type: "missed_threat" },
      { type: "unknown_type" },
    ]);
    expect(groups.map((g) => [g.principle.id, g.count])).toEqual([
      ["check-threats", 3],
      ["keep-safe", 1],
    ]);
  });
});

describe("a gym session about one principle", () => {
  it("puts drills for that principle first, without repeats", () => {
    const drills = buildSessionDrills({ builtIn: GYM_DRILLS, principleId: "two-threats", random: () => 0.3 });
    expect(drills).toHaveLength(5);
    expect(new Set(drills.map((d) => d.id)).size).toBe(5);
    expect(drills.filter((d) => principleOfDrill(d) === "two-threats").length).toBeGreaterThanOrEqual(3);
  });
});
