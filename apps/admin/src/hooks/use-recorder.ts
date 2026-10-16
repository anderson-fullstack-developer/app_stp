/**
 * Gravar a voz no navegador (MediaRecorder) e verificar a qualidade antes de enviar:
 * duração, silêncio e som saturado. O microfone fica aberto enquanto o ecrã está aberto
 * (gravar palavra a palavra sem pedir autorização de cada vez).
 */
import { VOICE_CONFIG } from "@stp/config";
import { useEffect, useRef, useState } from "react";

export type RecordingIssue = "too_short" | "too_long" | "silent" | "clipped";

export interface Take {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  issues: RecordingIssue[];
}

type Status = "idle" | "starting" | "recording" | "denied" | "unsupported";

const PREFERRED = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"];

const supported = () =>
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

/** Mede a gravação: duração real, pico, nível médio e fração de amostras saturadas. */
async function analyse(
  blob: Blob,
  fallbackMs: number,
): Promise<{ ms: number; issues: RecordingIssue[] }> {
  const { minMs, maxMs } = VOICE_CONFIG.recording;
  const issues: RecordingIssue[] = [];
  let ms = fallbackMs;
  try {
    const ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    void ctx.close();
    ms = Math.round(audio.duration * 1000) || fallbackMs;
    const data = audio.getChannelData(0);
    let peak = 0;
    let clipped = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]!);
      if (v > peak) peak = v;
      if (v > 0.985) clipped++;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, data.length));
    if (peak < 0.05 || rms < 0.004) issues.push("silent");
    if (clipped / Math.max(1, data.length) > 0.002) issues.push("clipped");
  } catch {
    // Sem descodificação (navegador antigo): fica só a verificação da duração.
  }
  if (ms < minMs) issues.push("too_short");
  if (ms > maxMs + 500) issues.push("too_long");
  return { ms, issues };
}

export function useRecorder() {
  const [status, setStatus] = useState<Status>(() => (supported() ? "idle" : "unsupported"));
  const [take, setTake] = useState<Take | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (autoStop.current) clearTimeout(autoStop.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  // Liberta o URL do áudio anterior.
  useEffect(() => () => (take ? URL.revokeObjectURL(take.url) : undefined), [take]);

  const start = async () => {
    if (!supported()) return setStatus("unsupported");
    setTake(null);
    setStatus("starting");
    try {
      stream.current ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch {
      setStatus("denied");
      return;
    }
    const mimeType = PREFERRED.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream.current, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 48_000,
    });
    const chunks: Blob[] = [];
    const begin = performance.now();
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      void analyse(blob, Math.round(performance.now() - begin)).then(({ ms, issues }) => {
        setTake({ blob, url: URL.createObjectURL(blob), mimeType: type, durationMs: ms, issues });
      });
      setStatus("idle");
      setStartedAt(null);
    };
    recorder.current = rec;
    rec.start();
    setStartedAt(Date.now());
    setStatus("recording");
    // Nunca passa do máximo: para sozinho.
    autoStop.current = setTimeout(() => stop(), VOICE_CONFIG.recording.maxMs);
  };

  const stop = () => {
    if (autoStop.current) clearTimeout(autoStop.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const play = () => {
    if (take) void new Audio(take.url).play().catch(() => {});
  };

  return { status, take, startedAt, start, stop, play, clear: () => setTake(null) };
}

/** Blob → base64 (para enviar em JSON). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
