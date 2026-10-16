/**
 * Regras puras das gravações de pronúncia (Faladores e Ouvintes). Os valores espelham
 * VOICE_CONFIG (@stp/config); voice-rules.spec.ts garante que não divergem.
 */

export const VOICE_RULES = {
  minimumAge: 18,
  votesToDecide: 2,
  voicesPerWord: 2,
  controlRate: 0.1,
  recording: { minMs: 400, maxMs: 5000, maxBytes: 200_000 },
  consentVersion: "2026-10-16",
} as const;

/** Formatos aceites (o que os navegadores e telemóveis gravam). */
export const AUDIO_MIME_TYPES = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
} as const satisfies Record<string, string>;

export type AudioMime = keyof typeof AUDIO_MIME_TYPES;

/** "audio/webm;codecs=opus" → "audio/webm" (ou null se não for aceite). */
export function normalizeMime(raw: string): AudioMime | null {
  const base = raw.split(";")[0]!.trim().toLowerCase();
  return base in AUDIO_MIME_TYPES ? (base as AudioMime) : null;
}

/**
 * Decisão depois de um voto: 2 votos iguais decidem; empate 1–1 espera por um 3.º ouvinte.
 */
export function decide(approvals: number, rejections: number): "APPROVED" | "REJECTED" | "PENDING" {
  if (approvals >= VOICE_RULES.votesToDecide) return "APPROVED";
  if (rejections >= VOICE_RULES.votesToDecide) return "REJECTED";
  return "PENDING";
}

/** Pergunta de controlo: o voto coincide com a decisão já tomada? */
export const controlMatched = (verdict: "APPROVE" | "REJECT", status: "APPROVED" | "REJECTED") =>
  (verdict === "APPROVE") === (status === "APPROVED");

/** Duração aceitável (corta silêncios vazios e gravações sem fim). */
export const durationOk = (ms: number) =>
  ms >= VOICE_RULES.recording.minMs && ms <= VOICE_RULES.recording.maxMs + 500;
