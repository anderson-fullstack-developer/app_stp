import { describe, expect, it } from "vitest";
import { isLiveInApp } from "@/admin/workflow";
import { createSeed } from "@/mocks/admin";
import { KEA_WIKTIONARY_COUNT, keaWiktionaryDrafts } from "@/mocks/kea-wiktionary";

describe("importação Kabuverdianu (Wiktionary)", () => {
  const drafts = keaWiktionaryDrafts("2026-10-07T00:00:00.000Z");

  it("importa as entradas para a língua de Cabo Verde", () => {
    expect(drafts.length).toBe(KEA_WIKTIONARY_COUNT);
    expect(drafts.length).toBeGreaterThan(500);
    expect(drafts.every((d) => d.languageId === "kabuverdianu")).toBe(true);
  });

  it("nada é aprovado automaticamente nem chega à app", () => {
    expect(drafts.every((d) => d.status === "DRAFT")).toBe(true);
    expect(drafts.some(isLiveInApp)).toBe(false);
    expect(drafts.every((d) => d.reviewer === null)).toBe(true);
  });

  it("não inventa traduções: o português fica para o linguista", () => {
    expect(drafts.every((d) => d.translation === "")).toBe(true);
  });

  it("guarda sempre a fonte e a licença", () => {
    expect(
      drafts.every((d) =>
        d.source.startsWith("Wiktionary (CC BY-SA 4.0) — https://en.wiktionary.org/wiki/"),
      ),
    ).toBe(true);
  });

  it("entra no painel admin como vocabulário", () => {
    const seed = createSeed();
    expect(seed.vocabulary.filter((v) => v.languageId === "kabuverdianu").length).toBe(
      KEA_WIKTIONARY_COUNT,
    );
  });
});
