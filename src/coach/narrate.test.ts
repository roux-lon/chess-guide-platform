import { describe, expect, it } from "vitest";
import type { CoachEvent, Purpose } from "./events";
import { TEMPLATE_VARS, TemplateNarrator, describeEvent } from "./narrate";
import type { TermId } from "./narrate";
import { ENGINE_PICK, GENERIC_WATCH, PURPOSE_WHY, TEMPLATES, WATCH_TEMPLATES } from "./templates/templates";
import type { TemplateGroup } from "./templates/templates";
import { TERMS } from "./templates/terms";
import type { EventMeta } from "./types";

const knight = { type: "knight", square: "c3" } as const;
const rook = { type: "rook", square: "a1" } as const;
const queen = { type: "queen", square: "d8" } as const;

const M: EventMeta = { perspective: "user", nature: "info" };

const PURPOSES: Purpose[] = [
  "develop",
  "controlCenter",
  "castle",
  "attack",
  "defend",
  "retreat",
  "capture",
  "trade",
  "pawnAdvance",
  "kingSafety",
  "improvePiece",
  "other",
];

/** One event for every template key, so the whole template file gets exercised. */
const SAMPLE_EVENTS: CoachEvent[] = [
  ...(["undefended", "cheaper-attacker", "outnumbered"] as const).map(
    (reason): CoachEvent => ({
      kind: "hanging_piece",
      ...M,
      actor: "you",
      owner: "you",
      piece: knight,
      attackers: [rook],
      reason,
      gain: 3,
    }),
  ),
  ...(["you", "bot"] as const).flatMap((actor) =>
    (["good", "equal", "bad"] as const).map(
      (verdict): CoachEvent => ({
        kind: "capture_trade",
        ...M,
        actor,
        captured: "bishop",
        capturer: "queen",
        square: "d5",
        netPoints: verdict === "good" ? 3 : verdict === "equal" ? 0 : -6,
        verdict,
      }),
    ),
  ),
  { kind: "trade_sequence", ...M, opener: "bot", firstCaptured: "queen", recaptured: "queen", square: "d5", won: "queen", lost: "queen", netForYou: 0, verdict: "equal" },
  { kind: "trade_sequence", ...M, opener: "bot", firstCaptured: "bishop", recaptured: "knight", square: "d5", won: "knight", lost: "bishop", netForYou: 0, verdict: "equal" },
  { kind: "trade_sequence", ...M, opener: "you", firstCaptured: "knight", recaptured: "pawn", square: "d5", won: "knight", lost: "pawn", netForYou: 2, verdict: "good" },
  { kind: "trade_sequence", ...M, opener: "bot", firstCaptured: "knight", recaptured: "pawn", square: "d5", won: "pawn", lost: "knight", netForYou: -2, verdict: "bad" },
  { kind: "missed_threat", ...M, piece: knight, attackers: [rook], gain: 3 },
  { kind: "check_given", ...M, actor: "you", by: "rook" },
  ...[1, 2, 6].map(
    (escapeMoves): CoachEvent => ({
      kind: "in_check_warning",
      ...M,
      kingSquare: "e1",
      checkers: [{ type: "rook", square: "h1" }],
      escapeMoves,
    }),
  ),
  ...(["you", "bot"] as const).flatMap((actor) => [
    { kind: "threat_created", ...M, actor, attacker: { type: "bishop", square: "f6" }, targets: [rook], gain: 5, discovered: false } as CoachEvent,
    { kind: "threat_created", ...M, actor, attacker: { type: "bishop", square: "f6" }, targets: [rook, queen], gain: 5, discovered: false } as CoachEvent,
  ]),
  { kind: "opportunity", ...M, target: rook, attacker: { type: "bishop", square: "f4" }, gain: 5, count: 1 },
  ...(["you", "bot"] as const).flatMap((actor) => [
    { kind: "double_attack", ...M, actor, attacker: { type: "knight", square: "c7" }, targets: [rook, queen], givesCheck: false } as CoachEvent,
    { kind: "double_attack", ...M, actor, attacker: { type: "knight", square: "c7" }, targets: [rook], givesCheck: true } as CoachEvent,
  ]),
  ...(["moved", "defended", "captured_attacker", "counterattack"] as const).map(
    (how): CoachEvent => ({ kind: "response_to_threat", ...M, actor: "bot", how, piece: rook }),
  ),
  ...(["you", "bot"] as const).flatMap((actor) =>
    PURPOSES.map((purpose): CoachEvent => ({ kind: "move_purpose", ...M, actor, purpose, piece: "knight", to: "f3" })),
  ),
  { kind: "move_quality", ...M, actor: "you", quality: "good", lossCp: 0 },
  { kind: "move_quality", ...M, actor: "you", quality: "mistake", lossCp: 200 },
  { kind: "move_quality", ...M, actor: "you", quality: "blunder", lossCp: 500 },
  { kind: "move_quality", ...M, actor: "bot", quality: "mistake", lossCp: 200 },
  { kind: "move_quality", ...M, actor: "bot", quality: "blunder", lossCp: 500 },
  { kind: "game_over", ...M, result: "you_win", reason: "checkmate" },
  { kind: "game_over", ...M, result: "bot_wins", reason: "checkmate" },
  { kind: "game_over", ...M, result: "draw", reason: "stalemate" },
  { kind: "game_over", ...M, result: "draw", reason: "insufficient-material" },
  { kind: "game_over", ...M, result: "draw", reason: "threefold-repetition" },
  { kind: "game_over", ...M, result: "draw", reason: "fifty-move-rule" },
  { kind: "hint_safety", ...M, unsafe: [], inCheck: true },
  { kind: "hint_safety", ...M, unsafe: [knight], inCheck: false },
  { kind: "hint_safety", ...M, unsafe: [knight, rook], inCheck: false },
  { kind: "hint_safety", ...M, unsafe: [], inCheck: false },
  ...(["check", "threat", "develop", "castle", "center", "free"] as const).map(
    (plan): CoachEvent => ({ kind: "hint_plan", ...M, plan, pieces: plan === "threat" || plan === "develop" ? [knight] : [] }),
  ),
  {
    kind: "hint_suggest",
    ...M,
    suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" },
    purpose: "develop",
    safeAfter: true,
  },
  { kind: "hint_suggest", ...M, suggestion: null, purpose: "other", safeAfter: false },
];

