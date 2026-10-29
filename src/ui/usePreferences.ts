"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getPreferencesStore } from "@/features/preferences";

/** The sound and celebration choices for this device. */
export function usePreferences() {
  const store = getPreferencesStore();
  const prefs = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.load();
  }, [store]);
  return { prefs, update: store.update.bind(store) };
}
