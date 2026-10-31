import { GYM_TEXT } from "@/content";
import type { Arrow, Drill, Highlight, PlanId } from "@/content";
import { sideToMove } from "@/lib/perspective";
import type { Side } from "@/lib/perspective";
import { allPieces, createGame } from "@/rules";
import type { AnswerCounts } from "@/storage";
import { similarDrill } from "./buildSession";
import type { GymAnswer } from "./accuracy";
import { doubleAttackMoves, moveSafety, planFor, threatenedSquares } from "./solve";

export type GymPhase = "question" | "answered" | "summary";

export interface GymVerdict {
  correct: boolean;
  headline: string;
  /** What exactly was right or wrong. */
  detail: string;
  /** Why, in beginner words (from the drill). */
  explanation: string;
}

export interface GymChoice {
  label: string;
  state: "idle" | "right" | "wrong";
}

export interface SummaryRow {
  type: string;
  counts: AnswerCounts;
}

export interface GymSnapshot {
  phase: GymPhase;
  /** 1-based number of the current drill. */
  number: number;
  total: number;
  drill?: Drill;
  prompt?: string;
  /** Said when a dropped piece was not a real move; the player can try again. */
  notice?: string;
  fen?: string;
  turn?: Side;
  orientation?: Side;
  /** The side the player may move (only for "find the double attack", and only while asking). */
  movableColor?: Side;
  legalDests: Map<string, string[]>;
  highlights: Highlight[];
  arrows: Arrow[];
  /** "Spot the threat": the squares picked so far. */
  selected: string[];
  /** Buttons for the choice types. Undefined for the other types. */
  choices?: GymChoice[];
  verdict?: GymVerdict;
  /** After a wrong answer: is there another drill of the same kind to try? */
  canSimilar: boolean;
  answers: GymAnswer[];
  summary?: { correct: number; total: number; perType: SummaryRow[] };
}

export interface GymSessionOptions {
  drills: readonly Drill[];
  /** Where "try a similar one" looks. */
  pool?: readonly Drill[];
  random?: () => number;
  /** Called once, with all the answers, when the session reaches its summary. */
  onFinish?: (answers: readonly GymAnswer[]) => void;
}

/**
 * One gym session: a few drills, one after the other. Every answer is worked out by the rules
 * layer (solve.ts) at the moment it is given, never read from the drill, so the verdict is true
 * even if a drill's data were wrong (a test makes sure it is not). No React in here.
 */
export class GymSession {
  private drills: Drill[];
  private index = 0;
  private phase: GymPhase;
  private selected: string[] = [];
  private picked?: number;
  private verdict?: GymVerdict;
  private notice?: string;
  private arrowsAfter: Arrow[] = [];
  private highlightsAfter: Highlight[] = [];
  private answers: GymAnswer[] = [];
  private finished = false;
  private listeners = new Set<() => void>();
  private snapshot: GymSnapshot;

  constructor(private readonly options: GymSessionOptions) {
    this.drills = [...options.drills];
    this.phase = this.drills.length === 0 ? "summary" : "question";
    this.snapshot = this.build();
    if (this.phase === "summary") this.finish();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): GymSnapshot => this.snapshot;

  // ---- answers ----

  /** "Spot the threat": pick or un-pick one of your pieces. */
  toggleSquare(square: string): void {
    const drill = this.drill();
    if (drill?.type !== "spotThreat" || this.phase !== "question") return;
    const mover = sideToMove(drill.fen);
    const piece = allPieces(drill.fen).find((p) => p.square === square);
    if (!piece || piece.color !== mover || piece.type === "king") return;
    this.selected = this.selected.includes(square)
      ? this.selected.filter((s) => s !== square)
      : [...this.selected, square];
    this.emit();
  }

  /** "Spot the threat": judge the pieces picked (none picked means "nothing is in danger"). */
  submitThreat(): void {
    const drill = this.drill();
    if (drill?.type !== "spotThreat" || this.phase !== "question") return;
    const actual = threatenedSquares(drill.fen);
    const missed = actual.filter((s) => !this.selected.includes(s));
    const extra = this.selected.filter((s) => !actual.includes(s));
    this.highlightsAfter = [
      ...actual.map((square) => ({ square, kind: "danger" as const })),
      ...extra.map((square) => ({ square, kind: "warn" as const })),
    ];
    this.settle(drill, missed.length === 0 && extra.length === 0, GYM_TEXT.detail.spotThreat(missed, extra));
  }

