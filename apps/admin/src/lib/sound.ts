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
import { type Note, SOUND_RECIPES as RECIPES, type SoundName } from "@stp/config/sounds";

export type { SoundName };

/** Substituições opcionais por ficheiros (ex.: { victory: "/sounds/vitoria.mp3" }). */
export const SOUND_FILES: Partial<Record<SoundName, string>> = {};

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
