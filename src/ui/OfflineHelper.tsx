"use client";

import { useEffect, useState } from "react";

/**
 * Registers the offline helper (public sw.js, made at build time) so the app works with no
 * network after the first visit. It only runs in the real build, never in `npm run dev`, where
 * saved copies would hide your changes. When a newer version is ready it asks before switching.
 */
export function OfflineHelper() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // On a first visit the helper takes over a page it did not control before. That is not an
    // update, so the page must not reload under someone who is in the middle of a lesson.
    const hadHelper = navigator.serviceWorker.controller !== null;
    let reloading = false;
    const onControllerChange = () => {
      if (reloading || !hadHelper) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.register("/sw.js").then(
      (registration) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            // A helper already controls the page, so this is an update, not the first install.
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          });
        };
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
        watch(registration.installing);
        registration.addEventListener("updatefound", () => watch(registration.installing));
      },
      () => {
        // Offline mode is a bonus. If it cannot start, the app still works online.
      },
    );
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[var(--radius-card)] bg-ink p-4 text-white shadow-2xl"
    >
      <span>A new version is ready.</span>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
        className="rounded-[var(--radius-button)] bg-white px-3 py-1 font-bold text-ink"
      >
        Refresh
      </button>
    </div>
  );
}
