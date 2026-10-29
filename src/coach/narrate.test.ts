import { describe, expect, it } from "vitest";
import type { CoachEvent } from "./events";
import { TEMPLATE_VARS, TemplateNarrator, describeEvent } from "./narrate";
import type { TermId } from "./narrate";
import { TEMPLATES } from "./templates/templates";
import type { TemplateGroup } from "./templates/templates";
import { TERMS } from "./templates/terms";

const knight = { type: "knight", square: "c3" } as const;
const rook = { type: "rook", square: "a1" } as const;

/** One event for every template key, so the whole template file gets exercised. */
const SAMPLE_EVENTS: CoachEvent[] = [
  { kind: "move_played", actor: "you", piece: "knight", from: "g1", to: "f3", san: "Nf3" },
  { kind: "move_played", actor: "you", piece: "pawn", from: "e4", to: "d5", san: "exd5", captured: "pawn" },
  { kind: "move_played", actor: "you", piece: "king", from: "e1", to: "g1", san: "O-O", castle: "kingside" },
  { kind: "move_played", actor: "you", piece: "pawn", from: "a7", to: "a8", san: "a8=Q", promotion: "queen" },
  { kind: "move_played", actor: "bot", piece: "knight", from: "g8", to: "f6", san: "Nf6" },
  { kind: "move_played", actor: "bot", piece: "pawn", from: "d5", to: "e4", san: "dxe4", captured: "pawn" },
  { kind: "move_played", actor: "bot", piece: "king", from: "e8", to: "c8", san: "O-O-O", castle: "queenside" },
  { kind: "move_played", actor: "bot", piece: "pawn", from: "a2", to: "a1", san: "a1=Q", promotion: "queen" },
  ...(["undefended", "cheaper-attacker"] as const).flatMap((reason) =>
    (
      [
        ["you", "you"],
        ["bot", "you"],
        ["you", "bot"],
        ["bot", "bot"],
      ] as const
    ).map(
      ([actor, owner]): CoachEvent => ({
        kind: "hanging_piece",
        actor,
        owner,
        piece: knight,
        attackers: [rook],
        reason,
      }),
    ),
  ),
  ...(["you", "bot"] as const).flatMap((actor) =>
    (["good", "equal", "bad"] as const).map(
      (verdict): CoachEvent => ({
        kind: "capture_trade",
        actor,
        captured: "bishop",
        capturer: "queen",
        square: "d5",
        netPoints: verdict === "good" ? 3 : verdict === "equal" ? 0 : -6,
        verdict,
      }),
    ),
  ),
  { kind: "missed_threat", piece: knight, attackers: [rook] },
  { kind: "check_given", actor: "you", by: "rook" },
  ...[1, 2, 6].map(
    (escapeMoves): CoachEvent => ({
      kind: "in_check_warning",
      kingSquare: "e1",
      checkers: [{ type: "rook", square: "h1" }],
      escapeMoves,
    }),
  ),
  { kind: "threat_from_opponent", attacker: { type: "knight", square: "e6" }, targets: [knight] },
  { kind: "threat_from_opponent", attacker: { type: "rook", square: "e6" }, targets: [knight, rook] },
  { kind: "good_development", actor: "you", piece: "knight", from: "g1", to: "f3" },
  { kind: "good_development", actor: "bot", piece: "bishop", from: "f8", to: "c5" },
  { kind: "center_control", actor: "you", how: "occupy", piece: "pawn", squares: ["e4"] },
  { kind: "center_control", actor: "you", how: "attack", piece: "knight", squares: ["d4", "e5"] },
  { kind: "center_control", actor: "bot", how: "occupy", piece: "pawn", squares: ["d5"] },
  { kind: "center_control", actor: "bot", how: "attack", piece: "knight", squares: ["d5"] },
  { kind: "move_quality", actor: "you", quality: "good", lossCp: 0 },
  { kind: "move_quality", actor: "you", quality: "mistake", lossCp: 200 },
  { kind: "move_quality", actor: "you", quality: "blunder", lossCp: 500 },
  { kind: "move_quality", actor: "bot", quality: "mistake", lossCp: 200 },
  { kind: "move_quality", actor: "bot", quality: "blunder", lossCp: 500 },
  { kind: "game_over", result: "you_win", reason: "checkmate" },
  { kind: "game_over", result: "bot_wins", reason: "checkmate" },
  { kind: "game_over", result: "draw", reason: "stalemate" },
  { kind: "game_over", result: "draw", reason: "insufficient-material" },
  { kind: "game_over", result: "draw", reason: "threefold-repetition" },
  { kind: "game_over", result: "draw", reason: "fifty-move-rule" },
  { kind: "hint_focus", piece: knight, inCheck: false },
  { kind: "hint_focus", piece: knight, inCheck: true },
  { kind: "hint_focus", piece: null, inCheck: true },
  { kind: "hint_focus", piece: null, inCheck: false },
  { kind: "hint_threats", threatened: [], inCheck: false },
  { kind: "hint_threats", threatened: [knight], inCheck: false },
  { kind: "hint_threats", threatened: [knight, rook], inCheck: false },
  { kind: "hint_threats", threatened: [], inCheck: true },
  {
    kind: "hint_suggest",
    suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" },
  },
  { kind: "hint_suggest", suggestion: null },
];

