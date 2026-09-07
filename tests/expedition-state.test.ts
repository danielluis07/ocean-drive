import { describe, expect, test } from "bun:test";

import {
  createInitialExpeditionState,
  loadExpeditionState,
  restoreExpeditionState,
  saveExpeditionState,
  serializeExpeditionState,
  transitionExpedition,
  type ExpeditionState,
} from "@/lib/expedition-state";

function reachConvergence(
  firstMiddle:
    | "corais-sob-estresse"
    | "respostas-desiguais" = "corais-sob-estresse",
) {
  const secondMiddle =
    firstMiddle === "corais-sob-estresse"
      ? "respostas-desiguais"
      : "corais-sob-estresse";
  let state = createInitialExpeditionState();
  const act = (action: Parameters<typeof transitionExpedition>[1]) => {
    state = transitionExpedition(state, action);
  };

  act({ type: "set-bookmark", station: "pulso-de-calor", passage: 2 });
  act({ type: "complete-station", station: "pulso-de-calor" });
  act({ type: "open-station", station: firstMiddle });
  act({ type: "set-bookmark", station: firstMiddle, passage: 2 });
  act({ type: "complete-station", station: firstMiddle });
  act({ type: "set-bookmark", station: secondMiddle, passage: 2 });
  act({ type: "complete-station", station: secondMiddle });
  return state;
}

describe("Expedition transitions", () => {
  test.each([
    ["corais-sob-estresse", ["corais-sob-estresse", "respostas-desiguais"]],
    ["respostas-desiguais", ["respostas-desiguais", "corais-sob-estresse"]],
  ] as const)(
    "records the legal middle order when %s is chosen first",
    (firstMiddle, expectedOrder) => {
      let state = createInitialExpeditionState();

      state = transitionExpedition(state, {
        type: "set-bookmark",
        station: "pulso-de-calor",
        passage: 2,
      });
      state = transitionExpedition(state, {
        type: "complete-station",
        station: "pulso-de-calor",
      });
      state = transitionExpedition(state, {
        type: "open-station",
        station: firstMiddle,
      });

      expect(state.middleOrder).toEqual([...expectedOrder]);
      expect(state.currentStation).toBe(firstMiddle);
    },
  );

  test.each([
    ["corais-sob-estresse", "respostas-desiguais"],
    ["respostas-desiguais", "corais-sob-estresse"],
  ] as const)(
    "unlocks Convergência after completing the %s then %s route",
    (firstMiddle, secondMiddle) => {
      let state = createInitialExpeditionState();

      state = transitionExpedition(state, {
        type: "set-bookmark",
        station: "pulso-de-calor",
        passage: 2,
      });
      state = transitionExpedition(state, {
        type: "complete-station",
        station: "pulso-de-calor",
      });
      state = transitionExpedition(state, {
        type: "open-station",
        station: firstMiddle,
      });
      state = transitionExpedition(state, {
        type: "set-bookmark",
        station: firstMiddle,
        passage: 2,
      });
      state = transitionExpedition(state, {
        type: "complete-station",
        station: firstMiddle,
      });
      state = transitionExpedition(state, {
        type: "set-bookmark",
        station: secondMiddle,
        passage: 2,
      });
      state = transitionExpedition(state, {
        type: "complete-station",
        station: secondMiddle,
      });

      expect(state.currentStation).toBe("convergencia");
      expect(state.completedStations).toEqual([
        "pulso-de-calor",
        firstMiddle,
        secondMiddle,
      ]);
    },
  );

  test("keeps Convergência locked until every evidence station is complete", () => {
    const initial = createInitialExpeditionState();

    expect(
      transitionExpedition(initial, {
        type: "open-station",
        station: "convergencia",
      }),
    ).toBe(initial);
  });

  test("3D evidence completion unlocks destinations without opening them or moving the vessel", () => {
    let state = transitionExpedition(createInitialExpeditionState(), {
      type: "set-presentation", presentation: "three-dimensional",
    });
    for (const station of ["pulso-de-calor", "respostas-desiguais", "corais-sob-estresse"] as const) {
      state = transitionExpedition(state, { type: "open-station", station });
      state = transitionExpedition(state, { type: "set-bookmark", station, passage: 2 });
      const before = state;
      state = transitionExpedition(state, { type: "complete-station", station });
      expect(state.currentStation).toBe(station);
      expect(state.vesselCheckpoints).toEqual(before.vesselCheckpoints);
      expect(state.pauseState).toBe("paused");
    }
    expect(state.completedStations).toEqual(["pulso-de-calor", "respostas-desiguais", "corais-sob-estresse"]);
    expect(transitionExpedition(state, { type: "connect-expedition" }).connected).toBe(false);
    state = transitionExpedition(state, { type: "open-station", station: "convergencia" });
    expect(transitionExpedition(state, { type: "connect-expedition" }).connected).toBe(false);
    state = transitionExpedition(state, { type: "set-bookmark", station: "convergencia", passage: 2 });
    expect(transitionExpedition(state, { type: "connect-expedition" }).connected).toBe(true);
  });

  test("rejects completion until the current station's final passage and explicit action", () => {
    const initial = createInitialExpeditionState();
    const afterReading = transitionExpedition(initial, {
      type: "set-bookmark",
      station: "pulso-de-calor",
      passage: 1,
    });

    expect(
      transitionExpedition(initial, {
        type: "complete-station",
        station: "corais-sob-estresse",
      }),
    ).toBe(initial);
    expect(
      transitionExpedition(afterReading, {
        type: "complete-station",
        station: "pulso-de-calor",
      }),
    ).toBe(afterReading);
    expect(afterReading.completedStations).toEqual([]);
  });

  test("rejects sailing outside an available 3D presentation", () => {
    const initial = createInitialExpeditionState();
    const locked = transitionExpedition(initial, {
      type: "lock-three-d",
      reason: "unsupported",
    });

    expect(
      transitionExpedition(initial, {
        type: "set-pause-state",
        pauseState: "sailing",
      }),
    ).toBe(initial);
    expect(
      transitionExpedition(locked, {
        type: "set-presentation",
        presentation: "three-dimensional",
      }),
    ).toBe(locked);
  });

  test("connects only from the final Convergência passage through the explicit action", () => {
    const atConvergence = reachConvergence();
    const passiveAttempt = transitionExpedition(atConvergence, {
      type: "connect-expedition",
    });
    const atFinalPassage = transitionExpedition(atConvergence, {
      type: "set-bookmark",
      station: "convergencia",
      passage: 2,
    });
    const connected = transitionExpedition(atFinalPassage, {
      type: "connect-expedition",
    });

    expect(passiveAttempt).toBe(atConvergence);
    expect(connected.connected).toBe(true);
  });

  test("preserves a bookmark when revisiting a completed Field Station", () => {
    const atConvergence = reachConvergence();
    const revisiting = transitionExpedition(atConvergence, {
      type: "open-station",
      station: "pulso-de-calor",
    });
    const bookmarked = transitionExpedition(revisiting, {
      type: "set-bookmark",
      station: "pulso-de-calor",
      passage: 1,
    });
    const returned = transitionExpedition(bookmarked, {
      type: "open-station",
      station: "convergencia",
    });
    const revisitedAgain = transitionExpedition(returned, {
      type: "open-station",
      station: "pulso-de-calor",
    });

    expect(revisitedAgain.bookmarks["pulso-de-calor"]).toBe(1);
    expect(revisitedAgain.completedStations).toContain("pulso-de-calor");
  });

  test("restart clears progress but keeps the active visit's 3D failure lock", () => {
    let state: ExpeditionState = reachConvergence();
    state = transitionExpedition(state, {
      type: "lock-three-d",
      reason: "context-loss",
    });
    state = transitionExpedition(state, { type: "restart-expedition" });

    expect(state.currentStation).toBe("pulso-de-calor");
    expect(state.bookmarks).toEqual({
      "pulso-de-calor": 0,
      "corais-sob-estresse": 0,
      "respostas-desiguais": 0,
      convergencia: 0,
    });
    expect(state.completedStations).toEqual([]);
    expect(state.middleOrder).toEqual([]);
    expect(state.connected).toBe(false);
    expect(state.threeDAvailability).toEqual({
      status: "unavailable",
      reason: "context-loss",
    });
  });
});

