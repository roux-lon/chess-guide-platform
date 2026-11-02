import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, SMALL_KEY, SmallStore } from "@/storage";
import { FakeKeyValueStore } from "@/storage/testing";
import { PreferencesStore } from "./PreferencesStore";

describe("preferences", () => {
  it("start with sound off and celebrations on", () => {
    expect(DEFAULT_PREFS).toEqual({ sound: false, confetti: true, thinkFirst: "sometimes" });
    const store = new PreferencesStore(new SmallStore(new FakeKeyValueStore()));
    expect(store.getSnapshot()).toEqual(DEFAULT_PREFS);
  });

  it("can be changed, tells listeners, and are remembered", () => {
    const kv = new FakeKeyValueStore();
    const store = new PreferencesStore(new SmallStore(kv));
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ sound: true });
    expect(store.getSnapshot()).toEqual({ ...DEFAULT_PREFS, sound: true });
    expect(listener).toHaveBeenCalledTimes(1);

    const later = new PreferencesStore(new SmallStore(kv));
    expect(later.getSnapshot()).toEqual({ ...DEFAULT_PREFS, sound: true });
    later.update({ confetti: false });
    expect(new SmallStore(kv).getPrefs()).toEqual({ ...DEFAULT_PREFS, sound: true, confetti: false });
  });

  it("picks up saved choices when loaded after the first render", () => {
    const kv = new FakeKeyValueStore();
    const store = new PreferencesStore(new SmallStore(kv));
    new SmallStore(kv).setPrefs({ sound: true });
    const listener = vi.fn();
    store.subscribe(listener);
    store.load();
    expect(store.getSnapshot().sound).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    store.load();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("gives server rendering the defaults whatever was saved", () => {
    const kv = new FakeKeyValueStore();
    new SmallStore(kv).setPrefs({ sound: true, confetti: false });
    expect(new PreferencesStore(new SmallStore(kv)).getServerSnapshot()).toEqual(DEFAULT_PREFS);
  });

  it("ignore broken saved data, and keep only tiny things in browser storage", () => {
    const kv = new FakeKeyValueStore();
    kv.setItem(SMALL_KEY, JSON.stringify({ prefs: { sound: "yes", confetti: 5 } }));
    expect(new PreferencesStore(new SmallStore(kv)).getSnapshot()).toEqual(DEFAULT_PREFS);
    new PreferencesStore(new SmallStore(kv)).update({ sound: true });
    expect(Object.keys(kv.data)).toEqual([SMALL_KEY]);
  });
});
