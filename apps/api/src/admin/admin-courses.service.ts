import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { hasRole } from "../content/review-rules.js";
import { PrismaService } from "../database/prisma.service.js";
import type { ContentStatus, Difficulty } from "../generated/prisma/enums.js";
import type { AuthUser } from "../users/users.service.js";

/** Estados de curso e unidade que se escolhem no painel. */
export const CONTAINER_STATUSES = ["DRAFT", "APPROVED", "ARCHIVED"] as const;
export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];

const EDITABLE: ContentStatus[] = ["DRAFT", "REJECTED"];
const PERSON = { select: { id: true, username: true } } as const;

/**
 * Estrutura dos cursos no painel: cursos → unidades → lições → exercícios (palavras).
 * - Cursos e unidades são "caixas" (títulos da interface): publicá-los é de linguistas ou
 *   administradores da língua. O conteúdo linguístico (lições e exercícios) segue sempre a
 *   revisão normal (DRAFT → revisão → APPROVED por outra pessoa).
 * - Lições só se editam em rascunho/rejeitadas; exercícios em rascunho/rejeitados saem da
 *   lição; aprovados só se arquivam (pela revisão).
 */
@Injectable()
export class AdminCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertEditor(actor: AuthUser, languageId: string) {
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

  private assertPublisher(actor: AuthUser, languageId: string) {
    if (!hasRole(actor, "ADMIN", languageId) && !hasRole(actor, "LINGUIST", languageId)) {
      throw new ForbiddenException({
        code: "FORBIDDEN_ROLE",
        message: "Só linguistas desta língua ou administradores publicam cursos e unidades.",
      });
    }
  }

  private audit(
    actor: AuthUser,
    action: string,
    entityType: string,
    entityId: string,
    metadata: object,
  ) {
    return this.prisma.adminAuditLog.create({
      data: { actorId: actor.id, action, entityType, entityId, metadata },
    });
  }

  /* --------------------------------- leitura --------------------------------- */

