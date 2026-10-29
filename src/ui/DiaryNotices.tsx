import type { DiarySummary } from "@/features/progress";

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-50";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Offers to bring progress saved by an earlier version into the diary file. */
export function LegacyOfferCard({
  offer,
  busy,
  onAccept,
  onDecline,
}: {
  offer: DiarySummary;
  busy?: boolean;
  onAccept(): void;
  onDecline(): void;
}) {
  const found = [
    offer.lessons > 0 ? plural(offer.lessons, "finished lesson", "finished lessons") : null,
    offer.games > 0 ? plural(offer.games, "game", "games") : null,
  ]
    .filter(Boolean)
    .join(" and ");
  return (
    <section aria-label="Progress found in this browser" className="space-y-3 rounded-[var(--radius-card)] bg-info/15 p-5 shadow">
      <h2 className="text-xl font-extrabold">I found progress saved in this browser</h2>
      <p className="text-lg">
        There {offer.lessons + offer.games === 1 ? "is" : "are"} {found} saved in this browser from
        before. Shall I bring {offer.lessons + offer.games === 1 ? "it" : "them"} into your diary file?
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={onAccept} className={primary}>
          Yes, bring it over
        </button>
        <button type="button" disabled={busy} onClick={onDecline} className={secondary}>
          No thanks
        </button>
      </div>
    </section>
  );
}

/** A gentle nudge, only in browser-storage mode, to save a copy. */
export function ExportReminder({ onExport }: { onExport(): void }) {
  return (
    <section aria-label="Save a copy" className="space-y-3 rounded-[var(--radius-card)] bg-warn/20 p-5 shadow">
      <h2 className="text-xl font-extrabold">Time to save a copy?</h2>
      <p className="text-lg">
        Your browser keeps your progress, but it can be lost if you clear your browsing data. Saving a copy
        takes a second.
      </p>
      <button type="button" onClick={onExport} className={primary}>
        Export my diary
      </button>
    </section>
  );
}
