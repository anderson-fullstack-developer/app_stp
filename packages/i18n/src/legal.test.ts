import { describe, expect, it } from "vitest";
import { fillLegal, LEGAL_DOCS } from "./legal";

const vars = { app: "Fala Neto", controller: "X", age: 13, email: null, date: "2026-10-13" };

describe("textos legais", () => {
  it("português e inglês têm as mesmas secções", () => {
    for (const kind of ["privacy", "terms"] as const) {
      expect(LEGAL_DOCS.en[kind].sections.length).toBe(LEGAL_DOCS.pt[kind].sections.length);
      LEGAL_DOCS.pt[kind].sections.forEach((s, i) =>
        expect(LEGAL_DOCS.en[kind].sections[i]?.body.length, s.heading).toBe(s.body.length),
      );
    }
  });

  it("preenche todos os marcadores e nunca inventa um email", () => {
    for (const locale of ["pt", "en"] as const) {
      for (const kind of ["privacy", "terms"] as const) {
        const text = JSON.stringify(fillLegal(locale, kind, vars));
        expect(text).not.toMatch(/\{\{/);
        expect(text).not.toMatch(/@/);
      }
    }
    const pt = fillLegal("pt", "privacy", vars);
    expect(pt.updated).toBe("Última atualização: 13 de outubro de 2026");
    expect(pt.sections[0]?.body[1]).toBe("Contacto: [email de suporte a definir].");
  });

  it("usa o email quando existe", () => {
    const doc = fillLegal("en", "terms", { ...vars, email: "help@example.org" });
    expect(JSON.stringify(doc)).toContain("help@example.org");
  });
});
