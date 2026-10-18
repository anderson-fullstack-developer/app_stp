import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { voiceApi, voiceErrorCode, voiceKeys } from "@/services/voice-api.service";

/** Papéis, consentimento e números da pessoa nas áreas de gravação. */
export function useVoiceMe() {
  return useQuery({ queryKey: voiceKeys.me, queryFn: voiceApi.me });
}

const KNOWN = [
  "CONSENT_REQUIRED",
  "NOT_A_CONTRIBUTOR",
  "ALREADY_RECORDED",
  "ALREADY_REVIEWED",
  "STORAGE_DISABLED",
  "TASK_FULL",
  "TASK_NOT_ACTIVE",
  "TASK_NOT_FOUND",
  "PAUSED",
  "WORD_NOT_FOUND",
] as const;

/** Mensagem traduzida para um erro da API das gravações. */
export function voiceError(t: TFunction, e: unknown): string {
  const code = voiceErrorCode(e);
  const known = KNOWN.find((k) => k === code);
  return known ? t(`voice.errors.${known}`) : t("voice.errors.generic");
}
