/**
 * Receitas dos efeitos sonoros da interface (notas sintetizadas): a fonte única.
 * A web toca-as com a Web Audio API (apps/admin/src/lib/sound.ts); a app mobile usa
 * ficheiros WAV gerados destas mesmas notas (scripts/render-sounds.ts).
 * NÃO é o áudio linguístico (pronúncias) — esse vem do conteúdo aprovado.
 */
export type Waveform = "sine" | "triangle" | "square" | "sawtooth";

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

export interface Note {
  /** Frequência inicial (Hz). */
  f: number;
  /** Início relativo (s). */
  t?: number;
  /** Duração (s). */
  d: number;
  type?: Waveform;
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

export const SOUND_RECIPES: Record<SoundName, Note[]> = {
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
