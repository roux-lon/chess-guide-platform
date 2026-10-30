import { COACH_CONFIG, EVENT_PRIORITY } from "./config";
import type { PriorityKey } from "./config";
import { commentText } from "./comment";
import type { CoachComment } from "./comment";
import type { CoachEvent, Purpose } from "./events";
import { ENGINE_PICK, GENERIC_WATCH, PURPOSE_WHY, TEMPLATES, WATCH_TEMPLATES } from "./templates/templates";
import type { TemplateGroup } from "./templates/templates";
import { TERMS } from "./templates/terms";
import type { TermId } from "./templates/terms";
import { otherWho } from "./types";
import type { PieceRef, Who } from "./types";

export type { TermId } from "./templates/terms";

export interface NarrateInput {
  events: CoachEvent[];
  /** Terms the player has already had explained. Not changed by narrate. */
  explained: ReadonlySet<TermId>;
}

export interface Narration {
  /** The whole thing as plain text (headline, why, watch): what the diary keeps. */
  text: string;
  /** The structured version for a move. Null for a hint, which is a single paragraph. */
  comment: CoachComment | null;
  /** Terms this comment explained for the first time. The caller adds them to its explained set. */
  explainedTerms: TermId[];
}

/** Turns events into words. The template version is the v1 implementation; an LLM one can replace it later. */
export interface Narrator {
  narrate(input: NarrateInput): Narration;
}

/** Placeholders each template group may use (headlines and watch lines). A test checks every template against this. */
export const TEMPLATE_VARS: Record<TemplateGroup, readonly string[]> = {
  hanging_piece: ["piece", "square", "attacker", "attackerSquare"],
  capture_trade: ["captured", "capturer", "square", "points"],
  trade_sequence: ["won", "lost", "Won", "points"],
  missed_threat: ["piece", "square", "attacker", "attackerSquare"],
  check_given: ["by"],
  in_check_warning: ["checker", "checkerSquare", "escapes", "kingSquare"],
  threat_created: ["attacker", "attackerSquare", "target", "targetSquare", "target2", "target2Square"],
  opportunity: ["target", "targetSquare", "attacker", "attackerSquare", "gain"],
  double_attack: ["attacker", "attackerSquare", "target", "targetSquare", "target2", "target2Square"],
  response_to_threat: ["piece", "square"],
  move_purpose: ["piece", "to"],
  move_quality: [],
  game_over: [],
  hint_safety: ["pieces", "them"],
  hint_plan: ["piece", "square", "pieces"],
  hint_suggest: ["piece", "from", "to", "san", "reason"],
};

export interface DescribedEvent {
  group: TemplateGroup;
  key: string;
  vars: Record<string, string>;
  terms: TermId[];
  /** Where it ranks when a move has several findings (see EVENT_PRIORITY). */
  priority: PriorityKey;
  /** For the engine's suggested move: what the reason line is made from. */
  reason?: { purpose: Purpose; safeAfter: boolean };
}

