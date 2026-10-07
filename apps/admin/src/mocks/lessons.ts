import type { Course } from "@/types";
import { lessonExercises } from "./questions";

const lesson = (
  id: string,
  unitId: string,
  title: string,
  status: "completed" | "current" | "locked",
  isTest = false,
) => ({ id, unitId, title, status, isTest, exercises: lessonExercises(id) });

/** Unit/lesson titles are Portuguese structure labels, not Forro content. */
export const forroCourse: Course = {
  id: "c-forro",
  languageId: "forro",
  units: [
    {
      id: "u1",
      index: 1,
      title: "Saudações",
      description: "Cumprimentar e apresentar-se",
      theme: "forest",
      lessons: [
        lesson("l1", "u1", "Cumprimentos", "completed"),
        lesson("l2", "u1", "Apresentações", "completed"),
        lesson("l3", "u1", "Como estás?", "current"),
        lesson("l4", "u1", "Despedidas", "locked"),
        lesson("t1", "u1", "Teste da unidade", "locked", true),
      ],
    },
    {
      id: "u2",
      index: 2,
      title: "Família",
      description: "Pessoas próximas",
      theme: "ocean",
      lessons: [
        lesson("l5", "u2", "Família próxima", "locked"),
        lesson("l6", "u2", "Pessoas", "locked"),
        lesson("l7", "u2", "Descrever", "locked"),
        lesson("t2", "u2", "Teste da unidade", "locked", true),
      ],
    },
    {
      id: "u3",
      index: 3,
      title: "Números",
      description: "Contar e quantidades",
      theme: "cocoa",
      lessons: [
        lesson("l8", "u3", "1 a 10", "locked"),
        lesson("l9", "u3", "Quantidades", "locked"),
        lesson("t3", "u3", "Teste da unidade", "locked", true),
      ],
    },
  ],
};

export const travelCategories = [
  { id: "t1", name: "Saudações", icon: "👋" },
  { id: "t2", name: "Restaurante", icon: "🍽️" },
  { id: "t3", name: "Hotel", icon: "🏨" },
  { id: "t4", name: "Transportes", icon: "🚌" },
  { id: "t5", name: "Mercado", icon: "🧺" },
  { id: "t6", name: "Emergências", icon: "🚑" },
];
