import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ZodPipe } from "../common/zod.pipe.js";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ClerkService } from "../auth/clerk.service.js";
import { ProgressService } from "../progress/progress.service.js";
import { type AuthUser, UsersService } from "./users.service.js";

const ProfilePatchBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    uiLocale: z.enum(["pt", "en", "fr"]),
    learningLanguageId: z.string().regex(/^[a-z][a-z0-9_-]{1,40}$/),
    countryCode: z.string().regex(/^[a-z]{2,5}$/),
    spokenLanguages: z.array(z.string().regex(/^[a-z]{2,10}$/)).max(12),
    timezone: z.string().min(3).max(64),
  })
  .partial()
  .strict();

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("me")
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly progress: ProgressService,
    private readonly clerk: ClerkService,
  ) {}

  @Get()
  @ApiOkResponse({
    description:
      "Perfil do utilizador autenticado, com os papéis e o progresso (XP, nível, moedas, streak).",
  })
  async me(@CurrentUser() user: AuthUser) {
    const [profile, progress] = await Promise.all([
      this.users.profile(user.id),
      this.progress.summary(user.id),
    ]);
    return { ...profile, progress };
  }

  @Patch()
  @ApiOkResponse({
    description: "Atualiza o perfil (idioma, língua a aprender, país, línguas, fuso).",
  })
  async update(
    @Body(new ZodPipe(ProfilePatchBody)) body: z.infer<typeof ProfilePatchBody>,
    @CurrentUser() user: AuthUser,
  ) {
    const profile = await this.users.updateProfile(user.id, body);
    return { ...profile, progress: await this.progress.summary(user.id) };
  }

  /**
   * Eliminar a conta (exigido pela Google Play): apaga no Clerk e anonimiza na base de dados
   * (sem email, nome, país nem papéis; a linha fica marcada DELETED para a auditoria).
   */
  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser) {
    await this.clerk.deleteUser(user.clerkId);
    await this.users.softDeleteByClerkId(user.clerkId);
  }

  @Get("achievements")
  @ApiOkResponse({ description: "Conquistas: ganhas (com data) e progresso das restantes." })
  achievements(@CurrentUser() user: AuthUser) {
    return this.progress.achievements(user.id);
  }
}
