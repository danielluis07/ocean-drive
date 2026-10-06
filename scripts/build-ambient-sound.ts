import { mkdir } from "node:fs/promises";
import { ambientSoundBudget } from "@/lib/production-budgets";

// Original synthetic ocean wash and distant diesel harmonics. Circular filters
// and integer-period modulation make the boundary an ordinary adjacent sample.
const rate = 12_000;
const seconds = 12;
const count = rate * seconds;
let seed = 42;
const noise = Float64Array.from({ length: count }, () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
});
function filter(input: Float64Array, cutoff: number) {
  const decay = Math.exp(-2 * Math.PI * cutoff / rate);
  let previous = 0;
  for (const sample of input) previous = decay * previous + (1 - decay) * sample;
  previous /= 1 - decay ** input.length;
  return input.map((sample) => {
    previous = decay * previous + (1 - decay) * sample;
    return previous;
  });
}
const soft = filter(filter(noise, 1000), 1000);
const low = filter(soft, 110);
const samples = soft.map((sample, index) => {
  const phase = 2 * Math.PI * index / count;
  const wash = (sample - low[index]) * (0.28 + 0.1 * Math.sin(phase * 2) + 0.05 * Math.sin(phase * 3 + 1));
  const enginePhase = phase * 660 + 0.18 * Math.sin(phase);
  const engine = (Math.sin(enginePhase) + 0.3 * Math.sin(enginePhase * 2) + 0.12 * Math.sin(enginePhase * 3)) * 0.028;
  return wash + engine;
});
const bytes = Buffer.alloc(44 + count * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(rate, 24);
bytes.writeUInt32LE(rate * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(count * 2, 40);
for (let index = 0; index < count; index++) bytes.writeInt16LE(Math.round(samples[index] * 32767), 44 + index * 2);
if (bytes.length > ambientSoundBudget) throw new Error("Ambient audio exceeds transfer budget");
await mkdir("public/audio", { recursive: true });
await Bun.write("public/audio/ocean-engine.v1.wav", bytes);
console.log(`Ambient loop: ${bytes.length} bytes, ${seconds}s, mono PCM ${rate}Hz.`);
