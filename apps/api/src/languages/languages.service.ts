import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { isPubliclyListed, visibleContentStatuses } from "./visibility.js";

export interface VocabularyQuery {
  locale: string;
  take: number;
  cursor?: string | undefined;
}

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureDb() {
    if (!this.prisma.configured)
      throw new ServiceUnavailableException("Base de dados não configurada.");
  }

  /** Países com as suas línguas (todas, com o estado — a app mostra "em breve"/"Beta"). */
  async listCountries() {
    this.ensureDb();
    const countries = await this.prisma.country.findMany({
      orderBy: { order: "asc" },
      include: {
        languages: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            altName: true,
            region: true,
            status: true,
            orthography: true,
          },
        },
      },
    });
    return countries.map((c) => ({
      id: c.id,
      name: c.name,
      languages: c.languages.map((l) => ({
        ...l,
        available: isPubliclyListed(l.status),
        beta: l.status === "BETA",
      })),
    }));
  }

  /** Vocabulário visível de uma língua, com o significado no idioma pedido (paginação por cursor). */
  async listVocabulary(languageId: string, q: VocabularyQuery) {
    this.ensureDb();
    const language = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!language || !isPubliclyListed(language.status))
      throw new NotFoundException("Língua não disponível.");

    const items = await this.prisma.vocabulary.findMany({
      where: { languageId, status: { in: visibleContentStatuses(language.status) } },
      orderBy: { id: "asc" },
      take: q.take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        word: true,
        partOfSpeech: true,
        status: true,
        variant: { select: { name: true } },
        sourceRef: true,
        audio: { select: { url: true, speakerName: true, sourceRef: true } },
        translations: {
          where: { locale: { in: [q.locale, "en"] } },
          select: { locale: true, text: true, isSuggestion: true },
        },
      },
    });
    const page = items.slice(0, q.take);
    return {
      language: { id: language.id, name: language.name, beta: language.status === "BETA" },
      items: page.map((v) => {
        const tr =
          v.translations.find((t) => t.locale === q.locale) ??
          v.translations.find((t) => t.locale === "en");
        return {
          id: v.id,
          word: v.word,
          partOfSpeech: v.partOfSpeech,
          variant: v.variant?.name ?? null,
          meaning: tr ? { locale: tr.locale, text: tr.text, isSuggestion: tr.isSuggestion } : null,
          reviewed: v.status === "APPROVED",
          sourceUrl: v.sourceRef,
          audio: v.audio
            ? { url: v.audio.url, speaker: v.audio.speakerName, sourceUrl: v.audio.sourceRef }
            : null,
        };
      }),
      nextCursor: items.length > q.take ? (page[page.length - 1]?.id ?? null) : null,
    };
  }
}
