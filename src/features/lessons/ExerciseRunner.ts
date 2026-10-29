import {
  GENERIC_HINT,
  ILLEGAL_FEEDBACK,
  PIECE_RULES,
  QUIZ_WRONG_FALLBACK,
  SHOW_ANSWER_TEXT,
  WRONG_FEEDBACK,
  isBoardExercise,
} from "@/content";
import type { Arrow, Exercise, Highlight, PieceName, PromotionName } from "@/content";
import { fillTemplate } from "@/lib/template";
import { sideToMove } from "@/lib/perspective";
import type { Side } from "@/lib/perspective";
import { createGame } from "@/rules";
import { findSolutions, judgeMove } from "./judge";
import type { Attempt, Verdict } from "./judge";

export type RunnerStatus = "ready" | "wrong" | "illegal" | "correct";

export interface ChoiceView {
  text: string;
  state: "idle" | "wrong" | "correct";
}

export interface RunnerSnapshot {
  exercise: Exercise;
  status: RunnerStatus;
  /** What to tell the player: why an attempt was wrong, or the success message. */
  feedback?: string;
  /** Board to show, for board exercises and quizzes that come with a picture. */
  fen?: string;
  turn?: Side;
  orientation?: Side;
  /** The side the player may move right now. Undefined when the board is locked. */
  movableColor?: Side;
  legalDests: Map<string, string[]>;
  highlights: Highlight[];
  arrows: Arrow[];
  lastMove?: { from: string; to: string };
  pendingPromotion?: { from: string; to: string };
  /** 0 = no hint yet, 1 = hint text, 2 = the answer is shown as an arrow. */
  hintLevel: 0 | 1 | 2;
  hintText?: string;
  canShowHint: boolean;
  attempts: number;
  /** Quiz answers, with which ones were tried. */
  choices?: ChoiceView[];
}

/**
 * Runs one exercise: takes attempts, judges them with the rules layer, explains wrong ones
 * gently, offers a two-step hint and lets the player try again. No React in here.
 */
export class ExerciseRunner {
  private status: RunnerStatus = "ready";
  private feedback?: string;
  private fen?: string;
  private lastMove?: { from: string; to: string };
  private pendingPromotion?: { from: string; to: string };
  private hintLevel: 0 | 1 | 2 = 0;
  private attempts = 0;
  private tried = new Map<number, "wrong" | "correct">();
  private solution?: Attempt;
  private listeners = new Set<() => void>();
  private snapshot: RunnerSnapshot;

  constructor(readonly exercise: Exercise) {
    this.fen = exercise.fen;
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RunnerSnapshot => this.snapshot;

  /** The player dropped a piece on a square. */
  attempt(from: string, to: string): void {
    if (this.status === "correct" || this.pendingPromotion) return;
    if (!isBoardExercise(this.exercise)) return;
    this.apply(judgeMove(this.exercise, { from, to }), { from, to });
  }

  choosePromotion(promotion: PromotionName): void {
    const pending = this.pendingPromotion;
    if (!pending || !isBoardExercise(this.exercise)) return;
    this.pendingPromotion = undefined;
    this.apply(judgeMove(this.exercise, { ...pending, promotion }), pending);
  }

  cancelPromotion(): void {
    this.pendingPromotion = undefined;
    this.emit();
  }

  /** The player picked a quiz answer. */
  answer(index: number): void {
    const exercise = this.exercise;
    if (exercise.type !== "quiz" || this.status === "correct") return;
    const choice = exercise.choices[index];
    if (!choice || this.tried.get(index) === "wrong") return;

    this.attempts++;
    if (index === exercise.correct) {
      this.tried.set(index, "correct");
      this.status = "correct";
      this.feedback = exercise.success;
    } else {
      this.tried.set(index, "wrong");
      this.status = "wrong";
      this.feedback = choice.feedback ?? QUIZ_WRONG_FALLBACK;
    }
    this.emit();
  }

  /** Clears the message after a wrong or illegal attempt so the player can go again. */
  retry(): void {
    if (this.status === "correct") return;
    this.status = "ready";
    this.feedback = undefined;
    this.pendingPromotion = undefined;
    this.emit();
  }

  /** First press: the hint text. Second press (board exercises): the answer as an arrow. */
  showHint(): void {
    if (this.status === "correct") return;
    const max = isBoardExercise(this.exercise) ? 2 : 1;
    if (this.hintLevel >= max) return;
    this.hintLevel = (this.hintLevel + 1) as 1 | 2;
    if (this.hintLevel === 2 && isBoardExercise(this.exercise)) {
      this.solution = findSolutions(this.exercise)[0];
    }
    this.emit();
  }

  // ---- internals ----

  private apply(verdict: Verdict, attempt: { from: string; to: string }): void {
    if (verdict.kind === "needs-promotion") {
      this.pendingPromotion = { from: attempt.from, to: attempt.to };
      return this.emit();
    }

    this.attempts++;
    if (verdict.kind === "correct") {
      this.status = "correct";
      this.fen = verdict.move.fenAfter;
      this.lastMove = { from: verdict.move.from, to: verdict.move.to };
      this.feedback = this.exercise.success;
    } else if (verdict.kind === "wrong") {
      this.status = "wrong";
      this.feedback = fillTemplate(WRONG_FEEDBACK[verdict.key], verdict.vars);
    } else {
      this.status = "illegal";
      const piece = verdict.vars.piece as PieceName;
      this.feedback = fillTemplate(ILLEGAL_FEEDBACK[verdict.reason], {
        ...verdict.vars,
        rule: PIECE_RULES[piece] ?? "",
      });
    }
    this.emit();
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private goalHighlights(): Highlight[] {
    const exercise = this.exercise;
    switch (exercise.type) {
      case "moveToSquare":
        return [{ square: exercise.to, kind: "good" }];
      case "captureTarget":
        return [{ square: exercise.target, kind: "warn" }];
      case "safeSquare":
        return [{ square: exercise.from, kind: "info" }];
      default:
        return [];
    }
  }

  private buildSnapshot(): RunnerSnapshot {
    const exercise = this.exercise;
    const fen = this.fen;
    const board = isBoardExercise(exercise);
    const playable = board && this.status !== "correct" && !this.pendingPromotion;
    const turn = fen ? sideToMove(fen) : undefined;

    const arrows: Arrow[] = [...(exercise.arrows ?? [])];
    if (this.hintLevel === 2 && this.solution) {
      arrows.push({ from: this.solution.from, to: this.solution.to, color: "green" });
    }

    const hintText =
      this.hintLevel === 0
        ? undefined
        : this.hintLevel === 1
          ? exercise.hint || GENERIC_HINT
          : `${exercise.hint || GENERIC_HINT} ${SHOW_ANSWER_TEXT}`;

    return {
      exercise,
      status: this.status,
      feedback: this.feedback,
      fen,
      turn,
      orientation: exercise.orientation ?? turn,
      movableColor: playable ? turn : undefined,
      legalDests: playable && fen ? createGame(fen).legalDests() : new Map(),
      highlights: [...(board ? this.goalHighlights() : []), ...(exercise.highlights ?? [])],
      arrows,
      lastMove: this.lastMove,
      pendingPromotion: this.pendingPromotion,
      hintLevel: this.hintLevel,
      hintText,
      canShowHint: this.status !== "correct" && this.hintLevel < (board ? 2 : 1),
      attempts: this.attempts,
      choices:
        exercise.type === "quiz"
          ? exercise.choices.map((choice, index) => ({
              text: choice.text,
              state: this.tried.get(index) ?? "idle",
            }))
          : undefined,
    };
  }
}
