// Configuração da CLI do Prisma 7 (migrações, seed). O .env não é lido automaticamente no Prisma 7.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrações usam a ligação DIRETA (sem pooler). Vazio em CI: só `prisma generate` corre lá.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
