/**
 * Gera os efeitos sonoros da app mobile (WAV) a partir das mesmas receitas da web
 * (@stp/config/sounds): mesmas notas, ataque rápido + decaimento exponencial, volume geral
 * 0,55 e filtro passa-baixo a 6,5 kHz. Uso: pnpm exec tsx scripts/render-sounds.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Note, SOUND_RECIPES, type SoundName } from "../packages/config/src/sounds.ts";

const RATE = 44_100;
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "mobile", "assets", "sounds");
/** Só os sons que a app mobile usa por agora (a Arena vem depois). */
const NAMES: SoundName[] = ["tap", "select", "correct", "wrong", "complete", "levelUp", "streak", "coins"];

function wave(type: Note["type"], phase: number) {
  const x = phase - Math.floor(phase); // 0..1
  switch (type ?? "sine") {
    case "triangle":
      return 1 - 4 * Math.abs(x - 0.5);
    case "square":
      return x < 0.5 ? 1 : -1;
    case "sawtooth":
      return 2 * x - 1;
    default:
      return Math.sin(2 * Math.PI * x);
  }
}

function render(notes: Note[]): Float32Array {
  const length = Math.max(...notes.map((n) => (n.t ?? 0) + n.d)) + 0.05;
  const buf = new Float32Array(Math.ceil(length * RATE));
  for (const n of notes) {
    const start = Math.floor((n.t ?? 0) * RATE);
    const total = Math.floor(n.d * RATE);
    const attack = Math.max(1, Math.floor(Math.min(0.012, n.d / 4) * RATE));
    const peak = n.g ?? 0.2;
    let phase = 0;
    for (let i = 0; i < total; i++) {
      const p = i / total;
      const f = n.to ? n.f * (n.to / n.f) ** p : n.f; // deslize exponencial, como na web
      phase += f / RATE;
      // Envolvente exponencial 0,0001 → pico → 0,0001 (sem cliques).
      const env =
        i < attack
          ? 0.0001 * (peak / 0.0001) ** (i / attack)
          : peak * (0.0001 / peak) ** ((i - attack) / Math.max(1, total - attack));
      buf[start + i]! += wave(n.type, phase) * env;
    }
  }
  // Volume geral + passa-baixo de 1 polo (suaviza os agudos, como o BiquadFilter da web).
  const k = 1 - Math.exp((-2 * Math.PI * 6500) / RATE);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += k * (buf[i]! * 0.55 - y);
    buf[i] = Math.max(-1, Math.min(1, y));
  }
  return buf;
}

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(s * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(out, { recursive: true });
for (const name of NAMES) {
  const file = join(out, `${name}.wav`);
  writeFileSync(file, wav(render(SOUND_RECIPES[name])));
  console.log("escrito", `apps/mobile/assets/sounds/${name}.wav`);
}
