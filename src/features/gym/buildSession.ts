import { GYM_TYPE_ORDER } from "@/content";
import type { Drill } from "@/content";
import { principleOfDrill } from "@/features/principles/principles";

export const SESSION_SIZE = 5;

export interface BuildSessionInput {
  /** The drills that ship with the app. */
  builtIn: readonly Drill[];
  /** Drills made from the person's own games. */
  mine?: readonly Drill[];
  /** Fills up to two places with drills from the person's own games. */
  includeMine?: boolean;
  /** Put up to three drills that train this principle first (the rest of the session is mixed). */
  principleId?: string;
  size?: number;
  /** Returns a number in [0, 1). Injected so tests are repeatable. */
  random?: () => number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Five mixed drills: different kinds in turn (so a session is not five of the same), and, when
 * asked, up to two from the person's own games. No drill appears twice.
 */
export function buildSessionDrills({
  builtIn,
  mine = [],
  includeMine = false,
  principleId,
  size = SESSION_SIZE,
  random = Math.random,
}: BuildSessionInput): Drill[] {
  const chosen: Drill[] = [];
  const used = new Set<string>();
  const take = (drill: Drill) => {
    chosen.push(drill);
    used.add(drill.id);
  };

  if (includeMine) {
    for (const drill of shuffled(mine, random).slice(0, Math.min(2, size))) take(drill);
  }

  if (principleId) {
    const matching = builtIn.filter((d) => !used.has(d.id) && principleOfDrill(d) === principleId);
    for (const drill of shuffled(matching, random).slice(0, Math.max(0, Math.min(3, size - chosen.length)))) take(drill);
  }

  const types = shuffled(GYM_TYPE_ORDER, random);
  for (let turn = 0; chosen.length < size; turn++) {
    const type = types[turn % types.length];
    const fresh = builtIn.filter((d) => !used.has(d.id));
    if (fresh.length === 0) break;
    const ofType = fresh.filter((d) => d.type === type);
    const pool = ofType.length > 0 ? ofType : fresh;
    take(pool[Math.floor(random() * pool.length)]);
  }
  return shuffled(chosen, random);
}

/** Another drill of the same kind that is not already in the session, or undefined. */
export function similarDrill(
  current: Drill,
  pool: readonly Drill[],
  inSession: ReadonlySet<string>,
  random: () => number = Math.random,
): Drill | undefined {
  const options = pool.filter((d) => d.type === current.type && !inSession.has(d.id));
  return options.length === 0 ? undefined : options[Math.floor(random() * options.length)];
}
