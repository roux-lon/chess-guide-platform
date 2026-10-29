export { DIARY_VERSION, EMPTY_STREAK, createEmptyDiary, hasProgress, summarizeDiary } from "./diary";
export type {
  ActiveGameRecord,
  CoachLogRecord,
  CoachingMode,
  Diary,
  DiarySettings,
  DiarySummary,
  GameRecord,
  GameResult,
  LessonRecord,
  MistakeRecord,
  StreakRecord,
} from "./diary";
export { validateDiary } from "./validate";
export type { ValidationResult } from "./validate";
export { MIGRATION_STEPS, migrate } from "./migrate";
export type { MigrateResult, MigrationStep } from "./migrate";
export { readDiary, readDiaryText } from "./read";
export type { ReadResult } from "./read";
export { mergeDiaries } from "./merge";
export { DIARY_FILENAME, exportFilename, serializeDiary } from "./exportImport";
export type { FileConnection, SaveOptions, StorageAdapter } from "./StorageAdapter";
export { PROBLEM_MESSAGES, StorageUnavailableError, needsAttention, problemStatus } from "./status";
export type { StorageProblem, StorageStatus } from "./status";
export { FileStorage } from "./FileStorage";
export { BrowserFallbackStorage, CORRUPT_KEY, DIARY_KEY } from "./fallbackStorage";
export { MemoryStorage } from "./memoryStorage";
export { BrowserLegacy, noLegacy } from "./legacy";
export type { LegacyPort } from "./legacy";
export { DEFAULT_PREFS, SMALL_KEY, SmallStore } from "./smallStore";
export type { KeyValueStore, Prefs } from "./smallStore";
export { DebouncedWriter } from "./debounce";
export {
  createStorageServices,
  getStorage,
  getStorageServices,
  supportsFileSystemAccess,
} from "./getStorage";
export type { BrowserLike, StorageServices } from "./getStorage";
