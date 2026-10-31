import { PLAYBOOK } from "@/content";
import type { Goal } from "@/content";
import { createGame, isPieceSafe, pieceValue, unsafePieces, winningCaptures } from "@/rules";
import type { Color, MoveInfo, Square } from "@/rules";
import { cautionFor } from "./cautions";
import { evaluateCondition, realSquare } from "./conditions";
import type { GoalStatus, MoveNote, NextStep, OpeningView, Suggestion } from "./types";

/** How many moves the coach suggests at once. */
export const MAX_SUGGESTIONS = 2;

export function goalStatuses(fen: string, color: Color): GoalStatus[] {
  return PLAYBOOK.goals.map((goal) => ({
    id: goal.id,
    label: goal.label,
    done: evaluateCondition(goal.done, fen, color),
  }));
}

interface RawCandidate {
  from: Square;
  to: Square;
  reason: string;
}

/**
 * The candidates that can really be played here: legal, and safe. Safe means the moved piece is
 * not simply lost and the move does not leave any of my pieces to be won (judged by static
 * exchange, so a guarded piece is fine). Keeps the order given.
 */
export function safeSuggestions(fen: string, color: Color, candidates: readonly RawCandidate[]): Suggestion[] {
  const legal = createGame(fen).legalMoves();
  const result: Suggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = `${candidate.from}${candidate.to}`;
    if (seen.has(key)) continue;
    const move = legal.find((m) => m.from === candidate.from && m.to === candidate.to && m.color === color);
    if (!move) continue;
    if (!isPieceSafe(move.fenAfter, move.to) || unsafePieces(move.fenAfter, color).length > 0) continue;
    seen.add(key);
    result.push({ from: move.from, to: move.to, san: move.san, reason: candidate.reason });
  }
  return result;
}

function goalCandidates(goal: Goal, fen: string, color: Color): RawCandidate[] {
  return goal.candidates
    .filter((c) => !c.when || evaluateCondition(c.when, fen, color))
    .map((c) => ({ from: realSquare(c.from, color), to: realSquare(c.to, color), reason: c.reason }));
}

/** Black's very first move: a simple answer to White's first move. */
function blackFirstMove(fen: string, first: MoveInfo): NextStep {
  const center = PLAYBOOK.goals[0];
  const known = PLAYBOOK.blackReplies.find((r) => r.whiteMove.from === first.from && r.whiteMove.to === first.to);
  if (known) {
    const moves = safeSuggestions(fen, "black", [{ ...known.reply, reason: known.reason }]);
    if (moves.length > 0) return { kind: "goal", goalId: center.id, title: center.title, why: center.why, moves };
  }
  const own = PLAYBOOK.blackOwnWay;
  const reason = "It puts a pawn in or next to the middle.";
  const moves = safeSuggestions(
    fen,
    "black",
    own.candidates.map((c) => ({ ...c, reason })),
  ).slice(0, MAX_SUGGESTIONS);
  return { kind: "goal", goalId: center.id, title: center.title, why: `${own.text} ${center.why}`, moves };
}

/** What to do next in this position. Safety comes before the plan. */
export function nextStep(fen: string, color: Color, history: readonly MoveInfo[]): NextStep {
  const game = createGame(fen);
  if (game.turn() !== color || game.status().isGameOver) return { kind: "wait" };
  if (game.status().inCheck) return { kind: "check" };

  const danger = unsafePieces(fen, color);
  if (danger.length > 0) {
    return { kind: "safety", pieces: danger.map((d) => ({ type: d.piece.type, square: d.piece.square })) };
  }

  // Material to win comes before the plan, but only a piece (a knight or more). The capture
  // already nets points after the recaptures (static exchange), so it need not leave the
  // capturing piece "safe": a pawn that takes a knight and is taken back is still a win.
  for (const win of winningCaptures(fen)) {
    if (pieceValue(win.target.type) < pieceValue("knight")) continue;
    const move = game
      .legalMoves()
      .find((m) => m.from === win.attacker.square && m.to === win.target.square && (!m.promotion || m.promotion === "queen"));
    if (!move) continue;
    return {
      kind: "chance",
      target: { type: win.target.type, square: win.target.square },
      attacker: { type: win.attacker.type, square: win.attacker.square },
      move: {
        from: move.from,
        to: move.to,
        san: move.san,
        reason: "It wins material.",
        ...(move.promotion ? { promotion: "queen" as const } : {}),
      },
    };
  }

  if (color === "black" && history.length === 1) return blackFirstMove(fen, history[0]);

  const statuses = goalStatuses(fen, color);
  for (const goal of PLAYBOOK.goals) {
    if (statuses.find((s) => s.id === goal.id)?.done) continue;
    const moves = safeSuggestions(fen, color, goalCandidates(goal, fen, color)).slice(0, MAX_SUGGESTIONS);
    if (moves.length > 0) return { kind: "goal", goalId: goal.id, title: goal.title, why: goal.why, moves };
  }
  return { kind: "free", allDone: statuses.every((s) => s.done) };
}

/** What the person's last move did for the plan, or undefined if they have not moved yet. */
export function noteForLastMove(color: Color, history: readonly MoveInfo[]): MoveNote | undefined {
  let index = -1;
  history.forEach((m, i) => {
    if (m.color === color) index = i;
  });
  if (index < 0) return undefined;
  const move = history[index];

  const before = goalStatuses(move.fenBefore, color);
  const after = goalStatuses(move.fenAfter, color);
  const advanced = after.filter((a) => a.done && !before.find((b) => b.id === a.id)?.done);

  const firstUnmet = PLAYBOOK.goals.find((g) => !before.find((b) => b.id === g.id)?.done);
  const onPlan =
    advanced.length > 0 ||
    (firstUnmet !== undefined &&
      goalCandidates(firstUnmet, move.fenBefore, color).some((c) => c.from === move.from && c.to === move.to));

  return {
    san: move.san,
    advanced,
    onPlan,
    caution: cautionFor(move, history.slice(0, index), color),
  };
}

/** Everything the opening panel shows, from the position and the moves so far. Pure. */
export function openingView(fen: string, color: Color, history: readonly MoveInfo[]): OpeningView {
  const goals = goalStatuses(fen, color);
  const complete = goals.every((g) => g.done);
  const myMoves = history.filter((m) => m.color === color).length;
  return {
    color,
    goals,
    complete,
    myMoves,
    ended: complete || myMoves >= PLAYBOOK.maxMoves,
    step: nextStep(fen, color, history),
    lastMove: noteForLastMove(color, history),
  };
}
