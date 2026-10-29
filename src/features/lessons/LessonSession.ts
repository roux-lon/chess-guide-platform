import type { Lesson, PromotionName } from "@/content";
import { ExerciseRunner } from "./ExerciseRunner";
import type { RunnerSnapshot } from "./ExerciseRunner";

export type LessonPhase = "intro" | "exercise" | "complete";
export type DotState = "done" | "current" | "todo";

export interface LessonSnapshot {
  lesson: Lesson;
  phase: LessonPhase;
  /** 0-based index of the current exercise. */
  index: number;
  total: number;
  /** One dot per exercise, for the progress bar. */
  dots: DotState[];
  /** The current exercise, while in the exercise phase. */
  runner?: RunnerSnapshot;
  /** True once the current exercise is solved and the player can move on. */
  canContinue: boolean;
  isLastExercise: boolean;
}

export interface LessonSessionOptions {
  lesson: Lesson;
  /** Called once when the player finishes the last exercise. Save progress here. */
  onComplete?: (lessonId: string) => void;
}

/**
 * Walks through one lesson: the explanation, then each exercise in turn, then completion.
 * Exercises are judged by ExerciseRunner; this class only does the sequencing. No React.
 */
export class LessonSession {
  private phase: LessonPhase = "intro";
  private index = 0;
  private runner?: ExerciseRunner;
  private stopListening?: () => void;
  private listeners = new Set<() => void>();
  private snapshot: LessonSnapshot;
  private readonly lesson: Lesson;
  private readonly onComplete?: (lessonId: string) => void;

  constructor({ lesson, onComplete }: LessonSessionOptions) {
    this.lesson = lesson;
    this.onComplete = onComplete;
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LessonSnapshot => this.snapshot;

  /** From the explanation to the first exercise. */
  start(): void {
    if (this.phase !== "intro") return;
    this.phase = "exercise";
    this.index = 0;
    this.loadRunner();
    this.emit();
  }

  /** After a solved exercise: the next one, or the completion screen after the last. */
  next(): void {
    if (this.phase !== "exercise" || this.runner?.getSnapshot().status !== "correct") return;
    if (this.index + 1 < this.lesson.exercises.length) {
      this.index++;
      this.loadRunner();
    } else {
      this.phase = "complete";
      this.dropRunner();
      this.onComplete?.(this.lesson.id);
    }
    this.emit();
  }

  /** Back to the explanation, to read it again or to replay the lesson. */
  restart(): void {
    this.phase = "intro";
    this.index = 0;
    this.dropRunner();
    this.emit();
  }

  // Forwarded to the current exercise.
  attempt = (from: string, to: string) => this.runner?.attempt(from, to);
  choosePromotion = (piece: PromotionName) => this.runner?.choosePromotion(piece);
  cancelPromotion = () => this.runner?.cancelPromotion();
  answer = (choice: number) => this.runner?.answer(choice);
  showHint = () => this.runner?.showHint();
  retry = () => this.runner?.retry();

  dispose(): void {
    this.dropRunner();
    this.listeners.clear();
  }

  // ---- internals ----

  private loadRunner(): void {
    this.dropRunner();
    const runner = new ExerciseRunner(this.lesson.exercises[this.index]);
    this.runner = runner;
    this.stopListening = runner.subscribe(() => this.emit());
  }

  private dropRunner(): void {
    this.stopListening?.();
    this.stopListening = undefined;
    this.runner = undefined;
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): LessonSnapshot {
    const total = this.lesson.exercises.length;
    const runner = this.runner?.getSnapshot();
    const dots: DotState[] = this.lesson.exercises.map((_, i) => {
      if (this.phase === "complete" || (this.phase === "exercise" && i < this.index)) return "done";
      if (this.phase === "exercise" && i === this.index) return "current";
      return "todo";
    });
    return {
      lesson: this.lesson,
      phase: this.phase,
      index: this.index,
      total,
      dots,
      runner,
      canContinue: runner?.status === "correct",
      isLastExercise: this.index === total - 1,
    };
  }
}
