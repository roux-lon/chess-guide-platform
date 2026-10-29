// Lesson and exercise data. Plain TypeScript, no React, no browser APIs.
// Positions are FEN strings. Every position must be legal (both kings on the board),
// which a test checks for the whole curriculum.

export type SquareName = string;
export type PieceName = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";
export type PromotionName = "queen" | "rook" | "bishop" | "knight";
export type Stage = 1 | 2 | 3;

/** Coloured square on a board picture. */
export interface Highlight {
  square: SquareName;
  kind: "good" | "warn" | "danger" | "info";
}

/** Arrow on a board picture. */
export interface Arrow {
  from: SquareName;
  to: SquareName;
  color?: "green" | "red" | "blue" | "yellow";
}

/**
 * Explanation text is a list of blocks. Inside any text, **double asterisks** mark a bit of
 * emphasis (see richText.ts). A diagram block shows a board picture.
 */
export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "diagram";
      fen: string;
      caption?: string;
      highlights?: Highlight[];
      arrows?: Arrow[];
      /** Which side is at the bottom. Defaults to White. */
      orientation?: "white" | "black";
    };

interface ExerciseBase {
  /** Unique across the whole curriculum, for example "pawn-2". */
  id: string;
  /** The instruction, or the question for a quiz. */
  prompt: string;
  /** A nudge that does not give the answer away. */
  hint: string;
  /** Shown when the player gets it right. */
  success: string;
}

interface BoardExerciseBase extends ExerciseBase {
  /** Start position. The side to move is the player. */
  fen: string;
  highlights?: Highlight[];
  arrows?: Arrow[];
  /** Defaults to the side to move. */
  orientation?: "white" | "black";
}

/** Move the piece on `from` to `to`. */
export interface MoveToSquareExercise extends BoardExerciseBase {
  type: "moveToSquare";
  from: SquareName;
  to: SquareName;
  /** If the move is a promotion, which piece the pawn must become. Any piece if left out. */
  promotion?: PromotionName;
}

/** Capture the piece standing on `target` with any piece. */
export interface CaptureTargetExercise extends BoardExerciseBase {
  type: "captureTarget";
  target: SquareName;
}

/** Move the piece on `from` to a square where it cannot be captured. */
export interface SafeSquareExercise extends BoardExerciseBase {
  type: "safeSquare";
  from: SquareName;
}

/** Deliver checkmate in one move. */
export interface MateInOneExercise extends BoardExerciseBase {
  type: "mateInOne";
}

/** The player's king is in check: find a way out, optionally a specific kind of way. */
export interface EscapeCheckExercise extends BoardExerciseBase {
  type: "escapeCheck";
  method?: "move-king" | "capture" | "block";
}

export interface QuizChoice {
  text: string;
  /** Shown if the player picks this wrong answer. Say why it is not right. */
  feedback?: string;
}

/** Multiple choice. A board picture is optional. */
export interface QuizExercise extends ExerciseBase {
  type: "quiz";
  choices: QuizChoice[];
  /** Index into `choices`. */
  correct: number;
  fen?: string;
  highlights?: Highlight[];
  arrows?: Arrow[];
  orientation?: "white" | "black";
}

export type BoardExercise =
  | MoveToSquareExercise
  | CaptureTargetExercise
  | SafeSquareExercise
  | MateInOneExercise
  | EscapeCheckExercise;

export type Exercise = BoardExercise | QuizExercise;

export const isBoardExercise = (exercise: Exercise): exercise is BoardExercise =>
  exercise.type !== "quiz";

export interface Lesson {
  /** Kebab-case and unique, for example "pawn". Used in the URL and in the diary. */
  id: string;
  stage: Stage;
  title: string;
  /** One friendly line for the lesson map. */
  summary: string;
  /** A symbol for the lesson map card. */
  icon: string;
  /** The piece speaking in its own voice, shown as a speech bubble before the lesson. Optional. */
  personality?: string;
  body: Block[];
  /** Three to six exercises. */
  exercises: Exercise[];
}

export interface StageInfo {
  stage: Stage;
  title: string;
  blurb: string;
}
