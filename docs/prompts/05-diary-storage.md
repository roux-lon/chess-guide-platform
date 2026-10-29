# Phase 5: Diary storage (history in a JSON file)

Read `CLAUDE.md` and `PLAN.md` (sections 4 and 9) first. This is phase 5 of 7. Phases 1 to 4 are committed.

## Goal

My history lives in a JSON file I choose on my own computer. Browser storage only holds small things. If the browser cannot do files, I can export and import instead.

## Tasks

1. **Schema:** a versioned `Diary` type matching PLAN section 4, plus a runtime validator. If you want a validation library (for example zod), ask first per CLAUDE.md; a small hand-written validator is also fine.
2. **Migrations:** a `migrate(raw)` function that upgrades older versions to the current one, with tests. Corrupt or unknown data must never crash the app.
3. **`FileStorage` (File System Access API)** in `storage/`, behind `StorageAdapter`:
   - first run: "Choose where to keep your chess diary" (pick or create `chess-progress.json`)
   - persist the file handle in IndexedDB
   - on a new session: show a friendly "Reconnect my diary" button (permission needs a user gesture)
   - read, validate, migrate; write with `createWritable`
   - debounced saves plus explicit saves at lesson completion and game end (not every move)
   - if the file is invalid, do not overwrite it; offer to keep a copy and start fresh
   - handle permission denied, file moved or deleted, and write failure with clear, kind messages
4. **`BrowserFallbackStorage`:** for browsers without the API (Firefox, Safari). Data stays in browser storage, with visible **Export JSON** and **Import JSON** buttons and a gentle reminder to export after a few sessions. Import validates and migrates, and asks before replacing existing data.
5. **Storage chooser:** one `getStorage()` factory in `storage/` picks the adapter by feature detection. The rest of the app only sees `StorageAdapter`.
6. **Browser storage use:** after this phase, `localStorage` holds only small data: settings, a "diary connected" hint, and maybe the last lesson pointer. History and progress live in the file. Migrate what phase 4 stored in the browser into the diary on first connect (ask before importing).
7. **UI:** a small "Diary" status chip (connected, needs reconnect, fallback mode) and a settings area to reconnect, switch file, export, and import.
8. **Tests:** use an in-memory fake file handle to test read, write, validation, migration, debounce and failure paths.

## Out of scope

Guided games, dashboards, polish.

## Acceptance checklist

- [ ] `typecheck`, `lint`, `test`, `build` all pass
- [ ] I pick a file once; closing and reopening the browser and clicking Reconnect restores all progress
- [ ] History is written to my file, not stored in `localStorage` (confirm by inspecting browser storage)
- [ ] In a browser without the File System Access API, Export/Import works and nothing crashes
- [ ] A corrupted JSON file does not get overwritten silently
- [ ] Saves are debounced; the file is not written on every move
- [ ] Only `storage/` knows about the File System Access API

Finish with a short report and a suggested commit message.
