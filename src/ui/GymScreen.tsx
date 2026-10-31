"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { GYM_DRILLS, GYM_TEXT, GYM_TYPE_ORDER } from "@/content";
import type { DrillType } from "@/content";
import { GymSession, buildSessionDrills, drillsFromPositions, percent } from "@/features/gym";
import type { GymSnapshot } from "@/features/gym";
import { waitingForPerson } from "@/features/progress";
import { Board } from "./Board";
import { Inline } from "./RichText";
import { useProgress } from "./useProgress";

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-40";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;

const CHOICE_STYLE = {
  idle: "bg-surface text-ink hover:bg-brand hover:text-white",
  wrong: "bg-danger/15 text-ink ring-2 ring-danger",
  right: "bg-good/30 text-ink ring-2 ring-good",
} as const;

export function GymScreen() {
  const { snapshot, store } = useProgress();
  const [session, setSession] = useState<GymSession | null>(null);
  const [includeMine, setIncludeMine] = useState(true);

  const diary = snapshot.diary;
  const mine = useMemo(() => drillsFromPositions(diary.gym.positions), [diary.gym.positions]);

  const start = () => {
    const drills = buildSessionDrills({ builtIn: GYM_DRILLS, mine, includeMine: includeMine && mine.length > 0 });
    setSession(
      new GymSession({
        drills,
        pool: [...GYM_DRILLS, ...mine],
        onFinish: (answers) => void store.recordGymSession(answers),
      }),
    );
  };

  if (!snapshot.ready) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-extrabold text-brand">{GYM_TEXT.pageTitle}</h1>
        <p role="status" className="mt-4 text-lg text-ink/70">
          {waitingForPerson(snapshot)
            ? "Connect your diary using the box above, and the gym will open."
            : "Getting your gym ready..."}
        </p>
      </main>
    );
  }

  if (session) return <SessionView session={session} onLeave={() => setSession(null)} onAgain={start} />;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand">{GYM_TEXT.pageTitle}</h1>
        <p className="text-lg">{GYM_TEXT.blurb}</p>
      </header>

      <section aria-label={GYM_TEXT.routineTitle} className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/70">{GYM_TEXT.routineTitle}</h2>
        <ol className="list-decimal space-y-1 pl-6 font-semibold">
          {([1, 2, 3, 4] as const).map((step) => (
            <li key={step}>{GYM_TEXT.stepLabel[step].replace(/^Step \d: /, "")}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded-[var(--radius-card)] bg-brand p-6 text-white shadow-lg">
        <button
          type="button"
          onClick={start}
          className="rounded-[var(--radius-button)] bg-white px-5 py-3 text-lg font-bold text-brand-dark shadow transition hover:bg-page"
        >
          {GYM_TEXT.start}
        </button>
        {mine.length > 0 ? (
          <label className="flex items-center gap-2 font-semibold">
            <input
              type="checkbox"
              checked={includeMine}
              onChange={(e) => setIncludeMine(e.target.checked)}
              className="h-5 w-5"
            />
            {GYM_TEXT.startMine}
          </label>
        ) : null}
        <p className="text-sm">{mine.length > 0 ? GYM_TEXT.mineAvailable(mine.length) : GYM_TEXT.mineNone}</p>
      </section>

      <section aria-label={GYM_TEXT.historyTitle} className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/70">{GYM_TEXT.historyTitle}</h2>
        {Object.keys(diary.gym.stats).length === 0 ? (
          <p>{GYM_TEXT.historyEmpty}</p>
        ) : (
          <AccuracyList stats={diary.gym.stats} />
        )}
      </section>
    </main>
  );
}

function AccuracyList({ stats }: { stats: Record<string, { asked: number; correct: number }> }) {
  return (
    <ul className="space-y-2">
      {GYM_TYPE_ORDER.map((type) => {
        const counts = stats[type];
        const pct = percent(counts);
        return (
          <li key={type} className="space-y-1">
            <div className="flex justify-between gap-2 font-semibold">
              <span>{GYM_TEXT.typeLabel[type]}</span>
              <span>{counts && pct !== null ? `${pct}% (${GYM_TEXT.summary.kindLine(counts.correct, counts.asked)})` : GYM_TEXT.summary.noneYet}</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${GYM_TEXT.typeLabel[type]} accuracy`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct ?? 0}
              className="h-3 overflow-hidden rounded-full bg-ink/10"
            >
              <div className="h-full bg-good" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface SessionProps {
  session: GymSession;
  onLeave(): void;
  onAgain(): void;
}

export function SessionView({ session, onLeave, onAgain }: SessionProps) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { snapshot } = useProgress();

  if (snap.phase === "summary" && snap.summary) {
    const { correct, total, perType } = snap.summary;
    return (
      <main className="mx-auto w-full max-w-2xl space-y-6 p-4">
        <h1 className="text-3xl font-extrabold text-brand">{GYM_TEXT.summary.title}</h1>
        <p className="text-2xl font-extrabold">{GYM_TEXT.summary.score(correct, total)}</p>
        <p>{correct * 2 >= total ? GYM_TEXT.summary.great : GYM_TEXT.summary.keepGoing}</p>
        <section className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink/70">{GYM_TEXT.summary.perType}</h2>
          <ul className="space-y-1">
            {perType.map((row) => (
              <li key={row.type} className="flex justify-between gap-2 font-semibold">
                <span>{GYM_TEXT.typeLabel[row.type as DrillType]}</span>
                <span>
                  {percent(row.counts)}% ({GYM_TEXT.summary.kindLine(row.counts.correct, row.counts.asked)})
                </span>
              </li>
            ))}
          </ul>
        </section>
        {Object.keys(snapshot.diary.gym.stats).length > 0 && (
          <section className="space-y-2 rounded-[var(--radius-card)] bg-surface p-5 shadow">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/70">{GYM_TEXT.historyTitle}</h2>
            <AccuracyList stats={snapshot.diary.gym.stats} />
          </section>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onAgain} className={primary}>
            {GYM_TEXT.buttons.again}
          </button>
          <button type="button" onClick={onLeave} className={secondary}>
            {GYM_TEXT.buttons.back}
          </button>
        </div>
      </main>
    );
  }

  return <DrillView session={session} snap={snap} onLeave={onLeave} />;
}

function DrillView({ session, snap, onLeave }: { session: GymSession; snap: GymSnapshot; onLeave(): void }) {
  const { drill, verdict } = snap;
  if (!drill || !snap.fen || !snap.turn) return null;
  const asking = snap.phase === "question";
  const last = snap.number >= snap.total;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold uppercase tracking-wide text-ink/70">
          {GYM_TEXT.progress(snap.number, snap.total)} · {GYM_TEXT.typeLabel[drill.type]}
        </p>
        <button type="button" onClick={onLeave} className="text-sm font-bold text-brand underline">
          {GYM_TEXT.buttons.back}
        </button>
      </header>
      <p className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-bold text-brand-dark">
        {GYM_TEXT.stepLabel[drill.routineStep]}
      </p>
      {drill.intro && <p className="font-semibold">{drill.intro}</p>}
      <p className="text-xl font-bold">
        <Inline text={snap.prompt ?? ""} />
      </p>
      {snap.notice && (
        <p role="status" className="rounded-[var(--radius-button)] bg-warn/25 p-3 font-semibold">
          {snap.notice}
        </p>
      )}

      <div className="mx-auto w-full max-w-md">
        <Board
          fen={snap.fen}
          turn={snap.turn}
          orientation={snap.orientation}
          movableColor={snap.movableColor}
          legalDests={snap.legalDests}
          highlights={snap.highlights}
          arrows={snap.arrows}
          freeMoves={drill.type === "spotDoubleAttack"}
          onMove={(from, to) => session.attemptMove(from, to)}
          onSquareSelect={drill.type === "spotThreat" ? (square) => session.toggleSquare(square) : undefined}
        />
      </div>

      {drill.type === "spotThreat" && asking && (
        <div className="space-y-2">
          <p aria-live="polite" className="font-semibold">
            {snap.selected.length === 0 ? "Nothing picked yet." : `Picked: ${snap.selected.join(", ")}`}
          </p>
          <button type="button" onClick={() => session.submitThreat()} className={primary}>
            {GYM_TEXT.buttons.check}
          </button>
        </div>
      )}

      {drill.type === "isItSafe" && asking && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => session.answerSafe(true)} className={secondary}>
            {GYM_TEXT.buttons.yesSafe}
          </button>
          <button type="button" onClick={() => session.answerSafe(false)} className={secondary}>
            {GYM_TEXT.buttons.noUnsafe}
          </button>
        </div>
      )}

      {snap.choices && (
        <ul className="space-y-2" aria-label="Answers">
          {snap.choices.map((choice, index) => (
            <li key={index}>
              <button
                type="button"
                disabled={!asking}
                onClick={() => {
                  if (drill.type === "pickOfThree") session.pick(index);
                  else if (drill.type === "whatsThePlan") session.choosePlan(drill.choices[index]);
                }}
                className={`w-full rounded-[var(--radius-button)] px-4 py-3 text-left text-lg font-semibold shadow transition disabled:opacity-100 ${CHOICE_STYLE[choice.state]}`}
              >
                {choice.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {verdict && (
        <section
          aria-live="polite"
          className={`space-y-2 rounded-[var(--radius-card)] p-4 shadow ${verdict.correct ? "bg-good/25" : "bg-warn/25"}`}
        >
          <p className="text-xl font-extrabold">{verdict.headline}</p>
          {verdict.detail && <p className="font-semibold">{verdict.detail}</p>}
          <p>
            <Inline text={verdict.explanation} />
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={() => session.next()} className={primary}>
              {last ? GYM_TEXT.buttons.finish : GYM_TEXT.buttons.next}
            </button>
            {snap.canSimilar && (
              <button type="button" onClick={() => session.similar()} className={secondary}>
                {GYM_TEXT.buttons.similar}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
