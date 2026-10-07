import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settings } from "@/hooks/use-settings";
import { scaleStep, sound } from "@/lib/sound";

describe("sound", () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    settings.set({ sound: true, effects: true, haptics: true });
  });
  afterEach(() => settings.set({ sound: true, effects: true, haptics: true }));

  it("não rebenta sem Web Audio (ex.: jsdom, browsers antigos)", () => {
    expect(() => sound.play("victory")).not.toThrow();
  });

  it("vibra quando a vibração está ligada", () => {
    sound.play("wrong");
    expect(vibrate).toHaveBeenCalledWith([25, 40, 25]);
  });

  it("não vibra quando a vibração está desligada", () => {
    settings.set({ haptics: false });
    sound.play("correct");
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("guarda as preferências no dispositivo", () => {
    settings.set({ effects: false });
    expect(JSON.parse(localStorage.getItem("lstp-settings-v1") ?? "{}")).toMatchObject({ effects: false });
  });

  it("o tom das entradas na sala sobe a cada jogador (escala maior)", () => {
    expect(scaleStep(0)).toBe(1);
    expect(scaleStep(7)).toBeCloseTo(2); // oitava
    const steps = [0, 1, 2, 3, 4, 5, 6].map(scaleStep);
    steps.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(steps[i]!));
    expect(scaleStep(99)).toBe(scaleStep(14)); // limitado no topo
  });
});
