import { Injectable, Logger } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import { Prisma, type Role, type User } from "../generated/prisma/client.js";
import {
  type ClerkUserInput,
  displayName,
  parseOnboarding,
  usernameBase,
} from "./clerk-user.mapper.js";

/** Utilizador autenticado, anexado ao pedido pelo ClerkAuthGuard. */
export interface AuthUser {
  id: string;
  clerkId: string;
  roles: { role: Role; languageId: string | null }[];
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * Sincroniza a tabela users com o Clerk. O Clerk é a fonte da identidade (email, nome);
 * o perfil da app (país, línguas, língua a aprender) começa com as escolhas do onboarding
 * e a partir daí é gerido pela nossa API — atualizações do Clerk não o sobrescrevem.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertFromClerk(input: ClerkUserInput): Promise<User | null> {
    if (!input.email) {
      this.logger.warn({ clerkId: input.clerkId }, "Utilizador do Clerk sem email; ignorado");
      return null;
    }
    const email = input.email;
    const name = displayName(input);
    const profile = parseOnboarding(input.unsafeMetadata);
    const learningLanguageId = await this.existingLanguage(profile.learningLanguageId);

    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await this.prisma.user.findFirst({
        where: { OR: [{ clerkId: input.clerkId }, { email }] },
      });
      if (existing) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: {
            clerkId: input.clerkId,
            email,
            name,
            // Perfil: só preenche o que ainda está vazio.
            ...(existing.countryCode == null && profile.countryCode
              ? { countryCode: profile.countryCode }
              : {}),
            ...(existing.spokenLanguages.length === 0 && profile.spokenLanguages
              ? { spokenLanguages: profile.spokenLanguages }
              : {}),
            ...(existing.learningLanguageId == null && learningLanguageId
              ? { learningLanguageId }
              : {}),
          },
        });
      }
      try {
        const base = usernameBase(input);
        return await this.prisma.user.create({
          data: {
            clerkId: input.clerkId,
            email,
            name,
            username: attempt === 0 ? base : `${base}${randomInt(1000, 99999)}`,
            ...(profile.countryCode ? { countryCode: profile.countryCode } : {}),
            ...(profile.spokenLanguages ? { spokenLanguages: profile.spokenLanguages } : {}),
            ...(profile.uiLocale ? { uiLocale: profile.uiLocale } : {}),
            ...(learningLanguageId ? { learningLanguageId } : {}),
            roles: { create: { role: "USER" } },
          },
        });
      } catch (e) {
        // Username ocupado, ou o webhook e o /me criaram o mesmo utilizador ao mesmo tempo:
        // tenta outra vez (a próxima volta encontra-o ou usa outro username).
        if (!isUniqueViolation(e)) throw e;
      }
    }
    throw new Error(`Não foi possível criar o utilizador ${input.clerkId}`);
  }

  /** Conta eliminada no Clerk: apaga os dados pessoais e mantém só a linha anónima (auditoria). */
  async softDeleteByClerkId(clerkId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) return false;
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: user.id } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          clerkId: null,
          email: `deleted+${user.id}@lingua-stp.invalid`,
          username: `deleted_${user.id.replaceAll("-", "")}`,
          name: "Conta eliminada",
          avatarColor: null,
          countryCode: null,
          spokenLanguages: [],
          learningLanguageId: null,
          status: "DELETED",
          deletedAt: new Date(),
        },
      }),
    ]);
    return true;
  }

  findAuthUser(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        status: true,
        roles: { select: { role: true, languageId: true } },
      },
    });
  }

  /** Perfil devolvido em GET /me. */
  async profile(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { select: { role: true, languageId: true } } },
    });
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      avatarColor: u.avatarColor,
      countryCode: u.countryCode,
      spokenLanguages: u.spokenLanguages,
      uiLocale: u.uiLocale,
      timezone: u.timezone,
      learningLanguageId: u.learningLanguageId,
      status: u.status,
      roles: u.roles,
      createdAt: u.createdAt,
    };
  }

  private async existingLanguage(id: string | undefined): Promise<string | undefined> {
    if (!id) return undefined;
    const lang = await this.prisma.language.findUnique({ where: { id }, select: { id: true } });
    return lang?.id;
  }
}
