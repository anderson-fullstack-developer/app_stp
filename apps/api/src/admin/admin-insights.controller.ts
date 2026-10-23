import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { Roles } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { AdminInsightsService } from "./admin-insights.service.js";

const SearchQuery = z.object({ q: z.string().trim().min(2).max(80) });

/** Dados reais (só leitura) das páginas do painel. O papel de cada rota segue o menu. */
@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("admin/insights")
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get("languages")
  @Roles(["ADMIN", "LINGUIST", "CONTENT_EDITOR"])
  @ApiOkResponse({ description: "Línguas com contagens de conteúdo e alunos." })
  languages() {
    return this.insights.languages();
  }

  @Get("matches")
  @Roles(["ADMIN", "MODERATOR"])
  @ApiOkResponse({ description: "Partidas da Arena (últimas 200) e números." })
  matches() {
    return this.insights.matches();
  }

  @Get("daily")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Desafios do dia com participação e melhores resultados." })
  daily() {
    return this.insights.daily();
  }

  @Get("rankings")
  @Roles(["ADMIN", "MODERATOR"])
  @ApiOkResponse({ description: "Top 100 da semana e de sempre." })
  rankings() {
    return this.insights.rankings();
  }

  @Get("achievements")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Conquistas e quantas pessoas as ganharam." })
  achievements() {
    return this.insights.achievements();
  }

  @Get("analytics")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Uso dos últimos 30 dias, retenção e conteúdo." })
  analytics() {
    return this.insights.analytics();
  }

  @Get("audit")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Registo de auditoria (últimas 300 ações)." })
  audit() {
    return this.insights.audit();
  }

  @Get("rewards")
  @Roles(["ADMIN"])
  @ApiOkResponse({ description: "Regras de recompensa (XP e moedas)." })
  rewards() {
    return this.insights.rewardRules();
  }

  @Get("search")
  @Roles(["ADMIN", "MODERATOR", "LINGUIST", "CONTENT_EDITOR"])
  search(@Query(new ZodPipe(SearchQuery)) q: z.infer<typeof SearchQuery>) {
    return this.insights.search(q.q);
  }
}
