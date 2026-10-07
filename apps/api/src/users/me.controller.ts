import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { type AuthUser, UsersService } from "./users.service.js";

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("me")
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: "Perfil do utilizador autenticado, com os papéis." })
  me(@CurrentUser() user: AuthUser) {
    return this.users.profile(user.id);
  }
}
