import { MILESTONE_TEXT } from "@/content";
import type { Milestone } from "@/features/games";

/**
 * Version 1's definition of done, as a plain checklist. It never celebrates early:
 * the summary only says "ready" when every item is really done.
 */
export function MilestoneCard({ milestone }: { milestone: Milestone }) {
  return (
    <section
      aria-label="Are you ready?"
      className={`space-y-3 rounded-[var(--radius-card)] p-5 shadow ${milestone.ready ? "bg-good/20" : "bg-surface"}`}
    >
      <h2 className="text-xl font-extrabold">{MILESTONE_TEXT.heading}</h2>
      <p className="text-sm text-ink/70">{MILESTONE_TEXT.intro}</p>
      <ul className="space-y-2">
        {milestone.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                item.done ? "bg-good text-white" : "bg-ink/10 text-ink/50"
              }`}
            >
              {item.done ? "✓" : ""}
            </span>
            <span>
              <span className="block font-semibold">
                {item.label}
                <span className="sr-only">{item.done ? " (done)" : " (not done yet)"}</span>
              </span>
              <span className="block text-sm text-ink/70">{item.done ? item.progress : (item.hint ?? item.progress)}</span>
              {!item.done && item.hint && <span className="block text-sm text-ink/70">{item.progress}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="font-semibold">
        {milestone.summary}
      </p>
    </section>
  );
}