const none = new Set<TermId>();
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const lead = (actor: "you" | "bot"): CoachEvent => ({
  kind: "move_played",
  ...M,
  actor,
  piece: "knight",
  from: "g1",
  to: "f3",
  san: "Nf3",
});
const purposeEvent = (purpose: Purpose, actor: "you" | "bot" = "you"): CoachEvent => ({
  kind: "move_purpose",
  ...M,
  actor,
  purpose,
  piece: "knight",
  to: "f3",
});

describe("templates", () => {
  it("only use placeholders that their group provides", () => {
    for (const table of [TEMPLATES, WATCH_TEMPLATES]) {
      for (const [group, keys] of Object.entries(table)) {
        const allowed = TEMPLATE_VARS[group as TemplateGroup];
        for (const [key, variants] of Object.entries(keys)) {
          for (const variant of variants) {
            for (const name of placeholders(variant)) {
              expect(allowed, `${group}.${key} uses {${name}}`).toContain(name);
            }
          }
        }
      }
    }
    for (const [purpose, variants] of Object.entries(PURPOSE_WHY)) {
      for (const variant of variants) expect(placeholders(variant), `why.${purpose}`).toEqual([]);
    }
  });

  it("have several variants for the sentences players will see often", () => {
    expect(TEMPLATES.move_quality.you_good.length).toBeGreaterThanOrEqual(3);
    expect(TEMPLATES.threat_created.you_one.length).toBeGreaterThanOrEqual(2);
    expect(TEMPLATES.opportunity.one.length).toBeGreaterThanOrEqual(2);
    expect(TEMPLATES.trade_sequence.equal_same.length).toBeGreaterThanOrEqual(2);
    expect(PURPOSE_WHY.develop.length).toBeGreaterThanOrEqual(2);
    expect(GENERIC_WATCH.you.length).toBeGreaterThanOrEqual(2);
    expect(GENERIC_WATCH.bot.length).toBeGreaterThanOrEqual(2);
  });

  it("are all reachable from some event (no dead or missing keys)", () => {
    const used = new Set(
      SAMPLE_EVENTS.flatMap((e) => {
        const d = describeEvent(e);
        return d ? [`${d.group}.${d.key}`] : [];
      }),
    );
    const all = Object.entries(TEMPLATES).flatMap(([group, keys]) =>
      Object.keys(keys).map((key) => `${group}.${key}`),
    );
    expect([...used].sort()).toEqual(all.sort());
  });

  it("have a 'what to watch' line only for keys that exist, and a 'why' for every purpose", () => {
    for (const [group, keys] of Object.entries(WATCH_TEMPLATES)) {
      for (const key of Object.keys(keys)) {
        expect(TEMPLATES[group as TemplateGroup], `${group}.${key}`).toHaveProperty(key);
      }
    }
    for (const purpose of PURPOSES) expect(PURPOSE_WHY[purpose].length, purpose).toBeGreaterThan(0);
    expect(Object.keys(PURPOSE_WHY).sort()).toEqual([...PURPOSES].sort());
  });

  it("never just restate the move (the log already shows it)", () => {
    const restating = /\b(?:you|the bot)(?:'s)? (?:moved|played)\b|\bgoes to [a-h][1-8]|\bfrom [a-h][1-8] to [a-h][1-8]/i;
    const texts = [
      ...Object.entries(TEMPLATES)
        .filter(([group]) => group !== "hint_suggest")
        .flatMap(([, keys]) => Object.values(keys).flat()),
      ...Object.values(WATCH_TEMPLATES).flatMap((keys) => Object.values(keys ?? {}).flat()),
      ...Object.values(PURPOSE_WHY).flat(),
      ...Object.values(GENERIC_WATCH).flat(),
    ];
    for (const text of texts) expect(text, text).not.toMatch(restating);
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
      "pin",
      "zugzwang",
      "tempo",
      "gambit",
      "fianchetto",
    ];
    const texts = [
      ...Object.values(TEMPLATES).flatMap((keys) => Object.values(keys).flat()),
      ...Object.values(WATCH_TEMPLATES).flatMap((keys) => Object.values(keys ?? {}).flat()),
      ...Object.values(PURPOSE_WHY).flat(),
      ...Object.values(GENERIC_WATCH).flat(),
      ...ENGINE_PICK.safe,
      ...ENGINE_PICK.plain,
      ...Object.values(TERMS),
    ];
    for (const text of texts) {
      for (const word of banned) {
        expect(text.toLowerCase(), `"${word}" in: ${text}`).not.toMatch(new RegExp(`\\b${word}\\b`));
      }
    }
  });
});

