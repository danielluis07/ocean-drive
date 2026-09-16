import { describe, expect, test } from "bun:test";

import {
  arrivalStopId,
  createInitialVoyageState,
  loadVoyageState,
  restoreVoyageState,
  saveVoyageState,
  serializeVoyageState,
  transitionVoyage,
  VOYAGE_STORAGE_KEY,
  type VoyageAction,
  type VoyageState,
} from "@/lib/voyage-state";

function apply(state: VoyageState, ...actions: VoyageAction[]) {
  return actions.reduce(transitionVoyage, state);
}

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("Voyage transitions", () => {
  test("every Stop is reachable from the start, in any order", () => {
    for (const stop of ["ilha-grande", "abrolhos", "fernando-de-noronha", "boipeba"] as const) {
      const state = transitionVoyage(createInitialVoyageState(), { type: "arrive-at-stop", stop });
      expect(state.currentStop).toBe(stop);
    }
  });

  test("arriving at a Stop records the Ship's place on the route", () => {
    const state = transitionVoyage(createInitialVoyageState(), { type: "arrive-at-stop", stop: "boipeba" });
    expect(state.routeProgress).toBe(2);
    expect(state.complete).toBe(false);
  });

  test("reaching the Arrival completes the Voyage regardless of Visited Stops", () => {
    const initial = createInitialVoyageState();
    const arrived = transitionVoyage(initial, { type: "arrive-at-stop", stop: arrivalStopId });
    expect(arrived.visitedStops).toEqual([]);
    expect(arrived.complete).toBe(true);
    // Sailing back keeps the Voyage complete.
    expect(transitionVoyage(arrived, { type: "arrive-at-stop", stop: "abrolhos" }).complete).toBe(true);
  });

  test("opening a Stop Account records a Visited Stop once, without moving the Ship", () => {
    const state = apply(
      createInitialVoyageState(),
      { type: "visit-stop", stop: "abrolhos" },
      { type: "visit-stop", stop: "fernando-de-noronha" },
      { type: "visit-stop", stop: "abrolhos" },
    );
    expect(state.visitedStops).toEqual(["abrolhos", "fernando-de-noronha"]);
    expect(state.currentStop).toBe("partida");
    expect(state.routeProgress).toBe(0);
    expect(state.complete).toBe(false);
  });

  test("route progress is clamped to the route and ignores invalid values", () => {
    const initial = createInitialVoyageState();
    expect(transitionVoyage(initial, { type: "set-route-progress", progress: 2.4 }).routeProgress).toBe(2.4);
    expect(transitionVoyage(initial, { type: "set-route-progress", progress: 12 }).routeProgress).toBe(4);
    expect(transitionVoyage(initial, { type: "set-route-progress", progress: -1 }).routeProgress).toBe(0);
    expect(transitionVoyage(initial, { type: "set-route-progress", progress: Number.NaN })).toBe(initial);
  });

  test("restart clears the Voyage but keeps the visit's presentation and 3D lock", () => {
    const state = apply(
      createInitialVoyageState(),
      { type: "arrive-at-stop", stop: arrivalStopId },
      { type: "visit-stop", stop: "boipeba" },
      { type: "lock-three-d", reason: "context-loss" },
      { type: "restart-voyage" },
    );
    expect(state).toEqual({
      ...createInitialVoyageState(),
      threeDAvailability: { status: "unavailable", reason: "context-loss" },
    });
  });

  test("one context restoration preserves the Voyage and a second loss locks 3D across restart and reload", () => {
    const original = apply(
      createInitialVoyageState(),
      { type: "arrive-at-stop", stop: "abrolhos" },
      { type: "visit-stop", stop: "abrolhos" },
      { type: "set-presentation", presentation: "three-dimensional" },
    );
    const lost = transitionVoyage(original, { type: "lose-context" });
    expect(lost.threeDAvailability.status).toBe("restoring");
    expect(lost.presentation).toBe("editorial");
    expect(lost.visitedStops).toEqual(original.visitedStops);
    expect(lost.routeProgress).toBe(original.routeProgress);
    expect(transitionVoyage(lost, { type: "set-presentation", presentation: "three-dimensional" })).toBe(lost);
    const restored = transitionVoyage(lost, { type: "restore-context" });
    expect(restored.threeDAvailability.status).toBe("available");
    const reloaded = restoreVoyageState(serializeVoyageState(restored));
    const restarted = apply(reloaded, { type: "lose-context" }, { type: "restart-voyage" });
    expect(restarted.threeDAvailability).toEqual({ status: "unavailable", reason: "context-loss" });
    expect(transitionVoyage(restarted, { type: "restore-context" })).toBe(restarted);
    expect(restoreVoyageState(serializeVoyageState(lost)).threeDAvailability).toEqual({ status: "unavailable", reason: "context-loss" });
  });

  test("3D cannot be entered while unavailable", () => {
    const locked = transitionVoyage(createInitialVoyageState(), { type: "lock-three-d", reason: "unsupported" });
    expect(transitionVoyage(locked, { type: "set-presentation", presentation: "three-dimensional" })).toBe(locked);
  });
});

