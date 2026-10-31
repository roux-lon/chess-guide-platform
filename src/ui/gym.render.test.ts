// Smoke tests for the Thinking Gym screens: each kind of drill draws, and the summary shows.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GYM_DRILLS, GYM_TEXT } from "@/content";
import { GymSession } from "@/features/gym";
import { GymScreen, SessionView } from "./GymScreen";

const noop = () => {};
const text = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const view = (session: GymSession) => text(renderToString(createElement(SessionView, { session, onLeave: noop, onAgain: noop })));

describe("GymScreen", () => {
  it("waits for the diary before showing anything about progress", () => {
    const html = text(renderToString(createElement(GymScreen)));
    expect(html).toContain(GYM_TEXT.pageTitle);
    expect(html).not.toContain(GYM_TEXT.start);
  });
});

describe("a gym session", () => {
  it.each(["spotThreat", "isItSafe", "pickOfThree", "whatsThePlan", "spotDoubleAttack"] as const)(
    "draws a %s drill with its step and a question",
    (type) => {
      const drill = GYM_DRILLS.find((d) => d.type === type);
      if (!drill) throw new Error("missing drill");
      const html = view(new GymSession({ drills: [drill] }));
      expect(html).toContain(GYM_TEXT.typeLabel[type]);
      expect(html).toContain(GYM_TEXT.stepLabel[drill.routineStep]);
      expect(html).toContain("Drill 1 of 1");
    },
  );

  it("shows the choices for a pick of three and the plans for a plan drill", () => {
    const pick = GYM_DRILLS.find((d) => d.id === "pick-1");
    const plan = GYM_DRILLS.find((d) => d.id === "plan-1");
    if (!pick || !plan) throw new Error("missing drill");
    expect(view(new GymSession({ drills: [pick] }))).toContain("Nxe5");
    const planHtml = view(new GymSession({ drills: [plan] }));
    expect(planHtml).toContain(GYM_TEXT.planLabel.center);
    expect(planHtml).toContain(GYM_TEXT.planLabel.castle);
  });

  it("shows the reason after a wrong answer, with 'try a similar one'", () => {
    const drill = GYM_DRILLS.find((d) => d.id === "safe-1");
    if (!drill) throw new Error("missing drill");
    const session = new GymSession({ drills: [drill], pool: GYM_DRILLS });
    session.answerSafe(true);
    const html = view(session);
    expect(html).toContain(GYM_TEXT.verdict.wrong);
    expect(html).toContain("You would give a knight for a pawn");
    expect(html).toContain(GYM_TEXT.buttons.similar);
    expect(html).toContain(GYM_TEXT.buttons.finish);
  });

  it("shows the score and the accuracy per kind at the end", () => {
    const threat = GYM_DRILLS.find((d) => d.id === "threat-4");
    if (!threat) throw new Error("missing drill");
    const session = new GymSession({ drills: [threat] });
    session.submitThreat();
    session.next();
    const html = view(session);
    expect(html).toContain(GYM_TEXT.summary.score(1, 1));
    expect(html).toContain(GYM_TEXT.typeLabel.spotThreat);
    expect(html).toContain("100%");
  });

  it("shows the intro line for a drill from my own game", () => {
    const base = GYM_DRILLS.find((d) => d.id === "safe-1");
    if (!base) throw new Error("missing drill");
    const html = view(new GymSession({ drills: [{ ...base, intro: GYM_TEXT.mine.intro }] }));
    expect(html).toContain(GYM_TEXT.mine.intro);
  });
});
