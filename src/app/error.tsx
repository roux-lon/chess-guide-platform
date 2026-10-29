"use client";

import { ErrorScreen } from "@/ui/ErrorScreen";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen kind="error" onRetry={reset} />;
}
