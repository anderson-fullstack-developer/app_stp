# Fala Neto — Pôr a API e a web online (Railway)

> Tudo o que é código já está pronto: um Dockerfile por serviço, `.dockerignore` na raiz e um `railway.json` por serviço.
>
> | Serviço | Dockerfile | Config Railway |
> |---|---|---|
> | API (NestJS) | `apps/api/Dockerfile` | `railway.json` (raiz) |
> | Web (app + painel) | `apps/admin/Dockerfile` | `apps/admin/railway.json` |
>
> Quando a conta da Railway existir, o deploy é ligar o repositório e colar as variáveis.
> Plano geral e ambientes: `docs/BACKEND.md` (secções 2–4).

## 1. Como funciona

- A Railway lê `railway.json` e constrói a imagem com `apps/api/Dockerfile` (a partir da raiz do monorepo).
- Ao arrancar, o contentor corre `prisma migrate deploy` (aplica só migrações pendentes) e depois `node dist/main.js`.
  Se uma migração falhar, a API **não** arranca — a versão anterior continua no ar.
- A Railway só troca para a nova versão quando `GET /api/v1/health` responde 200 (até 120 s).
- Deploy automático em cada push para `main` que mexa em `apps/api/**`, `packages/**` ou `pnpm-lock.yaml`.
- A Arena (Socket.IO) guarda as salas em memória (ADR-08): usar **1 réplica** por serviço.

## 2. Passos na Railway (uma vez)

1. **New Project → Deploy from GitHub repo** → `anderson-fullstack-developer/app_stp`.
2. Em **Settings** do serviço:
   - Root directory: vazio (raiz do repositório — o Dockerfile precisa do monorepo).
   - Config-as-code: `railway.json` (detetado automaticamente).
   - Região: UE (Amesterdão), perto do Neon.
   - Réplicas: **1**.
3. Em **Variables**, colar as variáveis da secção 3.
4. Em **Networking → Generate Domain** (ou domínio próprio, ex.: `api.falaneto.app`).
5. Abrir `https://<domínio>/api/v1/health` → deve dizer `ok`.
6. Repetir para staging (`stp-api-staging`) com a base de dados/branch Neon de staging.

## 3. Variáveis de ambiente

Os valores **nunca** vão para o repositório — só para o painel da Railway.

| Variável | Valor em produção | Notas |
|---|---|---|
| `NODE_ENV` | `production` | Torna obrigatórias as variáveis marcadas abaixo |
| `PORT` | (não definir) | A Railway define-a sozinha |
| `DATABASE_URL` | Neon, host **com** `-pooler`, `?sslmode=verify-full` | **Obrigatória** |
| `DIRECT_URL` | Neon, host **sem** `-pooler`, `?sslmode=require` | Usada pelas migrações |
| `CLERK_SECRET_KEY` | `sk_live_…` (instância de produção do Clerk) | **Obrigatória** |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_…` | **Obrigatória** — ver secção 4 |
| `CLERK_AUTHORIZED_PARTIES` | URL(s) da web, ex.: `https://falaneto.app` | Separadas por vírgula |
| `CORS_ORIGINS` | URL(s) da web, ex.: `https://falaneto.app` | A app Android não precisa de CORS |
| `RATE_LIMIT_PER_MINUTE` | `120` | Opcional |
| `LOG_LEVEL` | `info` | Opcional |
| `SENTRY_DSN` | — | Opcional, quando houver Sentry |
| `APP_VERSION` | ex.: `1.0.0` | Opcional, aparece no `/health` |

## 3b. Serviço da web

No **mesmo projeto** da Railway: **New → GitHub Repo** (o mesmo repositório) e, em **Settings**:

- Root directory: vazio. **Config-as-code:** `/apps/admin/railway.json` (tem de se indicar à mão — o da raiz é o da API).
- Domínio: o principal, ex.: `falaneto.app`.
- Health check: `/privacy` (página pública, sem sessão).

**Variáveis** (as `VITE_*` são públicas e entram no JavaScript do browser: a Railway passa-as à build; se mudarem, é preciso novo deploy):

| Variável | Valor | Quando é usada |
|---|---|---|
| `VITE_API_URL` | URL da API, ex.: `https://api.falaneto.app` (sem `/api/v1`) | build |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | build e execução |
| `CLERK_SECRET_KEY` | `sk_live_…` (o mesmo da API) | execução — **segredo** |
| `VITE_SOCKET_URL` | (não definir — usa a API) | build |
| `PORT` | (não definir) | a Railway define-a |

Depois de a web ter domínio, pôr esse domínio em `CORS_ORIGINS` e `CLERK_AUTHORIZED_PARTIES` **da API**, e no Clerk (produção) → **Domains**.

## 4. Webhook do Clerk

No painel do Clerk (produção) → **Webhooks → Add endpoint**:

- URL: `https://<domínio-da-api>/api/v1/webhooks/clerk`
- Eventos: `user.created`, `user.updated`, `user.deleted`
- Copiar o **Signing secret** para `CLERK_WEBHOOK_SIGNING_SECRET` na Railway.

## 5. Depois do deploy

- **App Android:** `EXPO_PUBLIC_API_URL` de produção no perfil `production` do `apps/mobile/eas.json`.
- **Conteúdo:** o seed (`pnpm --filter @stp/api db:seed`) corre-se à mão, uma vez, a partir do computador com a `DIRECT_URL` de produção — nunca no arranque do contentor.
- **Primeiro admin:** `pnpm --filter @stp/api exec tsx scripts/grant-role.ts <email> ADMIN`, com as variáveis de produção.

## 6. Testar a imagem localmente (opcional)

Com o Docker Desktop ligado, a partir da raiz:

```bash
docker build -f apps/api/Dockerfile -t fala-neto-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env fala-neto-api
# noutra janela:
curl http://localhost:3000/api/v1/health

# web (as VITE_* entram na build)
docker build -f apps/admin/Dockerfile -t fala-neto-web --build-arg VITE_API_URL=http://localhost:3000 --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_... .
docker run --rm -p 8080:3000 -e CLERK_SECRET_KEY=sk_test_... -e VITE_CLERK_PUBLISHABLE_KEY=pk_test_... fala-neto-web
# abrir http://localhost:8080
```
