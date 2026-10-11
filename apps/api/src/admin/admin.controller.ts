import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { CurrentUser, Roles } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import type { AuthUser } from "../users/users.service.js";
import { ADMIN_CONTENT_KINDS, AdminContentService } from "./admin-content.service.js";
import { AdminUsersService, GRANTABLE_ROLES } from "./admin-users.service.js";

const LanguageId = z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/);
const Kind = z.enum(ADMIN_CONTENT_KINDS);
const Id = z.uuid();
const Status = z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
const PartOfSpeech = z.enum([
  "NOUN",
  "PROPER_NOUN",
  "VERB",
  "ADJECTIVE",
  "ADVERB",
  "PRONOUN",
  "PREPOSITION",
  "CONJUNCTION",
  "INTERJECTION",
  "NUMERAL",
  "DETERMINER",
  "ARTICLE",
  "PARTICLE",
  "PHRASE",
  "OTHER",
]);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const ListQuery = z.object({
  languageId: LanguageId.optional(),
  status: Status.optional(),
  q: z.string().trim().max(80).optional(),
});
const ContentBody = z.object({
  languageId: LanguageId,
  text: z.string().trim().min(1).max(300),
  translations: z
    .object({ pt: optionalText(300), en: optionalText(300) })
    .default({ pt: undefined, en: undefined }),
  partOfSpeech: PartOfSpeech.optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  category: optionalText(60),
  notes: optionalText(2000),
  context: optionalText(500),
  sourceRef: optionalText(500),
});
const UsersQuery = z.object({ q: z.string().trim().max(80).optional() });
const GrantBody = z.object({
  role: z.enum(GRANTABLE_ROLES),
  languageId: LanguageId.nullable().default(null),
});
const StatusBody = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

/**
 * Painel de administração. O papel decide o acesso a cada rota; regras finas (língua do
 * papel, autor não revê, quem dá papéis de admin) ficam nos serviços.
 */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly content: AdminContentService,
    private readonly users: AdminUsersService,
  ) {}

  @Get("overview")
  @Roles(["CONTENT_EDITOR", "LINGUIST", "MODERATOR", "ADMIN"])
  @ApiOkResponse({ description: "Números do painel inicial." })
  overview(@CurrentUser() user: AuthUser) {
    return this.content.overview(user);
  }

  @Get("content/:kind")
  @Roles(["CONTENT_EDITOR", "LINGUIST", "ADMIN"])
  @ApiOkResponse({ description: "Vocabulário ou frases (filtro por língua, estado e texto)." })
  list(
    @Param("kind", new ZodPipe(Kind)) kind: z.infer<typeof Kind>,
    @Query(new ZodPipe(ListQuery)) q: z.infer<typeof ListQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.content.list(user, kind, q);
  }

  @Post("content/:kind")
  @Roles(["CONTENT_EDITOR", "LINGUIST", "ADMIN"])
  @ApiOkResponse({ description: "Criar (fica sempre em DRAFT)." })
  create(
    @Param("kind", new ZodPipe(Kind)) kind: z.infer<typeof Kind>,
    @Body(new ZodPipe(ContentBody)) body: z.infer<typeof ContentBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.content.create(user, kind, body);
  }

  @Patch("content/:kind/:id")
  @Roles(["CONTENT_EDITOR", "LINGUIST", "ADMIN"])
  @ApiOkResponse({ description: "Editar (só DRAFT ou REJECTED)." })
  update(
    @Param("kind", new ZodPipe(Kind)) kind: z.infer<typeof Kind>,
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(ContentBody)) body: z.infer<typeof ContentBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.content.update(user, kind, id, body);
  }

  @Get("users")
  @Roles(["MODERATOR", "ADMIN"])
  @ApiOkResponse({ description: "Utilizadores (pesquisa por @username, nome ou email)." })
  usersList(@Query(new ZodPipe(UsersQuery)) q: z.infer<typeof UsersQuery>) {
    return this.users.list(q.q);
  }

  @Post("users/:id/roles")
  @Roles(["ADMIN"])
  @HttpCode(200)
  grant(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(GrantBody)) body: z.infer<typeof GrantBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.grant(user, id, body.role, body.languageId);
  }

  @Delete("roles/:roleId")
  @Roles(["ADMIN"])
  revoke(@Param("roleId", new ZodPipe(Id)) roleId: string, @CurrentUser() user: AuthUser) {
    return this.users.revoke(user, roleId);
  }

  @Post("users/:id/status")
  @Roles(["MODERATOR", "ADMIN"])
  @HttpCode(200)
  setStatus(
    @Param("id", new ZodPipe(Id)) id: string,
    @Body(new ZodPipe(StatusBody)) body: z.infer<typeof StatusBody>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.setStatus(user, id, body.status);
  }
}
