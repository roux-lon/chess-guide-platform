import {
  COMMENT_EVENT_PRINCIPLE,
  FOLLOWED_EVENT_PRINCIPLE,
  MISTAKE_PRINCIPLE,
  PLAN_PRINCIPLE,
  PRINCIPLES,
  QUESTION_PRINCIPLE,
  isPrincipleId,
} from "@/content";
import type { Drill, Principle, PrincipleId } from "@/content";
import type { CoachEvent } from "@/coach";
import { planFor } from "@/features/gym/solve";
import type { AnswerCounts, Diary } from "@/storage";

/** The principle a mistake type breaks, if it maps to one. */
export function principleOfMistake(type: string): PrincipleId | undefined {
  return MISTAKE_PRINCIPLE[type];
}

/** The principle a saved coach-log event label shows (for the chip on an old comment). */
export function principleOfEventLabel(label: string): PrincipleId | undefined {
  return COMMENT_EVENT_PRINCIPLE[label];
}

/**
 * The label kept in the diary for a move's events, with the purpose added when that is all there
 * is to say ("move_purpose:develop"), so developing and castling can be counted later.
 */
export function eventLabel(kind: string, events: readonly CoachEvent[]): string {
  if (kind !== "move_purpose") return kind;
  const purpose = events.find((e) => e.kind === "move_purpose");
  return purpose && purpose.kind === "move_purpose" ? `move_purpose:${purpose.purpose}` : kind;
}

/** The principle a live comment is about: the first of its events that has one. */
export function principleOfEvents(events: readonly CoachEvent[]): PrincipleId | undefined {
  for (const event of events) {
    const label = eventLabel(event.kind, [event]);
    const id = COMMENT_EVENT_PRINCIPLE[label] ?? COMMENT_EVENT_PRINCIPLE[event.kind];
    if (id) return id;
  }
  return undefined;
}

/** The principle a drill trains: its own tag if it has a valid one, else by kind (and plan). */
export function principleOfDrill(drill: Drill): PrincipleId {
  if (drill.principleId && isPrincipleId(drill.principleId)) return drill.principleId;
  if (drill.type === "whatsThePlan") return PLAN_PRINCIPLE[drill.plan];
  return QUESTION_PRINCIPLE[drill.type];
}

/** The principle a plan follows. */
export function principleOfPlan(plan: keyof typeof PLAN_PRINCIPLE): PrincipleId {
  return PLAN_PRINCIPLE[plan];
}

/** The principle a think-first question trains, given the position (the plan depends on it). */
export function principleOfQuestion(type: "dangerPiece" | "safestMove" | "bestPlan", fen: string): PrincipleId | undefined {
  if (type !== "bestPlan") return QUESTION_PRINCIPLE[type];
  const plan = planFor(fen);
  return plan ? PLAN_PRINCIPLE[plan] : undefined;
}

export interface PrincipleRow {
  principle: Principle;
  /** Times a move of mine showed it, from the tagged events of my saved games. */
  followed: number;
  /** Times a mistake of mine broke it. */
  broken: number;
  /** Think-first questions about it. */
  quiz?: AnswerCounts;
}

/** One row per principle: how often I followed it and how often it slipped. Pure. */
export function principleRows(diary: Pick<Diary, "games" | "thinking">): PrincipleRow[] {
  const followed = new Map<string, number>();
  const broken = new Map<string, number>();
  const add = (map: Map<string, number>, id: string | undefined) => {
    if (id) map.set(id, (map.get(id) ?? 0) + 1);
  };

  for (const game of diary.games) {
    for (const entry of game.coachLog) {
      const mine = (entry.ply % 2 === 1) === (game.playerColor === "white");
      if (mine) add(followed, FOLLOWED_EVENT_PRINCIPLE[entry.event]);
    }
    for (const mistake of game.mistakes) {
      const mine = (mistake.ply % 2 === 1) === (game.playerColor === "white");
      if (mine) add(broken, principleOfMistake(mistake.type));
    }
  }

  return PRINCIPLES.map((principle) => ({
    principle,
    followed: followed.get(principle.id) ?? 0,
    broken: broken.get(principle.id) ?? 0,
    quiz: diary.thinking.byPrinciple[principle.id],
  }));
}

/** My mistakes in one game, grouped by the principle they broke (most first). */
export function brokenInGame(mistakes: readonly { type: string }[]): { principle: Principle; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of mistakes) {
    const id = principleOfMistake(m.type);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return PRINCIPLES.flatMap((principle) => {
    const count = counts.get(principle.id) ?? 0;
    return count > 0 ? [{ principle, count }] : [];
  }).sort((a, b) => b.count - a.count);
}

/** The first gym drill that trains a principle, or undefined. */
export function drillsForPrinciple(drills: readonly Drill[], id: string): Drill[] {
  return drills.filter((d) => principleOfDrill(d) === id);
}
