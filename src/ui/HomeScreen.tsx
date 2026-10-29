"use client";

import Link from "next/link";
import { HOME_TEXT, REWARD_TEXT } from "@/content";
import { LESSONS } from "@/features/lessons";
import { milestone } from "@/features/games";
import { nextStep } from "@/features/home";
import { waitingForPerson } from "@/features/progress";
import { rewardsSummary } from "@/features/rewards";
import { fillTemplate } from "@/lib/template";
import { Mascot } from "./Mascot";
import { MilestoneCard } from "./MilestoneCard";
import { useProgress } from "./useProgress";

const lessonList = LESSONS.map((l) => ({ id: l.id, title: l.title, stage: l.stage }));

/** The front page: Pip says hello, one clear next step, and how things are going. */
export function HomeScreen() {
  const { snapshot } = useProgress();

  const hello = (
    <header className="flex items-center gap-4">
      <Mascot mood="happy" size={96} label="Pip, your chess coach" className="shrink-0" />
      <div>
        <h1 className="text-3xl font-extrabold text-brand sm:text-4xl">{HOME_TEXT.greeting}</h1>
        <p className="text-lg">{HOME_TEXT.tagline}</p>
      </div>
    </header>
  );

  if (!snapshot.ready) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
        {hello}
        <p role="status" className="text-lg text-ink/70">
          {waitingForPerson(snapshot) ? HOME_TEXT.waiting : HOME_TEXT.loading}
        </p>
      </main>
    );
  }

  const diary = snapshot.diary;
  const step = nextStep(diary, lessonList);
  const rewards = rewardsSummary(diary, new Date());
  const ready = milestone(diary, lessonList);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
      {hello}

      <section
        aria-label="What to do next"
        className="space-y-3 rounded-[var(--radius-card)] bg-brand p-6 text-white shadow-lg"
      >
        <h2 className="text-2xl font-extrabold">{step.title}</h2>
        <p>{step.detail}</p>
        <Link
          href={step.href}
          className="inline-block rounded-[var(--radius-button)] bg-white px-5 py-3 text-lg font-bold text-brand-dark shadow transition hover:bg-page"
        >
          {step.cta}
        </Link>
      </section>

      <section aria-label="Your progress" className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/70">
            {fillTemplate(REWARD_TEXT.level, { level: String(rewards.level.level) })} ·{" "}
            {fillTemplate(REWARD_TEXT.xp, { xp: String(rewards.xp) })}
          </p>
          <div
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(rewards.level.fraction * 100)}
            className="h-4 overflow-hidden rounded-full bg-ink/10"
          >
            <div className="h-full bg-brand" style={{ width: `${rewards.level.fraction * 100}%` }} />
          </div>
          <p className="text-sm text-ink/70">
            {fillTemplate(REWARD_TEXT.toNext, {
              needed: String(rewards.level.xpToNext),
              next: String(rewards.level.level + 1),
            })}
          </p>
        </div>

        <div className="space-y-1 rounded-[var(--radius-card)] bg-surface p-5 shadow">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/70">Daily streak</p>
          <p className="text-2xl font-extrabold">
            <span aria-hidden="true">🔥 </span>
            {rewards.streak > 0
              ? fillTemplate(REWARD_TEXT.streakDays, { days: String(rewards.streak) })
              : "No streak yet"}
          </p>
          <p className="text-sm text-ink/70">
            {rewards.streak === 0
              ? REWARD_TEXT.streakNone
              : fillTemplate(REWARD_TEXT.streakBest, { best: String(rewards.bestStreak) })}
          </p>
        </div>
      </section>

      <MilestoneCard milestone={ready} />

      <nav aria-label="Main areas" className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/learn"
          className="rounded-[var(--radius-card)] bg-surface p-5 shadow transition hover:ring-2 hover:ring-brand"
        >
          <span className="block text-xl font-extrabold text-brand">
            <span aria-hidden="true">♞ </span>Learn chess
          </span>
          <span className="block">Short lessons that teach every rule.</span>
        </Link>
        <Link
          href="/play"
          className="rounded-[var(--radius-card)] bg-surface p-5 shadow transition hover:ring-2 hover:ring-brand"
        >
          <span className="block text-xl font-extrabold text-brand">
            <span aria-hidden="true">♟ </span>Play the bot
          </span>
          <span className="block">A friendly bot, and a coach for every move.</span>
        </Link>
      </nav>
    </main>
  );
}
