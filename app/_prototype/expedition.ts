// THROWAWAY: three camera calibrations of the approved Mar aberto direction.
// All coordinates and timings are fictional prototype parameters, not geography.
export type Variant = "A" | "B" | "C";
export type Tier = "high" | "balanced" | "low";
export const variants = {
  A: { name: "Mar aberto", height: 38, behind: 37, ahead: 12, lag: 2.2 },
  B: { name: "Leitura das águas", height: 57, behind: 23, ahead: 14, lag: 3.5 },
  C: { name: "Perto do convés", height: 23, behind: 29, ahead: 10, lag: 2.8 },
};
export const tiers = {
  high: { name: "Alta", dpr: 1.5, segments: 180, detail: 1, wake: 70 },
  balanced: {
    name: "Equilibrada",
    dpr: 1.15,
    segments: 112,
    detail: 0.55,
    wake: 48,
  },
  low: { name: "Leve", dpr: 0.8, segments: 64, detail: 0, wake: 28 },
};
export const stations = [
  {
    name: "Pulso de Calor",
    x: 0,
    z: -32,
    heading: "Uma história que começa na água.",
    pages: [
      "Abrolhos, 2019. Esta expedição revisita um episódio documentado de calor marinho.",
      "O calor é o ponto de partida. Adiante, duas estações permitem olhar para as respostas dos corais em qualquer ordem.",
    ],
  },
  {
    name: "Corais sob Estresse",
    x: -18,
    z: -69,
    heading: "Branquear não é o mesmo que morrer.",
    pages: [
      "O branqueamento é uma resposta ao estresse. Sua ocorrência não significa, por si só, a morte do coral.",
      "Este olhar e o das respostas desiguais fazem parte da mesma história. A ordem do percurso não altera as evidências.",
    ],
  },
  {
    name: "Respostas Desiguais",
    x: 18,
    z: -72,
    heading: "Um evento. Respostas diferentes.",
    pages: [
      "As observações do episódio registram diferenças de mortalidade entre organismos e locais.",
      "Uma mesma exposição ao calor não implica consequências ecológicas iguais. Conecte este olhar ao das outras estações.",
    ],
  },
  {
    name: "Convergência",
    x: 0,
    z: -114,
    heading: "O oceano não cabe em um só sinal.",
    pages: [
      "O calor, o branqueamento e as respostas desiguais se conectam: um evento compartilhado pode ter consequências diferentes.",
      "Você reconectou os olhares desta expedição. As evidências pertencem à pesquisa; o instituto, a embarcação e o percurso são fictícios.",
    ],
  },
] as const;
export const sourceUrl =
  "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full";
export type Expedition = ReturnType<typeof createExpedition>;
export function createExpedition() {
  return {
    x: 0,
    z: 12,
    heading: 0,
    turn: 0,
    input: 0,
    elapsed: 0,
    waveTime: 0,
    completed: [] as number[],
    reading: null as number | null,
    page: 0,
    readingPages: [0, 0, 0, 0],
    coreReached: [] as number[],
    paused: false,
    connected: false,
    grace: 0,
    departing: null as number | null,
    assistance: 0,
    noProgress: 0,
    sampleTime: 0,
    sampleDistance: 44,
    sampleHeading: 0,
    totalTurn: 0,
    visitedWater: new Set<string>(),
    modality: "pointer" as "pointer" | "touch" | "keyboard",
    hidden: false,
    variant: "A" as Variant,
    tier: "balanced" as Tier,
    quality: "auto" as Tier | "auto",
    p90: 0,
    fps: 0,
    dpr: 1,
    drawCalls: 0,
    triangles: 0,
    slowWindows: 0,
    fastWindows: 0,
    performanceTime: 0,
    frameTimes: [] as number[],
    fallback: "",
    ready: false,
    reduced: false,
    cameraHeading: 0,
    history: [] as { x: number; z: number }[],
    wakeTime: 0,
    lastEvent: "A expedição começou.",
    eventSerial: 0,
  };
}
export function available(s: Expedition, i: number) {
  return (
    i === 0 ||
    (i < 3
      ? s.completed.includes(0)
      : [0, 1, 2].every((n) => s.completed.includes(n)))
  );
}
export function nearest(s: Expedition) {
  let result = 0,
    distance = Infinity;
  stations.forEach((p, i) => {
    if (available(s, i) && (!s.completed.includes(i) || s.connected)) {
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      if (d < distance) {
        distance = d;
        result = i;
      }
    }
  });
  return { index: result, distance };
}
export const angleDifference = (target: number, current: number) =>
  Math.atan2(Math.sin(target - current), Math.cos(target - current));
