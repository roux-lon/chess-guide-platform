"use client";

import { useState } from "react";
import { needsAttention } from "@/features/progress";
import { DiaryPrompt } from "./DiaryPrompt";
import { ExportReminder, LegacyOfferCard } from "./DiaryNotices";
import { downloadText } from "./download";
import { useProgress } from "./useProgress";

/** Runs a click action, ignoring extra clicks while it is busy and never letting an error escape. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      // The storage reports problems through its status; anything else is not worth a crash.
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/** Sits under the top bar on every page: shows whatever the diary needs from the person, if anything. */
export function DiaryBanner() {
  const { snapshot, store } = useProgress();
  const { busy, run } = useBusy();

  const showPrompt = needsAttention(snapshot.status);
  const exportNow = () => {
    const { filename, text } = store.exportDiary();
    downloadText(filename, text);
  };

  if (!showPrompt && !snapshot.legacyOffer && !snapshot.exportReminder) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-2">
      {showPrompt && (
        <DiaryPrompt
          status={snapshot.status}
          busy={busy}
          actions={{
            onChoose: (mode, keepCurrent) => void run(() => store.chooseFile(mode, keepCurrent)),
            onReconnect: () => void run(() => store.reconnect()),
            onStartFresh: () => void run(() => store.startFreshKeepingCopy()),
            onRetrySave: () => void run(() => store.retrySave()),
          }}
        />
      )}
      {snapshot.legacyOffer && (
        <LegacyOfferCard
          offer={snapshot.legacyOffer}
          busy={busy}
          onAccept={() => void run(() => store.acceptLegacyImport())}
          onDecline={() => store.declineLegacyImport()}
        />
      )}
      {snapshot.exportReminder && <ExportReminder onExport={exportNow} />}
    </div>
  );
}
