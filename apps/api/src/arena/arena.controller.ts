import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/auth.decorators.js";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard.js";
import { PrismaService } from "../database/prisma.service.js";
import type { AuthUser } from "../users/users.service.js";

/** Histórico da Arena (o jogo em si corre no gateway Socket.IO). */
@ApiTags("arena")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("arena")
export class ArenaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("matches")
  @ApiOkResponse({ description: "As minhas últimas 20 partidas terminadas." })
  async matches(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.arenaMatchPlayer.findMany({
      where: { userId: user.id, match: { status: "FINISHED" } },
      orderBy: { match: { finishedAt: "desc" } },
      take: 20,
      include: {
        match: {
          select: {
            id: true,
            mode: true,
            languageId: true,
            roomCode: true,
            rounds: true,
            rewarded: true,
            finishedAt: true,
            _count: { select: { players: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      matchId: r.match.id,
      mode: r.match.mode,
      languageId: r.match.languageId,
      roomCode: r.match.roomCode,
      finishedAt: r.match.finishedAt,
      rounds: r.match.rounds,
      players: r.match._count.players,
      rewarded: r.match.rewarded,
      place: r.place,
      correct: r.correct,
      wrong: r.wrong,
      timeouts: r.timeouts,
      left: r.left,
      xp: r.xp,
      coins: r.coins,
    }));
  }
}
