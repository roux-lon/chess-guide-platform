"use client";

import type { RunnerSnapshot } from "@/features/lessons";
import type { PromotionName } from "@/content";
import { Board } from "./Board";
import { MoveInput } from "./MoveInput";
import { Inline } from "./RichText";
import { PromotionPicker } from "./PromotionPicker";

interface Props {
  runner: RunnerSnapshot;
  onMove: (from: string, to: string) => void;
  onAnswer: (choice: number) => void;
  onChoosePromotion: (piece: PromotionName) => void;
  onCancelPromotion: () => void;
}

const CHOICE_STYLE = {
  idle: "bg-surface text-ink hover:bg-brand hover:text-white",
  wrong: "bg-danger/15 text-ink/70 line-through",
  correct: "bg-good/30 text-ink ring-2 ring-good",
} as const;

/** The board or quiz for one exercise. It draws what the runner says and reports what the player does. */
export function ExerciseView({ runner, onMove, onAnswer, onChoosePromotion, onCancelPromotion }: Props) {
  const { exercise } = runner;
  const solved = runner.status === "correct";

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold">
        <Inline text={exercise.prompt} />
      </p>

      {runner.fen && runner.turn && (
        <div className="relative mx-auto w-full max-w-md">
          <Board
            fen={runner.fen}
            turn={runner.turn}
            orientation={runner.orientation}
            movableColor={runner.movableColor}
            legalDests={runner.legalDests}
            highlights={runner.highlights}
            arrows={runner.arrows}
            lastMove={runner.lastMove}
            freeMoves
            onMove={onMove}
          />
          {runner.pendingPromotion && (
            <PromotionPicker onChoose={onChoosePromotion} onCancel={onCancelPromotion} />
          )}
        </div>
      )}
      {runner.fen && runner.movableColor && <MoveInput onMove={onMove} />}

      {runner.choices && (
        <ul className="space-y-2" aria-label="Answers">
          {runner.choices.map((choice, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => onAnswer(index)}
                disabled={solved || choice.state === "wrong"}
                className={`w-full rounded-[var(--radius-button)] px-4 py-3 text-left text-lg font-semibold shadow transition ${CHOICE_STYLE[choice.state]}`}
              >
                {choice.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
