"use client";

import { THINK_FIRST_TEXT } from "@/content";
import type { ThinkingView } from "@/features/play";

const optionClass = {
  idle: "bg-page text-ink hover:bg-brand hover:text-white",
  right: "bg-good/30 text-ink",
  wrong: "bg-danger/20 text-ink",
} as const;

export interface ThinkFirstCardProps {
  thinking: ThinkingView;
  onAnswer(index: number): void;
  onSkip(): void;
}

/**
 * One quick question before the player's move. It sits beside the board and never blocks it:
 * the player can answer, skip, or simply move.
 */
export function ThinkFirstCard({ thinking, onAnswer, onSkip }: ThinkFirstCardProps) {
  const answered = thinking.verdict !== undefined;
  return (
    <section
      aria-label={THINK_FIRST_TEXT.cardTitle}
      className="space-y-3 rounded-[var(--radius-card)] bg-info/15 p-4 shadow"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-ink/70">
        {THINK_FIRST_TEXT.cardTitle} · {thinking.trains}
      </p>
      <p className="text-lg font-bold">{thinking.prompt}</p>
      <div className="flex flex-col gap-2">
        {thinking.options.map((option, index) => (
          <button
            key={`${index}-${option.label}`}
            type="button"
            disabled={answered}
            onClick={() => onAnswer(index)}
            className={`rounded-[var(--radius-button)] px-4 py-2 text-left font-bold shadow transition disabled:cursor-default ${optionClass[option.state]}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {thinking.verdict && (
        <p role="status" className="text-sm">
          <span className="font-bold">{thinking.verdict.headline} </span>
          {thinking.verdict.reason}
        </p>
      )}
      <button
        type="button"
        onClick={onSkip}
        className="rounded-[var(--radius-button)] bg-surface px-3 py-1 text-sm font-bold shadow hover:bg-brand hover:text-white"
      >
        {answered ? THINK_FIRST_TEXT.gotIt : THINK_FIRST_TEXT.skip}
      </button>
      {!answered && <p className="text-xs text-ink/70">{THINK_FIRST_TEXT.skipHint}</p>}
    </section>
  );
}