const withSquare = (ref: PieceRef) => `your ${ref.type} on ${ref.square}`;
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Picks the template key, fills in the facts, and says which terms and how important. Null for the plain "move played" event, which is never narrated. */
export function describeEvent(event: CoachEvent): DescribedEvent | null {
  switch (event.kind) {
    case "move_played":
      return null;

    case "hanging_piece": {
      const reason = event.reason === "cheaper-attacker" ? "cheaper" : event.reason;
      const attacker = event.attackers[0];
      return {
        group: "hanging_piece",
        key: `you_left_${reason}`,
        vars: {
          piece: event.piece.type,
          square: event.piece.square,
          attacker: attacker?.type ?? "piece",
          attackerSquare: attacker?.square ?? "",
        },
        terms: ["hanging"],
        priority: "hanging_piece",
      };
    }

    case "capture_trade":
      return {
        group: "capture_trade",
        key: `${event.actor}_${event.verdict}`,
        vars: {
          captured: event.captured,
          capturer: event.capturer,
          square: event.square,
          points: String(Math.abs(event.netPoints)),
        },
        terms: event.verdict === "equal" ? ["trade"] : event.verdict === "bad" ? ["piece_value"] : [],
        priority: event.verdict === "bad" && event.actor === "you" ? "capture_trade_bad" : "capture_trade",
      };

    case "trade_sequence":
      return {
        group: "trade_sequence",
        key: event.verdict === "equal" ? (event.won === event.lost ? "equal_same" : "equal_diff") : event.verdict,
        vars: {
          won: event.won,
          lost: event.lost,
          Won: capitalize(event.won),
          points: String(Math.abs(event.netForYou)),
        },
        terms: event.verdict === "bad" ? ["trade", "piece_value"] : ["trade"],
        priority: "trade_sequence",
      };

    case "missed_threat": {
      const attacker = event.attackers[0];
      return {
        group: "missed_threat",
        key: "one",
        vars: {
          piece: event.piece.type,
          square: event.piece.square,
          attacker: attacker?.type ?? "piece",
          attackerSquare: attacker?.square ?? "",
        },
        terms: ["hanging"],
        priority: "missed_threat",
      };
    }

    case "check_given":
      return {
        group: "check_given",
        key: "you",
        vars: { by: event.by },
        terms: ["check"],
        priority: "check_given",
      };

    case "in_check_warning": {
      const checker = event.checkers[0];
      return {
        group: "in_check_warning",
        key: event.escapeMoves <= 1 ? "one" : event.escapeMoves <= 3 ? "few" : "many",
        vars: {
          checker: checker?.type ?? "piece",
          checkerSquare: checker?.square ?? "",
          escapes: String(event.escapeMoves),
          kingSquare: event.kingSquare,
        },
        terms: ["check"],
        priority: "in_check_warning",
      };
    }

    case "threat_created": {
      const [first, second] = event.targets;
      return {
        group: "threat_created",
        key: `${event.actor}_${second ? "two" : "one"}`,
        vars: {
          attacker: event.attacker.type,
          attackerSquare: event.attacker.square,
          target: first.type,
          targetSquare: first.square,
          target2: second?.type ?? "",
          target2Square: second?.square ?? "",
        },
        terms: ["threat"],
        priority: "threat_created",
      };
    }

    case "opportunity":
      return {
        group: "opportunity",
        key: "one",
        vars: {
          target: event.target.type,
          targetSquare: event.target.square,
          attacker: event.attacker.type,
          attackerSquare: event.attacker.square,
          gain: String(event.gain),
        },
        terms: [],
        priority: "opportunity",
      };

    case "double_attack": {
      const [first, second] = event.targets;
      return {
        group: "double_attack",
        key: `${event.actor}${event.givesCheck ? "_check" : ""}`,
        vars: {
          attacker: event.attacker.type,
          attackerSquare: event.attacker.square,
          target: first?.type ?? "piece",
          targetSquare: first?.square ?? "",
          target2: second?.type ?? "piece",
          target2Square: second?.square ?? "",
        },
        terms: ["double_attack"],
        priority: "double_attack",
      };
    }

    case "response_to_threat":
      return {
        group: "response_to_threat",
        key: event.how,
        vars: { piece: event.piece.type, square: event.piece.square },
        terms: [],
        priority: "response_to_threat",
      };

    case "move_purpose":
      return {
        group: "move_purpose",
        key: `${event.actor}_${event.purpose}`,
        vars: { piece: event.piece, to: event.to },
        terms:
          event.purpose === "castle"
            ? ["castling"]
            : event.purpose === "develop"
              ? ["development"]
              : event.purpose === "controlCenter"
                ? ["center"]
                : [],
        priority: "move_purpose",
      };

    case "move_quality":
      return {
        group: "move_quality",
        key: `${event.actor}_${event.quality}`,
        vars: {},
        terms:
          event.quality === "blunder"
            ? ["blunder"]
            : event.quality === "mistake"
              ? ["mistake"]
              : [],
        priority:
          event.quality === "good"
            ? "move_quality_good"
            : event.actor === "you"
              ? "move_quality_bad"
              : "move_quality_bot_bad",
      };

    case "game_over": {
      const key =
        event.result === "you_win"
          ? "you_win"
          : event.result === "bot_wins"
            ? "bot_wins"
            : `draw_${event.reason}`;
      return {
        group: "game_over",
        key,
        vars: {},
        terms:
          event.reason === "checkmate"
            ? ["checkmate"]
            : event.reason === "stalemate"
              ? ["stalemate"]
              : [],
        priority: "game_over",
      };
    }

    case "hint_safety": {
      const key = event.inCheck ? "check" : event.unsafe.length > 0 ? "pieces" : "none";
      return {
        group: "hint_safety",
        key,
        vars: {
          pieces: joinList(event.unsafe.map(withSquare)),
          them: event.unsafe.length > 1 ? "them" : "it",
        },
        terms: key === "check" ? ["check"] : key === "pieces" ? ["hanging"] : [],
        priority: "move_purpose",
      };
    }

    case "hint_plan": {
      const first = event.pieces[0];
      return {
        group: "hint_plan",
        key: event.plan,
        vars: {
          piece: first?.type ?? "",
          square: first?.square ?? "",
          pieces: joinList(event.pieces.map(withSquare)),
        },
        terms: event.plan === "threat" ? ["threat"] : event.plan === "castle" ? ["castling"] : [],
        priority: "move_purpose",
      };
    }

    case "hint_suggest":
      return {
        group: "hint_suggest",
        key: event.suggestion ? "move" : "none",
        vars: {
          piece: event.suggestion?.piece ?? "",
          from: event.suggestion?.from ?? "",
          to: event.suggestion?.to ?? "",
          san: event.suggestion?.san ?? "",
          reason: "",
        },
        terms: [],
        priority: "move_purpose",
        reason: { purpose: event.purpose, safeAfter: event.safeAfter },
      };
  }
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "").replace(/\s+/g, " ").trim();
}

