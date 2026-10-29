import { COACH_CONFIG } from "./config";
import type { CoachEvent } from "./events";
import type { PieceRef } from "./types";
import { TEMPLATES } from "./templates/templates";
import type { TemplateGroup } from "./templates/templates";
import { TERMS } from "./templates/terms";
import type { TermId } from "./templates/terms";

export type { TermId } from "./templates/terms";

export interface NarrateInput {
  events: CoachEvent[];
  /** Terms the player has already had explained. Not changed by narrate. */
  explained: ReadonlySet<TermId>;
}

export interface Narration {
  text: string;
  /** Terms this comment explained for the first time. The caller adds them to its explained set. */
  explainedTerms: TermId[];
}

/** Turns events into words. The template version is the v1 implementation; an LLM one can replace it later. */
export interface Narrator {
  narrate(input: NarrateInput): Narration;
}

/** Placeholders each template group may use. A test checks every template against this. */
export const TEMPLATE_VARS: Record<TemplateGroup, readonly string[]> = {
  move_played: ["piece", "from", "to", "san", "captured", "promoted"],
  hanging_piece: ["piece", "square", "attacker", "attackerSquare"],
  capture_trade: ["captured", "capturer", "square", "points"],
  check_given: ["by"],
  in_check_warning: ["checker", "checkerSquare", "escapes", "kingSquare"],
  threat_from_opponent: [
    "attacker",
    "attackerSquare",
    "target",
    "targetSquare",
    "target2",
    "target2Square",
  ],
  good_development: ["piece", "from", "to"],
  center_control: ["piece", "square", "squares"],
  move_quality: [],
  game_over: [],
  hint_focus: ["piece", "square"],
  hint_threats: ["pieces", "them"],
  hint_suggest: ["piece", "from", "to", "san"],
};

export interface DescribedEvent {
  group: TemplateGroup;
  key: string;
  vars: Record<string, string>;
  terms: TermId[];
  /** Higher is said first when a move has more to say than fits in one comment. */
  priority: number;
}

