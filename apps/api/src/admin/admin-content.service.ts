import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { ContentStatus, Difficulty, PartOfSpeech } from "../generated/prisma/enums.js";
import { hasRole } from "../content/review-rules.js";
import type { AuthUser } from "../users/users.service.js";

export const ADMIN_CONTENT_KINDS = ["vocabulary", "phrase"] as const;
export type AdminContentKind = (typeof ADMIN_CONTENT_KINDS)[number];

/** Línguas da interface em que se escrevem traduções. */
export const TRANSLATION_LOCALES = ["pt", "en"] as const;

export interface ContentInput {
  languageId: string;
  /** Palavra (vocabulário) ou frase. */
  text: string;
  translations: Partial<Record<(typeof TRANSLATION_LOCALES)[number], string>>;
  partOfSpeech?: PartOfSpeech | undefined;
  difficulty?: Difficulty | undefined;
  category?: string | undefined;
  /** Notas (vocabulário) ou explicação (frase). */
  notes?: string | undefined;
  /** Contexto de uso (só frases). */
  context?: string | undefined;
  sourceRef?: string | undefined;
}

const PERSON = { select: { id: true, username: true, name: true } } as const;
const EDITABLE: ContentStatus[] = ["DRAFT", "REJECTED"];

const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && e.code === "P2002";

/**
 * Gestão de vocabulário e frases no painel. Regras (AGENTS.md):
 * - tudo o que se cria ou edita fica em DRAFT; só a revisão (review.service) aprova;
 * - só se edita DRAFT ou REJECTED (o aprovado não muda às escondidas);
 * - editores, linguistas e administradores só mexem nas línguas do seu papel.
 */
@Injectable()
export class AdminContentService {
  constructor(private readonly prisma: PrismaService) {}

  /** Línguas que o ator pode ver/editar (null = todas). */
  private languagesOf(actor: AuthUser): string[] | null {
    const content = actor.roles.filter((r) =>
      ["CONTENT_EDITOR", "LINGUIST", "ADMIN", "SUPER_ADMIN"].includes(r.role),
    );
    if (content.some((r) => r.languageId === null)) return null;
    return [...new Set(content.map((r) => r.languageId!).filter(Boolean))];
  }

  private assertCanEdit(actor: AuthUser, languageId: string) {
    const ok =
      hasRole(actor, "ADMIN", languageId) ||
      hasRole(actor, "LINGUIST", languageId) ||
      hasRole(actor, "CONTENT_EDITOR", languageId);
    if (!ok) {
      throw new ForbiddenException({
        code: "FORBIDDEN_LANGUAGE",
        message: "Não tens permissão para editar conteúdo desta língua.",
      });
    }
  }

