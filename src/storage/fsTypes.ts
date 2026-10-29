// The smallest picture of the File System Access API that we use. Only storage/ knows about it.
// Real browser objects satisfy these shapes, and tests use an in-memory fake.

export type PermissionResult = "granted" | "denied" | "prompt";

export interface WritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike {
  readonly name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
  /** Replaces the file's contents when closed (browsers write to a temporary file first). */
  createWritable(): Promise<WritableLike>;
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionResult>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionResult>;
}

/** The file dialogs. Each resolves null if the person closes the dialog without choosing. */
export interface FilePicker {
  pickExisting(): Promise<FileHandleLike | null>;
  pickNew(suggestedName: string): Promise<FileHandleLike | null>;
  /** Asks where to save a copy of `text`, and writes it there. False if cancelled. */
  saveCopy(suggestedName: string, text: string): Promise<boolean>;
}

/** Remembers the chosen file between visits. The real one uses IndexedDB. */
export interface HandleStore {
  get(): Promise<FileHandleLike | null>;
  set(handle: FileHandleLike): Promise<void>;
  clear(): Promise<void>;
}
