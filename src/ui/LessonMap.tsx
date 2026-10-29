"use client";

import Link from "next/link";
import { LESSONS, STAGES, lessonStates, lessonsInStage, nextLessonId, progressOf } from "@/features/lessons";
import { waitingForPerson } from "@/features/progress";
import type { LessonState } from "@/features/lessons";
import { useProgress } from "./useProgress";

const BADGE: Record<LessonState, { label: string; style: string }> = {
  done: { label: "Done", style: "bg-good/30 text-ink" },
  unlocked: { label: "Ready", style: "bg-brand text-white" },
  locked: { label: "Locked", style: "bg-ink/10 text-ink/70" },
};

export function LessonMap() {
  const { snapshot } = useProgress();

  if (!snapshot.ready) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p role="status" className="text-lg text-ink/70">
          {waitingForPerson(snapshot)
            ? "Connect your diary using the box above, and your lessons will appear."
            : "Loading your lessons..."}
        </p>
      </main>
    );
  }

  const isDone = (id: string) => snapshot.diary.lessons[id]?.status === "done";
  const states = lessonStates(LESSONS, isDone);
  const next = nextLessonId(LESSONS, isDone);
  const { done, total } = progressOf(LESSONS, isDone);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand">Learn chess</h1>
        <p className="text-lg">
          Short lessons, one step at a time. Finish a lesson to open the next one.
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Lessons finished"
          className="h-4 overflow-hidden rounded-full bg-ink/10"
        >
          <div className="h-full bg-good transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <p className="text-sm font-semibold text-ink/70">
          {done} of {total} lessons finished
        </p>
        {snapshot.saveError && (
          <p role="alert" className="rounded-[var(--radius-card)] bg-warn/25 p-3 text-sm">
            {snapshot.saveError}
          </p>
        )}
        {next ? (
          <Link
            href={`/learn/${next}`}
            className="inline-block rounded-[var(--radius-button)] bg-brand px-5 py-3 text-lg font-bold text-white shadow transition hover:bg-brand-dark"
          >
            {done === 0 ? "Start with lesson 1" : "Continue where you left off"}
          </Link>
        ) : (
          <p className="text-lg font-bold text-good-dark">You finished every lesson. Now go and play the bot!</p>
        )}
      </header>

      {STAGES.map(({ stage, title, blurb }) => (
        <section key={stage} aria-label={title} className="space-y-3">
          <div>
            <h2 className="text-2xl font-extrabold">{title}</h2>
            <p className="text-ink/70">{blurb}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {lessonsInStage(stage).map((lesson) => {
              const state = states.get(lesson.id) ?? "locked";
              const badge = BADGE[state];
              const content = (
                <>
                  <span className="text-3xl" aria-hidden="true">
                    {lesson.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-bold">{lesson.title}</span>
                    <span className="block text-sm text-ink/70">{lesson.summary}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.style}`}>
                    {badge.label}
                  </span>
                </>
              );
              return (
                <li key={lesson.id}>
                  {state === "locked" ? (
                    <div
                      aria-disabled="true"
                      className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface/60 p-4 opacity-70 shadow"
                    >
                      {content}
                    </div>
                  ) : (
                    <Link
                      href={`/learn/${lesson.id}`}
                      className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow transition hover:ring-2 hover:ring-brand"
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
