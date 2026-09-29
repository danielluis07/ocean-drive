// Times the ocean's render on the GPU with EXT_disjoint_timer_query_webgl2.
// Results arrive a few frames late, so a small ring of queries is polled each
// frame. A frame whose queries are all still in flight goes unmeasured rather
// than stalling the pipeline to read one back.

type TimerQueryExtension = { TIME_ELAPSED_EXT: GLenum; GPU_DISJOINT_EXT: GLenum };
type Slot = { query: WebGLQuery; pending: boolean; valid: boolean };

export type GpuTimer = {
  // Starts timing this frame's render; false when no query is free.
  begin: () => boolean;
  end: () => void;
  // The oldest finished measurement in milliseconds, or null when none is ready.
  poll: () => number | null;
  // Discards every measurement still in flight, e.g. across a pause.
  reset: () => void;
  dispose: () => void;
};

const RING_SIZE = 4;

// Null when the browser cannot time GPU work (Safari, some Firefox builds, many
// phones); the quality controller then falls back to frame intervals alone.
export function createGpuTimer(context: WebGL2RenderingContext): GpuTimer | null {
  const extension = context.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQueryExtension | null;
  if (!extension) return null;
  const slots: Slot[] = [];
  for (let index = 0; index < RING_SIZE; index++) {
    const query = context.createQuery();
    if (!query) {
      for (const slot of slots) context.deleteQuery(slot.query);
      return null;
    }
    slots.push({ query, pending: false, valid: false });
  }
  // Issue order, so results are read back oldest first.
  const inFlight: Slot[] = [];
  let active: Slot | null = null;
  const invalidate = () => { for (const slot of inFlight) slot.valid = false; };
  return {
    begin() {
      if (active) return false;
      const slot = slots.find((candidate) => !candidate.pending);
      if (!slot) return false;
      // Reading the flag clears it, so a disjoint event from before this query cannot void it.
      context.getParameter(extension.GPU_DISJOINT_EXT);
      context.beginQuery(extension.TIME_ELAPSED_EXT, slot.query);
      slot.pending = true;
      slot.valid = true;
      active = slot;
      return true;
    },
    end() {
      if (!active) return;
      context.endQuery(extension.TIME_ELAPSED_EXT);
      inFlight.push(active);
      active = null;
    },
    poll() {
      while (inFlight.length > 0) {
        const oldest = inFlight[0];
        if (!context.getQueryParameter(oldest.query, context.QUERY_RESULT_AVAILABLE)) return null;
        inFlight.shift();
        oldest.pending = false;
        // A disjoint event (clock change, context switch, power state) makes
        // every result in flight unreliable, not only the one just read.
        if (context.getParameter(extension.GPU_DISJOINT_EXT)) {
          invalidate();
          continue;
        }
        if (!oldest.valid) continue;
        const nanoseconds = context.getQueryParameter(oldest.query, context.QUERY_RESULT) as number;
        return nanoseconds / 1e6;
      }
      return null;
    },
    reset: invalidate,
    dispose() {
      if (active) context.endQuery(extension.TIME_ELAPSED_EXT);
      active = null;
      inFlight.length = 0;
      for (const slot of slots) context.deleteQuery(slot.query);
    },
  };
}
