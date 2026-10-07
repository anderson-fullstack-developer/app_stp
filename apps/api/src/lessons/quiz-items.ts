import { shortGloss } from "../courses/course-builder.js";
import type { PrismaService } from "../database/prisma.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { QuizItem } from "./lesson-rules.js";

export type LoadedItem = QuizItem & { lessonId: string | null; unitId: string | null };

/**
 * Palavras dos exercícios de vocabulário escolhidos, com o significado no idioma pedido
 * (a fonte em inglês é resumida). Palavras sem significado nesse idioma ficam de fora.
 * Partilhado pelas lições e pelo desafio do dia.
 */
export async function loadQuizItems(
  prisma: PrismaService,
  where: Prisma.ExerciseWhereInput,
  locale: string,
): Promise<LoadedItem[]> {
  const rows = await prisma.exercise.findMany({
    where: { ...where, vocabularyId: { not: null } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      lessonId: true,
      lesson: { select: { unitId: true } },
      vocabulary: {
        select: {
          id: true,
          word: true,
          partOfSpeech: true,
          translations: { where: { locale }, select: { text: true }, take: 1 },
        },
      },
    },
  });
  return rows.flatMap((r) => {
    const v = r.vocabulary;
    const text = v?.translations[0]?.text;
    if (!v || !text) return [];
    const gloss = locale === "en" ? shortGloss(text) : text.trim();
    if (!gloss) return [];
    return [
      {
        exerciseId: r.id,
        vocabularyId: v.id,
        word: v.word,
        gloss,
        partOfSpeech: v.partOfSpeech,
        lessonId: r.lessonId,
        unitId: r.lesson?.unitId ?? null,
      },
    ];
  });
}
