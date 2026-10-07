import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ProgressService } from "../progress/progress.service.js";
import { type AuthUser, UsersService } from "./users.service.js";

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("me")
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly progress: ProgressService,
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

  @Get("achievements")
  @ApiOkResponse({ description: "Conquistas: ganhas (com data) e progresso das restantes." })
  achievements(@CurrentUser() user: AuthUser) {
    return this.progress.achievements(user.id);
  }
}