describe("Voyage State persistence", () => {
  test("round-trips the current Stop, Visited Stops, completion, and route place", () => {
    const state = apply(
      createInitialVoyageState(),
      { type: "arrive-at-stop", stop: arrivalStopId },
      { type: "visit-stop", stop: "boipeba" },
      { type: "arrive-at-stop", stop: "abrolhos" },
      { type: "set-route-progress", progress: 2.6 },
      { type: "set-quality-preference", qualityPreference: "reduced-3d" },
      { type: "set-presentation", presentation: "three-dimensional" },
    );
    const storage = memoryStorage();
    expect(saveVoyageState(storage, state)).toBe(true);
    const restored = loadVoyageState(storage);
    expect(restored).toEqual(state);
    expect(restored).toMatchObject({ currentStop: "abrolhos", visitedStops: ["boipeba"], complete: true, routeProgress: 2.6 });
  });

  test("is tab-scoped under one versioned key", () => {
    const storage = memoryStorage();
    saveVoyageState(storage, createInitialVoyageState());
    expect(JSON.parse(storage.getItem(VOYAGE_STORAGE_KEY)!).version).toBe(1);
  });

  test.each([
    ["malformed JSON", "{"],
    ["incompatible version", JSON.stringify({ version: 2, state: createInitialVoyageState() })],
    ["incomplete shape", JSON.stringify({ version: 1, state: { complete: true } })],
    ["unknown Stop", JSON.stringify({ version: 1, state: { ...createInitialVoyageState(), currentStop: "convergencia" } })],
    ["duplicate Visited Stops", JSON.stringify({ version: 1, state: { ...createInitialVoyageState(), visitedStops: ["boipeba", "boipeba"] } })],
    ["off-route progress", JSON.stringify({ version: 1, state: { ...createInitialVoyageState(), routeProgress: 7 } })],
    ["an Arrival without completion", JSON.stringify({ version: 1, state: { ...createInitialVoyageState(), currentStop: arrivalStopId, routeProgress: 4 } })],
    ["legacy Expedition State", JSON.stringify({ version: 1, state: { currentStation: "pulso-de-calor", middleOrder: [], connected: false } })],
  ])("rejects %s safely", (_label, value) => {
    expect(restoreVoyageState(value)).toEqual(createInitialVoyageState());
  });

  test("remains usable when storage reads and writes throw", () => {
    const unavailableStorage = {
      getItem(): string | null {
        throw new Error("unavailable");
      },
      setItem() {
        throw new Error("unavailable");
      },
    };
    expect(loadVoyageState(unavailableStorage)).toEqual(createInitialVoyageState());
    expect(saveVoyageState(unavailableStorage, createInitialVoyageState())).toBe(false);
  });
});
