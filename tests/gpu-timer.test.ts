import { expect, test } from "bun:test";
import { createGpuTimer } from "@/lib/gpu-timer";

const TIME_ELAPSED_EXT = 0x88bf;
const GPU_DISJOINT_EXT = 0x8fbb;
const QUERY_RESULT = 0x8866;
const QUERY_RESULT_AVAILABLE = 0x8867;

function fakeContext(options: { extension?: boolean } = {}) {
  let next = 0;
  const results = new Map<number, { ns: number; available: boolean }>();
  const state = { disjoint: false, active: null as number | null, deleted: 0, elapsedNs: 5e6 };
  const context = {
    QUERY_RESULT,
    QUERY_RESULT_AVAILABLE,
    getExtension: (name: string) => options.extension === false || name !== "EXT_disjoint_timer_query_webgl2" ? null : { TIME_ELAPSED_EXT, GPU_DISJOINT_EXT },
    createQuery: () => ({ id: next++ }),
    deleteQuery: () => { state.deleted++; },
    beginQuery: (target: number, query: { id: number }) => {
      expect(target).toBe(TIME_ELAPSED_EXT);
      expect(state.active).toBeNull();
      state.active = query.id;
    },
    endQuery: () => {
      results.set(state.active!, { ns: state.elapsedNs, available: false });
      state.active = null;
    },
    getParameter: (name: number) => {
      expect(name).toBe(GPU_DISJOINT_EXT);
      const disjoint = state.disjoint;
      state.disjoint = false;
      return disjoint;
    },
    getQueryParameter: (query: { id: number }, name: number) => {
      const result = results.get(query.id)!;
      return name === QUERY_RESULT_AVAILABLE ? result.available : result.ns;
    },
  };
  const finish = () => { for (const result of results.values()) result.available = true; };
  return { context: context as unknown as WebGL2RenderingContext, state, finish };
}

test("no extension means no timer, so the controller keeps frame intervals", () => {
  expect(createGpuTimer(fakeContext({ extension: false }).context)).toBeNull();
});

test("results are read back oldest first, one per poll, in milliseconds", () => {
  const { context, state, finish } = fakeContext();
  const timer = createGpuTimer(context)!;
  for (const ns of [4e6, 6e6]) {
    state.elapsedNs = ns;
    expect(timer.begin()).toBe(true);
    timer.end();
  }
  expect(timer.poll()).toBeNull();
  finish();
  expect(timer.poll()).toBe(4);
  expect(timer.poll()).toBe(6);
  expect(timer.poll()).toBeNull();
});

test("a full ring skips timing instead of waiting on the GPU", () => {
  const { context, finish } = fakeContext();
  const timer = createGpuTimer(context)!;
  for (let frame = 0; frame < 4; frame++) {
    expect(timer.begin()).toBe(true);
    timer.end();
  }
  expect(timer.begin()).toBe(false);
  finish();
  expect(timer.poll()).toBe(5);
  expect(timer.begin()).toBe(true);
  timer.end();
});

test("a disjoint event discards every result in flight", () => {
  const { context, state, finish } = fakeContext();
  const timer = createGpuTimer(context)!;
  for (let frame = 0; frame < 3; frame++) {
    timer.begin();
    timer.end();
  }
  finish();
  state.disjoint = true;
  expect(timer.poll()).toBeNull();
  timer.begin();
  timer.end();
  finish();
  expect(timer.poll()).toBe(5);
});

test("reset discards measurements from before a pause, and dispose releases the ring", () => {
  const { context, state, finish } = fakeContext();
  const timer = createGpuTimer(context)!;
  timer.begin();
  timer.end();
  timer.reset();
  finish();
  expect(timer.poll()).toBeNull();
  timer.dispose();
  expect(state.deleted).toBe(4);
});
