"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PRINCIPLES_TEXT } from "@/content";
import { principleRows } from "@/features/principles";
import { waitingForPerson } from "@/features/progress";
import { Board } from "./Board";
import { useProgress } from "./useProgress";

const primary =
  "rounded-[var(--radius-button)] bg-brand px-4 py-2 font-bold text-white shadow transition hover:bg-brand-dark";

/** "Rules I've learned": every principle with how often it was followed or slipped, from the diary. */
export function PrinciplesScreen() {
  const { snapshot } = useProgress();
  const rows = useMemo(() => principleRows(snapshot.diary), [snapshot.diary]);
  const hasHistory = snapshot.diary.games.length > 0;

  if (!snapshot.ready) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-3xl font-extrabold text-brand">{PRINCIPLES_TEXT.pageTitle}</h1>
        <p role="status" className="mt-4 text-lg text-ink/70">
          {waitingForPerson(snapshot)
            ? "Connect your diary using the box above, and your rules will show here."
            : "Getting your rules ready..."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand">{PRINCIPLES_TEXT.pageTitle}</h1>
        <p className="text-lg">{PRINCIPLES_TEXT.blurb}</p>
        {!hasHistory && <p className="text-ink/70">{PRINCIPLES_TEXT.noHistory}</p>}
      </header>
      <ol className="space-y-4">
        {rows.map(({ principle, followed, broken, quiz }, index) => (
          <li
            key={principle.id}
            id={principle.id}
            className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow sm:grid-cols-[14rem_1fr]"
          >
            <div className="w-full max-w-[14rem]">
              <Board
                fen={principle.example.fen}
                turn={principle.example.fen.split(" ")[1] === "b" ? "black" : "white"}
                orientation={principle.example.orientation}
                highlights={principle.example.highlights}
                arrows={principle.example.arrows}
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold">
                {index + 1}. {principle.title}
              </h2>
              <p>{principle.text}</p>
              <p className="text-sm text-ink/70">{principle.example.caption}</p>
              <p className="flex flex-wrap gap-2 text-sm font-bold">
                <span className="rounded-full bg-good/25 px-3 py-1">{PRINCIPLES_TEXT.followed(followed)}</span>
                <span className="rounded-full bg-danger/15 px-3 py-1">{PRINCIPLES_TEXT.broken(broken)}</span>
                {quiz && quiz.asked > 0 && (
                  <span className="rounded-full bg-info/20 px-3 py-1">{PRINCIPLES_TEXT.quiz(quiz.correct, quiz.asked)}</span>
                )}
              </p>
              <Link href={`/gym?principle=${principle.id}`} className={`${primary} inline-block`}>
                {PRINCIPLES_TEXT.practice}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
