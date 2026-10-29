import { describe, expect, it } from "vitest";
import type { Stage } from "@/content";
import { createEmptyDiary } from "@/storage";
import type { Diary } from "@/storage";
import { TREND_GAMES, buildDashboard } from "./dashboard";
import { game, gameWithMistakes, inOrder } from "./testHelpers";

const LESSONS: { id: string; title: string; stage: Stage }[] = [
  { id: "dont-hang-pieces", title: "Don't hang your pieces", stage: 3 },
  { id: "whats-the-threat", title: "Threats", stage: 3 },
  { id: "trading-fairly", title: "Trading fairly", stage: 3 },
  { id: "pawn", title: "The pawn", stage: 1 },
];

function diaryWith(games: Diary["games"], lessons: string[] = []): Diary {
  const diary = createEmptyDiary();
  diary.games = games;
  for (const id of lessons) diary.lessons[id] = { status: "done", completedAt: "2026-03-01T00:00:00.000Z" };
  const counts: Record<string, number> = {};
  for (const g of games) for (const m of g.mistakes) counts[m.type] = (counts[m.type] ?? 0) + 1;
  diary.mistakeCounts = counts;
  return diary;
}

describe("buildDashboard", () => {
  it("is calm and empty for a new diary", () => {
    const d = buildDashboard(createEmptyDiary(), LESSONS);
    expect(d.lessons).toEqual({ done: 0, total: 4 });
    expect(d.games).toEqual({ finished: 0, wins: 0, losses: 0, draws: 0, abandoned: 0 });
    expect(d.mistakes).toMatchObject({ total: 0, byType: [], recentGames: [], repeated: null });
    expect(d.lessonSuggestion).toBeNull();
    expect(d.levelSuggestion).toBeNull();
    expect(d.milestone.ready).toBe(false);
    expect(d.hasUnfinishedGame).toBe(false);
  });

  it("counts lessons and results, keeping unfinished games apart", () => {
    const games = inOrder([
      game({ result: "win" }),
      game({ result: "loss" }),
      game({ result: "draw" }),
      game({ result: "win" }),
      game({ result: "abandoned" }),
    ]);
    const d = buildDashboard(diaryWith(games, ["pawn", "dont-hang-pieces"]), LESSONS);
    expect(d.lessons).toEqual({ done: 2, total: 4 });
    expect(d.games).toEqual({ finished: 4, wins: 2, losses: 1, draws: 1, abandoned: 1 });
  });

  it("shows mistakes by type, most frequent first, as bars relative to the biggest", () => {
    const games = inOrder([
      gameWithMistakes(["hanging_piece", "hanging_piece", "bad_trade"]),
      gameWithMistakes(["hanging_piece", "bad_trade"]),
    ]);
    const { byType, total } = buildDashboard(diaryWith(games), LESSONS).mistakes;
    expect(total).toBe(5);
    expect(byType.map((b) => [b.type, b.count, b.share])).toEqual([
      ["hanging_piece", 3, 1],
      ["bad_trade", 2, 2 / 3],
    ]);
    expect(byType[0].label).toBe("Leaving a piece hanging");
  });

  it("names types it does not know, instead of showing a code", () => {
    const diary = createEmptyDiary();
    diary.mistakeCounts = { missed_check_threat: 3 };
    expect(buildDashboard(diary, LESSONS).mistakes.byType[0].label).toBe("Missed check threat");
  });

  it("shows the trend over the latest finished games, oldest first, and skips unfinished ones", () => {
    const many = inOrder([
      ...Array.from({ length: TREND_GAMES + 3 }, (_, i) => gameWithMistakes(Array(i % 3).fill("blunder"))),
      gameWithMistakes(["blunder"], { result: "abandoned" }),
    ]);
    const { recentGames } = buildDashboard(diaryWith(many), LESSONS).mistakes;
    expect(recentGames).toHaveLength(TREND_GAMES);
    expect(recentGames.every((g) => g.result !== (("abandoned") as string))).toBe(true);
    const dates = recentGames.map((g) => g.playedAt);
    expect([...dates].sort()).toEqual(dates);
  });

  it("names the repeated mistake and suggests the matching lesson", () => {
    const games = inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["hanging_piece"])]);
    const d = buildDashboard(diaryWith(games), LESSONS);
    expect(d.mistakes.repeated).toEqual({ type: "hanging_piece", label: "Leaving a piece hanging", count: 2 });
    expect(d.lessonSuggestion?.lessonId).toBe("dont-hang-pieces");
  });

  it("changes its answer when a different mistake is repeated", () => {
    const first = inOrder([gameWithMistakes(["hanging_piece"]), gameWithMistakes(["hanging_piece"])]);
    expect(buildDashboard(diaryWith(first), LESSONS).lessonSuggestion?.lessonId).toBe("dont-hang-pieces");
    const later = inOrder([...first, ...Array.from({ length: 4 }, () => gameWithMistakes(["bad_trade", "bad_trade"]))]);
    const d = buildDashboard(diaryWith(later), LESSONS);
    expect(d.mistakes.repeated?.type).toBe("bad_trade");
    expect(d.lessonSuggestion?.lessonId).toBe("trading-fairly");
  });

  it("includes the level suggestion and notices an unfinished game", () => {
    const diary = diaryWith(inOrder([game({ botLevel: 1 }), game({ botLevel: 1 }), game({ botLevel: 1 })]));
    diary.activeGame = {
      id: "x",
      startedAt: "2026-03-01T00:00:00.000Z",
      playerColor: "white",
      botLevel: 1,
      coachingMode: "quiet",
      fen: "f",
      moves: ["e4"],
      coachLog: [],
      mistakes: [],
    };
    const d = buildDashboard(diary, LESSONS);
    expect(d.levelSuggestion).toMatchObject({ kind: "raise", to: 2 });
    expect(d.hasUnfinishedGame).toBe(true);
  });
});
