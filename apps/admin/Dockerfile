# syntax=docker/dockerfile:1
# Web Fala Neto (TanStack Start: app + painel) para produção — Railway ou qualquer host de contentores.
# Construir a partir da RAIZ do repositório (o monorepo é necessário):
#   docker build -f apps/admin/Dockerfile -t fala-neto-web \
#     --build-arg VITE_API_URL=https://api.exemplo.app \
#     --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_... .

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable
WORKDIR /app

# ---------- dependências (só a web e o que ela usa) ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Os package.json de todas as apps/pacotes têm de existir para o lockfile bater certo.
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages ./packages
# --ignore-scripts: o postinstall da raiz gera o cliente Prisma da API, que a web não usa.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@stp/admin..." --ignore-scripts

# ---------- compilação ----------
FROM deps AS build
# Variáveis VITE_* são PÚBLICAS e ficam dentro do JavaScript enviado ao browser:
# têm de existir no momento da build (a Railway passa-as como build args).
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SIGN_IN_URL=/sign-in
ARG VITE_CLERK_SIGN_UP_URL=/onboarding
ARG VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/learn
ARG VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/learn
COPY apps/admin ./apps/admin
# Dados do curso e das fontes (importados como @content/* pela web).
COPY content ./content
# Servidor Node (a configuração do Lovable usa Cloudflare por omissão).
RUN NITRO_PRESET=node-server pnpm --filter @stp/admin build

# ---------- execução ----------
FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
# A build é autónoma: .output traz o servidor e as dependências de que precisa.
COPY --from=build --chown=node:node /app/apps/admin/.output ./.output
USER node
EXPOSE 3000
# CLERK_SECRET_KEY (segredo) e VITE_CLERK_PUBLISHABLE_KEY chegam em tempo de execução, pelo painel.
CMD ["node", ".output/server/index.mjs"]
