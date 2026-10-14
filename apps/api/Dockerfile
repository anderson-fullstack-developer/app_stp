# syntax=docker/dockerfile:1
# API Fala Neto (NestJS) para produção — Railway ou qualquer host de contentores.
# Construir a partir da RAIZ do repositório (o monorepo é necessário):
#   docker build -f apps/api/Dockerfile -t fala-neto-api .

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

# ---------- dependências (só a API e o que ela usa) ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Os package.json de todas as apps/pacotes têm de existir para o lockfile bater certo.
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages ./packages
# O postinstall da raiz corre `prisma generate`, que precisa do schema.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
# Sem --mount=type=cache: a Railway exige um id próprio por serviço e recusa outros formatos.
RUN pnpm install --frozen-lockfile --filter "@stp/api..."

# ---------- compilação ----------
FROM deps AS build
COPY apps/api ./apps/api
RUN pnpm --filter @stp/api db:generate && pnpm --filter @stp/api build

# ---------- execução ----------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
# Utilizador sem privilégios.
RUN chown -R node:node /app
USER node
EXPOSE 3000
# Aplica as migrações pendentes (idempotente) e arranca. Sem migração válida, não arranca.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
