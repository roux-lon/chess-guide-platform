"use client";

import { GameMenu } from "./GameMenu";
import { GameScreen } from "./GameScreen";
import { ReviewScreen } from "./ReviewScreen";
import { useBusy } from "./DiaryBanner";
import { useGameFlow } from "./useGameFlow";

/** The play page: pick a game, play it, look back at it. Everything it does is decided by GameFlow. */
export function PlayScreen() {
  const { flow, snapshot, store } = useGameFlow();
  const { busy, run } = useBusy();

  if (snapshot.phase === "playing" && snapshot.session) {
    return (
      <GameScreen
        // A new session is a new game, so the screen's own small state starts afresh.
        key={snapshot.session.gameId}
        session={snapshot.session}
        practice={snapshot.practice}
        opening={snapshot.opening}
        reviewReady={snapshot.reviewReady}
        diaryReady={snapshot.diaryReady}
        onResign={() => void run(() => flow.resign())}
        onLeave={() => void run(() => flow.leave())}
        onOpenReview={() => flow.openReview()}
        onEndPractice={() => flow.endPractice()}
        onContinueOpening={() => void run(() => flow.continueOpeningAsGame())}
        onLevelChange={(level) => void store.updateSettings({ botLevel: level })}
      />
    );
  }

  if (snapshot.phase === "review" && snapshot.review) {
    return (
      <ReviewScreen
        review={snapshot.review}
        onPractice={(mistake) => flow.startPractice(mistake)}
        onNewGame={() => flow.backToMenu()}
      />
    );
  }

  const { defaults } = snapshot;
  return (
    <GameMenu
      // The form starts from the saved choices, so it restarts once they have loaded.
      key={`${defaults.level}-${defaults.coachingMode}-${snapshot.resume?.active.id ?? "none"}`}
      defaults={defaults}
      resume={snapshot.resume}
      diaryReady={snapshot.diaryReady}
      busy={busy}
      onStart={(config) => void run(() => flow.startGame(config))}
      onStartOpening={(config) => void run(() => flow.startOpening(config))}
      onResume={() => void run(() => flow.resumeGame())}
      onDiscard={() => void run(() => flow.discardResume())}
    />
  );
}
