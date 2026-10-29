import type { Lesson } from "../types";
import { STAGE_1_LESSONS } from "./stage1";
import { STAGE_2_LESSONS } from "./stage2";
import { STAGE_3_LESSONS } from "./stage3";

/** Every lesson in the order a learner meets them. Later lessons unlock after earlier ones. */
export const LESSONS: Lesson[] = [...STAGE_1_LESSONS, ...STAGE_2_LESSONS, ...STAGE_3_LESSONS];
