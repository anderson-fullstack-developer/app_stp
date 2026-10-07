import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ZodPipe } from "../common/zod.pipe.js";
import { CoursesService } from "./courses.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/, "id de língua inválido");
const CourseQuery = z.object({ locale: z.enum(["pt", "en", "fr"]).default("pt") });

@ApiTags("courses")
@Controller("languages/:languageId/course")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @ApiOkResponse({
    description:
      "Curso da língua: unidades e lições visíveis, com o número de perguntas no idioma pedido.",
  })
  get(
    @Param("languageId", new ZodPipe(LanguageId)) languageId: string,
    @Query(new ZodPipe(CourseQuery)) q: z.infer<typeof CourseQuery>,
  ) {
    return this.courses.getCourse(languageId, q.locale);
  }
}