interface Ranked {
  event: CoachEvent;
  described: DescribedEvent;
}

/**
 * Narrates events from the wording in templates/. A move gets one comment with one main idea:
 * the top-ranked finding is the headline, the purpose of the move is the "why", a line from
 * the headline's own watch list (or a habit-building one) is the "watch", and the rest of the
 * findings wait in "more". At most one new term is explained per comment.
 */
export class TemplateNarrator implements Narrator {
  private readonly lastVariant = new Map<string, number>();

  constructor(private readonly random: () => number = Math.random) {}

  narrate({ events, explained }: NarrateInput): Narration {
    const hint = events.find((e) => e.kind.startsWith("hint_"));
    if (hint) return this.narrateHint(hint, explained);
    return this.narrateMove(events, explained);
  }

  private narrateHint(hint: CoachEvent, explained: ReadonlySet<TermId>): Narration {
    const described = describeEvent(hint);
    if (!described) return { text: "", comment: null, explainedTerms: [] };

    if (described.reason) {
      const { purpose, safeAfter } = described.reason;
      described.vars.reason =
        purpose !== "other"
          ? this.pick(`why.${purpose}`, PURPOSE_WHY[purpose])
          : this.pick(`engine.${safeAfter ? "safe" : "plain"}`, safeAfter ? ENGINE_PICK.safe : ENGINE_PICK.plain);
    }

    const sentences = [fill(this.pick(`${described.group}.${described.key}`, TEMPLATES[described.group][described.key]), described.vars)];
    const explainedTerms: TermId[] = [];
    const term = described.terms.find((t) => !explained.has(t));
    if (term) {
      sentences.push(TERMS[term]);
      explainedTerms.push(term);
    }
    return { text: sentences.join(" "), comment: null, explainedTerms };
  }

  private narrateMove(events: CoachEvent[], explained: ReadonlySet<TermId>): Narration {
    const lead = events.find((e) => e.kind === "move_played");
    const actor: Who = lead?.kind === "move_played" ? lead.actor : "you";

    const ranked: Ranked[] = events
      .flatMap((event) => {
        const described = describeEvent(event);
        return described ? [{ event, described }] : [];
      })
      .sort((a, b) => EVENT_PRIORITY[b.described.priority] - EVENT_PRIORITY[a.described.priority]);

    const purposeItem = ranked.find((r) => r.event.kind === "move_purpose");
    const praise = ranked.find((r) => r.described.priority === "move_quality_good");
    const top = ranked[0] === praise ? ranked[1] : ranked[0];
    let headline = top
      ? this.say(top.described)
      : fill(this.pick(`move_purpose.${actor}_other`, TEMPLATES.move_purpose[`${actor}_other`]), {});
    // "Good move!" alone teaches nothing, so praise rides along with the purpose of the move.
    if (praise && top === purposeItem) headline = `${this.say(praise.described)} ${headline}`;
    const purpose = purposeItem?.event.kind === "move_purpose" ? purposeItem.event.purpose : "other";
    let why = this.pick(`why.${purpose}`, PURPOSE_WHY[purpose]);

    const watchLines = top ? WATCH_TEMPLATES[top.described.group]?.[top.described.key] : undefined;
    const watch = watchLines
      ? fill(this.pick(`watch.${top.described.group}.${top.described.key}`, watchLines), top.described.vars)
      : this.pick(`watch.generic.${actor}`, GENERIC_WATCH[actor]);

    const moreItems = ranked
      .filter((r) => r !== top && r !== purposeItem && r !== praise)
      .slice(0, COACH_CONFIG.maxMoreItems);
    const more = moreItems.map((r) => this.say(r.described));

    // Explain one new word, from the most important finding that is actually shown.
    const shown = [top, ...moreItems, purposeItem].filter((r): r is Ranked => r !== undefined);
    const explainedTerms: TermId[] = [];
    const term = shown.flatMap((r) => r.described.terms).find((t) => !explained.has(t));
    if (term) {
      why = `${why} ${TERMS[term]}`;
      explainedTerms.push(term);
    }

    const comment: CoachComment = {
      kind: top?.event.nature ?? "info",
      toMove: otherWho(actor),
      headline,
      why,
      watch,
      more,
      events,
    };
    return { text: commentText(comment), comment, explainedTerms };
  }

  private say(described: DescribedEvent): string {
    return fill(this.pick(`${described.group}.${described.key}`, TEMPLATES[described.group][described.key]), described.vars);
  }

  /** A random variant, but never the same one twice in a row for the same template. */
  private pick(id: string, variants: readonly string[] | undefined): string {
    if (!variants || variants.length === 0) {
      throw new Error(`No template for ${id}`);
    }
    let index = Math.floor(this.random() * variants.length);
    if (variants.length > 1 && this.lastVariant.get(id) === index) {
      index = (index + 1) % variants.length;
    }
    this.lastVariant.set(id, index);
    return variants[index];
  }
}