  private async assertLanguage(languageId: string) {
    const lang = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!lang) {
      throw new UnprocessableEntityException({
        code: "UNKNOWN_LANGUAGE",
        message: "Língua desconhecida.",
      });
    }
  }

  async list(
    actor: AuthUser,
    kind: AdminContentKind,
    filter: { languageId?: string | undefined; status?: ContentStatus | undefined; q?: string },
  ) {
    const allowed = this.languagesOf(actor);
    if (filter.languageId && allowed && !allowed.includes(filter.languageId)) return [];
    const languageWhere = filter.languageId
      ? { languageId: filter.languageId }
      : allowed
        ? { languageId: { in: allowed } }
        : {};
    const q = filter.q?.trim();
    const base = { ...languageWhere, ...(filter.status ? { status: filter.status } : {}) };
    const include = {
      translations: { select: { locale: true, text: true } },
      createdBy: PERSON,
      reviewedBy: PERSON,
    } as const;

    const rows =
      kind === "vocabulary"
        ? (
            await this.prisma.vocabulary.findMany({
              where: { ...base, ...(q ? { word: { contains: q, mode: "insensitive" } } : {}) },
              orderBy: { updatedAt: "desc" },
              take: 200,
              include,
            })
          ).map((v) => ({ ...v, text: v.word }))
        : (
            await this.prisma.phrase.findMany({
              where: { ...base, ...(q ? { text: { contains: q, mode: "insensitive" } } : {}) },
              orderBy: { updatedAt: "desc" },
              take: 200,
              include,
            })
          ).map((p) => ({ ...p, partOfSpeech: null, category: null, notes: p.explanation }));

    return rows.map((r) => ({
      id: r.id,
      kind,
      languageId: r.languageId,
      text: r.text,
      translations: Object.fromEntries(r.translations.map((t) => [t.locale, t.text])),
      partOfSpeech: r.partOfSpeech,
      difficulty: r.difficulty,
      category: r.category,
      notes: r.notes,
      sourceRef: r.sourceRef,
      status: r.status,
      version: r.version,
      aiGenerated: r.aiGenerated,
      author: r.createdBy,
      reviewer: r.reviewedBy,
      approvedAt: r.approvedAt,
      updatedAt: r.updatedAt,
    }));
  }

  async create(actor: AuthUser, kind: AdminContentKind, input: ContentInput) {
    this.assertCanEdit(actor, input.languageId);
    await this.assertLanguage(input.languageId);
    const translations = this.translationRows(input);
    try {
      const created =
        kind === "vocabulary"
          ? await this.prisma.vocabulary.create({
              data: {
                languageId: input.languageId,
                word: input.text,
                ...(input.partOfSpeech ? { partOfSpeech: input.partOfSpeech } : {}),
                ...(input.difficulty ? { difficulty: input.difficulty } : {}),
                category: input.category ?? null,
                notes: input.notes ?? null,
                sourceRef: input.sourceRef ?? null,
                createdById: actor.id,
                translations: { create: translations },
              },
            })
          : await this.prisma.phrase.create({
              data: {
                languageId: input.languageId,
                text: input.text,
                ...(input.difficulty ? { difficulty: input.difficulty } : {}),
                context: input.context ?? null,
                explanation: input.notes ?? null,
                sourceRef: input.sourceRef ?? null,
                createdById: actor.id,
                translations: { create: translations },
              },
            });
      await this.audit(actor, `content.create`, kind, created.id, { languageId: input.languageId });
      return { id: created.id, status: created.status };
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException({
          code: "DUPLICATE",
          message: "Já existe esta palavra nesta língua.",
        });
      }
      throw e;
    }
  }

  async update(actor: AuthUser, kind: AdminContentKind, id: string, input: ContentInput) {
    const current =
      kind === "vocabulary"
        ? await this.prisma.vocabulary.findUnique({
            where: { id },
            select: { languageId: true, status: true },
          })
        : await this.prisma.phrase.findUnique({
            where: { id },
            select: { languageId: true, status: true },
          });
    if (!current) throw new NotFoundException("Conteúdo não encontrado.");
    this.assertCanEdit(actor, current.languageId);
    if (input.languageId !== current.languageId) {
      throw new UnprocessableEntityException({
        code: "LANGUAGE_FIXED",
        message: "Não se muda a língua de um conteúdo existente.",
      });
    }
    if (!EDITABLE.includes(current.status)) {
      throw new UnprocessableEntityException({
        code: "NOT_EDITABLE",
        message: "Só se edita conteúdo em rascunho ou rejeitado.",
      });
    }
    const translations = this.translationRows(input);
    const where = { id, status: current.status }; // não edita se a revisão mudou o estado
    try {
      const ok = await this.prisma.$transaction(async (tx) => {
        const res =
          kind === "vocabulary"
            ? await tx.vocabulary.updateMany({
                where,
                data: {
                  word: input.text,
                  ...(input.partOfSpeech ? { partOfSpeech: input.partOfSpeech } : {}),
                  ...(input.difficulty ? { difficulty: input.difficulty } : {}),
                  category: input.category ?? null,
                  notes: input.notes ?? null,
                  sourceRef: input.sourceRef ?? null,
                  version: { increment: 1 },
                },
              })
            : await tx.phrase.updateMany({
                where,
                data: {
                  text: input.text,
                  ...(input.difficulty ? { difficulty: input.difficulty } : {}),
                  context: input.context ?? null,
                  explanation: input.notes ?? null,
                  sourceRef: input.sourceRef ?? null,
                  version: { increment: 1 },
                },
              });
        if (res.count === 0) return false;
        for (const t of translations) {
          if (kind === "vocabulary") {
            await tx.vocabularyTranslation.upsert({
              where: { vocabularyId_locale: { vocabularyId: id, locale: t.locale } },
              create: { vocabularyId: id, ...t },
              update: { text: t.text },
            });
          } else {
            await tx.phraseTranslation.upsert({
              where: { phraseId_locale: { phraseId: id, locale: t.locale } },
              create: { phraseId: id, ...t },
              update: { text: t.text },
            });
          }
        }
        return true;
      });
      if (!ok) {
        throw new ConflictException({
          code: "STATUS_CHANGED",
          message: "O estado mudou entretanto. Atualiza e tenta outra vez.",
        });
      }
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException({
          code: "DUPLICATE",
          message: "Já existe esta palavra nesta língua.",
        });
      }
      throw e;
    }
    await this.audit(actor, "content.update", kind, id, { languageId: current.languageId });
    return { id, status: current.status };
  }

  /** Números do painel inicial (nas línguas que o ator vê). */
  async overview(actor: AuthUser) {
    const allowed = this.languagesOf(actor);
    const where = allowed ? { languageId: { in: allowed } } : {};
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [vocab, phrases, exercises, users, newUsers, active] = await Promise.all([
      this.prisma.vocabulary.groupBy({ by: ["status"], where, _count: true }),
      this.prisma.phrase.groupBy({ by: ["status"], where, _count: true }),
      this.prisma.exercise.groupBy({ by: ["status"], where, _count: true }),
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.user.count({ where: { status: "ACTIVE", createdAt: { gte: weekAgo } } }),
      this.prisma.xpEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: weekAgo } } }),
    ]);
    const byStatus = (rows: { status: ContentStatus; _count: number }[]) =>
      Object.fromEntries(rows.map((r) => [r.status, r._count])) as Partial<
        Record<ContentStatus, number>
      >;
    return {
      content: {
        vocabulary: byStatus(vocab),
        phrase: byStatus(phrases),
        exercise: byStatus(exercises),
      },
      users: { active: users, newThisWeek: newUsers, activeThisWeek: active.length },
    };
  }

  private translationRows(input: ContentInput) {
    return TRANSLATION_LOCALES.flatMap((locale) => {
      const text = input.translations[locale]?.trim();
      return text ? [{ locale, text, origin: "linguist" }] : [];
    });
  }

  private audit(
    actor: AuthUser,
    action: string,
    kind: AdminContentKind,
    id: string,
    metadata: Record<string, string>,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorId: actor.id,
        action,
        entityType: kind === "vocabulary" ? "VOCABULARY" : "PHRASE",
        entityId: id,
        metadata,
      },
    });
  }
}
