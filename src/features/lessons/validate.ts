import { isBoardExercise } from "@/content";
import type { Arrow, Exercise, Highlight, Lesson } from "@/content";
import { createGame, pieceAt } from "@/rules";
import { findSolutions } from "./judge";

const SQUARE = /^[a-h][1-8]$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MIN_EXERCISES = 3;
export const MAX_EXERCISES = 6;

/** Is this a position the rules layer accepts? Returns a message if not. */
function fenProblem(fen: string): string | null {
  try {
    createGame(fen);
    return null;
  } catch {
    return `"${fen}" is not a legal position (both kings are needed, and the FEN must be valid)`;
  }
}

function shapeProblems(
  where: string,
  highlights: Highlight[] | undefined,
  arrows: Arrow[] | undefined,
): string[] {
  const problems: string[] = [];
  for (const h of highlights ?? []) {
    if (!SQUARE.test(h.square)) problems.push(`${where}: highlight on "${h.square}" is not a square`);
  }
  for (const a of arrows ?? []) {
    if (!SQUARE.test(a.from) || !SQUARE.test(a.to)) {
      problems.push(`${where}: arrow ${a.from}-${a.to} uses a square that does not exist`);
    }
  }
  return problems;
}

function exerciseProblems(exercise: Exercise): string[] {
  const where = `exercise "${exercise.id}"`;
  const problems: string[] = [];

  if (!KEBAB.test(exercise.id)) problems.push(`${where}: id must be kebab-case`);
  if (!exercise.prompt.trim()) problems.push(`${where}: prompt is empty`);
  if (!exercise.success.trim()) problems.push(`${where}: success message is empty`);
  if (!exercise.hint.trim()) problems.push(`${where}: hint is empty`);
  problems.push(...shapeProblems(where, exercise.highlights, exercise.arrows));

  if (!isBoardExercise(exercise)) {
    if (exercise.choices.length < 2) problems.push(`${where}: a quiz needs at least two choices`);
    if (!Number.isInteger(exercise.correct) || !exercise.choices[exercise.correct]) {
      problems.push(`${where}: correct answer index ${exercise.correct} is not one of the choices`);
    }
    if (exercise.choices.some((c) => !c.text.trim())) problems.push(`${where}: a choice is empty`);
    if (exercise.fen) {
      const fen = fenProblem(exercise.fen);
      if (fen) problems.push(`${where}: ${fen}`);
    }
    return problems;
  }

  const fen = fenProblem(exercise.fen);
  if (fen) return [...problems, `${where}: ${fen}`];

  const game = createGame(exercise.fen);
  // A lone piece against a king is a "dead draw" to the rules, which is fine for a lesson.
  // What matters is that the player has a move to make.
  if (game.legalMoves().length === 0) {
    problems.push(`${where}: the side to move has no legal moves (checkmate or stalemate at the start)`);
  }

  const mover = game.turn();
  switch (exercise.type) {
    case "moveToSquare": {
      if (!SQUARE.test(exercise.from) || !SQUARE.test(exercise.to)) {
        problems.push(`${where}: from/to must be squares`);
      } else if (pieceAt(exercise.fen, exercise.from)?.color !== mover) {
        problems.push(`${where}: there is no piece of the side to move on ${exercise.from}`);
      }
      break;
    }
    case "captureTarget": {
      const target = SQUARE.test(exercise.target) ? pieceAt(exercise.fen, exercise.target) : null;
      if (!target || target.color === mover) {
        problems.push(`${where}: there is no enemy piece on ${exercise.target} to capture`);
      }
      break;
    }
    case "safeSquare": {
      if (pieceAt(exercise.fen, exercise.from)?.color !== mover) {
        problems.push(`${where}: there is no piece of the side to move on ${exercise.from}`);
      }
      break;
    }
    case "escapeCheck": {
      if (!game.status().inCheck) problems.push(`${where}: the king is not in check`);
      break;
    }
    case "mateInOne":
      break;
  }

  if (problems.length === 0 && findSolutions(exercise).length === 0) {
    problems.push(`${where}: no legal move solves it, so it cannot be completed`);
  }
  return problems;
}

/**
 * Checks a whole curriculum and returns a list of problems (empty means it is fine).
 * A test runs this on the real lessons, so a bad FEN or an unsolvable exercise
 * fails the build instead of reaching a learner.
 */
export function validateCurriculum(lessons: readonly Lesson[]): string[] {
  const problems: string[] = [];
  const lessonIds = new Set<string>();
  const exerciseIds = new Set<string>();
  let lastStage = 0;

  for (const lesson of lessons) {
    const where = `lesson "${lesson.id}"`;

    if (!KEBAB.test(lesson.id)) problems.push(`${where}: id must be kebab-case`);
    if (lessonIds.has(lesson.id)) problems.push(`${where}: duplicate lesson id`);
    lessonIds.add(lesson.id);

    if (lesson.stage < lastStage) problems.push(`${where}: lessons must be in stage order`);
    lastStage = lesson.stage;

    if (!lesson.title.trim()) problems.push(`${where}: title is empty`);
    if (!lesson.summary.trim()) problems.push(`${where}: summary is empty`);
    if (lesson.body.length === 0) problems.push(`${where}: there is no explanation`);

    for (const block of lesson.body) {
      if (block.type === "diagram") {
        const fen = fenProblem(block.fen);
        if (fen) problems.push(`${where}: diagram ${fen}`);
        problems.push(...shapeProblems(`${where} diagram`, block.highlights, block.arrows));
      }
    }

    const count = lesson.exercises.length;
    if (count < MIN_EXERCISES || count > MAX_EXERCISES) {
      problems.push(`${where}: has ${count} exercises, expected ${MIN_EXERCISES} to ${MAX_EXERCISES}`);
    }

    for (const exercise of lesson.exercises) {
      if (exerciseIds.has(exercise.id)) problems.push(`exercise "${exercise.id}": duplicate id`);
      exerciseIds.add(exercise.id);
      problems.push(...exerciseProblems(exercise));
    }
  }
  return problems;
}
