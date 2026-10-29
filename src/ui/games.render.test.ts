// Smoke tests for the game screens: each state shows the right things and nothing crashes.
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FakeEngine } from "@/engine";
import { buildDashboard, buildGameRecord, buildReview, milestone } from "@/features/games";
import type { GameConfig } from "@/features/games";
import { GameSession } from "@/features/play/GameSession";
import { createEmptyDiary } from "@/storage";
import type { CoachingMode, Diary, GameRecord } from "@/storage";
import { DashboardView } from "./ProgressDashboard";
import { GameMenu } from "./GameMenu";
import { GameScreen } from "./GameScreen";
import { MilestoneCard } from "./MilestoneCard";
import { PlayScreen } from "./PlayScreen";
import { ReviewScreen } from "./ReviewScreen";

const noop = () => {};
/** React escapes quotes and adds comment separators in server HTML; undo that for comparing text. */
const text = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const render = (element: ReturnType<typeof createElement>) => text(renderToString(element));

const DEFAULTS: GameConfig = { level: 1, playerColor: "white", coachingMode: "quiet" };
const SCHOLARS = ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"];

function record(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    ...buildGameRecord({
      meta: { id: "g", startedAt: "2026-04-02T11:00:00.000Z", playerColor: "white", botLevel: 2, coachingMode: "full" },
      sanMoves: SCHOLARS,
      result: "win",
      entries: [],
      now: new Date("2026-04-02T12:00:00Z"),
    }),
    coachLog: [{ ply: 3, event: "missed_threat", text: "Watch the queen." }],
    mistakes: [{ ply: 3, type: "missed_threat", lossCp: 300 }],
    ...overrides,
  };
}

describe("GameMenu", () => {
  const menu = (props: Partial<ComponentProps<typeof GameMenu>> = {}) =>
    render(
      createElement(GameMenu, {
        defaults: DEFAULTS,
        resume: null,
        diaryReady: true,
        onStart: noop,
        onResume: noop,
        onDiscard: noop,
        ...props,
      }),
    );

  it("offers the three kinds of coaching, with what each one means", () => {
    const html = menu();
    for (const label of ["Full", "Quiet", "Off"]) expect(html).toContain(label);
    expect(html).toContain("A comment on every move");
    expect(html).toContain("No coaching at all");
    expect(html).toContain("Start the game");
    expect(html).toContain("Level 1");
    expect(html).toContain("Level 5");
  });

  it("starts from the saved choices", () => {
    const html = menu({ defaults: { level: 3, playerColor: "black", coachingMode: "off" } });
    expect(html).toMatch(/<option value="3" selected/);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="off"/);
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="black"/);
    expect(html).not.toMatch(/<input[^>]*checked=""[^>]*value="quiet"/);
  });

  it("offers to continue an unfinished game, and only then", () => {
    expect(menu()).not.toContain("Continue your game");
    const html = menu({
      resume: {
        moveCount: 6,
        active: {
          id: "x",
          startedAt: "2026-04-02T11:00:00.000Z",
          playerColor: "black",
          botLevel: 2,
          coachingMode: "quiet",
          fen: "f",
          moves: [],
          coachLog: [],
          mistakes: [],
        },
      },
    });
    expect(html).toContain("Continue your game");
    expect(html).toContain("as Black against level 2, after 6 moves");
    expect(html).toContain("Give it up");
    expect(html).toContain("Or start a new game");
  });

  it("warns when the diary is not connected", () => {
    expect(menu({ diaryReady: false })).toContain("not connected yet");
    expect(menu({ diaryReady: true })).not.toContain("not connected yet");
  });
});

describe("ReviewScreen", () => {
  const review = (r: GameRecord) => render(createElement(ReviewScreen, { review: buildReview(r), onPractice: noop, onNewGame: noop }));

  it("says how the game went and shows the biggest mistake with a way to try it again", () => {
    const html = review(record());
    expect(html).toContain("You won!");
    expect(html).toContain("against level 2");
    expect(html).toContain("Move 2: Missing a threat");
    expect(html).toContain("You played");
    expect(html).toContain("Qh5");
    expect(html).toContain("Watch the queen.");
    expect(html).toContain("Play it again from here");
    expect(html).toContain("Play another game");
  });

  it("is kind about a loss and about leaving early", () => {
    expect(review(record({ result: "loss" }))).toContain("The bot won this one");
    expect(review(record({ result: "abandoned" }))).toContain("You left this game early");
  });

  it("has a happy note for a clean game, and an honest one when coaching was off", () => {
    expect(review(record({ mistakes: [] }))).toContain("No clear mistakes");
    expect(review(record({ mistakes: [], coachingMode: "off" }))).toContain("Coaching was off");
  });

  it("says when there are more mistakes than it shows", () => {
    const many = record({
      mistakes: [
        { ply: 1, type: "mistake", lossCp: 160 },
        { ply: 3, type: "blunder", lossCp: 400 },
        { ply: 5, type: "hanging_piece", lossCp: 300 },
      ],
    });
    const html = render(createElement(ReviewScreen, { review: buildReview(many, 2), onPractice: noop, onNewGame: noop }));
    expect(html).toContain("3 mistakes in all");
  });
});

