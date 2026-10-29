import type { FileHandleLike, FilePicker } from "./fsTypes";

/** The parts of `window` that the file dialogs need. */
export interface PickerWindow {
  showOpenFilePicker(options?: unknown): Promise<FileHandleLike[]>;
  showSaveFilePicker(options?: unknown): Promise<FileHandleLike>;
}

const TYPES = [{ description: "Chess diary", accept: { "application/json": [".json"] } }];

const isAbort = (error: unknown) =>
  typeof error === "object" && error !== null && "name" in error && (error as { name: unknown }).name === "AbortError";

/** Runs a dialog. If the person closes it without choosing, that is not an error: it gives null. */
async function ask<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

/** The real file dialogs of the browser. Thin on purpose: tested by hand, not in unit tests. */
export function createBrowserFilePicker(win: PickerWindow): FilePicker {
  return {
    pickExisting: () =>
      ask(async () => (await win.showOpenFilePicker({ types: TYPES, multiple: false }))[0] ?? null),

    pickNew: (suggestedName) => ask(() => win.showSaveFilePicker({ suggestedName, types: TYPES })),

    async saveCopy(suggestedName, text) {
      const copied = await ask(async () => {
        const handle = await win.showSaveFilePicker({ suggestedName, types: TYPES });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return true;
      });
      return copied === true;
    },
  };
}
