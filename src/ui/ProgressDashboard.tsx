"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RESULT_TEXT } from "@/content";
import { buildDashboard } from "@/features/games";
import type { Dashboard } from "@/features/games";
import { LESSONS } from "@/features/lessons";
import { waitingForPerson } from "@/features/progress";
import { MilestoneCard } from "./MilestoneCard";
import { useProgress } from "./useProgress";

const RESULT_BAR = {
  win: "bg-good",
  loss: "bg-danger",
  draw: "bg-info",
} as const;

const button = "rounded-[var(--radius-button)] px-5 py-3 font-bold shadow transition";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;

const card = "space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow";

/** What the diary says about you, drawn with plain bars. It only displays numbers it is given. */
export function DashboardView({
  dashboard,
  onUseLevel,
}: {
  dashboard: Dashboard;
  onUseLevel?: (level: number) => void;
}) {
  const { lessons, games, mistakes, lessonSuggestion, levelSuggestion, milestone } = dashboard;
  const trendMax = Math.max(1, ...mistakes.recentGames.map((g) => g.count));

  return (
    <div className="space-y-6">
      <MilestoneCard milestone={milestone} />

      <section aria-label="Lessons and games" className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-extrabold">Lessons</h2>
          <p className="text-3xl font-extrabold text-brand">
            {lessons.done} <span className="text-lg font-bold text-ink/70">of {lessons.total}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Lessons finished"
            aria-valuemin={0}
            aria-valuemax={lessons.total}
            aria-valuenow={lessons.done}
            className="h-3 overflow-hidden rounded-full bg-ink/10"
          >
            <div className="h-full bg-good" style={{ width: `${lessons.total ? (lessons.done / lessons.total) * 100 : 0}%` }} />
          </div>
          <Link href="/learn" className="inline-block font-bold text-brand underline">
            Go to the lessons
          </Link>
        </div>

        <div className={card}>
          <h2 className="text-xl font-extrabold">Games</h2>
          {games.finished === 0 && games.abandoned === 0 ? (
            <p className="text-ink/70">No games yet. Your first one will show up here.</p>
          ) : (
            <>
              <p className="text-3xl font-extrabold text-brand">
                {games.finished} <span className="text-lg font-bold text-ink/70">finished</span>
              </p>
              <ul className="flex flex-wrap gap-2 text-sm font-semibold">
                <li className="rounded-full bg-good/25 px-3 py-1">{games.wins} won</li>
                <li className="rounded-full bg-danger/15 px-3 py-1">{games.losses} lost</li>
                <li className="rounded-full bg-info/15 px-3 py-1">{games.draws} drawn</li>
                {games.abandoned > 0 && (
                  <li className="rounded-full bg-warn/25 px-3 py-1">{games.abandoned} left early</li>
                )}
              </ul>
            </>
          )}
          <Link href="/play" className="inline-block font-bold text-brand underline">
            Play the bot
          </Link>
        </div>
      </section>

      <section aria-label="Your mistakes" className={card}>
        <h2 className="text-xl font-extrabold">Your mistakes</h2>
        {mistakes.total === 0 ? (
          <p className="text-ink/70">
            Nothing to show yet. Play a game with coaching on, and the coach will spot the moments that cost
            you, and keep count here.
          </p>
        ) : (
          <>
            <ul className="space-y-2" aria-label="Mistakes by type">
              {mistakes.byType.map((bar) => (
                <li key={bar.type}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{bar.label}</span>
                    <span>{bar.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full bg-brand" style={{ width: `${Math.round(bar.share * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>

            {mistakes.repeated && (
              <p className="rounded-[var(--radius-button)] bg-warn/20 p-3">
                The one that keeps coming back: <strong>{mistakes.repeated.label}</strong> ({mistakes.repeated.count}{" "}
                times lately).
              </p>
            )}

            {mistakes.recentGames.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink/70">
                  Mistakes in your latest games
                </h3>
                <ol className="flex h-24 items-end gap-1" aria-label="Mistakes per game, oldest first">
                  {mistakes.recentGames.map((g) => (
                    <li key={g.id} className="flex h-full flex-1 flex-col justify-end" title={`${RESULT_TEXT[g.result].headline}: ${g.count} mistakes`}>
                      <div
                        className={`min-h-1 rounded-t ${RESULT_BAR[g.result]}`}
                        style={{ height: `${(g.count / trendMax) * 100}%` }}
                      />
                      <span className="sr-only">
                        {g.count} mistakes, {RESULT_TEXT[g.result].headline}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-1 text-xs text-ink/70">Green: won. Red: lost. Blue: drawn.</p>
              </div>
            )}
          </>
        )}
      </section>

      {(lessonSuggestion || levelSuggestion) && (
        <section aria-label="Suggestions" className={card}>
          <h2 className="text-xl font-extrabold">A couple of ideas</h2>
          <p className="text-sm text-ink/70">Only suggestions. You choose what to do.</p>
          {lessonSuggestion && (
            <div className="space-y-2 rounded-[var(--radius-button)] bg-info/15 p-3">
              <p>{lessonSuggestion.message}</p>
              <Link href={`/learn/${lessonSuggestion.lessonId}`} className={`${primary} inline-block`}>
                Open the lesson
              </Link>
            </div>
          )}
          {levelSuggestion && (
            <div className="space-y-2 rounded-[var(--radius-button)] bg-info/15 p-3">
              <p>{levelSuggestion.message}</p>
              {onUseLevel && (
                <button type="button" onClick={() => onUseLevel(levelSuggestion.to)} className={primary}>
                  Use level {levelSuggestion.to} for my next game
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function ProgressDashboard() {
  const { snapshot, store } = useProgress();
  const dashboard = useMemo(() => buildDashboard(snapshot.diary, LESSONS), [snapshot.diary]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <h1 className="text-3xl font-extrabold text-brand">Your progress</h1>
      {!snapshot.ready ? (
        <p role="status" className="text-lg text-ink/70">
          {waitingForPerson(snapshot)
            ? "Connect your diary using the box above, and your progress will appear."
            : "Loading your progress..."}
        </p>
      ) : (
        <DashboardView dashboard={dashboard} onUseLevel={(level) => void store.updateSettings({ botLevel: level })} />
      )}
    </main>
  );
}
