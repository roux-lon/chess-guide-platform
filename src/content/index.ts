export type {
  Arrow,
  Block,
  BoardExercise,
  CaptureTargetExercise,
  EscapeCheckExercise,
  Exercise,
  Highlight,
  Lesson,
  MateInOneExercise,
  MoveToSquareExercise,
  PieceName,
  PromotionName,
  QuizChoice,
  QuizExercise,
  SafeSquareExercise,
  Stage,
  StageInfo,
  SquareName,
} from "./types";
export { isBoardExercise } from "./types";
export { STAGES } from "./stages";
export { parseInline, stripEmphasis } from "./richText";
export type { InlineSpan } from "./richText";
export {
  GENERIC_HINT,
  ILLEGAL_FEEDBACK,
  PIECE_RULES,
  QUIZ_WRONG_FALLBACK,
  SHOW_ANSWER_TEXT,
  WRONG_FEEDBACK,
} from "./feedback";
export type { IllegalKey, WrongKey } from "./feedback";
export { COACH_DRAWER_TEXT, COMMENT_KIND_LABEL } from "./coachText";
export type { CommentKindKey } from "./coachText";
export { LESSONS } from "./lessons";
export { MISTAKE_TYPES, MISTAKE_TYPE_IDS, isMistakeType, mistakeLabel } from "./mistakes";
export type { MistakeInfo, MistakeType } from "./mistakes";
export {
  COACHING_MODE_TEXT,
  GAME_TEXT,
  MILESTONE_TEXT,
  RESULT_TEXT,
  REVIEW_TEXT,
  SUGGESTION_TEXT,
} from "./progressText";
export { REWARD_TEXT, XP_PER_LEVEL, XP_RULES } from "./rewards";
export { HOME_TEXT } from "./home";
export { ERROR_TEXT } from "./errors";
export { PLAYBOOK } from "./playbook";
export type {
  BlackReply,
  Candidate,
  Caution,
  CautionRule,
  Condition,
  Goal,
  Playbook,
  PlaybookSquare,
} from "./playbook";
export { OPENING_TEXT } from "./openingText";
