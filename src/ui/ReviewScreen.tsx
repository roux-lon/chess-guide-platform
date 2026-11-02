"use client";

import Link from "next/link";
import { PRINCIPLES_TEXT, REVIEW_TEXT, RESULT_TEXT } from "@/content";
import type { Review, ReviewMistake } from "@/features/games";
import { Board } from "./Board";
import { moodLabel, resultMood } from "@/features/mascot";
import { Confetti } from "./Confetti";
import { Mascot } from "./Mascot";
import { PrincipleChip } from "./PrincipleChip";

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-50";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;

const HEADLINE_TONE = {
  win: "bg-good/25",
  loss: "bg-danger/15",
  draw: "bg-info/15",
  abandoned: "bg-warn/20",
} as const;

interface Props {
  review: Review;
  onPractice(mistake: ReviewMistake): void;
  onNewGame(): void;
}

const pawns = (cp: number) => (cp / 100).toFixed(1).replace(/\.0$/, "");

/** After a game: how it went, and the moments that cost the most, each one to try again. */
export function ReviewScreen({ review, onPractice, onNewGame }: Props) {
  const { record, mistakes, totalMistakes } = review;
  const result = RESULT_TEXT[record.result];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <section
        aria-label="Result"
        className={`space-y-1 rounded-[var(--radius-card)] p-6 shadow ${HEADLINE_TONE[record.result]}`}
      >
        <Confetti run={record.result === "win"} />
        <Mascot
          mood={resultMood(record.result)}
          size={88}
          label={moodLabel(resultMood(record.result))}
          className="float-right ml-3"
        />
        <h1 className="text-3xl font-extrabold">{result.headline}</h1>
        <p className="text-lg">{result.detail}</p>
        <p className="text-sm text-ink/70">
          You made {review.playerMoves} {review.playerMoves === 1 ? "move" : "moves"} against level{" "}
          {record.botLevel}.
        </p>
      </section>

      <section aria-label="Your biggest mistakes" className="space-y-4">
        <h2 className="text-2xl font-extrabold text-brand">Looking back</h2>
        {mistakes.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-surface p-5 text-lg shadow">
            {record.coachingMode === "off"
              ? REVIEW_TEXT.noMistakesOff
              : record.result === "abandoned"
                ? REVIEW_TEXT.noMistakesLeftEarly
                : REVIEW_TEXT.noMistakes}
          </p>
        ) : (
          <>
            <p>
              {REVIEW_TEXT.intro}
              {totalMistakes > mistakes.length &&
                ` (${totalMistakes} mistakes in all, these are the biggest ${mistakes.length}.)`}
            </p>
            {review.byPrinciple.length > 0 && (
              <ul aria-label="Rules that slipped" className="space-y-2 rounded-[var(--radius-card)] bg-warn/20 p-4">
                {review.byPrinciple.map(({ principle, count }) => (
                  <li key={principle.id} className="flex flex-wrap items-center gap-2">
                    <span>{PRINCIPLES_TEXT.reviewGroup(principle.title, count)}</span>
                    <PrincipleChip id={principle.id} />
                    <Link href={`/gym?principle=${principle.id}`} className="text-sm font-bold text-brand underline">
                      {PRINCIPLES_TEXT.practice}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ol className="space-y-4">
              {mistakes.map((mistake) => (
                <li
                  key={`${mistake.ply}-${mistake.type}`}
                  className="grid gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow sm:grid-cols-[14rem_1fr]"
                >
                  <div className="w-full max-w-[14rem]">
                    <Board
                      fen={mistake.fenBefore}
                      turn={record.playerColor}
                      orientation={record.playerColor}
                      arrows={[{ from: mistake.from, to: mistake.to, color: "red" }]}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-extrabold">
                      Move {mistake.moveNumber}: {mistake.label}
                    </h3>
                    <PrincipleChip id={mistake.principleId} />
                    <p className="text-sm text-ink/70">
                      You played <strong className="font-mono">{mistake.san}</strong> (the red arrow). It cost about{" "}
                      {pawns(mistake.lossCp)} {pawns(mistake.lossCp) === "1" ? "pawn" : "pawns"} of value.
                    </p>
                    {mistake.text && <p className="rounded-[var(--radius-button)] bg-brand/10 p-3">{mistake.text}</p>}
                    <button type="button" onClick={() => onPractice(mistake)} className={primary}>
                      Play it again from here
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onNewGame} className={primary}>
          Play another game
        </button>
      </div>
    </main>
  );
}

