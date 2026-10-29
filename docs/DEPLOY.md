# Putting Chess Coach online

Chess Coach is a **static site**: after a build it is just files (`out/`). There is no server to run and nothing to pay for. This guide uses **Cloudflare Pages** (free). You only need a GitHub account and a Cloudflare account.

> **Be honest about the passcode.** The secret word is checked inside the visitor's browser, and its fingerprint (a SHA-256 hash) is shipped with the page. That makes it a **polite lock, not real security**. It keeps casual visitors out. Someone determined could get past it. This is fine for v1 because the app holds no secrets and no private data (your diary stays in a file on your own computer). For real protection, see "Optional: real protection" below.

## Why Cloudflare Pages

- Free, with no cap that matters for a personal site.
- Serves any static folder, understands the `public/_headers` file in this project (it stops the offline helper `sw.js` from being cached and serves the engine `.wasm` with the right type).
- Gives you a `https://something.pages.dev` address. The engine and the offline mode both need **https**, which it provides.
- It also has Cloudflare Access, the zero-code way to add real protection.

(Netlify works the same way with the same settings, and also reads `_headers`. Vercel works too, but ignores `_headers`, so you would need to add the same two rules in a `vercel.json`. Pick one host, not all three.)

## Before you start

1. The code is on GitHub (this repo is).
2. You have chosen a passcode and made its hash:

   ```
   node scripts/hash-passcode.mjs "your secret word"
   ```

   Copy the long text it prints. Do **not** put the word itself anywhere online.

3. Optional, but a good habit: run a build locally first and make sure it passes.

   ```
   npm install
   npm run typecheck && npm run lint && npm run test && npm run build
   ```

## Steps

1. Sign in at <https://dash.cloudflare.com> and open **Workers & Pages**.
2. Choose **Create**, then **Pages**, then **Connect to Git**. Pick this repository and the `main` branch.
3. Fill in the build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | None (or Next.js (Static HTML Export)) |
   | Build command | `npm run build` |
   | Build output directory | `out` |
   | Root directory | leave empty |

4. Open **Environment variables** and add (for Production):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_PASSCODE_HASH` | the long hash from the step above |
   | `NODE_VERSION` | `22` |

   Do **not** set `NODE_ENV=production` yourself. The build tools (TypeScript, Tailwind) are "dev dependencies" and the host has to install them.

5. Press **Save and Deploy**. The first build takes a couple of minutes.
6. When it finishes, open the `https://….pages.dev` address. You should see the secret-word screen with Pip, the mascot.

Every time you push to `main`, the site rebuilds and updates by itself.

## What the build does

`npm run build` does three things, in order:

1. Copies the chess engine (Stockfish, lite, single-threaded) into `public/engine/`.
2. Builds the site into `out/`.
3. Writes `out/sw.js`: the small **offline helper**. It lists every file of the site so that after your first visit, the app opens, teaches and plays with **no network**.

The single-threaded engine needs **no special headers**, so any static host works.

## Check it after deploying

Open the deployed address in **Chrome** and go through `docs/QA-CHECKLIST.md`. The most important parts:

- The passcode works, and a wrong word is refused kindly.
- Create or reconnect your diary file, finish a lesson, play a few moves against the bot.
- Reload the page. Then turn off your Wi-Fi and reload again: the app should still open and the bot should still answer.

## Updating the passcode

Make a new hash, change `NEXT_PUBLIC_PASSCODE_HASH` in Cloudflare, then trigger a new deploy (the value is baked in at build time, so changing it without a rebuild does nothing).

## When you deploy a new version

People who already visited keep the old saved copy until they come back. The next time they open the app online, a small box says **"A new version is ready. Refresh"**. Pressing it switches over. Nothing in their diary is touched.

## Optional: real protection with Cloudflare Access

If you want the site to be truly private (not just a polite lock), turn on **Cloudflare Access** (free for small groups) in Cloudflare's **Zero Trust** area and require a login (for example a one-time code sent to your email) for your `pages.dev` address. No code changes are needed. You can keep the passcode screen as well, or leave `NEXT_PUBLIC_PASSCODE_HASH` empty. (An empty hash shows a setup hint on the lock screen, so for a public site you want it set.)

## If something goes wrong

| Symptom | Likely cause |
|---|---|
| Build fails with "Cannot find module typescript/tailwind" | The host skipped dev dependencies. Remove any `NODE_ENV=production` variable. |
| Lock screen says no passcode is set up | `NEXT_PUBLIC_PASSCODE_HASH` is missing, or you changed it and did not redeploy. |
| The bot never moves | Open the browser console. The engine files (`/engine/…wasm`) must load with status 200 and the type `application/wasm`. |
| "A new version is ready" never shows up | `sw.js` is being cached. Check that `_headers` was deployed (it is in `out/`). |
| Diary asks you to reconnect every visit | Normal. Browsers ask for one click to re-open a file. It works in Chrome and Edge on desktop only. Other browsers use the Export/Import buttons. |
