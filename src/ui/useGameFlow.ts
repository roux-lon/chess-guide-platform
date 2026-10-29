"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { GameFlow } from "@/features/games";
import { createAnalysisEngine, createBotEngine } from "@/features/play";
import { getProgressStore } from "@/features/progress";
import { useProgress } from "./useProgress";

/**
 * The game flow for the play page: one per visit. It follows the diary while the page is
 * open, and when the page goes away a game in progress is saved as left (so it can be continued).
 */
export function useGameFlow() {
  const { snapshot: progress, store } = useProgress();
  const [flow] = useState(
    () =>
      new GameFlow({
        progress: getProgressStore(),
        createBotEngine,
        createAnalysisEngine,
      }),
  );
  const snapshot = useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
  useEffect(() => flow.connect(), [flow]);
  return { flow, snapshot, progress, store };
}