const none = new Set<TermId>();
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe("templates", () => {
  it("only use placeholders that their group provides", () => {
    for (const [group, keys] of Object.entries(TEMPLATES)) {
      const allowed = TEMPLATE_VARS[group as TemplateGroup];
      for (const [key, variants] of Object.entries(keys)) {
        for (const variant of variants) {
          for (const name of placeholders(variant)) {
            expect(allowed, `${group}.${key} uses {${name}}`).toContain(name);
          }
        }
      }
    }
  });

  it("have several variants for the sentences players will see often", () => {
    for (const key of ["you_move", "you_capture", "bot_move", "bot_capture"]) {
      expect(TEMPLATES.move_played[key].length, key).toBeGreaterThanOrEqual(2);
    }
    expect(TEMPLATES.move_quality.you_good.length).toBeGreaterThanOrEqual(3);
  });

  it("are all reachable from some event (no dead or missing keys)", () => {
    const used = new Set(SAMPLE_EVENTS.map((e) => `${describeEvent(e).group}.${describeEvent(e).key}`));
    const all = Object.entries(TEMPLATES).flatMap(([group, keys]) =>
      Object.keys(keys).map((key) => `${group}.${key}`),
    );
    expect([...used].sort()).toEqual(all.sort());
  });

  it("are kind and beginner friendly", () => {
    const banned = [
      "stupid",
      "dumb",
      "idiot",
      "terrible",
      "awful",
      "pathetic",
      "obviously",
      "silly",
      "fork",
      "pin",
      "zugzwang",
      "tempo",
      "gambit",
      "fianchetto",
    ];
    const texts = [
      ...Object.values(TEMPLATES).flatMap((keys) => Object.values(keys).flat()),
      ...Object.values(TERMS),
    ];
    for (const text of texts) {
      for (const word of banned) {
        expect(text.toLowerCase(), `"${word}" in: ${text}`).not.toMatch(new RegExp(`\\b${word}\\b`));
      }
    }
  });
});

