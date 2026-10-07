/**
 * Efeitos sonoros e vibração da interface (cliques, acertos, contagem, vitória…).
 *
 * Os sons são sintetizados com a Web Audio API: sem ficheiros, sem licenças, peso zero.
 * Para trocar um som por um ficheiro próprio, basta pôr o URL em SOUND_FILES.
 * NÃO é usado para o áudio linguístico (pronúncias) — esse vem do conteúdo aprovado.
 *
 * Respeita as Definições: Som (geral) + Efeitos para tocar, Vibração para vibrar.
 */
import { settings } from "@/hooks/use-settings";

export type SoundName =
  | "tap"
  | "select"
  | "correct"
  | "wrong"
  | "tick"
  | "urgent"
  | "go"
  | "lifeLost"
  | "eliminated"
  | "final"
  | "victory"
  | "defeat"
  | "complete"
  | "levelUp"
  | "streak"
  | "coins"
  | "join"
  | "roomFull";

/** Substituições opcionais por ficheiros (ex.: { victory: "/sounds/vitoria.mp3" }). */
export const SOUND_FILES: Partial<Record<SoundName, string>> = {};

interface Note {
  /** Frequência inicial (Hz). */
  f: number;
  /** Início relativo (s). */
  t?: number;
  /** Duração (s). */
  d: number;
  type?: OscillatorType;
  /** Volume do pico (0–1). */
  g?: number;
  /** Frequência final, para deslizar (glide). */
  to?: number;
}

// Notas (Hz) usadas abaixo
const C5 = 523.25,
  D5 = 587.33,
  E5 = 659.25,
  G5 = 783.99,
  A5 = 880,
  C6 = 1046.5,
  D6 = 1174.66,
  E6 = 1318.51,
  G6 = 1567.98,
  C7 = 2093;

const RECIPES: Record<SoundName, Note[]> = {
  tap: [{ f: 900, to: 700, d: 0.045, type: "sine", g: 0.16 }],
  select: [{ f: 660, to: 880, d: 0.07, type: "triangle", g: 0.16 }],
  correct: [
    { f: G5, d: 0.12, type: "triangle", g: 0.3 },
    { f: D6, t: 0.085, d: 0.26, type: "triangle", g: 0.28 },
  ],
  wrong: [
    { f: 311, to: 280, d: 0.14, type: "triangle", g: 0.28 },
    { f: 233, to: 205, t: 0.11, d: 0.26, type: "triangle", g: 0.26 },
  ],
  tick: [{ f: 1150, d: 0.06, type: "triangle", g: 0.22 }],
  urgent: [{ f: 1500, d: 0.045, type: "triangle", g: 0.12 }],
  go: [
    { f: C5, d: 0.1, type: "triangle", g: 0.24 },
    { f: E5, t: 0.07, d: 0.1, type: "triangle", g: 0.24 },
    { f: G5, t: 0.14, d: 0.1, type: "triangle", g: 0.24 },
    { f: C6, t: 0.21, d: 0.38, type: "triangle", g: 0.26 },
  ],
  lifeLost: [
    { f: 210, to: 85, d: 0.3, type: "sine", g: 0.5 },
    { f: 466, to: 330, d: 0.14, type: "triangle", g: 0.14 },
  ],
  eliminated: [
    { f: 392, d: 0.18, type: "triangle", g: 0.26 },
    { f: 330, t: 0.16, d: 0.18, type: "triangle", g: 0.26 },
    { f: 262, t: 0.32, d: 0.5, type: "triangle", g: 0.26 },
    { f: 131, t: 0.32, d: 0.55, type: "sine", g: 0.22 },
  ],
  final: [
    { f: 147, d: 0.7, type: "sine", g: 0.3 },
    { f: 220, t: 0.05, d: 0.65, type: "triangle", g: 0.14 },
    { f: 440, t: 0.28, d: 0.4, type: "triangle", g: 0.12 },
  ],
  victory: [
    { f: C5, d: 0.12, type: "triangle", g: 0.26 },
    { f: E5, t: 0.11, d: 0.12, type: "triangle", g: 0.26 },
    { f: G5, t: 0.22, d: 0.12, type: "triangle", g: 0.26 },
    { f: C6, t: 0.34, d: 0.7, type: "triangle", g: 0.28 },
    { f: E5, t: 0.34, d: 0.7, type: "sine", g: 0.14 },
    { f: G5, t: 0.34, d: 0.7, type: "sine", g: 0.14 },
    { f: C7, t: 0.5, d: 0.3, type: "sine", g: 0.06 },
  ],
  defeat: [
    { f: 392, d: 0.26, type: "triangle", g: 0.22 },
    { f: 370, t: 0.24, d: 0.26, type: "triangle", g: 0.22 },
    { f: 349, t: 0.48, d: 0.26, type: "triangle", g: 0.22 },
    { f: 330, to: 311, t: 0.72, d: 0.65, type: "triangle", g: 0.22 },
  ],
  complete: [
    { f: C5, d: 0.12, type: "triangle", g: 0.22 },
    { f: E5, t: 0.09, d: 0.12, type: "triangle", g: 0.22 },
    { f: G5, t: 0.18, d: 0.12, type: "triangle", g: 0.22 },
    { f: C6, t: 0.27, d: 0.5, type: "triangle", g: 0.24 },
    { f: C7, t: 0.36, d: 0.22, type: "sine", g: 0.06 },
  ],
  levelUp: [C5, D5, E5, G5, A5, C6].map((f, i) => ({
    f,
    t: i * 0.065,
    d: i === 5 ? 0.55 : 0.1,
    type: "triangle" as const,
    g: 0.22,
  })),
  streak: [
    { f: 300, to: 900, d: 0.35, type: "sine", g: 0.16 },
    { f: E6, t: 0.28, d: 0.4, type: "triangle", g: 0.18 },
  ],
  /** Jogador entrou na sala — usar com `pitch` crescente para a escala subir à medida que a sala enche. */
  join: [
    { f: 520, to: 700, d: 0.07, type: "sine", g: 0.22 },
    { f: 1040, t: 0.05, d: 0.12, type: "triangle", g: 0.12 },
  ],
  roomFull: [
    { f: C5, d: 0.5, type: "triangle", g: 0.16 },
    { f: E5, t: 0.04, d: 0.5, type: "triangle", g: 0.16 },
    { f: G5, t: 0.08, d: 0.5, type: "triangle", g: 0.16 },
    { f: C6, t: 0.12, d: 0.55, type: "triangle", g: 0.2 },
    { f: G6, t: 0.2, d: 0.3, type: "sine", g: 0.06 },
  ],
  coins: [
    { f: G6, d: 0.08, type: "triangle", g: 0.16 },
    { f: C7, t: 0.07, d: 0.26, type: "triangle", g: 0.16 },
  ],
};

