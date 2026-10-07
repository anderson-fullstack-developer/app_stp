/**
 * Seed da base de dados (idempotente: pode correr várias vezes sem duplicar).
 *
 * Cria países, línguas, variantes, a fonte Wiktionary e importa o vocabulário de Kriolu
 * de content/sources/wiktionary-kea como RASCUNHO (DRAFT): significado em inglês da fonte e
 * sugestão automática em português — nunca como tradução aprovada.
 *
 * Uso: pnpm --filter @stp/api db:seed
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { type PartOfSpeech, PrismaClient } from "../src/generated/prisma/client.js";
import { DEFAULT_REWARD_RULES } from "../src/progress/rules/rewards.js";

const url = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
if (!url) throw new Error("Defina DATABASE_URL/DIRECT_URL no apps/api/.env");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const keaDir = join(root, "content", "sources", "wiktionary-kea");

interface Entry {
  word: string;
  senses: { partOfSpeech: string; glossEn: string }[];
  variantLabels: string[];
  sourceUrl: string;
}

const POS: Record<string, PartOfSpeech> = {
  substantivo: "NOUN",
  "nome próprio": "PROPER_NOUN",
  verbo: "VERB",
  adjetivo: "ADJECTIVE",
  advérbio: "ADVERB",
  pronome: "PRONOUN",
  preposição: "PREPOSITION",
  conjunção: "CONJUNCTION",
  interjeição: "INTERJECTION",
  numeral: "NUMERAL",
  determinante: "DETERMINER",
  artigo: "ARTICLE",
  partícula: "PARTICLE",
  expressão: "PHRASE",
};

/** Mesma limpeza usada na app (lib/preview-quiz.ts → shortGloss). */
const shortGloss = (g: string) =>
  (g.replace(/\([^)]*\)/g, " ").split(/[;,]/)[0] ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\s.\-–]+$/, "")
    .trim();

