import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { PrismaService } from "../database/prisma.service.js";
import { AudioStorage } from "./audio-storage.js";

/**
 * Áudios aprovados, públicos (como os da Lingua Libre): a app toca-os sem sessão.
 * Pendentes e rejeitados nunca saem por aqui — só pela Área dos Ouvintes, com sessão.
 */
@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AudioStorage,
  ) {}

  @Get("audio/:key")
  @SkipThrottle()
  async audio(@Param("key") key: string, @Res() res: Response) {
    if (!/^rec_[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(key)) throw new NotFoundException();
    const asset = await this.prisma.audioAsset.findUnique({
      where: { storageKey: key },
      select: { status: true, mimeType: true },
    });
    if (asset?.status !== "APPROVED") throw new NotFoundException();
    const data = await this.storage.get(key);
    if (!data) throw new NotFoundException();
    res.setHeader("Content-Type", asset.mimeType);
    // O site (outro domínio) e a app tocam este áudio.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(data);
  }
}
