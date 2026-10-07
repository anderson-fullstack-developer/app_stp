import { describe, expect, it } from "vitest";
import { detectLocale, en, localeFromSpoken, pt } from "./index";

const flatten = (o: object, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = p ? `${p}.${k}` : k;
    return typeof v === "string" ? { ...acc, [key]: v } : { ...acc, ...flatten(v as object, key) };
  }, {});

describe("i18n", () => {
  it("deteta o idioma do dispositivo", () => {
    expect(detectLocale(["en-US", "pt-PT"])).toBe("en");
    expect(detectLocale(["pt-BR"])).toBe("pt");
    expect(detectLocale(["fr-FR", "en-GB"])).toBe("en"); // francês ainda não disponível
    expect(detectLocale(["de-DE"])).toBe("pt");
    expect(detectLocale([])).toBe("pt");
  });

  it("sugere o idioma a partir das línguas faladas", () => {
    expect(localeFromSpoken(["en"])).toBe("en");
    expect(localeFromSpoken(["kea", "en"])).toBe("pt");
    expect(localeFromSpoken(["forro"])).toBe("pt");
    expect(localeFromSpoken(["other"])).toBeNull();
  });

  it("inglês tem as mesmas chaves que o português e nenhuma tradução vazia", () => {
    const a = flatten(pt);
    const b = flatten(en);
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    for (const [k, v] of Object.entries(b)) expect(v.trim(), k).not.toBe("");
  });

  it("mantém as variáveis {{…}} iguais nas duas línguas", () => {
    const a = flatten(pt);
    const b = flatten(en);
    const vars = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const k of Object.keys(a)) expect(vars(b[k]!), k).toEqual(vars(a[k]!));
  });
});