  /** "Is it safe?": the player says yes or no. */
  answerSafe(saidSafe: boolean): void {
    const drill = this.drill();
    if (drill?.type !== "isItSafe" || this.phase !== "question") return;
    const verdict = moveSafety(drill.fen, drill.move.from, drill.move.to);
    if (verdict.lost) this.highlightsAfter = [{ square: verdict.lost, kind: "danger" }];
    this.settle(drill, saidSafe === verdict.safe, GYM_TEXT.detail.isItSafe(verdict.safe));
  }

  /** "Pick the best move": choose one of the three. */
  pick(index: number): void {
    const drill = this.drill();
    if (drill?.type !== "pickOfThree" || this.phase !== "question") return;
    const choice = drill.choices[index];
    if (!choice) return;
    const verdicts = drill.choices.map((c) => moveSafety(drill.fen, c.from, c.to));
    const best = verdicts.findIndex((v) => v.safe);
    this.picked = index;
    this.arrowsAfter = drill.choices.map((c, i) => ({
      from: c.from,
      to: c.to,
      color: i === best ? ("green" as const) : ("red" as const),
    }));
    const bestSan = this.sanOf(drill.fen, drill.choices[best]);
    this.settle(drill, verdicts[index].safe, `${choice.feedback} ${GYM_TEXT.detail.pickOfThree(bestSan)}`);
  }

  /** "What's the plan?": choose a plan. */
  choosePlan(plan: PlanId): void {
    const drill = this.drill();
    if (drill?.type !== "whatsThePlan" || this.phase !== "question") return;
    const right = planFor(drill.fen);
    this.picked = drill.choices.indexOf(plan);
    this.settle(drill, plan === right, right ? GYM_TEXT.detail.whatsThePlan(GYM_TEXT.planLabel[right]) : "");
  }

  /** "Find the double attack": the player moved a piece on the board. */
  attemptMove(from: string, to: string): void {
    const drill = this.drill();
    if (drill?.type !== "spotDoubleAttack" || this.phase !== "question") return;
    const legal = createGame(drill.fen)
      .legalMoves()
      .some((m) => m.from === from && m.to === to);
    if (!legal) {
      // Not a real move: say so and let the player try again. This is not counted.
      this.notice = GYM_TEXT.verdict.illegalMove;
      this.emit();
      return;
    }
    const forks = doubleAttackMoves(drill.fen);
    const right = forks.some((m) => m.from === from && m.to === to);
    const show = forks[0] ?? { from, to };
    this.arrowsAfter = right
      ? [{ from, to, color: "green" }]
      : [
          { from, to, color: "red" },
          { from: show.from, to: show.to, color: "green" },
        ];
    this.settle(drill, right, right ? "" : GYM_TEXT.verdict.wrongMove);
  }

  // ---- moving on ----

  /** After an answer: the next drill, or the summary after the last one. */
  next(): void {
    if (this.phase !== "answered") return;
    if (this.index + 1 >= this.drills.length) {
      this.phase = "summary";
      this.finish();
    } else {
      this.index++;
      this.reset();
    }
    this.emit();
  }

  /** After a wrong answer: put another drill of the same kind next. */
  similar(): void {
    const drill = this.drill();
    if (!drill || this.phase !== "answered" || !this.verdict || this.verdict.correct) return;
    const inSession = new Set(this.drills.map((d) => d.id));
    const another = similarDrill(drill, this.options.pool ?? this.drills, inSession, this.options.random);
    if (!another) return;
    this.drills.splice(this.index + 1, 0, another);
    this.next();
  }

  // ---- internals ----

  private drill(): Drill | undefined {
    return this.drills[this.index];
  }

  private sanOf(fen: string, move: { from: string; to: string }): string {
    return (
      createGame(fen)
        .legalMoves()
        .find((m) => m.from === move.from && m.to === move.to)?.san ?? `${move.from}${move.to}`
    );
  }