describe("Expedition persistence", () => {
  test("restores a valid Expedition paused", () => {
    const threeDimensionalState = transitionExpedition(
      createInitialExpeditionState(),
      {
        type: "set-presentation",
        presentation: "three-dimensional",
      },
    );
    const sailingState = transitionExpedition(threeDimensionalState, {
      type: "set-pause-state",
      pauseState: "sailing",
    });

    const restored = restoreExpeditionState(
      serializeExpeditionState(sailingState),
    );

    expect(restored.pauseState).toBe("paused");
  });

  test.each([
    ["malformed JSON", "{"],
    [
      "incompatible version",
      JSON.stringify({ version: 2, state: createInitialExpeditionState() }),
    ],
    [
      "incomplete shape",
      JSON.stringify({ version: 1, state: { connected: true } }),
    ],
    [
      "passive completion",
      JSON.stringify({
        version: 1,
        state: { ...createInitialExpeditionState(), connected: true },
      }),
    ],
    [
      "invalid middle order",
      JSON.stringify({
        version: 1,
        state: {
          ...createInitialExpeditionState(),
          middleOrder: ["corais-sob-estresse"],
        },
      }),
    ],
  ])("rejects %s safely", (_label, value) => {
    expect(restoreExpeditionState(value)).toEqual(
      createInitialExpeditionState(),
    );
  });

  test("round-trips every renderer-independent field while forcing pause", () => {
    let state = transitionExpedition(createInitialExpeditionState(), {
      type: "checkpoint-vessel",
      checkpoint: "pulso-de-calor",
      pose: { position: { x: 12.5, z: -4 }, heading: 1.2 },
    });
    state = transitionExpedition(state, {
      type: "set-quality-preference",
      qualityPreference: "reduced-3d",
    });
    state = transitionExpedition(state, {
      type: "set-presentation",
      presentation: "three-dimensional",
    });
    state = transitionExpedition(state, {
      type: "set-pause-state",
      pauseState: "sailing",
    });

    const restored = restoreExpeditionState(serializeExpeditionState(state));

    expect(restored).toEqual({ ...state, pauseState: "paused" });
  });

  test("remains usable when storage reads and writes throw", () => {
    const unavailableStorage = {
      getItem() {
        throw new Error("unavailable");
      },
      setItem() {
        throw new Error("unavailable");
      },
    };

    expect(loadExpeditionState(unavailableStorage)).toEqual(
      createInitialExpeditionState(),
    );
    expect(saveExpeditionState(unavailableStorage, reachConvergence())).toBe(
      false,
    );
  });
});
