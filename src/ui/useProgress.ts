"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getProgressStore } from "@/features/progress";

/** The saved progress, loaded once when the first component asks for it. */
export function useProgress() {
  const store = getProgressStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    void store.load();
  }, [store]);
  /** False until the diary has been read once; before that the snapshot is a neutral placeholder. */
  const settled = snapshot !== store.getServerSnapshot();
  return { snapshot, store, settled };
}