  /** Árvore de uma língua: cursos, unidades e lições com contagens de exercícios. */
  async tree(actor: AuthUser, languageId: string) {
    this.assertEditor(actor, languageId);
    const courses = await this.prisma.course.findMany({
      where: { languageId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        status: true,
        units: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            order: true,
            status: true,
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                status: true,
                difficulty: true,
                estimatedMinutes: true,
                _count: { select: { exercises: true } },
              },
            },
          },
        },
      },
    });
    const lessonIds = courses.flatMap((c) => c.units.flatMap((u) => u.lessons.map((l) => l.id)));
    const approved = await this.prisma.exercise.groupBy({
      by: ["lessonId"],
      where: { lessonId: { in: lessonIds }, status: "APPROVED" },
      _count: true,
    });
    const approvedBy = new Map(approved.map((a) => [a.lessonId, a._count]));
    return courses.map((c) => ({
      ...c,
      units: c.units.map((u) => ({
        ...u,
        lessons: u.lessons.map(({ _count, ...l }) => ({
          ...l,
          exercises: _count.exercises,
          approvedExercises: approvedBy.get(l.id) ?? 0,
        })),
      })),
    }));
  }

  /** Uma lição com os exercícios (palavra, traduções e estado de cada um). */
  async lesson(actor: AuthUser, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        unit: {
          select: {
            id: true,
            title: true,
            course: { select: { id: true, title: true, languageId: true } },
          },
        },
        createdBy: PERSON,
        reviewedBy: PERSON,
        exercises: {
          orderBy: { order: "asc" },
          include: {
            createdBy: PERSON,
            vocabulary: {
              select: {
                id: true,
                word: true,
                status: true,
                partOfSpeech: true,
                translations: { select: { locale: true, text: true } },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException("Lição não encontrada.");
    const languageId = lesson.unit.course.languageId;
    this.assertEditor(actor, languageId);
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      order: lesson.order,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      status: lesson.status,
      version: lesson.version,
      languageId,
      unit: { id: lesson.unit.id, title: lesson.unit.title },
      course: { id: lesson.unit.course.id, title: lesson.unit.course.title },
      author: lesson.createdBy,
      reviewer: lesson.reviewedBy,
      exercises: lesson.exercises.map((e) => ({
        id: e.id,
        type: e.type,
        prompt: e.prompt,
        order: e.order,
        status: e.status,
        author: e.createdBy,
        vocabulary: e.vocabulary
          ? {
              id: e.vocabulary.id,
              word: e.vocabulary.word,
              status: e.vocabulary.status,
              partOfSpeech: e.vocabulary.partOfSpeech,
              translations: Object.fromEntries(
                e.vocabulary.translations.map((t) => [t.locale, t.text]),
              ),
            }
          : null,
      })),
    };
  }

  /** Lições e exercícios num estado (para a fila de revisão), nas línguas do ator. */
  async reviewItems(actor: AuthUser, status: ContentStatus) {
    const roles = actor.roles.filter((r) =>
      ["CONTENT_EDITOR", "LINGUIST", "ADMIN", "SUPER_ADMIN"].includes(r.role),
    );
    const all = roles.some((r) => r.languageId === null);
    const langs = [...new Set(roles.map((r) => r.languageId).filter((l): l is string => !!l))];
    const langFilter = all ? {} : { in: langs };
    const [lessons, exercises] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { status, unit: { course: { languageId: langFilter } } },
        orderBy: { updatedAt: status === "UNDER_REVIEW" ? "asc" : "desc" },
        take: 200,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdBy: PERSON,
          reviewedBy: PERSON,
          unit: { select: { title: true, course: { select: { languageId: true } } } },
          _count: { select: { exercises: true } },
        },
      }),
      this.prisma.exercise.findMany({
        where: { status, languageId: langFilter },
        orderBy: { updatedAt: status === "UNDER_REVIEW" ? "asc" : "desc" },
        take: 200,
        select: {
          id: true,
          prompt: true,
          languageId: true,
          updatedAt: true,
          createdBy: PERSON,
          reviewedBy: PERSON,
          lesson: { select: { id: true, title: true } },
          vocabulary: {
            select: {
              word: true,
              status: true,
              translations: { select: { locale: true, text: true } },
            },
          },
        },
      }),
    ]);
    return {
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        unit: l.unit.title,
        languageId: l.unit.course.languageId,
        exercises: l._count.exercises,
        author: l.createdBy,
        reviewer: l.reviewedBy,
        updatedAt: l.updatedAt,
      })),
      exercises: exercises.map((e) => ({
        id: e.id,
        prompt: e.prompt,
        languageId: e.languageId,
        lesson: e.lesson,
        vocabularyStatus: e.vocabulary?.status ?? null,
        translations: Object.fromEntries(
          (e.vocabulary?.translations ?? []).map((t) => [t.locale, t.text]),
        ),
        author: e.createdBy,
        reviewer: e.reviewedBy,
        updatedAt: e.updatedAt,
      })),
    };
  }

  /* -------------------------------- cursos e unidades -------------------------------- */

  async createCourse(
    actor: AuthUser,
    input: { languageId: string; title: string; description?: string | undefined },
  ) {
    this.assertEditor(actor, input.languageId);
    const lang = await this.prisma.language.findUnique({ where: { id: input.languageId } });
    if (!lang) {
      throw new UnprocessableEntityException({
        code: "UNKNOWN_LANGUAGE",
        message: "Língua desconhecida.",
      });
    }
    const last = await this.prisma.course.aggregate({
      where: { languageId: input.languageId },
      _max: { order: true },
    });
    const course = await this.prisma.course.create({
      data: {
        languageId: input.languageId,
        title: input.title,
        description: input.description ?? null,
        order: (last._max.order ?? -1) + 1,
      },
    });
    await this.audit(actor, "course.create", "COURSE", course.id, { languageId: input.languageId });
    return { id: course.id };
  }

  async createUnit(
    actor: AuthUser,
    input: {
      courseId: string;
      title: string;
      description?: string | undefined;
      icon?: string | undefined;
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: { languageId: true },
    });
    if (!course) throw new NotFoundException("Curso não encontrado.");
    this.assertEditor(actor, course.languageId);
    const last = await this.prisma.unit.aggregate({
      where: { courseId: input.courseId },
      _max: { order: true },
    });
    const unit = await this.prisma.unit.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? null,
        order: (last._max.order ?? -1) + 1,
      },
    });
    await this.audit(actor, "unit.create", "UNIT", unit.id, { courseId: input.courseId });
    return { id: unit.id };
  }

  async updateContainer(
    actor: AuthUser,
    kind: "course" | "unit",
    id: string,
    input: {
      title?: string | undefined;
      description?: string | undefined;
      icon?: string | undefined;
      order?: number | undefined;
      status?: ContainerStatus | undefined;
    },
  ) {
    const languageId =
      kind === "course"
        ? (await this.prisma.course.findUnique({ where: { id }, select: { languageId: true } }))
            ?.languageId
        : (
            await this.prisma.unit.findUnique({
              where: { id },
              select: { course: { select: { languageId: true } } },
            })
          )?.course.languageId;
    if (!languageId) throw new NotFoundException("Não encontrado.");
    this.assertEditor(actor, languageId);
    if (input.status) this.assertPublisher(actor, languageId);
    const data = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    if (kind === "course") await this.prisma.course.update({ where: { id }, data });
    else {
      await this.prisma.unit.update({
        where: { id },
        data: { ...data, ...(input.icon !== undefined ? { icon: input.icon || null } : {}) },
      });
    }
    await this.audit(actor, `${kind}.update`, kind.toUpperCase(), id, { ...input });
    return { id };
  }

  /* ----------------------------------- lições ----------------------------------- */

  async createLesson(
    actor: AuthUser,
    input: {
      unitId: string;
      title: string;
      description?: string | undefined;
      difficulty?: Difficulty | undefined;
      estimatedMinutes?: number | undefined;
    },
  ) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: input.unitId },
      select: { course: { select: { languageId: true } } },
    });
    if (!unit) throw new NotFoundException("Unidade não encontrada.");
    this.assertEditor(actor, unit.course.languageId);
    const last = await this.prisma.lesson.aggregate({
      where: { unitId: input.unitId },
      _max: { order: true },
    });
    const lesson = await this.prisma.lesson.create({
      data: {
        unitId: input.unitId,
        title: input.title,
        description: input.description ?? null,
        ...(input.difficulty ? { difficulty: input.difficulty } : {}),
        ...(input.estimatedMinutes ? { estimatedMinutes: input.estimatedMinutes } : {}),
        order: (last._max.order ?? -1) + 1,
        createdById: actor.id,
      },
    });
    await this.audit(actor, "lesson.create", "LESSON", lesson.id, { unitId: input.unitId });
    return { id: lesson.id, status: lesson.status };
  }

  async updateLesson(
    actor: AuthUser,
    id: string,
    input: {
      title?: string | undefined;
      description?: string | undefined;
      difficulty?: Difficulty | undefined;
      estimatedMinutes?: number | undefined;
      order?: number | undefined;
    },
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      select: { status: true, unit: { select: { course: { select: { languageId: true } } } } },
    });
    if (!lesson) throw new NotFoundException("Lição não encontrada.");
    this.assertEditor(actor, lesson.unit.course.languageId);
    const contentChange =
      input.title !== undefined ||
      input.description !== undefined ||
      input.difficulty !== undefined ||
      input.estimatedMinutes !== undefined;
    // Mudar a ordem é estrutura (sempre); mudar o conteúdo só em rascunho/rejeitada.
    if (contentChange && !EDITABLE.includes(lesson.status)) {
      throw new UnprocessableEntityException({
        code: "NOT_EDITABLE",
        message: "Só se edita uma lição em rascunho ou rejeitada.",
      });
    }
    await this.prisma.lesson.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {}),
        ...(input.estimatedMinutes ? { estimatedMinutes: input.estimatedMinutes } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(contentChange ? { version: { increment: 1 } } : {}),
      },
    });
    await this.audit(actor, "lesson.update", "LESSON", id, { ...input });
    return { id };
  }

  /* --------------------------------- exercícios --------------------------------- */

  /** Junta uma palavra à lição como exercício de escolha múltipla (fica em rascunho). */
  async addWord(actor: AuthUser, lessonId: string, vocabularyId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { unit: { select: { course: { select: { languageId: true } } } } },
    });
    if (!lesson) throw new NotFoundException("Lição não encontrada.");
    const languageId = lesson.unit.course.languageId;
    this.assertEditor(actor, languageId);
    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: vocabularyId },
      select: { languageId: true, word: true, status: true },
    });
    if (!vocab || vocab.languageId !== languageId) {
      throw new UnprocessableEntityException({
        code: "WRONG_LANGUAGE",
        message: "Essa palavra não é desta língua.",
      });
    }
    if (vocab.status === "REJECTED" || vocab.status === "ARCHIVED") {
      throw new UnprocessableEntityException({
        code: "VOCABULARY_UNAVAILABLE",
        message: "Essa palavra foi rejeitada ou arquivada.",
      });
    }
    const already = await this.prisma.exercise.findFirst({
      where: { lessonId, vocabularyId, status: { notIn: ["ARCHIVED"] } },
      select: { id: true },
    });
    if (already) {
      throw new ConflictException({ code: "DUPLICATE", message: "Essa palavra já está na lição." });
    }
    const last = await this.prisma.exercise.aggregate({
      where: { lessonId },
      _max: { order: true },
    });
    const exercise = await this.prisma.exercise.create({
      data: {
        languageId,
        lessonId,
        vocabularyId,
        type: "MULTIPLE_CHOICE",
        prompt: vocab.word,
        order: (last._max.order ?? -1) + 1,
        createdById: actor.id,
      },
    });
    await this.audit(actor, "exercise.create", "EXERCISE", exercise.id, { lessonId, vocabularyId });
    return { id: exercise.id, status: exercise.status };
  }

  /** Tira da lição um exercício ainda não aprovado (aprovados só se arquivam na revisão). */
  async removeExercise(actor: AuthUser, id: string) {
    const ex = await this.prisma.exercise.findUnique({
      where: { id },
      select: { languageId: true, status: true, _count: { select: { answers: true } } },
    });
    if (!ex) throw new NotFoundException("Exercício não encontrado.");
    this.assertEditor(actor, ex.languageId);
    if (!EDITABLE.includes(ex.status)) {
      throw new UnprocessableEntityException({
        code: "NOT_EDITABLE",
        message: "Exercícios em revisão ou aprovados não se apagam (arquiva-se na revisão).",
      });
    }
    // Com respostas já dadas, fica fora da lição mas o histórico mantém-se.
    if (ex._count.answers > 0) {
      await this.prisma.exercise.update({
        where: { id },
        data: { status: "ARCHIVED", lessonId: null },
      });
    } else {
      await this.prisma.exercise.delete({ where: { id } });
    }
    await this.audit(actor, "exercise.remove", "EXERCISE", id, {});
    return { removed: true };
  }

  /** Nova ordem dos exercícios de uma lição (lista completa de ids). */
  async reorder(actor: AuthUser, lessonId: string, ids: string[]) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        unit: { select: { course: { select: { languageId: true } } } },
        exercises: { select: { id: true } },
      },
    });
    if (!lesson) throw new NotFoundException("Lição não encontrada.");
    this.assertEditor(actor, lesson.unit.course.languageId);
    const current = new Set(lesson.exercises.map((e) => e.id));
    if (ids.length !== current.size || ids.some((id) => !current.has(id))) {
      throw new UnprocessableEntityException({
        code: "INVALID_ORDER",
        message: "A lista tem de ter exatamente os exercícios da lição.",
      });
    }
    await this.prisma.$transaction(
      ids.map((id, order) => this.prisma.exercise.update({ where: { id }, data: { order } })),
    );
    return { ok: true };
  }
}
