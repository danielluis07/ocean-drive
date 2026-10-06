export const SOUND_STORAGE_KEY = "ocean-drive:sound:v1";
export const AMBIENT_SOUND_URL = "/audio/ocean-engine.v1.wav";
export const SOUND_FADE_SECONDS = 0.35;
export const SOUND_GAIN = 0.22;

// One decoded, gapless buffer per visit. Nothing is allocated or fetched until
// enabled; gain automation keeps fading even when background timers slow down.
export function createAmbientSound(onFailure: () => void) {
  let context: AudioContext | null = null;
  let gain: GainNode | null = null;
  let source: AudioBufferSourceNode | null = null;
  let loading: Promise<void> | null = null;
  let wanted = false;
  let disposed = false;
  let suspension: ReturnType<typeof setTimeout> | undefined;
  let rampFrom = 0;
  let rampTo = 0;
  let rampStart = 0;
  const abort = new AbortController();

  function fade(value: number) {
    if (!context || !gain) return;
    const now = context.currentTime;
    // Compute our linear envelope explicitly: cancelAndHoldAtTime is still
    // unavailable in Firefox. Keep rapid reversals continuous in every engine.
    const progress = Math.min(1, Math.max(0, (now - rampStart) / SOUND_FADE_SECONDS));
    const held = rampFrom + (rampTo - rampFrom) * progress;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(held, now);
    gain.gain.linearRampToValueAtTime(value, now + SOUND_FADE_SECONDS);
    rampFrom = held;
    rampTo = value;
    rampStart = now;
  }

  function setActive(active: boolean) {
    wanted = active;
    clearTimeout(suspension);
    if (!active) {
      fade(0);
      if (context) suspension = setTimeout(() => {
        if (!wanted && !disposed && context && gain) {
          // Audio and wall clocks can drift slightly; guarantee silence before
          // freezing the context so no residual gain survives suspension.
          const now = context.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(0, now);
          rampFrom = rampTo = 0;
          rampStart = now;
          void context.suspend().catch(() => {});
        }
      }, SOUND_FADE_SECONDS * 1000 + 50);
      return;
    }
    try {
      context ??= new AudioContext();
      if (!gain) {
        gain = context.createGain();
        gain.gain.value = 0;
        gain.connect(context.destination);
      }
      // Called synchronously from the toggle to retain browser user activation.
      const resumed = context.resume();
      loading ??= (async () => {
        const response = await fetch(AMBIENT_SOUND_URL, { signal: abort.signal });
        if (!response.ok) throw new Error("Ambient audio request failed");
        const buffer = await context!.decodeAudioData(await response.arrayBuffer());
        if (disposed) return;
        source = context!.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain!);
        source.start();
      })().catch(error => {
        loading = null;
        throw error;
      });
      void Promise.all([resumed, loading]).then(() => {
        if (wanted && !disposed) fade(SOUND_GAIN);
      }).catch(() => {
        if (disposed) return;
        setActive(false);
        onFailure();
      });
    } catch {
      setActive(false);
      onFailure();
    }
  }

  return {
    setActive,
    dispose() {
      disposed = true;
      wanted = false;
      clearTimeout(suspension);
      abort.abort();
      source?.stop();
      source?.disconnect();
      gain?.disconnect();
      void context?.close().catch(() => {});
    },
  };
}