const pieceLabel = (ref: PieceRef) => `${ref.type}`;
const withSquare = (ref: PieceRef) => `your ${ref.type} on ${ref.square}`;

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Picks the template key, fills in the facts, and says which terms and how important. */
export function describeEvent(event: CoachEvent): DescribedEvent {
  switch (event.kind) {
    case "move_played": {
      const how = event.castle
        ? "castle"
        : event.promotion
          ? "promote"
          : event.captured
            ? "capture"
            : "move";
      return {
        group: "move_played",
        key: `${event.actor}_${how}`,
        vars: {
          piece: event.piece,
          from: event.from,
          to: event.to,
          san: event.san,
          captured: event.captured ?? "",
          promoted: event.promotion ?? "",
        },
        terms: event.castle ? ["castling"] : event.promotion ? ["promotion"] : [],
        priority: 1000,
      };
    }

    case "hanging_piece": {
      const reason = event.reason === "undefended" ? "undefended" : "cheaper";
      const who =
        event.owner === "you"
          ? event.actor === "you"
            ? "you_left"
            : "threat"
          : event.actor === "you"
            ? "chance"
            : "bot_left";
      const attacker = event.attackers[0];
      return {
        group: "hanging_piece",
        key: `${who}_${reason}`,
        vars: {
          piece: event.piece.type,
          square: event.piece.square,
          attacker: attacker?.type ?? "piece",
          attackerSquare: attacker?.square ?? "",
        },
        terms: ["hanging"],
        // The reason (a loose piece) is said before the verdict ("that was a blunder").
        priority: who === "you_left" ? 92 : who === "threat" ? 91 : who === "chance" ? 60 : 58,
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
        priority: event.verdict === "bad" ? 75 : event.verdict === "good" ? 72 : 65,
      };

    case "check_given":
      return {
        group: "check_given",
        key: "you",
        vars: { by: event.by },
        terms: ["check"],
        priority: 80,
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
        priority: 88,
      };
    }

    case "threat_from_opponent": {
      const [first, second] = event.targets;
      return {
        group: "threat_from_opponent",
        key: second ? "two" : "one",
        vars: {
          attacker: event.attacker.type,
          attackerSquare: event.attacker.square,
          target: first.type,
          targetSquare: first.square,
          target2: second?.type ?? "",
          target2Square: second?.square ?? "",
        },
        terms: [],
        priority: 50,
      };
    }

    case "good_development":
      return {
        group: "good_development",
        key: event.actor,
        vars: { piece: event.piece, from: event.from, to: event.to },
        terms: ["development"],
        priority: 30,
      };

    case "center_control":
      return {
        group: "center_control",
        key: `${event.actor}_${event.how}`,
        vars: {
          piece: event.piece,
          square: event.squares[0] ?? "",
          squares: joinList(event.squares),
        },
        terms: ["center"],
        priority: 20,
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
        priority: event.quality === "good" ? 40 : 90,
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
        priority: 100,
      };
    }

    case "hint_focus": {
      const key = event.piece ? (event.inCheck ? "piece_in_check" : "piece") : event.inCheck ? "in_check" : "none";
      return {
        group: "hint_focus",
        key,
        vars: { piece: event.piece ? pieceLabel(event.piece) : "", square: event.piece?.square ?? "" },
        terms: event.inCheck ? ["check"] : [],
        priority: 0,
      };
    }

    case "hint_threats": {
      const key = event.inCheck ? "check" : event.threatened.length > 0 ? "pieces" : "none";
      return {
        group: "hint_threats",
        key,
        vars: {
          pieces: joinList(event.threatened.map(withSquare)),
          them: event.threatened.length > 1 ? "them" : "it",
        },
        terms: key === "check" ? ["check"] : key === "pieces" ? ["hanging"] : [],
        priority: 0,
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
        },
        terms: [],
        priority: 0,
      };
  }
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
}

/**
 * Narrates events from the wording in templates/. Each comment is a lead sentence (what was
 * played) plus the most important one or two findings, with at most one new term explained.
 */
export class TemplateNarrator implements Narrator {
  private readonly lastVariant = new Map<string, number>();

  constructor(private readonly random: () => number = Math.random) {}

  narrate({ events, explained }: NarrateInput): Narration {
    const hint = events.find((e) => e.kind.startsWith("hint_"));
    if (hint) return this.compose([describeEvent(hint)], explained);

    const lead = events.find((e) => e.kind === "move_played");
    const extras = events
      .filter((e) => e.kind !== "move_played")
      .map(describeEvent)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, COACH_CONFIG.maxExtraSentences);

    return this.compose([...(lead ? [describeEvent(lead)] : []), ...extras], explained);
  }

  private compose(parts: DescribedEvent[], explained: ReadonlySet<TermId>): Narration {
    const sentences: string[] = [];
    const explainedTerms: TermId[] = [];

    for (const part of parts) {
      sentences.push(fill(this.pick(part), part.vars));
      if (explainedTerms.length === 0) {
        const term = part.terms.find((t) => !explained.has(t));
        if (term) {
          sentences.push(TERMS[term]);
          explainedTerms.push(term);
        }
      }
    }
    return { text: sentences.join(" "), explainedTerms };
  }

  /** A random variant, but never the same one twice in a row for the same template. */
  private pick({ group, key }: DescribedEvent): string {
    const variants = TEMPLATES[group][key];
    if (!variants || variants.length === 0) {
      throw new Error(`No template for ${group}.${key}`);
    }
    const id = `${group}.${key}`;
    let index = Math.floor(this.random() * variants.length);
    if (variants.length > 1 && this.lastVariant.get(id) === index) {
      index = (index + 1) % variants.length;
    }
    this.lastVariant.set(id, index);
    return variants[index];
  }
}