async function main() {
  // Países e línguas (ADR-13); Kriolu em BETA (ADR-14).
  for (const c of [
    { id: "st", name: "São Tomé e Príncipe", order: 1 },
    { id: "cv", name: "Cabo Verde", order: 2 },
  ])
    await prisma.country.upsert({ where: { id: c.id }, update: c, create: c });

  const languages = [
    {
      id: "forro",
      countryId: "st",
      name: "Forro / Santomé",
      altName: "Santomé",
      isoCode: "cri",
      region: "Ilha de São Tomé",
      status: "ACTIVE" as const,
    },
    {
      id: "angolar",
      countryId: "st",
      name: "Angolar",
      altName: "Ngola",
      isoCode: "aoa",
      region: "Sul de São Tomé",
      status: "COMING_SOON" as const,
    },
    {
      id: "lungie",
      countryId: "st",
      name: "Lung'Ie / Principense",
      altName: "Principense",
      isoCode: "pre",
      region: "Ilha do Príncipe",
      status: "COMING_SOON" as const,
    },
    {
      id: "kabuverdianu",
      countryId: "cv",
      name: "Kriolu / Crioulo cabo-verdiano",
      altName: "Kabuverdianu",
      isoCode: "kea",
      region: "Cabo Verde",
      orthography: "ALUPEC",
      status: "BETA" as const,
    },
  ];
  for (const l of languages)
    await prisma.language.upsert({ where: { id: l.id }, update: l, create: l });

  // Utilizador de sistema, autor das importações automáticas (não é uma pessoa).
  const system = await prisma.user.upsert({
    where: { email: "sistema@lingua-stp.invalid" },
    update: {},
    create: {
      email: "sistema@lingua-stp.invalid",
      username: "sistema",
      name: "Importação automática",
    },
  });

  const source = await prisma.source.upsert({
    where: { name: "Wiktionary (en) — Kabuverdianu" },
    update: {},
    create: {
      name: "Wiktionary (en) — Kabuverdianu",
      url: "https://en.wiktionary.org/wiki/Category:Kabuverdianu_lemmas",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      attribution: "Contribuidores do Wiktionary",
      notes: "Importado com scripts/import-wiktionary-kea.mjs. Rascunhos por rever.",
    },
  });

  const entries = (
    JSON.parse(readFileSync(join(keaDir, "entries.json"), "utf8")) as { entries: Entry[] }
  ).entries;
  const ptSuggestions = (
    JSON.parse(readFileSync(join(keaDir, "pt-suggestions.json"), "utf8")) as {
      translations: Record<string, string>;
    }
  ).translations;

  // Variantes do Kriolu a partir dos rótulos da fonte.
  const variantNames = new Set(
    entries.flatMap((e) => e.variantLabels).filter((v) => !/dated|pejorative/i.test(v)),
  );
  const variantIds = new Map<string, string>();
  for (const name of variantNames) {
    const v = await prisma.languageVariant.upsert({
      where: { languageId_name: { languageId: "kabuverdianu", name } },
      update: {},
      create: { languageId: "kabuverdianu", name },
    });
    variantIds.set(name, v.id);
  }

  // Inserção em lotes (poucos pedidos à Neon); skipDuplicates mantém o seed idempotente.
  const rows = entries.flatMap((e) => {
    const first = e.senses[0];
    if (!first) return [];
    const variantLabel = e.variantLabels.find((v) => variantIds.has(v));
    return [
      {
        languageId: "kabuverdianu",
        word: e.word,
        partOfSpeech: POS[first.partOfSpeech] ?? ("OTHER" as const),
        variantId: variantLabel ? (variantIds.get(variantLabel) ?? null) : null,
        sourceId: source.id,
        sourceRef: e.sourceUrl,
        status: "DRAFT" as const,
        createdById: system.id,
        notes: e.variantLabels.length ? `Rótulos da fonte: ${e.variantLabels.join(", ")}` : null,
      },
    ];
  });
  const inserted = await prisma.vocabulary.createMany({ data: rows, skipDuplicates: true });
  console.log(`  vocabulário novo: ${inserted.count} (de ${rows.length})`);

  const vocab = await prisma.vocabulary.findMany({
    where: { languageId: "kabuverdianu" },
    select: { id: true, word: true, partOfSpeech: true },
  });
  const idOf = new Map(vocab.map((v) => [`${v.word}|${v.partOfSpeech}`, v.id]));
  const translations = entries.flatMap((e) => {
    const first = e.senses[0];
    if (!first) return [];
    const vocabularyId = idOf.get(`${e.word}|${POS[first.partOfSpeech] ?? "OTHER"}`);
    if (!vocabularyId) return [];
    const out = [];
    const glossEn = e.senses
      .map((x) => x.glossEn)
      .filter(Boolean)
      .join("; ");
    if (glossEn)
      out.push({ vocabularyId, locale: "en", text: glossEn, isSuggestion: true, origin: "source" });
    const pt = ptSuggestions[`${first.partOfSpeech}|${shortGloss(first.glossEn)}`];
    if (pt && !pt.includes("confirmar"))
      out.push({ vocabularyId, locale: "pt", text: pt, isSuggestion: true, origin: "machine" });
    return out;
  });
  const tInserted = await prisma.vocabularyTranslation.createMany({
    data: translations,
    skipDuplicates: true,
  });
  console.log(`  traduções novas: ${tInserted.count} (de ${translations.length})`);

  // Gravações de pronúncia de falantes nativas (Lingua Libre, CC0) — ligadas às palavras.
  const llSource = await prisma.source.upsert({
    where: { name: "Lingua Libre — Kabuverdianu" },
    update: {},
    create: {
      name: "Lingua Libre — Kabuverdianu",
      url: "https://commons.wikimedia.org/wiki/Category:Lingua_Libre_pronunciation-kea",
      license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution:
        "Falantes: Rosa Lima, Rosa Pimenta Lima, Rosangela Delgado, Lenilda (Lingua Libre)",
      notes:
        "Importado com scripts/import-lingua-libre-kea.mjs. Ficheiros no Wikimedia Commons; copiar para R2 em produção.",
    },
  });
  const llDir = join(root, "content", "sources", "lingua-libre-kea");
  const recordings = (
    JSON.parse(readFileSync(join(llDir, "recordings.json"), "utf8")) as {
      recordings: {
        word: string;
        speaker: string | null;
        url: string;
        commonsPage: string;
        mimeType: string;
      }[];
    }
  ).recordings;
  await prisma.audioAsset.createMany({
    skipDuplicates: true,
    data: recordings.map((r) => ({
      languageId: "kabuverdianu",
      storageKey: `commons:${decodeURIComponent(r.url.split("/").pop() ?? r.word)}`,
      url: r.url,
      mimeType: r.mimeType,
      speakerName: r.speaker,
      region: "Cabo Verde",
      // Publicado pelas próprias falantes em domínio público através do Lingua Libre.
      consentRecorded: true,
      sourceId: llSource.id,
      sourceRef: r.commonsPage,
      status: "DRAFT" as const,
      createdById: system.id,
    })),
  });
  const audio = await prisma.audioAsset.findMany({
    where: { sourceId: llSource.id },
    select: { id: true, sourceRef: true },
  });
  const audioIdByPage = new Map(audio.map((a) => [a.sourceRef, a.id]));
  let linked = 0;
  for (const r of recordings) {
    const audioId = audioIdByPage.get(r.commonsPage);
    if (!audioId) continue;
    const res = await prisma.vocabulary.updateMany({
      where: { languageId: "kabuverdianu", word: r.word, audioId: null },
      data: { audioId },
    });
    linked += res.count;
  }
  console.log(`  gravações: ${recordings.length}; palavras com áudio ligado agora: ${linked}`);

  // Regras de recompensa: só cria as que faltam (não apaga ajustes feitos no admin).
  const rules = await prisma.rewardRule.createMany({
    data: DEFAULT_REWARD_RULES.map((r) => ({ ...r })),
    skipDuplicates: true,
  });
  console.log(`  regras de recompensa novas: ${rules.count}`);

  // Estatísticas para utilizadores criados antes da migração de progresso.
  const stats = await prisma.userStats.createMany({
    data: (await prisma.user.findMany({ where: { stats: null }, select: { id: true } })).map(
      (u) => ({
        userId: u.id,
      }),
    ),
    skipDuplicates: true,
  });
  console.log(`  estatísticas criadas: ${stats.count}`);

  const counts = {
    países: await prisma.country.count(),
    línguas: await prisma.language.count(),
    variantes: await prisma.languageVariant.count(),
    vocabulário: await prisma.vocabulary.count(),
    traduções: await prisma.vocabularyTranslation.count(),
    aprovados: await prisma.vocabulary.count({ where: { status: "APPROVED" } }),
    áudios: await prisma.audioAsset.count(),
    palavrasComÁudio: await prisma.vocabulary.count({ where: { audioId: { not: null } } }),
    regrasDeRecompensa: await prisma.rewardRule.count(),
  };
  console.log("Seed concluído:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