export function event(s: Expedition, text: string) {
  s.lastEvent = text;
  s.eventSerial++;
}
export function reorient(s: Expedition) {
  const p = stations[nearest(s).index];
  s.heading = Math.atan2(p.x - s.x, -(p.z - s.z));
  s.turn = 0;
  s.input = 0;
  s.noProgress = 0;
  s.assistance = 0;
  event(s, "Rota reorientada. O leme está com você.");
}
export function continueExpedition(s: Expedition) {
  if (s.reading === null) return;
  const station = s.reading;
  if (!s.completed.includes(station)) s.completed.push(station);
  if (station === 3) s.connected = true;
  s.departing = station;
  s.reading = null;
  s.page = 0;
  s.grace = 1.2;
  s.input = 0;
  s.turn = 0;
  s.noProgress = 0;
  s.assistance = 0;
  s.sampleTime = 0;
  s.sampleDistance = nearest(s).distance;
  event(
    s,
    s.connected
      ? "Expedição conectada."
      : station === 0
        ? "Duas estações se revelam nas águas."
        : available(s, 3)
          ? "Convergência se iluminou. Conduza a embarcação até lá."
          : "Estação concluída. Continue a expedição.",
  );
}
export function step(s: Expedition, delta: number, portrait: boolean) {
  if (!s.ready || s.paused || s.hidden || s.reading !== null || s.fallback)
    return;
  const dt = Math.min(delta, 0.05);
  s.elapsed += dt;
  s.waveTime += dt;
  if (s.grace > 0) {
    s.grace -= dt;
    return;
  }
  s.turn += (s.input * 0.62 - s.turn) * (1 - Math.exp(-dt * 5));
  s.heading += s.turn * dt;
  s.totalTurn += Math.abs(s.turn * dt);
  const boundaryDistance = Math.hypot(s.x, s.z + 50);
  if (boundaryDistance > 87) {
    const inward = Math.atan2(-s.x, s.z + 50);
    s.heading += Math.max(
      -0.95 * dt,
      Math.min(0.95 * dt, angleDifference(inward, s.heading)),
    );
    s.assistance = 3;
  }
  const closest = nearest(s);
  let speed = 3.1;
  const approach = portrait ? 9 : 7.5;
  stations.forEach((p, i) => {
    if (!available(s, i)) return;
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (s.departing === i) {
      if (d > approach + 4) s.departing = null;
      return;
    }
    const target = Math.atan2(p.x - s.x, -(p.z - s.z));
    if (
      d < approach + 3 &&
      Math.abs(angleDifference(target, s.heading)) < 0.8
    ) {
      speed = 1.6;
      if (Math.abs(s.input) < 0.1)
        s.heading += angleDifference(target, s.heading) * dt * 0.65;
      if (d < approach) {
        s.reading = i;
        s.page = s.readingPages[i];
        s.input = 0;
        s.turn = 0;
        event(s, `Chegada: ${p.name}.`);
      }
    }
  });
  if (s.reading !== null) return;
  s.x += Math.sin(s.heading) * speed * dt;
  s.z -= Math.cos(s.heading) * speed * dt;
  s.wakeTime += dt;
  if (s.wakeTime > 0.12) {
    s.wakeTime = 0;
    s.history.unshift({ x: s.x, z: s.z });
    if (s.history.length > 90) s.history.pop();
  }
  s.sampleTime += dt;
  if (s.sampleTime > 4) {
    const tile = `${Math.floor(s.x / 15)},${Math.floor(s.z / 15)}`;
    const newWater = !s.visitedWater.has(tile);
    s.visitedWater.add(tile);
    const progress = closest.distance < s.sampleDistance - 2;
    const away = closest.distance > s.sampleDistance + 3;
    const circling = s.totalTurn > 1.8 && !newWater;
    if (progress || (newWater && boundaryDistance < 85 && !away))
      s.noProgress = 0;
    else if (
      away ||
      circling ||
      boundaryDistance > 87 ||
      (!newWater && Math.abs(s.input) < 0.05)
    )
      s.noProgress += s.sampleTime;
    else s.noProgress = Math.max(0, s.noProgress - s.sampleTime);
    s.assistance =
      boundaryDistance > 87
        ? 3
        : s.noProgress >= 16
          ? 2
          : s.noProgress >= 8
            ? 1
            : 0;
    s.sampleDistance = closest.distance;
    s.sampleTime = 0;
    s.totalTurn = 0;
  }
}
export function measure(s: Expedition, dt: number) {
  if (
    !s.ready ||
    s.paused ||
    s.hidden ||
    s.reading !== null ||
    s.fallback ||
    dt <= 0 ||
    dt > 0.5
  )
    return;
  s.frameTimes.push(dt * 1000);
  s.performanceTime += dt;
  if (s.performanceTime < 5) return;
  const times = s.frameTimes.sort((a, b) => a - b);
  s.p90 = times[Math.floor((times.length - 1) * 0.9)];
  s.fps = times.length / s.performanceTime;
  if (s.quality === "auto") {
    s.slowWindows = s.p90 > 33.3 ? s.slowWindows + 1 : 0;
    s.fastWindows = s.p90 < 19 ? s.fastWindows + 1 : 0;
    if (s.slowWindows >= 2) {
      if (s.tier === "low")
        s.fallback =
          "O oceano está exigindo mais deste dispositivo. Continue pela leitura.";
      else s.tier = s.tier === "high" ? "balanced" : "low";
      s.slowWindows = 0;
      s.fastWindows = 0;
    } else if (s.fastWindows >= 6 && s.tier !== "high") {
      s.tier = s.tier === "low" ? "balanced" : "high";
      s.fastWindows = 0;
    }
  }
  s.frameTimes = [];
  s.performanceTime = 0;
}
