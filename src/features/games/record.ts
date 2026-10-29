import type { CoachEvent } from "@/coach";
import type { CoachLogEntry } from "@/features/coach";
import { createGameFromSan, movesToPgn } from "@/rules";
import type { Color, GameStatus } from "@/rules";
import type {
  ActiveGameRecord,
  CoachLogRecord,
  CoachingMode,
  GameRecord,
  GameResult,
  MistakeRecord,
} from "@/storage";
import { classifyGame, toMistakeRecords } from "./mistakes";

/** The facts about a game that stay the same while it is played. */
export interface GameMeta {
  id: string;
  /** ISO date the game was started. */
  startedAt: string;
  playerColor: Color;
  botLevel: number;
  coachingMode: CoachingMode;
}

/** The kind of event that best describes a move, for the short label kept in the diary. */
export function primaryEventKind(events: readonly CoachEvent[]): string {
  const has = (test: (e: CoachEvent) => boolean) => events.some(test);
  if (has((e) => e.kind === "game_over")) return "game_over";
  if (has((e) => e.kind === "missed_threat")) return "missed_threat";
  if (has((e) => e.kind === "hanging_piece" && e.owner === "you" && e.actor === "you")) return "hanging_piece";
  if (has((e) => e.kind === "move_quality" && e.quality !== "good")) return "move_quality";
  if (has((e) => e.kind === "capture_trade")) return "capture_trade";
  if (has((e) => e.kind === "in_check_warning")) return "in_check_warning";
  if (has((e) => e.kind === "check_given")) return "check_given";
  if (has((e) => e.kind === "threat_from_opponent")) return "threat_from_opponent";
  if (has((e) => e.kind === "hanging_piece")) return "hanging_piece";
  if (has((e) => e.kind === "good_development")) return "good_development";
  if (has((e) => e.kind === "center_control")) return "center_control";
  return "move_played";
}

/** The result for the player, or null if the game is not over. */
export function resultFromStatus(status: GameStatus, playerColor: Color): GameResult | null {
  if (!status.isGameOver) return null;
  if (status.outcome === "checkmate") return status.winner === playerColor ? "win" : "loss";
  return "draw";
}

export function coachLogRecords(entries: readonly CoachLogEntry[]): CoachLogRecord[] {
  return entries.map((e) => ({ ply: e.ply, event: primaryEventKind(e.events), text: e.text }));
}

/**
 * All the mistakes in a game: the ones found in this visit, plus any kept from an earlier visit
 * (a resumed game). One record per move and type, in move order.
 */
