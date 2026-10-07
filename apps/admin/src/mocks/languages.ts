import type { Country, Language } from "@/types";

/**
 * Países e línguas da plataforma (app + admin). Só nomes e regiões — nenhum conteúdo linguístico.
 * Para acrescentar um país/língua basta acrescentar aqui (e, no futuro, na base de dados).
 */
export const countries: Country[] = [
  { id: "st", name: "São Tomé e Príncipe", order: 1 },
  { id: "cv", name: "Cabo Verde", order: 2 },
];

export const languages: Language[] = [
  {
    id: "forro",
    name: "Forro / Santomé",
    countryId: "st",
    region: "Ilha de São Tomé",
    available: true,
  },
  { id: "angolar", name: "Angolar", countryId: "st", region: "Sul de São Tomé", available: false },
  {
    id: "lungie",
    name: "Lung’Ie / Principense",
    countryId: "st",
    region: "Ilha do Príncipe",
    available: false,
  },
  {
    id: "kabuverdianu",
    name: "Kriolu / Crioulo cabo-verdiano",
    countryId: "cv",
    region: "Cabo Verde (variantes por ilha)",
    available: true,
    beta: true,
  },
];

/** Admin-only metadata keyed by language id. */
export const languageMeta: Record<string, { altName: string; code: string; description: string }> =
  {
    forro: { altName: "Santomé", code: "FOR", description: "Língua da ilha de São Tomé." },
    angolar: { altName: "Ngola", code: "ANG", description: "Língua do sul de São Tomé." },
    lungie: { altName: "Principense", code: "LUN", description: "Língua da ilha do Príncipe." },
    kabuverdianu: {
      altName: "Kabuverdianu",
      code: "KEA",
      description:
        "Língua crioula de Cabo Verde, com variantes por ilha (ex.: Santiago, São Vicente). A variante de cada conteúdo é indicada na revisão.",
    },
  };
