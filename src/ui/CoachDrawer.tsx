"use client";

import { useEffect, useRef } from "react";
import { COACH_DRAWER_TEXT, COMMENT_KIND_LABEL } from "@/content";
import type { CommentKindKey } from "@/content";
import type { Mood } from "@/features/mascot";
import type { CoachLogEntry, HintView } from "@/features/play";
import { Mascot } from "./Mascot";

const KIND_CLASS: Record<CommentKindKey, string> = {
  threat: "bg-danger/15",
  opportunity: "bg-good/25",
  trade: "bg-info/15",
  info: "bg-brand/15",
};

function Chip({ className, children }: { className: string; children: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-ink ${className}`}>{children}</span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  log: readonly CoachLogEntry[];
  hints: HintView[];
  canRequestHint: boolean;
  hintLoading: boolean;
  onRequestHint: () => void;
  /** How Pip looks. */
  mood?: Mood;
}

/** Slide-out panel with the coach's comments and hints. It only displays what it is given. */
export function CoachDrawer({
  open,
  onClose,
  log,
  hints,
  canRequestHint,
  hintLoading,
  onRequestHint,
  mood = "happy",
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const newestRef = useRef<HTMLLIElement>(null);

  // Esc closes the drawer while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move keyboard focus into the drawer when it opens.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Keep the newest comment in view.
  useEffect(() => {
    if (open) newestRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [open, log.length]);

  return (
    <aside
      id="coach-drawer"
      aria-label="Your coach"
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col bg-surface shadow-2xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <header className="flex items-center justify-between border-b border-ink/10 p-4">
        <div className="flex items-center gap-3">
          <Mascot mood={mood} size={48} />
          <h2 className="text-xl font-extrabold text-brand">Your coach</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-button)] bg-page px-3 py-1 font-bold text-ink shadow transition hover:bg-brand hover:text-white"
        >
          Close
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section aria-label="Hints">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/70">Hints</h3>
          {hints.length === 0 && !hintLoading && (
            <p className="text-sm text-ink/70">
              Not sure what to do? Press the button and I will give you a small nudge. Each press
              tells you a bit more.
            </p>
          )}
          <ol className="space-y-2">
            {hints.map((hint) => (
              <li key={hint.tier} className="rounded-[var(--radius-card)] bg-info/15 p-3 text-sm">
                <span className="font-bold">
                  {COACH_DRAWER_TEXT.hintLabel(hint.tier, 3)}
                  {hint.title ? ` · ${hint.title}` : ""}:{" "}
                </span>
                {hint.text}
              </li>
            ))}
          </ol>
          {hintLoading && (
            <p role="status" className="mt-2 text-sm text-ink/70">
              Let me think about this position...
            </p>
          )}
          {canRequestHint && (
            <button
              type="button"
              onClick={onRequestHint}
              className="mt-3 rounded-[var(--radius-button)] bg-brand px-4 py-2 font-bold text-white shadow transition hover:bg-brand-dark"
            >
              {hints.length === 0 ? "I'm stuck: give me a hint" : "Show the next hint"}
            </button>
          )}
        </section>

        <section aria-label="Move comments">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/70">
            What happened
          </h3>
          {log.length === 0 ? (
            <p className="text-sm text-ink/70">Make a move and I will tell you what I think.</p>
          ) : (
            <ol className="space-y-2">
              {log.map((entry, i) => {
                const newest = i === log.length - 1;
                return (
                  <li
                    key={`${entry.ply}-${entry.moveSan}`}
                    ref={newest ? newestRef : undefined}
                    aria-current={newest ? "true" : undefined}
                    className={`rounded-[var(--radius-card)] p-3 text-sm ${
                      newest ? "bg-brand/15 ring-2 ring-brand" : "bg-page"
                    }`}
                  >
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink/70">
                      Move {Math.ceil(entry.ply / 2)} · {entry.side === "you" ? "You" : "Bot"} ·{" "}
                      <span className="font-mono normal-case">{entry.moveSan}</span>
                    </p>
                    {entry.comment ? (
                      <>
                        <div className="mb-2 flex flex-wrap gap-1">
                          <Chip className={KIND_CLASS[entry.comment.kind]}>
                            {COMMENT_KIND_LABEL[entry.comment.kind]}
                          </Chip>
                          <Chip className="bg-ink/10">
                            {entry.comment.toMove === "you"
                              ? COACH_DRAWER_TEXT.yourTurn
                              : COACH_DRAWER_TEXT.botTurn}
                          </Chip>
                        </div>
                        <p className="text-base font-bold">{entry.comment.headline}</p>
                        {entry.comment.why && (
                          <p className="mt-1 text-xs">
                            <span className="font-bold">{COACH_DRAWER_TEXT.whyLabel} </span>
                            {entry.comment.why}
                          </p>
                        )}
                        {entry.comment.watch && (
                          <p className="mt-1 text-xs">
                            <span className="font-bold">{COACH_DRAWER_TEXT.watchLabel} </span>
                            {entry.comment.watch}
                          </p>
                        )}
                        {entry.comment.more.length > 0 && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer font-bold">
                              {COACH_DRAWER_TEXT.moreLabel(entry.comment.more.length)}
                            </summary>
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {entry.comment.more.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </>
                    ) : (
                      <p>{entry.text}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}