  private settle(drill: Drill, correct: boolean, detail: string): void {
    this.phase = "answered";
    this.notice = undefined;
    this.verdict = {
      correct,
      headline: correct ? GYM_TEXT.verdict.right : GYM_TEXT.verdict.wrong,
      detail: correct && drill.type !== "spotDoubleAttack" ? "" : detail,
      explanation: drill.explanation,
    };
    this.answers = [...this.answers, { drillId: drill.id, type: drill.type, correct }];
    this.emit();
  }

  private reset(): void {
    this.phase = "question";
    this.selected = [];
    this.picked = undefined;
    this.verdict = undefined;
    this.notice = undefined;
    this.arrowsAfter = [];
    this.highlightsAfter = [];
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.options.onFinish?.(this.answers);
  }

  private emit(): void {
    this.snapshot = this.build();
    this.listeners.forEach((l) => l());
  }

  private build(): GymSnapshot {
    const total = this.drills.length;
    const drill = this.phase === "summary" ? undefined : this.drill();
    const base = {
      phase: this.phase,
      number: Math.min(this.index + 1, total),
      total,
      legalDests: new Map<string, string[]>(),
      highlights: [] as Highlight[],
      arrows: [] as Arrow[],
      selected: this.selected,
      canSimilar: false,
      answers: this.answers,
    };

    if (this.phase === "summary" || !drill) {
      const rows = new Map<string, AnswerCounts>();
      for (const a of this.answers) {
        const known = rows.get(a.type) ?? { asked: 0, correct: 0 };
        rows.set(a.type, { asked: known.asked + 1, correct: known.correct + (a.correct ? 1 : 0) });
      }
      return {
        ...base,
        phase: "summary",
        summary: {
          correct: this.answers.filter((a) => a.correct).length,
          total: this.answers.length,
          perType: [...rows].map(([type, counts]) => ({ type, counts })),
        },
      };
    }

    const turn = sideToMove(drill.fen);
    const asking = this.phase === "question";
    const highlights: Highlight[] = asking
      ? this.selected.map((square) => ({ square, kind: "info" as const }))
      : this.highlightsAfter;

    let arrows: Arrow[] = [];
    if (drill.type === "isItSafe") arrows = [{ from: drill.move.from, to: drill.move.to, color: "yellow" }];
    if (drill.type === "pickOfThree") {
      arrows = asking
        ? drill.choices.map((c) => ({ from: c.from, to: c.to, color: "blue" as const }))
        : this.arrowsAfter;
    }
    if (drill.type === "spotDoubleAttack" && !asking) arrows = this.arrowsAfter;

    let choices: GymChoice[] | undefined;
    if (drill.type === "pickOfThree") {
      const best = drill.choices.findIndex((c) => moveSafety(drill.fen, c.from, c.to).safe);
      choices = drill.choices.map((c, i) => ({
        label: this.sanOf(drill.fen, c),
        state: asking ? "idle" : i === best ? "right" : i === this.picked ? "wrong" : "idle",
      }));
    }
    if (drill.type === "whatsThePlan") {
      const right = planFor(drill.fen);
      choices = drill.choices.map((plan, i) => ({
        label: GYM_TEXT.planLabel[plan],
        state: asking ? "idle" : plan === right ? "right" : i === this.picked ? "wrong" : "idle",
      }));
    }

    const prompt =
      drill.type === "isItSafe"
        ? GYM_TEXT.prompt.isItSafe(this.sanOf(drill.fen, drill.move))
        : GYM_TEXT.prompt[drill.type];

    const inSession = new Set(this.drills.map((d) => d.id));
    return {
      ...base,
      drill,
      prompt,
      notice: this.notice,
      fen: drill.fen,
      turn,
      orientation: drill.orientation ?? turn,
      movableColor: drill.type === "spotDoubleAttack" && asking ? turn : undefined,
      legalDests: drill.type === "spotDoubleAttack" && asking ? createGame(drill.fen).legalDests() : new Map(),
      highlights,
      arrows,
      choices,
      verdict: this.verdict,
      canSimilar:
        this.phase === "answered" &&
        this.verdict?.correct === false &&
        similarDrill(drill, this.options.pool ?? this.drills, inSession, () => 0) !== undefined,
    };
  }
}
