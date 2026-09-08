import { headingDifference } from "@/lib/navigation-geometry";

type CameraFraming = { heading: number; distance: number; height: number; lookAhead: number };

export function frameHelmCamera(previous: CameraFraming | null, heading: number, options: {
  portrait: boolean; choosingMiddle: boolean; reading: boolean; reducedMotion: boolean; sailing: boolean; seconds: number;
}): CameraFraming {
  const { portrait, choosingMiddle, reading } = options;
  const desired = {
    heading,
    distance: reading ? 24 : choosingMiddle ? 34 : portrait ? 29 : 31,
    height: reading ? 32 : portrait ? choosingMiddle ? 78 : 68 : choosingMiddle ? 48 : 36,
    lookAhead: reading ? 5 : 17,
  };
  if (!previous || options.reducedMotion || reading || !options.sailing) return desired;
  const blend = 1 - Math.exp(-Math.max(0, Math.min(options.seconds, 0.05)) * 5);
  return {
    heading: previous.heading + headingDifference(heading, previous.heading) * blend,
    distance: previous.distance + (desired.distance - previous.distance) * blend,
    height: previous.height + (desired.height - previous.height) * blend,
    lookAhead: previous.lookAhead + (desired.lookAhead - previous.lookAhead) * blend,
  };
}