export function mistakeRecords(
  entries: readonly CoachLogEntry[],
  restored: readonly MistakeRecord[] = [],
): MistakeRecord[] {
  const seen = new Set<string>();
  return [...restored, ...toMistakeRecords(classifyGame(entries))]
    .filter((m) => {
      const key = `${m.ply}:${m.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.ply - b.ply);
}

const RESULT_TAG: Record<GameResult, string> = {
  win: "",
  loss: "",
  draw: "1/2-1/2",
  abandoned: "*",
};

function pgnResult(result: GameResult, playerColor: Color): string {
  if (result === "win") return playerColor === "white" ? "1-0" : "0-1";
  if (result === "loss") return playerColor === "white" ? "0-1" : "1-0";
  return RESULT_TAG[result];
}

export interface BuildGameInput {
  meta: GameMeta;
  /** Moves so far in standard notation. */
  sanMoves: readonly string[];
  result: GameResult;
  entries: readonly CoachLogEntry[];
  /** Mistakes kept from an earlier visit to this same game. */
  restoredMistakes?: readonly MistakeRecord[];
  now: Date;
}

/** The diary record for a game that ended, or was resigned or left (result "abandoned"). */
export function buildGameRecord({
  meta,
  sanMoves,
  result,
  entries,
  restoredMistakes = [],
  now,
}: BuildGameInput): GameRecord {
  const white = meta.playerColor === "white" ? "You" : `Bot (level ${meta.botLevel})`;
  const black = meta.playerColor === "white" ? `Bot (level ${meta.botLevel})` : "You";
  const pgn =
    movesToPgn(sanMoves, {
      event: "Chess Coach game",
      date: meta.startedAt.slice(0, 10).replace(/-/g, "."),
      white,
      black,
      result: pgnResult(result, meta.playerColor),
    }) ?? "";

  return {
    id: meta.id,
    playedAt: now.toISOString(),
    result,
    playerColor: meta.playerColor,
    botLevel: meta.botLevel,
    coachingMode: meta.coachingMode,
    pgn,
    coachLog: coachLogRecords(entries),
    mistakes: mistakeRecords(entries, restoredMistakes),
  };
}

export interface BuildActiveInput {
  meta: GameMeta;
  fen: string;
  sanMoves: readonly string[];
  entries: readonly CoachLogEntry[];
  restoredMistakes?: readonly MistakeRecord[];
}

/** What is saved so an unfinished game can be continued next time. */
export function buildActiveGame({
  meta,
  fen,
  sanMoves,
  entries,
  restoredMistakes = [],
}: BuildActiveInput): ActiveGameRecord {
  return {
    id: meta.id,
    startedAt: meta.startedAt,
    playerColor: meta.playerColor,
    botLevel: meta.botLevel,
    coachingMode: meta.coachingMode,
    fen,
    moves: [...sanMoves],
    coachLog: coachLogRecords(entries),
    mistakes: mistakeRecords(entries, restoredMistakes),
  };
}

/**
 * The diary record for a saved unfinished game that is being given up (or finished off as
 * abandoned) without playing on. Same shape as a finished game's record.
 */
export function recordFromActive(active: ActiveGameRecord, result: GameResult, now: Date): GameRecord {
  const white = active.playerColor === "white" ? "You" : `Bot (level ${active.botLevel})`;
  const black = active.playerColor === "white" ? `Bot (level ${active.botLevel})` : "You";
  const pgn =
    movesToPgn(active.moves, {
      event: "Chess Coach game",
      date: active.startedAt.slice(0, 10).replace(/-/g, "."),
      white,
      black,
      result: pgnResult(result, active.playerColor),
    }) ?? "";
  return {
    id: active.id,
    playedAt: now.toISOString(),
    result,
    playerColor: active.playerColor,
    botLevel: active.botLevel,
    coachingMode: active.coachingMode,
    pgn,
    coachLog: active.coachLog,
    mistakes: active.mistakes,
  };
}

export type ResumeCheck = { ok: true } | { ok: false; reason: string };

/**
 * Can this saved game really be continued? The moves must replay legally, land on the saved
 * position, and the game must not already be over. A saved game that fails this is discarded
 * rather than risking a broken board.
 */
export function checkActiveGame(active: ActiveGameRecord): ResumeCheck {
  const game = createGameFromSan(active.moves);
  if (!game) return { ok: false, reason: "The saved moves do not replay correctly." };
  if (game.fen() !== active.fen) return { ok: false, reason: "The saved position does not match the saved moves." };
  if (game.status().isGameOver) return { ok: false, reason: "That game was already over." };
  if (!Number.isInteger(active.botLevel) || active.botLevel < 1 || active.botLevel > 5) {
    return { ok: false, reason: "The saved bot level is not one I know." };
  }
  return { ok: true };
}

export interface ResumeOffer {
  active: ActiveGameRecord;
  /** How many moves have been played. */
  moveCount: number;
}

/** The unfinished game to offer for continuing, or null if there is none or it cannot be resumed. */
export function resumeOffer(active: ActiveGameRecord | undefined): ResumeOffer | null {
  if (!active) return null;
  return checkActiveGame(active).ok ? { active, moveCount: active.moves.length } : null;
}