describe("TemplateNarrator: one comment per move", () => {
  it("produces clean text for every kind of event", () => {
    const narrator = new TemplateNarrator();
    for (const event of SAMPLE_EVENTS) {
      const events = event.kind.startsWith("hint_") ? [event] : [lead(event.kind === "move_purpose" ? event.actor : "you"), event];
      const { text } = narrator.narrate({ events, explained: none });
      expect(text.length, JSON.stringify(event)).toBeGreaterThan(0);
      expect(text).not.toMatch(/[{}]|undefined|NaN/);
      expect(text).not.toMatch(/\s{2,}/);
    }
  });

  it("leads with the most important finding, then says why and what to watch", () => {
    const events: CoachEvent[] = [
      lead("you"),
      purposeEvent("controlCenter"),
      { kind: "move_quality", ...M, actor: "you", quality: "blunder", lossCp: 500 },
      { kind: "threat_created", ...M, actor: "you", attacker: { type: "bishop", square: "f6" }, targets: [rook], gain: 5, discovered: false },
      { kind: "hanging_piece", ...M, actor: "you", owner: "you", piece: knight, attackers: [rook], reason: "undefended", gain: 3 },
    ];
    const { comment } = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(comment).not.toBeNull();
    expect(comment?.headline).toContain("nothing protects your knight on c3");
    expect(comment?.why).toContain("middle of the board");
    expect(comment?.watch).toContain("capture");
    // The lesser findings wait in "more", not in the headline.
    expect(comment?.more.join(" ")).toContain("blunder");
    expect(comment?.more.join(" ")).toContain("now attacks the bot");
    expect(comment?.headline).not.toContain("blunder");
  });

  it("keeps one main idea: the comment's kind follows the headline", () => {
    const kindOf = (events: CoachEvent[]) => new TemplateNarrator(() => 0).narrate({ events, explained: none }).comment?.kind;
    const withNature = (event: CoachEvent, nature: EventMeta["nature"]) => ({ ...event, nature }) as CoachEvent;
    const threat = withNature(
      { kind: "threat_created", ...M, actor: "you", attacker: rook, targets: [queen], gain: 9, discovered: false },
      "threat",
    );
    const chance = withNature(
      { kind: "opportunity", ...M, target: rook, attacker: knight, gain: 5, count: 1 },
      "opportunity",
    );
    const trade = withNature(
      { kind: "trade_sequence", ...M, opener: "bot", firstCaptured: "queen", recaptured: "queen", square: "d5", won: "queen", lost: "queen", netForYou: 0, verdict: "equal" },
      "trade",
    );
    expect(kindOf([lead("you"), purposeEvent("attack"), threat])).toBe("threat");
    expect(kindOf([lead("bot"), purposeEvent("other", "bot"), chance])).toBe("opportunity");
    expect(kindOf([lead("you"), purposeEvent("trade"), trade])).toBe("trade");
    expect(kindOf([lead("you"), purposeEvent("develop")])).toBe("info");
  });

  it("says whose turn it is after the move", () => {
    const narrator = new TemplateNarrator(() => 0);
    expect(narrator.narrate({ events: [lead("you"), purposeEvent("develop")], explained: none }).comment?.toMove).toBe("bot");
    expect(narrator.narrate({ events: [lead("bot"), purposeEvent("develop", "bot")], explained: none }).comment?.toMove).toBe("you");
  });

  it("explains the purpose of a quiet move instead of restating it", () => {
    const { comment } = new TemplateNarrator(() => 0).narrate({ events: [lead("you"), purposeEvent("develop")], explained: none });
    expect(comment?.headline).toBe("Nice! Your knight joins the game.");
    expect(comment?.why).toContain("starting");
    expect(comment?.watch).not.toBe("");
    expect(comment?.more).toEqual([]);
  });

  it("folds praise into the purpose instead of leading with a bare \"Good move!\"", () => {
    const events: CoachEvent[] = [
      lead("you"),
      purposeEvent("controlCenter"),
      { kind: "move_quality", ...M, actor: "you", quality: "good", lossCp: 0 },
    ];
    const { comment } = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(comment?.headline).toBe("Good move! Your knight fights for the center of the board.");
    expect(comment?.more).toEqual([]);
  });

  it("falls back to a quiet-move comment when there is nothing else", () => {
    const { comment, text } = new TemplateNarrator(() => 0).narrate({ events: [lead("you")], explained: none });
    expect(comment?.headline).toBe("A quiet move.");
    expect(text).not.toBe("");
  });

  it("speaks about the bot in the third person", () => {
    const { comment } = new TemplateNarrator(() => 0).narrate({
      events: [lead("bot"), purposeEvent("develop", "bot")],
      explained: none,
    });
    expect(comment?.headline).toMatch(/^The bot/);
  });

  it("never says 'can you take it' about a piece the player is attacking", () => {
    const events: CoachEvent[] = [
      lead("you"),
      purposeEvent("attack"),
      { kind: "threat_created", ...M, actor: "you", attacker: { type: "bishop", square: "f6" }, targets: [{ type: "rook", square: "e5" }], gain: 5, discovered: false },
    ];
    for (let pick = 0; pick < 2; pick++) {
      const { text } = new TemplateNarrator(() => pick / 2).narrate({ events, explained: none });
      expect(text).not.toMatch(/can you take/i);
      expect(text).toMatch(/(has to|must) (respond|answer)/);
    }
  });

  it("explains a term the first time and not again", () => {
    const events: CoachEvent[] = [
      lead("you"),
      purposeEvent("attack"),
      { kind: "threat_created", ...M, actor: "you", attacker: rook, targets: [queen], gain: 9, discovered: false },
    ];
    const narrator = new TemplateNarrator(() => 0);
    const first = narrator.narrate({ events, explained: none });
    expect(first.explainedTerms).toEqual(["threat"]);
    expect(first.comment?.why).toContain(TERMS.threat);

    const second = narrator.narrate({ events, explained: new Set<TermId>(["threat"]) });
    expect(second.explainedTerms).toEqual([]);
    expect(second.text).not.toContain(TERMS.threat);
  });

  it("explains at most one new term per comment", () => {
    const events: CoachEvent[] = [
      lead("you"),
      purposeEvent("castle"),
      { kind: "move_quality", ...M, actor: "you", quality: "blunder", lossCp: 500 },
      { kind: "hanging_piece", ...M, actor: "you", owner: "you", piece: knight, attackers: [rook], reason: "undefended", gain: 3 },
    ];
    const { text, explainedTerms } = new TemplateNarrator(() => 0).narrate({ events, explained: none });
    expect(explainedTerms).toHaveLength(1);
    expect(text.match(/\(/g)?.length).toBe(1);
  });

  it("explains the term of the purpose, like castling, when it is the main idea", () => {
    const result = new TemplateNarrator(() => 0).narrate({ events: [lead("you"), purposeEvent("castle")], explained: none });
    expect(result.explainedTerms).toEqual(["castling"]);
  });

  it("never repeats the same variant twice in a row", () => {
    const events = [lead("you"), purposeEvent("develop")];
    const narrator = new TemplateNarrator(() => 0); // always asks for variant 0
    const a = narrator.narrate({ events, explained: none }).text;
    const b = narrator.narrate({ events, explained: none }).text;
    expect(a).not.toBe(b);
  });
});

describe("TemplateNarrator: hints", () => {
  const narrate = (event: CoachEvent, explained = none) =>
    new TemplateNarrator(() => 0).narrate({ events: [event], explained });

  it("narrates a hint on its own, as a single paragraph", () => {
    const result = narrate({ kind: "hint_suggest", ...M, suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" }, purpose: "develop", safeAfter: true });
    expect(result.comment).toBeNull();
    expect(result.text).toContain("g1");
    expect(result.text).toContain("f3");
    expect(result.text).toContain("Nf3");
  });

  it("gives the purpose of the suggested move as the reason", () => {
    const { text } = narrate({ kind: "hint_suggest", ...M, suggestion: { piece: "knight", from: "g1", to: "f3", san: "Nf3" }, purpose: "develop", safeAfter: true });
    expect(text).toContain(PURPOSE_WHY.develop[0]);
  });

  it("says honestly that it is the engine's pick when the move has no clear purpose", () => {
    const suggestion = { piece: "rook", from: "a3", to: "b3", san: "Rb3" } as const;
    const safe = narrate({ kind: "hint_suggest", ...M, suggestion, purpose: "other", safeAfter: true }).text;
    expect(safe).toContain("engine's pick");
    expect(safe).toContain("keep all your pieces safe");
    const plain = narrate({ kind: "hint_suggest", ...M, suggestion, purpose: "other", safeAfter: false }).text;
    expect(plain).toContain("engine's pick");
    expect(plain).not.toContain("keep all your pieces safe");
  });

  it("names the pieces in danger in the safety check, and explains 'hanging'", () => {
    const { text, explainedTerms } = narrate({ kind: "hint_safety", ...M, unsafe: [knight], inCheck: false });
    expect(text).toContain("your knight on c3");
    expect(text).toContain("keep it safe");
    expect(explainedTerms).toEqual(["hanging"]);
  });

  it("uses plural wording for several pieces in danger", () => {
    const { text } = narrate({ kind: "hint_safety", ...M, unsafe: [knight, rook], inCheck: false });
    expect(text).toContain("your knight on c3 and your rook on a1");
    expect(text).toContain("keep them safe");
  });

  it("says plainly that nothing is in danger", () => {
    const { text } = narrate({ kind: "hint_safety", ...M, unsafe: [], inCheck: false });
    expect(text).toContain("Nothing of yours can be won");
  });

  it("lists the pieces still at home in the plan check", () => {
    const { text } = narrate({ kind: "hint_plan", ...M, plan: "develop", pieces: [{ type: "knight", square: "g1" }, { type: "bishop", square: "f1" }] });
    expect(text).toContain("your knight on g1 and your bishop on f1");
  });

  it("names the threatened piece and the three ways out in the plan check", () => {
    const { text } = narrate({ kind: "hint_plan", ...M, plan: "threat", pieces: [knight] });
    expect(text).toContain("knight on c3");
    expect(text).toContain("move it, protect it, or capture");
  });
});
