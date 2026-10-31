import type { Condition, Playbook } from "@/content";
import { createGame } from "@/rules";

const SQUARE = /^[a-h][1-8]$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAUTION_RULES = ["same-piece-twice", "early-queen", "edge-pawn", "early-f-pawn"];

function conditionProblems(where: string, condition: Condition): string[] {
  switch (condition.type) {
    case "pawnOn":
    case "pieceOn":
    case "squareEmpty": {
      const bad = condition.squares.filter((s) => !SQUARE.test(s));
      const problems = bad.map((s) => `${where}: "${s}" is not a square`);
      if (condition.squares.length === 0) problems.push(`${where}: needs at least one square`);
      return problems;
    }
    case "all":
    case "any":
      return [
        ...(condition.of.length === 0 ? [`${where}: "${condition.type}" needs at least one condition`] : []),
        ...condition.of.flatMap((c) => conditionProblems(where, c)),
      ];
    default:
      return [];
  }
}

/** Everything wrong with a playbook, as readable messages. Empty when it is fine. */
export function playbookProblems(playbook: Playbook): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  if (playbook.goals.length === 0) problems.push("The playbook has no goals");
  if (!Number.isInteger(playbook.maxMoves) || playbook.maxMoves < 1) problems.push("maxMoves must be a whole number");

  for (const goal of playbook.goals) {
    const where = `goal "${goal.id}"`;
    if (!KEBAB.test(goal.id)) problems.push(`${where}: id must be kebab-case`);
    if (ids.has(goal.id)) problems.push(`${where}: duplicate id`);
    ids.add(goal.id);
    for (const field of ["label", "title", "why", "doneText"] as const) {
      if (!goal[field].trim()) problems.push(`${where}: ${field} is empty`);
    }
    if (goal.candidates.length === 0) problems.push(`${where}: needs at least one candidate move`);
    problems.push(...conditionProblems(`${where} done`, goal.done));
    for (const c of goal.candidates) {
      const move = `${where} candidate ${c.from}-${c.to}`;
      if (!SQUARE.test(c.from) || !SQUARE.test(c.to)) problems.push(`${move}: not a square`);
      if (!c.reason.trim()) problems.push(`${move}: reason is empty`);
      if (c.when) problems.push(...conditionProblems(move, c.when));
    }
  }

  const cautionIds = new Set<string>();
  for (const caution of playbook.cautions) {
    if (cautionIds.has(caution.id)) problems.push(`caution "${caution.id}": duplicate id`);
    cautionIds.add(caution.id);
    if (!CAUTION_RULES.includes(caution.rule)) problems.push(`caution "${caution.id}": unknown rule`);
    if (!caution.text.trim() || !caution.title.trim()) problems.push(`caution "${caution.id}": needs a title and text`);
  }

  // Black's answers must be real moves: White's first move from the start, then the reply.
  for (const r of playbook.blackReplies) {
    const game = createGame();
    if (!game.tryMove(r.whiteMove.from, r.whiteMove.to)) {
      problems.push(`black reply: White's ${r.whiteMove.from}-${r.whiteMove.to} is not legal at the start`);
    } else if (!game.tryMove(r.reply.from, r.reply.to)) {
      problems.push(`black reply: ${r.reply.from}-${r.reply.to} is not legal after ${r.whiteMove.from}-${r.whiteMove.to}`);
    }
  }
  for (const c of playbook.blackOwnWay.candidates) {
    if (!SQUARE.test(c.from) || !SQUARE.test(c.to)) problems.push(`black own way: ${c.from}-${c.to} is not a square`);
  }
  return problems;
}
