import type { ReactNode } from "react";
import type { StorageStatus } from "@/features/progress";

export interface DiaryActions {
  onChoose(mode: "create" | "open", keepCurrent?: boolean): void;
  onReconnect(): void;
  onStartFresh(): void;
  onRetrySave(): void;
}

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-50";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;

function Card({ tone, title, children }: { tone: "warn" | "bad"; title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className={`space-y-3 rounded-[var(--radius-card)] p-5 shadow ${tone === "warn" ? "bg-warn/20" : "bg-danger/15"}`}
    >
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * What to show when the diary needs the person to do something: pick a file, allow access
 * again, or deal with a problem. It only draws; the actions come from the caller.
 */
export function DiaryPrompt({
  status,
  actions,
  busy = false,
}: {
  status: StorageStatus;
  actions: DiaryActions;
  busy?: boolean;
}) {
  switch (status.state) {
    case "unconfigured":
      return (
        <Card tone="warn" title="Choose where to keep your chess diary">
          <p className="text-lg">
            Your progress is saved in one small file on your own computer, so it stays yours. Make a new
            file, or pick the one you made before.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => actions.onChoose("create")} className={primary}>
              Create a new diary file
            </button>
            <button type="button" disabled={busy} onClick={() => actions.onChoose("open")} className={secondary}>
              Use an existing diary file
            </button>
          </div>
        </Card>
      );

    case "needs-reconnect":
      return (
        <Card tone="warn" title="Welcome back!">
          <p className="text-lg">
            Your diary is in <strong>{status.fileName}</strong>. Your browser needs a quick OK before I can
            open it again.
          </p>
          <button type="button" disabled={busy} onClick={actions.onReconnect} className={primary}>
            Reconnect my diary
          </button>
        </Card>
      );

    case "problem":
      return (
        <Card tone="bad" title="Your diary needs a little help">
          <p role="alert" className="text-lg">
            {status.message}
          </p>
          {status.details && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold">What exactly is wrong?</summary>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                {status.details.map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex flex-wrap gap-3">
            {(status.problem === "permission-denied" || status.problem === "read-failed") && (
              <button type="button" disabled={busy} onClick={actions.onReconnect} className={primary}>
                {status.problem === "permission-denied" ? "Reconnect my diary" : "Try again"}
              </button>
            )}
            {status.problem === "write-failed" && (
              <button type="button" disabled={busy} onClick={actions.onRetrySave} className={primary}>
                Try saving again
              </button>
            )}
            {status.problem === "invalid-file" && (
              <button type="button" disabled={busy} onClick={actions.onStartFresh} className={primary}>
                Save a copy, then start fresh
              </button>
            )}
            {status.problem === "file-missing" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => actions.onChoose("create", true)}
                className={primary}
              >
                Start a new diary file
              </button>
            )}
            {(status.problem === "file-missing" || status.problem === "invalid-file") && (
              <button type="button" disabled={busy} onClick={() => actions.onChoose("open")} className={secondary}>
                Choose a different file
              </button>
            )}
          </div>
        </Card>
      );

    default:
      return null;
  }
}
