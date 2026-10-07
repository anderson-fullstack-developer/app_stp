import type { Language } from "@/types";

/** Shared language list (app + admin). Names/regions only — no linguistic content. */
export const languages: Language[] = [
  { id: "forro", name: "Forro / Santomé", region: "Ilha de São Tomé", available: true },
  { id: "angolar", name: "Angolar", region: "Sul de São Tomé", available: false },
  { id: "lungie", name: "Lung’Ie / Principense", region: "Ilha do Príncipe", available: false },
];

/** Admin-only metadata keyed by language id. */
export const languageMeta: Record<string, { altName: string; code: string; description: string }> =
  {
    forro: { altName: "Santomé", code: "FOR", description: "Língua da ilha de São Tomé." },
    angolar: { altName: "Ngola", code: "ANG", description: "Língua do sul de São Tomé." },
    lungie: { altName: "Principense", code: "LUN", description: "Língua da ilha do Príncipe." },
  };
