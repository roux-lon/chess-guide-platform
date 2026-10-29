import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The offline helper is a plain script, so these tests run it against a tiny pretend browser.
const source = readFileSync("scripts/sw.template.js", "utf8")
  .replace("__CACHE_NAME__", "chess-coach-new")
  .replace(
    "/*__FILES__*/ []",
    JSON.stringify(["index.html", "learn.html", "learn/pawn.html", "_next/static/a.js", "engine/stockfish.wasm"]),
  );

type Handler = (event: Record<string, unknown>) => void;

class FakeResponse {
  ok = true;
  status = 200;
  statusText = "OK";
  headers = {};
  constructor(public body: string) {}
  async blob() {
    return this.body;
  }
  clone() {
    return new FakeResponse(this.body);
  }
}

function setup(options: { online?: boolean; existing?: string[] } = {}) {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, Map<string, string>>();
  for (const name of options.existing ?? []) stores.set(name, new Map());
  const calls: string[] = [];
  let online = options.online ?? true;
  let skipped = false;
  let claimed = false;

  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        put: async (address: string, response: FakeResponse) => void store.set(address, response.body),
        match: async (address: string) => (store.has(address) ? { body: store.get(address) } : undefined),
      };
    },
  };

  const fakeFetch = async (input: string | { url: string }) => {
    const address = typeof input === "string" ? input : new URL(input.url).pathname;
    calls.push(address);
    if (!online) throw new Error("offline");
    return new FakeResponse("network:" + address);
  };
  const ResponseCtor = function (body: string) {
    return new FakeResponse(body);
  };

  const self = {
    location: { origin: "https://coach.example" },
    addEventListener: (type: string, handler: Handler) => void (handlers[type] = handler),
    skipWaiting: () => void (skipped = true),
    clients: { claim: async () => void (claimed = true) },
  };
  new Function("self", "caches", "fetch", "Response", "URL", source)(self, caches, fakeFetch, ResponseCtor, URL);

  const waited = async (type: string) => {
    let promise: Promise<unknown> = Promise.resolve();
    handlers[type]({ waitUntil: (p: Promise<unknown>) => (promise = p) });
    await promise;
  };
  const request = async (path: string, mode = "cors", method = "GET", origin = "https://coach.example") => {
    let answer: Promise<{ body: string }> | undefined;
    handlers.fetch({
      request: { method, mode, url: origin + path },
      respondWith: (p: Promise<{ body: string }>) => (answer = p),
    });
    return answer ? (await answer).body : undefined;
  };
  return {
    stores,
    calls,
    handlers,
    waited,
    request,
    setOnline: (v: boolean) => void (online = v),
    flags: () => ({ skipped, claimed }),
  };
}

describe("offline helper", () => {
  it("saves every file when it installs, pages under their short addresses too", async () => {
    const sw = setup();
    await sw.waited("install");
    const saved = sw.stores.get("chess-coach-new")!;
    expect([...saved.keys()].sort()).toEqual(
      [
        "/",
        "/_next/static/a.js",
        "/engine/stockfish.wasm",
        "/index.html",
        "/learn",
        "/learn.html",
        "/learn/",
        "/learn/pawn",
        "/learn/pawn.html",
        "/learn/pawn/",
      ].sort(),
    );
  });

  it("fails the install if a file cannot be fetched, so a half-saved version is never used", async () => {
    const sw = setup({ online: false });
    await expect(sw.waited("install")).rejects.toThrow();
  });

  it("removes saved copies from older versions, but only its own kind", async () => {
    const sw = setup({ existing: ["chess-coach-old", "chess-coach-new", "someone-elses"] });
    await sw.waited("activate");
    expect([...sw.stores.keys()].sort()).toEqual(["chess-coach-new", "someone-elses"]);
    expect(sw.flags().claimed).toBe(true);
  });

  it("only switches to a new version when asked", () => {
    const sw = setup();
    sw.handlers.message({ data: { type: "SOMETHING_ELSE" } });
    expect(sw.flags().skipped).toBe(false);
    sw.handlers.message({ data: { type: "SKIP_WAITING" } });
    expect(sw.flags().skipped).toBe(true);
  });

  it("serves build files from the saved copy without touching the network", async () => {
    const sw = setup();
    await sw.waited("install");
    sw.calls.length = 0;
    expect(await sw.request("/_next/static/a.js?v=1")).toBe("network:/_next/static/a.js");
    expect(sw.calls).toEqual([]);
  });

  it("opens pages from the network when online, and from the saved copy when offline", async () => {
    const sw = setup();
    await sw.waited("install");
    expect(await sw.request("/learn/pawn", "navigate")).toBe("network:/learn/pawn");
    sw.setOnline(false);
    expect(await sw.request("/learn/pawn", "navigate")).toBe("network:/learn/pawn.html");
    expect(await sw.request("/learn", "navigate")).toBe("network:/learn.html");
    expect(await sw.request("/", "navigate")).toBe("network:/index.html");
  });

  it("shows the start page for an address it never saved, rather than an error", async () => {
    const sw = setup();
    await sw.waited("install");
    sw.setOnline(false);
    expect(await sw.request("/nowhere", "navigate")).toBe("network:/index.html");
  });

  it("leaves other addresses and non-GET requests alone", async () => {
    const sw = setup();
    await sw.waited("install");
    expect(await sw.request("/x.js", "cors", "GET", "https://elsewhere.example")).toBeUndefined();
    expect(await sw.request("/learn", "navigate", "POST")).toBeUndefined();
  });
});
