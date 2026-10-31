// Thinking Gym drills: short questions that train one step of the thinking routine.
// Plain data, no React, no browser APIs. A drill stores the position, the question and the
// answer it expects; features/gym/solve.ts recomputes every answer with the rules layer and a
// test fails when the data disagrees.

export type DrillType = "spotThreat" | "isItSafe" | "pickOfThree" | "whatsThePlan" | "spotDoubleAttack";

/** The thinking routine: 1 what did they just do, 2 what is my plan, 3 pick a move, 4 safety check. */
export type RoutineStep = 1 | 2 | 3 | 4;

export type PlanId = "develop" | "center" | "castle" | "attack" | "defend";

interface DrillBase {
  /** Unique across all drills, for example "threat-1". */
  id: string;
  /** The side to move is the player. */
  fen: string;
  /** The routine step this drill trains. */
  routineStep: RoutineStep;
  /** Shown after the answer, right or wrong: the reason, in beginner words. */
  explanation: string;
  orientation?: "white" | "black";
  /** A line shown above the question. Used for drills built from the person's own games. */
  intro?: string;
}

/** "What is the bot attacking?" Click the pieces that could be won, or none. */
export interface SpotThreatDrill extends DrillBase {
  type: "spotThreat";
  /** Squares of the player's pieces the other side can win (by exchange). Empty = nothing. */
  threatened: string[];
}

/** "Is this move safe?" The move is shown on the board, the player says yes or no. */
export interface IsItSafeDrill extends DrillBase {
  type: "isItSafe";
  move: { from: string; to: string };
  safe: boolean;
  /** When not safe: the square of the piece of the player's that can be won after the move. */
  loses?: string;
}

export interface PickChoice {
  from: string;
  to: string;
  /** Why this move is right or wrong. */
  feedback: string;
}

/** "Which of these three moves is best?" Exactly one passes the safety check. */
export interface PickOfThreeDrill extends DrillBase {
  type: "pickOfThree";
  choices: [PickChoice, PickChoice, PickChoice];
  /** Index of the safe move. */
  best: number;
}

/** "What is the plan here?" */
export interface WhatsThePlanDrill extends DrillBase {
  type: "whatsThePlan";
  plan: PlanId;
  /** Two to four plans to pick from, including `plan`. */
  choices: PlanId[];
}

/** "Find the move that attacks two things at once." The player moves a piece on the board. */
export interface SpotDoubleAttackDrill extends DrillBase {
  type: "spotDoubleAttack";
  solution: { from: string; to: string };
}

export type Drill =
  | SpotThreatDrill
  | IsItSafeDrill
  | PickOfThreeDrill
  | WhatsThePlanDrill
  | SpotDoubleAttackDrill;
