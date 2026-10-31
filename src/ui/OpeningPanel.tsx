"use client";

import { OPENING_TEXT, PLAYBOOK } from "@/content";
import type { OpeningView } from "@/features/opening";

const button =
  "rounded-[var(--radius-button)] px-4 py-2 font-bold shadow transition disabled:opacity-40";

interface Props {
  view: OpeningView;
  onContinue(): void;
  onLeave(): void;
}

/** The opening checklist, the next step and a word about the last move. It only draws what OpeningView says. */
export function OpeningPanel({ view, onContinue, onLeave }: Props) {
  const T = OPENING_TEXT;
  const doneCount = view.goals.filter((g) => g.done).length;
  const { step, lastMove } = view;

  const ticked = lastMove?.advanced ?? [];
  const tickedText = ticked
    .map((g) => PLAYBOOK.goals.find((goal) => goal.id === g.id)?.doneText ?? "")
    .join(" ");

  return (
    <section aria-label={T.checklistTitle} className="space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/70">{T.checklistTitle}</h2>
        <span className="text-sm font-semibold text-ink/70">{T.progress(doneCount, view.goals.length)}</span>
      </div>

      <ul className="space-y-1">
        {view.goals.map((goal) => (
          <li key={goal.id} className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                goal.done ? "bg-good text-white" : "bg-page text-ink/60 ring-2 ring-ink/20"
              }`}
            >
              {goal.done ? "✓" : ""}
            </span>
            <span className={goal.done ? "text-ink" : "text-ink/80"}>{goal.label}</span>
            <span className="sr-only">{goal.done ? T.goalDone : T.goalTodo}</span>
          </li>
        ))}
      </ul>

      {lastMove && (
        <div aria-live="polite" className="space-y-1 rounded-[var(--radius-button)] bg-brand/10 p-3 text-sm">
          {ticked.length > 0 ? (
            <p className="font-bold">
              {T.lastMove.advanced(
                ticked.map((g) => g.label),
                tickedText,
              )}
            </p>
          ) : lastMove.onPlan ? (
            <p className="font-bold">{T.lastMove.onPlan(lastMove.san)}</p>
          ) : (
            <p className="font-bold">{T.lastMove.offPlan(lastMove.san)}</p>
          )}
          {lastMove.caution && (
            <p>
              <span className="font-bold">{lastMove.caution.title}. </span>
              {lastMove.caution.text}
            </p>
          )}
        </div>
      )}

      {view.ended ? (
        <div className="space-y-3 rounded-[var(--radius-button)] bg-good/20 p-3">
          <p className="text-lg font-extrabold">{view.complete ? T.ended.completeTitle : T.ended.timeUpTitle}</p>
          <p className="text-sm">
            {view.complete ? T.ended.complete(view.myMoves) : T.ended.timeUp(doneCount, view.goals.length)}
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onContinue} className={`${button} bg-brand text-white hover:bg-brand-dark`}>
              {T.ended.keepPlaying}
            </button>
            <p className="text-xs text-ink/70">{T.ended.keepPlayingNote}</p>
            <button type="button" onClick={onLeave} className={`${button} bg-page text-ink hover:bg-brand hover:text-white`}>
              {T.ended.backToMenu}
            </button>
          </div>
        </div>
      ) : (
        <div aria-live="polite" className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink/70">{T.nextStepTitle}</h3>
          {step.kind === "wait" && <p>{T.step.wait}</p>}
          {step.kind === "check" && <p className="font-semibold">{T.step.check}</p>}
          {step.kind === "safety" && <p className="font-semibold">{T.step.safety(step.pieces)}</p>}
          {step.kind === "chance" && (
            <p className="font-semibold">
              {T.step.chance(step.attacker.type, step.attacker.square, step.target.type, step.target.square, step.move.san)}
            </p>
          )}
          {step.kind === "goal" && (
            <>
              <p className="text-lg font-extrabold">{step.title}</p>
              <p className="text-sm">{step.why}</p>
              <ul className="space-y-1 text-sm">
                {step.moves.map((m) => (
                  <li key={m.san}>{T.step.tryMove(m.san, m.reason)}</li>
                ))}
              </ul>
              <p className="text-xs text-ink/70">{T.reminder}</p>
            </>
          )}
          {step.kind === "free" && <p>{step.allDone ? T.step.freeDone : T.step.freeNoMove}</p>}
          <p className="text-xs text-ink/70">{T.movesLeft(Math.max(0, PLAYBOOK.maxMoves - view.myMoves))}</p>
        </div>
      )}
    </section>
  );
}