describe("GameScreen", () => {
  function screen(
    mode: CoachingMode,
    props: Partial<ComponentProps<typeof GameScreen>> = {},
    options: ConstructorParameters<typeof GameSession>[0] extends infer O ? Partial<O> : never = {},
  ) {
    const session = new GameSession({
      engine: new FakeEngine(),
      analysisEngine: mode === "off" ? undefined : new FakeEngine(),
      coachingMode: mode,
      botDelayMs: 0,
      ...options,
    });
    return render(
      createElement(GameScreen, {
        session,
        practice: false,
        reviewReady: false,
        diaryReady: true,
        onResign: noop,
        onLeave: noop,
        onOpenReview: noop,
        onEndPractice: noop,
        onLevelChange: noop,
        ...props,
      }),
    );
  }

  it("quiet: has the coach, hints and undo", () => {
    const html = screen("quiet");
    expect(html).toContain("Coaching: Quiet");
    expect(html).toContain(">Coach<");
    expect(html).toContain("I'm stuck");
    expect(html).toContain("Undo my move");
    expect(html).toContain("Resign");
    expect(html).toContain("Leave game");
  });

  it("full: shows the same tools", () => {
    expect(screen("full")).toContain("Coaching: Full");
  });

  it("off: has no coach, no hints and no undo, only the game", () => {
    const html = screen("off");
    expect(html).toContain("Coaching: Off");
    expect(html).not.toContain(">Coach<");
    expect(html).not.toContain("I'm stuck");
    expect(html).not.toContain("Undo my move");
    expect(html).toContain("Resign");
  });

  it("warns that the game is not saved when the diary is not connected", () => {
    expect(screen("quiet", { diaryReady: false })).toContain("not connected, so this game is not saved yet");
    expect(screen("quiet", { diaryReady: true })).not.toContain("not saved yet");
  });

  it("practice: says nothing is saved and offers the way back", () => {
    const html = screen("full", { practice: true }, { practice: true });
    expect(html).toContain("Practice");
    expect(html).toContain("not saved anywhere");
    expect(html).toContain("Back to my review");
    expect(html).not.toContain("Resign");
    expect(html).not.toContain("Leave game");
    expect(html).toContain("Back to the menu");
  });

  it("a finished game offers the review once it is ready", () => {
    const over = { startFen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1" };
    expect(screen("quiet", { reviewReady: true }, over)).toContain("See how it went");
    expect(screen("quiet", { reviewReady: false }, over)).toContain("Saving your game");
  });
});

describe("MilestoneCard", () => {
  const lessons = [{ id: "a", stage: 1 as const }];

  it("is honest while there is more to do", () => {
    const html = render(createElement(MilestoneCard, { milestone: milestone(createEmptyDiary(), lessons) }));
    expect(html).toContain("Are you ready?");
    expect(html).toContain("Finish every lesson in Stage 1");
    expect(html).toContain("Finish a game at level 2 or higher with coaching Off");
    expect(html).toContain("Not there yet");
    expect(html).not.toContain("You have done both");
  });

  it("says it is real only when it is", () => {
    const diary = createEmptyDiary();
    diary.lessons.a = { status: "done", completedAt: "2026-01-01T00:00:00.000Z" };
    // A Stage 2 and Stage 3 lesson are needed too, so add them to the list.
    const all = [
      { id: "a", stage: 1 as const },
      { id: "b", stage: 2 as const },
      { id: "c", stage: 3 as const },
    ];
    diary.lessons.b = diary.lessons.a;
    diary.lessons.c = diary.lessons.a;
    diary.games = [record({ botLevel: 2, coachingMode: "off" })];
    const html = render(createElement(MilestoneCard, { milestone: milestone(diary, all) }));
    expect(html).toContain("You have done both");
    expect(html).not.toContain("Not there yet");
  });
});

describe("DashboardView", () => {
  const lessons = [
    { id: "dont-hang-pieces", title: "Don't hang your pieces", stage: 3 as const },
    { id: "whats-the-threat", title: "Threats", stage: 3 as const },
  ];
  const view = (diary: Diary, onUseLevel?: (n: number) => void) =>
    render(createElement(DashboardView, { dashboard: buildDashboard(diary, lessons), onUseLevel }))
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

  it("is calm for a new diary", () => {
    const html = view(createEmptyDiary());
    expect(html).toContain("No games yet");
    expect(html).toContain("Nothing to show yet");
    expect(html).toContain("0");
    expect(html).not.toContain("A couple of ideas");
  });

  it("shows results, mistake bars, the repeated mistake and suggestions", () => {
    const diary = createEmptyDiary();
    const hung = (id: string, playedAt: string) =>
      record({
        id,
        playedAt,
        botLevel: 1,
        mistakes: [
          { ply: 3, type: "hanging_piece", lossCp: 300 },
          { ply: 5, type: "hanging_piece", lossCp: 300 },
        ],
      });
    diary.games = [
      hung("a", "2026-03-01T10:00:00.000Z"),
      hung("b", "2026-03-02T10:00:00.000Z"),
      hung("c", "2026-03-03T10:00:00.000Z"),
      record({ id: "d", result: "abandoned", playedAt: "2026-03-04T10:00:00.000Z", mistakes: [] }),
    ];
    diary.mistakeCounts = { hanging_piece: 6 };
    diary.lessons["dont-hang-pieces"] = { status: "done", completedAt: "2026-02-01T00:00:00.000Z" };

    const html = view(diary, noop);
    expect(html).toContain("3 finished");
    expect(html).toContain("3 won");
    expect(html).toContain("1 left early");
    expect(html).toContain("Leaving a piece hanging");
    expect(html).toContain("The one that keeps coming back: Leaving a piece hanging (6 times lately)");
    expect(html).toContain("A couple of ideas");
    expect(html).toContain('"leaving a piece hanging" has come up 6 times lately');
    expect(html).toContain("Only suggestions");
    expect(html).toContain("Open the lesson");
    expect(html).toContain("might like to try level 2");
    expect(html).toContain("Use level 2 for my next game");
  });
});

describe("PlayScreen", () => {
  it("renders the menu before anything has loaded, without crashing", () => {
    const html = render(createElement(PlayScreen));
    expect(html).toContain("Play the bot");
    expect(html).toContain("Start the game");
  });
});
