"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Diary, DiarySummary, ImportPreview } from "@/features/progress";
import { useBusy } from "./DiaryBanner";
import { downloadText } from "./download";
import { useProgress } from "./useProgress";

const button = "rounded-[var(--radius-button)] px-5 py-3 text-lg font-bold shadow transition disabled:opacity-50";
const primary = `${button} bg-brand text-white hover:bg-brand-dark`;
const secondary = `${button} bg-surface text-ink hover:bg-brand hover:text-white`;
const danger = `${button} bg-danger text-white hover:brightness-110`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const describe = (s: DiarySummary) =>
  `${plural(s.lessons, "finished lesson", "finished lessons")} and ${plural(s.games, "game", "games")}`;

type ImportState =
  | { step: "idle" }
  | { step: "error"; message: string; details: string[] }
  | { step: "confirm"; diary: Diary; summary: DiarySummary; migratedFrom?: number; replacesProgress: boolean }
  | { step: "done"; summary: DiarySummary };

/** Where the diary lives, plus saving a copy and restoring from one. */
export function DiarySettings() {
  const { snapshot, store, settled } = useProgress();
  const { busy, run } = useBusy();
  const [importing, setImporting] = useState<ImportState>({ step: "idle" });

  const { status } = snapshot;
  const fileMode = snapshot.storageKind === "file";

  const exportNow = () => {
    const { filename, text } = store.exportDiary();
    downloadText(filename, text);
  };

  async function onPickImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // so choosing the same file again still works
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImporting({ step: "error", message: "I could not read that file.", details: [] });
      return;
    }
    const preview: ImportPreview = store.prepareImport(text);
    if (!preview.ok) {
      setImporting({ step: "error", message: preview.message, details: preview.details });
    } else {
      setImporting({ step: "confirm", ...preview });
    }
  }

  async function applyImport(diary: Diary, summary: DiarySummary) {
    const worked = await store.applyImport(diary);
    setImporting(
      worked
        ? { step: "done", summary }
        : { step: "error", message: "I could not save the imported diary just now.", details: [] },
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-brand">Your diary</h1>
        <Link href="/learn" className="font-bold text-brand underline">
          Back to learning
        </Link>
      </header>

      <section aria-label="Where your diary lives" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
        <h2 className="text-xl font-extrabold">Where your diary lives</h2>
        {!settled && <p className="text-ink/70">Checking...</p>}
        {settled && status.state === "connected" && (
          <p className="text-lg">
            Your diary is the file <strong>{status.fileName}</strong> on your computer. Everything you learn is
            saved there.
          </p>
        )}
        {settled && status.state === "fallback" && (
          <p className="text-lg">
            Your browser cannot keep a diary file (Firefox and Safari cannot), so your progress is saved inside
            this browser. Save a copy below now and then, so it is safe even if browser data is cleared. For a
            real diary file, use Chrome or Edge on a computer.
          </p>
        )}
        {settled && status.state === "unconfigured" && (
          <p className="text-lg">No diary file is chosen yet. Use the box at the top of the page to pick one.</p>
        )}
        {settled && status.state === "needs-reconnect" && (
          <p className="text-lg">
            Your diary is in <strong>{status.fileName}</strong>, but your browser needs a quick OK first.
          </p>
        )}
        {settled && status.state === "problem" && (
          <p role="alert" className="text-lg">
            {status.message}
          </p>
        )}

        {fileMode && settled && (
          <div className="flex flex-wrap gap-3">
            {(status.state === "needs-reconnect" || status.state === "connected") && (
              <button type="button" disabled={busy} onClick={() => void run(() => store.reconnect())} className={secondary}>
                Reconnect my diary
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => void run(() => store.chooseFile("open"))} className={secondary}>
              Use a different file
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => store.chooseFile("create", true))}
              className={secondary}
            >
              Move my diary to a new file
            </button>
          </div>
        )}
      </section>

      <section aria-label="Save a copy" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
        <h2 className="text-xl font-extrabold">Save a copy</h2>
        <p>Download your diary as a JSON file you can keep anywhere.</p>
        <button type="button" onClick={exportNow} disabled={!snapshot.ready} className={primary}>
          Export JSON
        </button>
      </section>

      <section aria-label="Restore from a copy" className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow">
        <h2 className="text-xl font-extrabold">Restore from a copy</h2>
        <p>Choose a diary file you saved earlier. I check it first, and I ask before replacing anything.</p>
        <label className={`${secondary} inline-block cursor-pointer ${!snapshot.ready ? "pointer-events-none opacity-50" : ""}`}>
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            disabled={!snapshot.ready}
            onChange={(e) => void onPickImport(e)}
            className="sr-only"
          />
        </label>
        {!snapshot.ready && settled && (
          <p className="text-sm text-ink/70">Connect your diary first, then you can import.</p>
        )}

        {importing.step === "error" && (
          <div role="alert" className="space-y-2 rounded-[var(--radius-card)] bg-danger/15 p-4">
            <p className="font-semibold">{importing.message}</p>
            {importing.details.length > 0 && (
              <ul className="list-disc space-y-1 pl-6 text-sm">
                {importing.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            <p className="text-sm">Nothing was changed.</p>
          </div>
        )}

        {importing.step === "confirm" && (
          <div role="alert" className="space-y-3 rounded-[var(--radius-card)] bg-warn/20 p-4">
            <p className="text-lg font-semibold">This copy has {describe(importing.summary)}.</p>
            {importing.migratedFrom !== undefined && (
              <p className="text-sm">It is an older kind of diary file, and I have upgraded it for you.</p>
            )}
            {importing.replacesProgress ? (
              <p>
                Importing will <strong>replace</strong> the progress you have now. Do you want to go ahead?
              </p>
            ) : (
              <p>You have no progress yet, so nothing will be lost.</p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => applyImport(importing.diary, importing.summary))}
                className={importing.replacesProgress ? danger : primary}
              >
                {importing.replacesProgress ? "Replace my progress" : "Import it"}
              </button>
              <button type="button" onClick={() => setImporting({ step: "idle" })} className={secondary}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {importing.step === "done" && (
          <p role="status" className="rounded-[var(--radius-card)] bg-good/25 p-4 font-semibold">
            Done! Your diary now has {describe(importing.summary)}.
          </p>
        )}
      </section>
    </main>
  );
}
