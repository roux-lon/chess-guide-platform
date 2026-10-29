/* eslint-disable */
// The offline helper ("service worker"). build-sw.mjs copies this file to out/sw.js after a build,
// filling in the three values below. It keeps a copy of every file of the site so the app opens,
// teaches and plays with no network after the first visit.
//
// - A new build gets a new cache name, so people never see a mix of old and new files.
// - A waiting new version only takes over when the person presses "Refresh" (SKIP_WAITING).

const CACHE = "__CACHE_NAME__";
const PREFIX = "chess-coach-";
const FILES = /*__FILES__*/ [];

/** Turns a file path in out/ into the address it is served at. */
function addressesFor(path) {
  const list = ["/" + path];
  if (path.endsWith(".html")) {
    const bare = "/" + path.slice(0, -".html".length);
    if (path === "index.html") list.push("/");
    else list.push(bare, bare + "/");
  }
  return list;
}

/** A copy that is safe to hand back for a page: the "redirected" mark would make browsers refuse it. */
async function plain(response) {
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function precache() {
  const cache = await caches.open(CACHE);
  for (const path of FILES) {
    const response = await fetch("/" + path, { cache: "reload" });
    if (!response.ok) throw new Error("Could not fetch " + path);
    const copy = await plain(response);
    for (const address of addressesFor(path)) await cache.put(address, copy.clone());
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(PREFIX) && n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(answer(request, url));
});

async function answer(request, url) {
  const cache = await caches.open(CACHE);
  if (request.mode === "navigate") {
    // Pages: try the network first so a deployed update shows up, fall back to the saved copy.
    try {
      return await fetch(request);
    } catch {
      const saved =
        (await cache.match(url.pathname)) ||
        (await cache.match(url.pathname.replace(/\/$/, "") + ".html")) ||
        (await cache.match("/index.html"));
      if (saved) return saved;
      throw new Error("Offline and this page was never saved");
    }
  }
  // Everything else is a build file that never changes under the same name: saved copy first.
  const saved = await cache.match(url.pathname);
  if (saved) return saved;
  const response = await fetch(request);
  return response;
}