describe("TemplateNarrator", () => {
  it("produces clean text for every kind of event", () => {
    const narrator = new TemplateNarrator();
    for (const event of SAMPLE_EVENTS) {
      const { text } = narrator.narrate({ events: [event], explained: none });
      expect(text.length, JSON.stringify(event)).toBeGreaterThan(0);
      expect(text).not.toMatch(/[{}]|undefined|NaN/);
      expect(text).not.toMatch(/\s{2,}/);
    }
  });

  it("starts with the lead sentence, then the most important findings", () => {
    const events: CoachEvent[] = [
      { kind: "center_control", actor: "you", how: "occupy", piece: "pawn", squares: ["e4"] },
      { kind: "move_quality", actor: "you", quality: "blunder", lossCp: 500 },
      { kind: "good_development", actor: "you", piece: "knight", from: "g1", to: "f3" },
      { kind: "move_played", actor: "you", piece: "pawn", from: "e2", to: "e4", san: "e4" },
    ];
    const { text } = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(text.startsWith("You moved your pawn from e2 to e4.")).toBe(true);
    expect(text).toContain("blunder");
    // The two lowest-priority findings do not both fit.
    expect(text).not.toContain("center");
  });

  it("speaks about the bot in the third person", () => {
    const events: CoachEvent[] = [
      { kind: "move_played", actor: "bot", piece: "knight", from: "g8", to: "f6", san: "Nf6" },
    ];
    const { text } = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(text).toMatch(/^The bot/);
  });

  it("explains a term the first time and not again", () => {
    const events: CoachEvent[] = [
      { kind: "move_played", actor: "you", piece: "rook", from: "a1", to: "a8", san: "Ra8+" },
      { kind: "check_given", actor: "you", by: "rook" },
    ];
    const narrator = new TemplateNarrator(() => 0);
    const first = narrator.narrate({ events, explained: none });
    expect(first.explainedTerms).toEqual(["check"]);
    expect(first.text).toContain(TERMS.check);

    const second = narrator.narrate({ events, explained: new Set<TermId>(["check"]) });
    expect(second.explainedTerms).toEqual([]);
    expect(second.text).not.toContain(TERMS.check);
  });

  it("explains at most one new term per comment", () => {
    const events: CoachEvent[] = [
      { kind: "move_played", actor: "you", piece: "bishop", from: "f1", to: "b5", san: "Bb5+" },
      { kind: "move_quality", actor: "you", quality: "blunder", lossCp: 500 },
      { kind: "hanging_piece", actor: "you", owner: "you", piece: knight, attackers: [rook], reason: "undefended" },
    ];
    const { text, explainedTerms } = new TemplateNarrator(() => 0).narrate({
      events,
      explained: none,
    });
    expect(explainedTerms).toHaveLength(1);
    expect(text.match(/\(/g)?.length).toBe(1);
  });

  it("explains the lead event's term, like castling", () => {
    const events: CoachEvent[] = [
      { kind: "move_played", actor: "you", piece: "king", from: "e1", to: "g1", san: "O-O", castle: "kingside" },
    ];
    const result = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(result.explainedTerms).toEqual(["castling"]);
  });

  it("never repeats the same variant twice in a row", () => {
    const events: CoachEvent[] = [
      { kind: "move_played", actor: "you", piece: "knight", from: "g1", to: "f3", san: "Nf3" },
    ];
    const narrator = new TemplateNarrator(() => 0); // always asks for variant 0
    const a = narrator.narrate({ events, explained: none }).text;
    const b = narrator.narrate({ events, explained: none }).text;
    expect(a).not.toBe(b);
  });

  it("narrates a hint on its own, without a lead sentence", () => {
    const { text } = new TemplateNarrator(() => 0).narrate({
      events: [
        {
          kind: "hint_suggest",
          suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" },
        },
      ],
      explained: none,
    });
    expect(text).toContain("g1");
    expect(text).toContain("f3");
    expect(text).toContain("Nf3");
  });

  it("explains hanging pieces in a threat hint", () => {
    const { text, explainedTerms } = new TemplateNarrator(() => 0).narrate({
      events: [{ kind: "hint_threats", threatened: [knight], inCheck: false }],
      explained: none,
    });
    expect(text).toContain("your knight on c3");
    expect(text).toContain("keep it safe");
    expect(explainedTerms).toEqual(["hanging"]);
  });

  it("uses plural wording for several threatened pieces", () => {
    const { text } = new TemplateNarrator(() => 0).narrate({
      events: [{ kind: "hint_threats", threatened: [knight, rook], inCheck: false }],
      explained: none,
    });
    expect(text).toContain("your knight on c3 and your rook on a1");
    expect(text).toContain("keep them safe");
  });
});