/** Padrões de vibração (ms). */
const HAPTICS: Partial<Record<SoundName, number | number[]>> = {
  tap: 8,
  select: 8,
  tick: 10,
  urgent: 6,
  go: 25,
  correct: 15,
  wrong: [25, 40, 25],
  lifeLost: [40, 30, 40],
  eliminated: [60, 40, 90],
  final: 30,
  victory: [20, 30, 20, 30, 60],
  defeat: 60,
  levelUp: [15, 25, 15, 25, 40],
  streak: 20,
  coins: 10,
  complete: [15, 30, 30],
  join: 12,
  roomFull: [20, 40, 20, 40, 50],
};

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;

function getAudio(): { ctx: AudioContext; out: AudioNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    // Filtro passa-baixo: tira a aspereza dos harmónicos agudos → som mais suave.
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 6500;
    master.connect(soften).connect(ctx.destination);
    out = master;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return out ? { ctx, out } : null;
}

function playNote(ac: AudioContext, dest: AudioNode, n: Note, at: number, pitch = 1) {
  const start = at + (n.t ?? 0);
  const end = start + n.d;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.f * pitch, start);
  if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to * pitch, end);
  // Envolvente: ataque rápido (sem clique) e decaimento exponencial suave.
  const peak = n.g ?? 0.2;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.012, n.d / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(dest);
  osc.start(start);
  osc.stop(end + 0.02);
}

const lastPlayed = new Map<SoundName, number>();
/** Intervalo mínimo entre repetições do mesmo som (evita metralhar cliques). */
const MIN_GAP_MS = 45;

/** Escala maior em semitons — dá aos sons repetidos (ex.: entradas na sala) uma subida musical. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
/** Fator de tom para o passo `step` (0, 1, 2…) da escala maior. */
export const scaleStep = (step: number) =>
  2 ** ((MAJOR[Math.max(0, Math.min(step, MAJOR.length - 1))] ?? 0) / 12);

export const sound = {
  /** `pitch` multiplica as frequências (1 = original; ver scaleStep). */
  play(name: SoundName, opts?: { pitch?: number }) {
    if (typeof window === "undefined") return;
    const now = performance.now();
    if (now - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return;
    lastPlayed.set(name, now);

    const prefs = settings.get();
    const pattern = HAPTICS[name];
    if (prefs.haptics && pattern !== undefined && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* ignorar */
      }
    }
    if (!prefs.sound || !prefs.effects) return;

    const file = SOUND_FILES[name];
    if (file) {
      const el = new Audio(file);
      el.volume = 0.6;
      void el.play().catch(() => {});
      return;
    }
    const audio = getAudio();
    if (!audio) return;
    const at = audio.ctx.currentTime + 0.005;
    for (const n of RECIPES[name]) playNote(audio.ctx, audio.out, n, at, opts?.pitch ?? 1);
  },
};
