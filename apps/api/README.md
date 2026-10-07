# apps/api — API NestJS

API REST da plataforma (servidor autoritativo). Plano completo em [`docs/BACKEND.md`](../../docs/BACKEND.md).

## Stack
NestJS 12 (ESM) · TypeScript 6 · Zod 4 (configuração e validação) · Helmet · CORS restrito ·
rate limiting (`@nestjs/throttler`) · logs estruturados (Pino) · Sentry (opcional) · Swagger · Vitest + Supertest.

## Começar
```bash
cp apps/api/.env.example apps/api/.env   # opcional: os valores por omissão servem para desenvolvimento
pnpm dev:api                             # http://localhost:3000/api/v1/health
```
Documentação interativa (fora de produção): http://localhost:3000/api/docs

## Base de dados (Neon + Prisma 7)
```bash
pnpm --filter @stp/api db:migrate   # cria/aplica migrações (usa DIRECT_URL)
pnpm --filter @stp/api db:seed      # países, línguas, variantes e vocabulário Kriolu (DRAFT)
pnpm --filter @stp/api db:studio    # explorar dados no navegador
```
O cliente Prisma é gerado em `src/generated/` (fora do Git) automaticamente no `pnpm install`.

## Endpoints
| Rota | O quê |
|---|---|
| `GET /api/v1/health` | Estado da API e da base de dados (503 se a base de dados falhar) |
| `GET /api/v1/languages` | Países e línguas com o estado (ACTIVE, BETA, COMING_SOON) |
| `GET /api/v1/languages/:id/vocabulary?locale=pt&take=50&cursor=` | Vocabulário visível: só APPROVED; em Beta inclui rascunhos marcados `reviewed: false` |
| `GET /api/v1/me` | Perfil do utilizador autenticado (`Authorization: Bearer <token do Clerk>`), com os papéis |
| `POST /api/v1/webhooks/clerk` | Eventos do Clerk (`user.created/updated/deleted`), assinatura verificada |

## Autenticação (Clerk)
- O cliente envia o token de sessão do Clerk (`getToken()`) em `Authorization: Bearer`.
- `ClerkAuthGuard` valida o token (`CLERK_SECRET_KEY`, origem em `CLERK_AUTHORIZED_PARTIES`), carrega o
  utilizador da Neon e, se o webhook ainda não chegou, sincroniza-o na hora. Contas não ativas → 403.
- Papéis: `@Roles("ADMIN", ...)` numa rota com o guard; `SUPER_ADMIN` passa sempre. Todos começam com `USER`.
- Webhook: criar o endpoint no painel do Clerk (Webhooks → Add endpoint → `https://<api>/api/v1/webhooks/clerk`,
  eventos `user.*`) e pôr o *signing secret* em `CLERK_WEBHOOK_SIGNING_SECRET`. Em desenvolvimento:
  `clerk webhooks listen --forward-to http://localhost:3000/api/v1/webhooks/clerk`.
- Conta eliminada no Clerk → linha anonimizada (sem email, nome, país nem papéis), estado `DELETED`.
- O perfil da app (país, línguas, língua a aprender) vem do onboarding só na criação; depois é gerido pela API.

## Comandos
| Comando | O quê |
|---|---|
| `pnpm --filter @stp/api dev` | Servidor com recarregamento |
| `pnpm --filter @stp/api test` | Testes unitários + e2e |
| `pnpm --filter @stp/api build` | Compila para `dist/` |
| `pnpm --filter @stp/api start` | Corre a versão compilada |

## Regras
- Todas as rotas em `/api/v1/...`.
- Configuração validada em `src/config/env.ts`: se faltar ou estiver errada, a API **não arranca**.
- Erros sempre no formato `{ statusCode, code, message, details?, path, timestamp }` (`src/common/all-exceptions.filter.ts`); nunca stack traces para o cliente.
- O cliente nunca envia XP, moedas, pontuação, vidas ou resultados — o servidor calcula tudo.
- Segredos só em variáveis de ambiente (nunca no repositório, que é público).
