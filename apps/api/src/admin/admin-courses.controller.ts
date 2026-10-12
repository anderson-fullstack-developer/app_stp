import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser, Roles } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { AdminCoursesService, CONTAINER_STATUSES } from "./admin-courses.service.js";

const Id = z.uuid();
const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/);
const Title = z.string().trim().min(1).max(120);
const Description = z.string().trim().max(1000).optional();
const Difficulty = z.enum(["EASY", "MEDIUM", "HARD"]);

const TreeQuery = z.object({ languageId: LanguageId });
const ReviewQuery = z.object({
  status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]),
});
const CourseBody = z.object({ languageId: LanguageId, title: Title, description: Description });
const UnitBody = z.object({
  courseId: z.uuid(),
  title: Title,
  description: Description,
  icon: z.string().trim().max(8).optional(),
});
const ContainerPatch = z.object({
  title: Title.optional(),
  description: Description,
  icon: z.string().trim().max(8).optional(),
  order: z.number().int().min(0).max(10_000).optional(),
  status: z.enum(CONTAINER_STATUSES).optional(),
});
const LessonBody = z.object({
  unitId: z.uuid(),
  title: Title,
  description: Description,
  difficulty: Difficulty.optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
});
const LessonPatch = z.object({
  title: Title.optional(),
  description: Description,
  difficulty: Difficulty.optional(),
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
  order: z.number().int().min(0).max(10_000).optional(),
});
const WordBody = z.object({ vocabularyId: z.uuid() });
const OrderBody = z.object({ ids: z.array(z.uuid()).max(200) });

/** Cursos, unidades, lições e exercícios no painel (passo 3 do fecho da web). */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Roles(["CONTENT_EDITOR", "LINGUIST", "ADMIN"])
@Controller("admin")
export class AdminCoursesController {
  constructor(private readonly courses: AdminCoursesService) {}

  @Get("courses")
  @ApiOkResponse({ description: "Cursos → unidades → lições de uma língua (com contagens)." })
  tree(@Query(new ZodPipe(TreeQuery)) q: z.infer<typeof TreeQuery>, @CurrentUser() user: AuthUser) {
    return this.courses.tree(user, q.languageId);
  }

  @Get("review-items")
  @ApiOkResponse({ description: "Lições e exercícios num estado (fila de revisão)." })
  reviewItems(
    @Query(new ZodPipe(ReviewQuery)) q: z.infer<typeof ReviewQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.reviewItems(user, q.status);
  }

  @Post("courses")
  createCourse(
    @Body(new ZodPipe(CourseBody)) body: z.infer<typeof CourseBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.createCourse(user, body);
  }

  @Patch("courses/:id")
  updateCourse(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(ContainerPatch)) body: z.infer<typeof ContainerPatch>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.updateContainer(user, "course", id, body);
  }

  @Post("units")
  createUnit(
    @Body(new ZodPipe(UnitBody)) body: z.infer<typeof UnitBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.createUnit(user, body);
  }

  @Patch("units/:id")
  updateUnit(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(ContainerPatch)) body: z.infer<typeof ContainerPatch>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.updateContainer(user, "unit", id, body);
  }

  @Post("lessons")
  createLesson(
    @Body(new ZodPipe(LessonBody)) body: z.infer<typeof LessonBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.createLesson(user, body);
  }

  @Get("lessons/:id")
  @ApiOkResponse({ description: "Uma lição com os exercícios (palavra, traduções, estado)." })
  lesson(@Param("id", new ZodPipe(Id)) id: string, @CurrentUser() user: AuthUser) {
    return this.courses.lesson(user, id);
  }

  @Patch("lessons/:id")
  updateLesson(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(LessonPatch)) body: z.infer<typeof LessonPatch>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.updateLesson(user, id, body);
  }

  @Post("lessons/:id/words")
  @ApiOkResponse({ description: "Juntar uma palavra à lição (exercício em rascunho)." })
  addWord(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(WordBody)) body: z.infer<typeof WordBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.addWord(user, id, body.vocabularyId);
  }

  @Put("lessons/:id/order")
  @HttpCode(200)
  reorder(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(OrderBody)) body: z.infer<typeof OrderBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courses.reorder(user, id, body.ids);
  }

  @Delete("exercises/:id")
  removeExercise(@Param("id", new ZodPipe(Id)) id: string, @CurrentUser() user: AuthUser) {
    return this.courses.removeExercise(user, id);
  }
}
