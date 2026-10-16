import { VOICE_CONFIG } from "@stp/config";
import { controlMatched, decide, durationOk, normalizeMime, VOICE_RULES } from "./voice-rules.js";

describe("Regras das gravações de pronúncia", () => {
  it("valores iguais aos do produto (@stp/config)", () => {
    expect(VOICE_RULES.minimumAge).toBe(VOICE_CONFIG.minimumAge);
    expect(VOICE_RULES.votesToDecide).toBe(VOICE_CONFIG.votesToDecide);
    expect(VOICE_RULES.voicesPerWord).toBe(VOICE_CONFIG.voicesPerWord);
    expect(VOICE_RULES.controlRate).toBe(VOICE_CONFIG.controlRate);
    expect(VOICE_RULES.recording).toEqual(VOICE_CONFIG.recording);
    expect(VOICE_RULES.consentVersion).toBe(VOICE_CONFIG.consentVersion);
  });

  it("2 votos iguais decidem; 1–1 espera por um terceiro", () => {
    expect(decide(1, 0)).toBe("PENDING");
    expect(decide(1, 1)).toBe("PENDING");
    expect(decide(2, 0)).toBe("APPROVED");
    expect(decide(2, 1)).toBe("APPROVED");
    expect(decide(0, 2)).toBe("REJECTED");
    expect(decide(1, 2)).toBe("REJECTED");
  });

  it("perguntas de controlo comparam o voto com a decisão", () => {
    expect(controlMatched("APPROVE", "APPROVED")).toBe(true);
    expect(controlMatched("REJECT", "APPROVED")).toBe(false);
    expect(controlMatched("REJECT", "REJECTED")).toBe(true);
  });

  it("formatos e durações", () => {
    expect(normalizeMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeMime("AUDIO/MP4")).toBe("audio/mp4");
    expect(normalizeMime("video/mp4")).toBeNull();
    expect(durationOk(200)).toBe(false);
    expect(durationOk(1200)).toBe(true);
    expect(durationOk(9000)).toBe(false);
  });
});
