"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LESSONS, LessonSession, getLesson, lessonAfter, lessonStates } from "@/features/lessons";
import type { DotState } from "@/features/lessons";
import { lessonMood, moodLabel } from "@/features/mascot";
import { getProgressStore, waitingForPerson } from "@/features/progress";
import { Confetti } from "./Confetti";
import { Mascot } from "./Mascot";
import { playSound } from "./sound";
import { usePreferences } from "./usePreferences";
import { ExerciseView } from "./ExerciseView";
import { Inline, RichText } from "./RichText";
import { useProgress } from "./useProgress";

const DOT_STYLE: Record<DotState, string> = {
  done: "bg-good",
  current: "bg-brand ring-4 ring-brand/30",
  todo: "bg-ink/20",
};

const DOT_LABEL: Record<DotState, string> = {
  done: "finished",
  current: "current",
  todo: "not started",
};

const FEEDBACK_STYLE = {
  correct: "bg-good/25",
  wrong: "bg-warn/25",
  illegal: "bg-warn/25",
  ready: "bg-surface",
} as const;

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId);
  const { snapshot } = useProgress();

  if (!lesson) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-lg">We could not find that lesson.</p>
        <Link href="/learn" className="mt-4 inline-block font-bold text-brand underline">
          Back to all lessons
        </Link>
      </main>
    );
  }

  if (!snapshot.ready) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p role="status" className="text-lg text-ink/70">
          {waitingForPerson(snapshot)
            ? "Connect your diary using the box above, and your lesson will open."
            : "Getting your lesson ready..."}
        </p>
      </main>
    );
  }

  const states = lessonStates(LESSONS, (id) => snapshot.diary.lessons[id]?.status === "done");
  if (states.get(lesson.id) === "locked") {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-3xl font-extrabold text-brand">Not yet!</h1>
        <p className="text-lg">Finish the lessons before this one first, then it will open up.</p>
        <Link href="/learn" className={`${primary} inline-block`}>
          Back to all lessons
        </Link>
      </main>
    );
  }

  // A new session per lesson, so moving between lessons starts fresh.
  return <LessonRunner key={lesson.id} lessonId={lesson.id} />;
}

function useLessonSession(lessonId: string): LessonSession {
  const [session] = useState(
    () =>
      new LessonSession({
        lesson: getLesson(lessonId)!,
        onComplete: (id) => void getProgressStore().completeLesson(id),
      }),
  );
  useEffect(() => () => session.dispose(), [session]);
  return session;
}

function LessonRunner({ lessonId }: { lessonId: string }) {
  const session = useLessonSession(lessonId);
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { snapshot } = useProgress();
  const { prefs } = usePreferences();
  const { lesson, runner } = snap;
  const next = lessonAfter(lesson.id);

  // A small sound when an answer is checked, only if sound is on.
  const status = runner?.status;
  useEffect(() => {
    if (status === "correct") playSound("correct", prefs.sound);
    else if (status === "wrong" || status === "illegal") playSound("wrong", prefs.sound);
  }, [status, prefs.sound]);
  useEffect(() => {
    if (snap.phase === "complete") playSound("win", prefs.sound);
  }, [snap.phase, prefs.sound]);

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-ink/70">Stage {lesson.stage}</p>
        <h1 className="text-3xl font-extrabold text-brand">
          <span aria-hidden="true">{lesson.icon} </span>
          {lesson.title}
        </h1>
      </div>
      <Link href="/learn" className="font-bold text-brand underline">
        All lessons
      </Link>
    </header>
  );

  if (snap.phase === "intro") {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        {header}
        {lesson.personality && (
          <div className="flex items-center gap-3">
            <span className="text-5xl" aria-hidden="true">
              {lesson.icon}
            </span>
            <p className="relative rounded-[var(--radius-card)] bg-surface p-4 text-lg font-semibold shadow">
              <span className="sr-only">{lesson.title} says: </span>
              &ldquo;{lesson.personality}&rdquo;
            </p>
          </div>
        )}
        <RichText blocks={lesson.body} />
        <button type="button" onClick={() => session.start()} className={primary}>
          Start the exercises
        </button>
      </main>
    );
  }

  if (snap.phase === "complete") {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4">
        {header}
        <Confetti run />
        <section
          aria-label="Lesson complete"
          className="space-y-4 rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-lg"
        >
          <Mascot mood="cheering" size={120} label={moodLabel("cheering")} className="mx-auto" />
          <h2 className="text-3xl font-extrabold text-good-dark">Lesson complete!</h2>
          <p className="text-lg">You finished &quot;{lesson.title}&quot;. Great work!</p>
          {snapshot.saveError && (
            <p role="alert" className="rounded-[var(--radius-card)] bg-warn/25 p-3 text-sm">
              {snapshot.saveError}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {next ? (
              <Link href={`/learn/${next.id}`} className={primary}>
                Next lesson: {next.title}
              </Link>
            ) : (
              <Link href="/play" className={primary}>
                You know all the rules! Play the bot
              </Link>
            )}
            <button type="button" onClick={() => session.restart()} className={secondary}>
              Replay this lesson
            </button>
            <Link href="/learn" className={`${secondary} inline-block`}>
              All lessons
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!runner) return null;
  const board = runner.fen !== undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      {header}

      <ol
        className="flex items-center gap-2"
        aria-label={`Exercise ${snap.index + 1} of ${snap.total}`}
      >
        {snap.dots.map((dot, i) => (
          <li key={i} className={`h-4 w-4 rounded-full ${DOT_STYLE[dot]}`}>
            <span className="sr-only">
              Exercise {i + 1}: {DOT_LABEL[dot]}
            </span>
          </li>
        ))}
      </ol>

      <ExerciseView
        runner={runner}
        onMove={session.attempt}
        onAnswer={session.answer}
        onChoosePromotion={session.choosePromotion}
        onCancelPromotion={session.cancelPromotion}
      />

      {runner.feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-[var(--radius-card)] p-4 text-lg font-semibold shadow ${FEEDBACK_STYLE[runner.status]}`}
        >
          <div className="flex items-start gap-3">
            <Mascot
              mood={lessonMood(runner.status, runner.hintLevel > 0)}
              size={56}
              className="shrink-0"
            />
            <p>
              {runner.status === "correct" && <span aria-hidden="true">✅ </span>}
              <Inline text={runner.feedback} />
            </p>
          </div>
        </div>
      )}

      {runner.hintText && (
        <p className="rounded-[var(--radius-card)] bg-info/15 p-4 text-lg">
          <span className="font-bold">Hint: </span>
          <Inline text={runner.hintText} />
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {snap.canContinue && (
          <button type="button" onClick={() => session.next()} className={primary}>
            {snap.isLastExercise ? "Finish the lesson" : "Next exercise"}
          </button>
        )}
        {board && (runner.status === "wrong" || runner.status === "illegal") && (
          <button type="button" onClick={() => session.retry()} className={primary}>
            Try again
          </button>
        )}
        {runner.canShowHint && (
          <button type="button" onClick={() => session.showHint()} className={secondary}>
            {runner.hintLevel === 0 ? "I need a hint" : "Show me the move"}
          </button>
        )}
      </div>
    </main>
  );
}
