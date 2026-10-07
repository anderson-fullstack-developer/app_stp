import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { isPubliclyListed, visibleContentStatuses } from "../languages/visibility.js";

/** Mínimo de perguntas para uma lição ser jogável num idioma. */
export const MIN_LESSON_QUESTIONS = 4;

/**
 * Leitura pública dos cursos (só conteúdo visível — ver visibility.ts). Cada lição diz
 * quantas perguntas tem no idioma pedido: uma palavra sem significado nesse idioma
 * fica de fora (ex.: sugestões em português marcadas "(confirmar)").
 */
@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourse(languageId: string, locale: string) {
    if (!this.prisma.configured) {
      throw new ServiceUnavailableException({
        code: "DATABASE_NOT_CONFIGURED",
        message: "Base de dados indisponível.",
      });
    }
    const language = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!language || !isPubliclyListed(language.status)) {
      throw new NotFoundException("Língua não disponível.");
    }
    const visible = { in: visibleContentStatuses(language.status) };
    const course = await this.prisma.course.findFirst({
      where: { languageId, status: visible },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        units: {
          where: { status: visible },
          orderBy: { order: "asc" },
          select: {
            id: true,
            slug: true,
            icon: true,
            title: true,
            order: true,
            status: true,
            lessons: {
              where: { status: visible },
              orderBy: { order: "asc" },
              select: {
                id: true,
                slug: true,
                title: true,
                order: true,
                estimatedMinutes: true,
                status: true,
                _count: {
                  select: {
                    exercises: {
                      where: {
                        status: visible,
                        // Só palavras com significado no idioma de quem joga.
                        vocabulary: { translations: { some: { locale } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException("Esta língua ainda não tem curso.");

    const reviewed = (s: string) => s === "APPROVED";
    return {
      language: { id: language.id, name: language.name, beta: language.status === "BETA" },
      locale,
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        reviewed: reviewed(course.status),
      },
      units: course.units.map((u) => ({
        id: u.id,
        slug: u.slug,
        icon: u.icon,
        title: u.title,
        order: u.order,
        reviewed: reviewed(u.status),
        lessons: u.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          order: l.order,
          estimatedMinutes: l.estimatedMinutes,
          questions: l._count.exercises,
          playable: l._count.exercises >= MIN_LESSON_QUESTIONS,
          reviewed: reviewed(l.status),
        })),
      })),
    };
  }
}
