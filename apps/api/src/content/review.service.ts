import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { ContentKind, ContentStatus } from "../generated/prisma/enums.js";
import type { AuthUser } from "../users/users.service.js";
import { decideReview, type ReviewActionName, type ReviewTarget } from "./review-rules.js";

/** Tipos de conteúdo com autor e revisão (curso/unidade entram com o editor do admin). */
export const REVIEWABLE_KINDS = ["vocabulary", "phrase", "exercise", "lesson"] as const;
export type ReviewableKind = (typeof REVIEWABLE_KINDS)[number];

const KIND_ENUM: Record<ReviewableKind, ContentKind> = {
  vocabulary: "VOCABULARY",
  phrase: "PHRASE",
  exercise: "EXERCISE",
  lesson: "LESSON",
};

/**
 * Aplica ações de revisão: valida com decideReview, muda o estado com controlo de
 * concorrência (só se o estado não mudou entretanto) e regista revisão + auditoria
 * na mesma transação.
 */
@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadTarget(kind: ReviewableKind, id: string): Promise<ReviewTarget | null> {
    const pick = { status: true, createdById: true } as const;
    switch (kind) {
      case "vocabulary":
        return this.prisma.vocabulary.findUnique({
          where: { id },
          select: { ...pick, languageId: true },
        });
      case "phrase":
        return this.prisma.phrase.findUnique({
          where: { id },
          select: { ...pick, languageId: true },
        });
      case "exercise":
        return this.prisma.exercise.findUnique({
          where: { id },
          select: { ...pick, languageId: true },
        });
      case "lesson": {
        const l = await this.prisma.lesson.findUnique({
          where: { id },
          select: { ...pick, unit: { select: { course: { select: { languageId: true } } } } },
        });
        return (
          l && {
            status: l.status,
            createdById: l.createdById,
            languageId: l.unit.course.languageId,
          }
        );
      }
    }
  }

  async apply(
    kind: ReviewableKind,
    id: string,
    action: ReviewActionName,
    actor: AuthUser,
    comment?: string,
  ) {
    const target = await this.loadTarget(kind, id);
    if (!target) throw new NotFoundException("Conteúdo não encontrado.");
    const decision = decideReview(action, target, actor);
    if (!decision.ok) {
      const body = { code: decision.code, message: decision.message };
      throw decision.code === "INVALID_TRANSITION"
        ? new UnprocessableEntityException(body)
        : new ForbiddenException(body);
    }

    const approving = decision.to === "APPROVED";
    const reviewing = action !== "submit" && action !== "archive";
    const data = {
      status: decision.to,
      ...(reviewing ? { reviewedById: actor.id } : {}),
      ...(approving ? { approvedAt: new Date() } : {}),
    };
    const where = { id, status: target.status }; // não aplica se outro revisor mudou o estado

    const updated = await this.prisma.$transaction(async (tx) => {
      const res =
        kind === "vocabulary"
          ? await tx.vocabulary.updateMany({ where, data })
          : kind === "phrase"
            ? await tx.phrase.updateMany({ where, data })
            : kind === "exercise"
              ? await tx.exercise.updateMany({ where, data })
              : await tx.lesson.updateMany({ where, data });
      if (res.count === 0) return false;
      await tx.contentReview.create({
        data: {
          contentKind: KIND_ENUM[kind],
          contentId: id,
          action: decision.log,
          ...(comment ? { comment } : {}),
          actorId: actor.id,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          action: `content.${action}`,
          entityType: KIND_ENUM[kind],
          entityId: id,
          metadata: { from: target.status, to: decision.to, languageId: target.languageId },
        },
      });
      return true;
    });
    if (!updated) {
      throw new ConflictException({
        code: "STATUS_CHANGED",
        message: "O estado mudou entretanto. Atualiza e tenta outra vez.",
      });
    }
    return { kind, id, from: target.status, status: decision.to as ContentStatus };
  }

  /** Fila de revisão de uma língua (o mais antigo primeiro). */
  async queue(languageId: string, take = 50) {
    const where = { languageId, status: "UNDER_REVIEW" as const };
    const [vocabulary, phrases, exercises] = await Promise.all([
      this.prisma.vocabulary.findMany({
        where,
        orderBy: { updatedAt: "asc" },
        take,
        select: { id: true, word: true, createdById: true, updatedAt: true },
      }),
      this.prisma.phrase.findMany({
        where,
        orderBy: { updatedAt: "asc" },
        take,
        select: { id: true, text: true, createdById: true, updatedAt: true },
      }),
      this.prisma.exercise.findMany({
        where,
        orderBy: { updatedAt: "asc" },
        take,
        select: { id: true, prompt: true, createdById: true, updatedAt: true },
      }),
    ]);
    return { languageId, vocabulary, phrases, exercises };
  }

  history(kind: ReviewableKind, id: string) {
    return this.prisma.contentReview.findMany({
      where: { contentKind: KIND_ENUM[kind], contentId: id },
      orderBy: { createdAt: "asc" },
      select: {
        action: true,
        comment: true,
        createdAt: true,
        actor: { select: { id: true, username: true } },
      },
    });
  }
}
