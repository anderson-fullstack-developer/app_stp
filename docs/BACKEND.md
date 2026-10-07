# Fala Neto — Plano do Backend

> Complementa `docs/PLANO_DE_ENGENHARIA.md` (fases e ADRs). Este documento detalha **o que vamos usar, onde fica alojado e a ordem exata de construção** do backend.
>
> Estado (2026-10-07): fase 0 concluída; **B1 concluído** — `apps/api` com NestJS 12 (ESM), configuração validada com Zod 4, `/api/v1/health`, Helmet, CORS, rate limiting, erros uniformes, logs Pino, Sentry opcional, Swagger e testes e2e. **B2 parte 1 concluída:** Prisma 7 + Neon (eu-central-1), migração `init_core` (países, línguas, variantes, utilizadores, papéis por língua, curso/unidade/lição/exercício, vocabulário e frases com traduções por idioma, áudio, fontes/licenças, revisão, auditoria), seed com o Kriolu (1059 palavras DRAFT) e endpoints `/languages` e `/languages/:id/vocabulary`. **B2 parte 2 concluída (2026-10-07):** migração `progress_gamification` (estatísticas, livro-razão de XP e moedas, dias ativos, progresso e tentativas de lição, conquistas, regras de recompensa) com restrições na BD (saldo ≥ 0, máx. 2 proteções, 1 tentativa ativa por lição); regras puras testadas em `apps/api/src/progress/rules`; `GET /me` devolve XP, nível, moedas e streak calculados no fuso do utilizador. Tudo conforme `docs/REGRAS_DE_NEGOCIO.md`.
> **B5 parte 1 (2026-10-07):** curso de Kriolu (Beta) na Neon — 9 unidades, 66 lições, 533 exercícios (um por palavra, ligado ao vocabulário por `vocabularyId`), montado por `src/courses/course-builder.ts` a partir de `content/courses/kabuverdianu/themes.json` (os mesmos temas da app). `GET /api/v1/languages/:id/course?locale=` devolve só conteúdo visível e quantas perguntas cada lição tem no idioma pedido. Revisão: `POST /api/v1/content/:kind/:id/(submit|approve|request_changes|reject|archive)`, fila e histórico; regras em `src/content/review-rules.ts` (autor nunca revê o próprio conteúdo, nem sendo admin; linguista só da sua língua), com registo em `content_reviews` e `admin_audit_logs`. Nota: com restrições novas, `prisma migrate dev` pede confirmação interativa — gerar a migração com `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` e aplicar com `prisma migrate deploy`.
> **B4 adiantado (frontend):** Clerk ligado à app web (`clerk init`, app `Fala Neto`): login/registo reais com email+código, palavra-passe e Google; registo no fim do onboarding leva país, línguas faladas, idioma, língua a aprender, motivos e objetivo em `unsafeMetadata`; gestão de conta (incl. eliminar conta) em Definições → Conta; ecrãs em PT/EN com o tema da app. **B4 concluído na API (2026-10-07):** `ClerkAuthGuard` valida o token de sessão e carrega o utilizador (sincroniza na hora se o webhook ainda não chegou), `@Roles` com papéis (todos começam com `USER`; `SUPER_ADMIN` passa sempre), `GET /api/v1/me`, webhook `POST /api/v1/webhooks/clerk` com assinatura verificada (`user.created/updated` → cria/atualiza; `user.deleted` → anonimiza). Testado contra a Neon. **Falta configurar** o endpoint do webhook no painel do Clerk (signing secret) — até lá o `/me` cria o utilizador no primeiro pedido.

---

## 1. Visão geral

```text
 App Android (Expo)            Painel admin (web)
        │  HTTPS REST /api/v1 + Socket.IO   │  HTTPS /api/v1/admin
        ▼                                    ▼
 ┌──────────────────────────────────────────────────────┐
 │  API NestJS  (Railway, região UE)                     │
 │  auth Clerk · RBAC · validação Zod · rate limit       │
 └───┬──────────┬───────────┬───────────┬───────────────┘
     │ Prisma   │ ficheiros │ email     │ (fase 4) cache/filas
     ▼          ▼           ▼           ▼
   Neon      Cloudflare   Resend     Upstash Redis
 (Postgres)     R2
     ▲
 Webhooks a entrar na API: Clerk (contas) · RevenueCat (subscrições) · Stripe (escolas, mais tarde)
 Observabilidade: Sentry (erros) · PostHog (produto) · health check
```

Princípio: **o servidor é a única fonte de verdade** (XP, moedas, streak, vidas, respostas, tempo, vencedor, acesso Premium).

---

## 2. Serviços e alojamento

Todos têm plano gratuito ou de entrada suficiente para desenvolvimento e testes. Preços mudam — confirmar no site de cada um antes de passar a plano pago.

### 2.1 Essenciais (MVP)

| # | Serviço | Para quê | Quando | Região | Notas |
|---|---|---|---|---|---|
| 1 | **GitHub** | Código, CI (Actions) | ✅ já em uso | — | Repositório público: nunca commitar segredos. |
| 2 | **Neon** | Base de dados PostgreSQL | Passo B2 | UE (Frankfurt) | Um *branch* por ambiente: `dev`, `staging`, `main` (produção). URL com pooling para a app, URL direta para migrações. |
| 3 | **Railway** | Alojar a API NestJS (+ Socket.IO) | Passo B3 | UE (Amesterdão) | Processo sempre ligado (necessário para tempo real). Deploy automático a partir do GitHub. Serviços separados para staging e produção. |
| 4 | **Clerk** | Contas: email + palavra-passe, Google (Apple mais tarde), verificação de email, recuperar palavra-passe | Passo B4 | EUA | Envia os emails de autenticação. Confirmar acordo de tratamento de dados (RGPD). |
| 5 | **Cloudflare R2** | Áudios das palavras/frases, imagens, avatares | Passo B6 | UE | Sem custo de saída de dados. Upload por URL assinada emitida pela API. |
| 6 | **Cloudflare (DNS + domínio)** | Domínio próprio (`api.`, `admin.`, `media.`, email) | Passo B0 | — | Necessário para o Resend (verificar domínio) e para URLs estáveis. |
| 7 | **Cloudflare Workers/Pages** *(ou Vercel)* | Alojar o painel admin | Passo B7 | — | O build do admin já gera saída para Cloudflare. Vercel também serve. |
| 8 | **Resend** | Emails da app (boas-vindas, lembrete de streak, resumo semanal, convites de escolas, avisos ao admin) | Passo B10 | UE | Os emails de login/recuperação são do Clerk; o Resend é para o resto. Exige verificar o domínio (registos DNS SPF/DKIM). |
| 9 | **Sentry** | Erros da API, app e admin | Passo B1 | UE | Plano gratuito chega para o início. |
| 10 | **PostHog** | Analytics de produto (registos, 1.ª lição, retenção) | Passo B10 | **UE** (escolher a cloud europeia) | RGPD: pedir consentimento quando aplicável. |
| 11 | **Expo EAS** | Builds Android (.aab), atualizações OTA, notificações push | Fase 3 (app) | — | Push via Expo Push Service → Firebase Cloud Messaging. |
| 12 | **Google Play Console** | Publicar a app; produtos de subscrição | Fase 3 | — | Taxa única de registo. Teste fechado ≥ 14 dias antes de produção (contas pessoais novas). |
| 13 | **Firebase (só FCM)** | Entrega das notificações push no Android | Fase 3 | — | Usado pelo Expo; não usamos o resto do Firebase. |

### 2.2 Mais tarde

| # | Serviço | Para quê | Quando |
|---|---|---|---|
| 14 | **RevenueCat** | Subscrições Premium via Google Play Billing; webhook para a API | Fase 5 |
| 15 | **Google AdMob** | Anúncios (só nos sítios permitidos) | Fase 5 |
| 16 | **Upstash Redis** | Matchmaking com várias instâncias, Socket.IO Redis Adapter, cache de rankings, rate limit distribuído | Quando a Arena precisar de >1 instância |
| 17 | **Stripe** | **Só escolas/instituições e vendas fora da app** (faturas, licenças B2B) | Fase 7 |
| 18 | **UptimeRobot / Better Stack** | Alerta se a API cair | Antes da produção |

> **Stripe e a Google Play:** conteúdo digital vendido **dentro** da app Android tem de usar o Google Play Billing (por isso RevenueCat). O Stripe fica para licenças a escolas e pagamentos na web — nunca para desbloquear funcionalidades dentro da app.

### 2.3 Não vamos usar (e porquê)

| Serviço | Motivo |
|---|---|
| Cloudinary | Um só fornecedor de ficheiros no início (R2). Reavaliar se forem precisas transformações de imagem. |
| Supabase / Firebase como backend | Já escolhemos NestJS + Neon; evitar duas fontes de verdade. |
| Vercel/Netlify para a API | Funções *serverless* não mantêm ligações Socket.IO. |

---

## 3. Ambientes

| | Local | Staging | Produção |
|---|---|---|---|
| API | `localhost:3000` | Railway `stp-api-staging` | Railway `stp-api` |
| Base de dados | Neon branch `dev` | Neon branch `staging` | Neon `main` |
| Ficheiros | R2 bucket `stp-media-dev` | `stp-media-staging` | `stp-media` |
| Clerk | instância de desenvolvimento | instância de desenvolvimento | instância de produção |
| Admin | `localhost:8080` | `admin-staging.<domínio>` | `admin.<domínio>` |
| Quem usa | developers | equipa, linguistas, testadores | utilizadores reais |

Deploy: `main` → staging automático; produção por promoção manual (tag/release) depois de testar em staging.

---

## 4. Variáveis de ambiente (só nomes — valores nunca no repositório)

**API (`apps/api/.env`, segredos nos painéis da Railway):**

```bash
NODE_ENV=                 # development | staging | production
PORT=3000
DATABASE_URL=             # Neon, com pooling (app)
DIRECT_URL=               # Neon, direta (migrações Prisma)
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=     # assinatura dos webhooks (Svix)
CORS_ORIGINS=             # URLs do admin/app autorizados
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=            # ex.: https://media.<domínio>
RESEND_API_KEY=
EMAIL_FROM=               # ex.: "Fala Neto <ola@<domínio>>"
SENTRY_DSN=
POSTHOG_KEY=
# mais tarde
REVENUECAT_WEBHOOK_SECRET=
REDIS_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

**Admin / app (só chaves públicas):** `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY` · no Expo: `EXPO_PUBLIC_*` equivalentes.

---

## 5. Stack do backend (`apps/api`)

| Peça | Escolha |
|---|---|
| Framework | NestJS (TypeScript estrito, módulos por domínio) |
| ORM | Prisma (migrações versionadas) |
| Validação | Zod em `packages/contracts` (partilhado com app e admin) |
| Auth | Clerk (verificação do JWT na API + webhook de utilizadores) |
| Permissões | Guard RBAC com tabela `user_roles` (papéis do admin) |
| Tempo real | Socket.IO (gateway NestJS) — fase 4 |
| Segurança | Helmet, CORS restrito, rate limiting (`@nestjs/throttler`), limites de tamanho, logs de auditoria |
| Logs | Pino (JSON estruturado) |
| Documentação da API | OpenAPI/Swagger gerado (`/api/docs`, só fora de produção) |
| Testes | Jest/Vitest + Supertest; BD de teste num branch Neon |
| Datas | UTC na BD; fuso do utilizador só para calcular "o dia" (streak, desafio diário) |

**Modelo multilíngue (ADR-13):** `Country` → `Language` (`countryId`) → `LanguageVariant` (ex.: variantes por ilha do crioulo cabo-verdiano) → `Course` → `Unit` → `Lesson` → `Exercise`. Vocabulário, frases e áudios têm `languageId` + `variantId` opcional. Progresso, rankings, desafio diário e Arena são sempre **por língua**. Papéis de linguista podem ser **por língua** (um revisor de Forro não aprova Kriolu).

**Módulos:** `health` · `auth` · `users` · `roles` · `languages` · `content` (cursos, unidades, lições, exercícios, vocabulário, frases) · `review` (workflow) · `media` · `progress` · `gamification` (XP, níveis, streak, moedas, conquistas) · `social` (amigos, bloqueios) · `leaderboards` · `daily` · `notifications` · `admin` · `audit` · *(fase 4)* `game` · *(fase 5)* `subscriptions`.

---

## 6. Passos de construção (um passo = um PR, com testes e CI verde)

| Passo | O quê | Entregáveis | Feito quando… | Depende de |
|---|---|---|---|---|
| **B0** | Contas e domínio | Criar contas (secção 7), comprar domínio, DNS na Cloudflare | Todas as contas da fase 1 criadas e chaves guardadas num gestor de senhas | — |
| **B1** ✅ (2026-10-07) | Esqueleto NestJS | `apps/api` no monorepo, config validada, `/api/v1/health`, Helmet, CORS, rate limit, erros uniformes, logs, Sentry, Swagger, testes, CI | `pnpm --filter @stp/api test` verde e CI verde | B0 (Sentry) |
| **B2** ✅ (2026-10-07; tabelas da Arena na Fase 2) | Base de dados | `schema.prisma` do MVP (utilizadores, papéis, conteúdo, revisão, progresso, gamificação, social, auditoria; tabelas de jogo já criadas), migração inicial, seed com **placeholders rotulados**, branches Neon | Migração aplicada em `dev` e `staging`; diagrama do modelo em `docs/` | B1, **regras de negócio** |
| **B3** | Deploy staging | Serviço na Railway, variáveis, health check, deploy automático de `main` | `https://api-staging.<domínio>/api/v1/health` responde | B2 |
| **B4** ✅ (2026-10-07; falta só o endpoint do webhook no painel) | Autenticação | Guard Clerk, webhook → cria/atualiza `User`, papéis, `GET /me`, **eliminar conta** | Registo no Clerk aparece na BD; `/me` só responde autenticado | B3 |
| **B5** 🟡 (parte 1 ✅ 2026-10-07: curso no servidor + fluxo de revisão; falta o CRUD/editor no admin) | Conteúdo + revisão | CRUD de conteúdo; `DRAFT → UNDER_REVIEW → APPROVED/REJECTED → ARCHIVED`; **quem cria não aprova**; histórico, versão, auditoria; API pública só devolve `APPROVED` | Testes provam: autor não aprova; conteúdo não aprovado nunca sai na API pública | B4 |
| **B6** | Ficheiros (R2) | URLs assinadas de upload, validação de tipo/tamanho, `AudioAsset` (falante, região, variante) | Upload de um áudio pelo admin em staging, reprodução por URL pública | B5 |
| **B7** | Admin ligado à API | Login do admin com Clerk; `services/admin.ts` passa a chamar a API; admin publicado | **Linguistas conseguem introduzir e aprovar conteúdo real em staging** | B6 |
| **B8** | Progresso e gamificação | Tentativas de lição, validação de respostas no servidor, XP/níveis/streak (com fuso)/moedas/conquistas, transações idempotentes | Testes das regras de `docs/REGRAS_DE_NEGOCIO.md` | B5, regras |
| **B9** | Social, rankings, diário | Amizades, pedidos, bloqueios, pesquisa; rankings diário/semanal/mensal/global/amigos/país; desafio diário com ranking | Endpoints testados e documentados | B8 |
| **B10** | Emails e analytics | Resend (boas-vindas, lembrete de streak, resumo), preferências de notificação, PostHog no servidor | Email de boas-vindas recebido numa conta de teste | B4 |
| **B11** | Produção | Ambiente de produção, backups (Neon), monitorização de uptime, revisão de segurança, política de privacidade publicada | API de produção ativa e monitorizada | B1–B10 |
| **B12** | Arena em tempo real *(fase 4)* | Gateway Socket.IO, motor `@stp/game-engine` no servidor, matchmaking, salas, reconexão, anti-batota | Partida completa entre 2 clientes reais em staging | B8 |
| **B13** | Pagamentos *(fase 5)* | Webhook RevenueCat, acesso Premium decidido no servidor | Compra de teste na Play Console reflete-se em `/me` | B4, app na Play Console |

> **Antes de B2:** escrever `docs/REGRAS_DE_NEGOCIO.md`. O modelo de dados depende das regras (recompensas configuráveis, limites diários, streak freeze, repetição de lições, Premium).

Em paralelo com B1–B7, a **app mobile** (fase 3) pode começar pelo design system (3.1) e ecrãs com dados de teste, ligando-se à API à medida que os endpoints ficam prontos.

---

## 7. Contas a criar (B0) — checklist para o dono do produto

Criar com um email da equipa (não pessoal) e ativar autenticação de dois fatores em todas.

- [ ] **Domínio** (ex.: na Cloudflare Registrar) — decidir o nome primeiro (D-10 no plano).
- [ ] **Cloudflare** — DNS do domínio + R2 (cartão necessário mesmo no plano gratuito).
- [ ] **Neon** — projeto `lingua-stp`, região UE.
- [ ] **Railway** — ligar ao repositório GitHub.
- [ ] **Clerk** — aplicação `Fala Neto`; ativar email + Google.
- [ ] **Resend** — adicionar e verificar o domínio.
- [ ] **Sentry** — organização + projetos `api`, `admin`, `mobile` (região UE).
- [ ] **PostHog** — projeto na cloud **UE**.
- [ ] *(Fase 3)* **Expo** (EAS) e **Google Play Console**.
- [ ] *(Fase 5)* **RevenueCat**, **AdMob**.
- [ ] *(Fase 7)* **Stripe**.

Os segredos são entregues ao developer por um gestor de senhas (ex.: Bitwarden), **nunca por chat ou email**, e colocados diretamente nos painéis da Railway/Cloudflare.

---

## 8. Custos (ordem de grandeza)

- **Desenvolvimento e testes:** quase tudo nos planos gratuitos. Custos fixos prováveis: domínio (anual) e Railway (plano de entrada, pago por uso).
- **Lançamento:** taxa única da Google Play Console.
- **Crescimento:** Neon, Railway, Clerk e PostHog passam a pagos com o volume de utilizadores; rever mensalmente e ativar alertas de faturação em todos.

---

## 9. Decisões pendentes

| # | Pergunta | Recomendação |
|---|---|---|
| BD-01 | Nome do domínio | Decidir junto com o nome final da app (D-10). |
| BD-02 | Admin na Cloudflare ou na Vercel? | Cloudflare (o build atual já gera para lá; DNS e R2 no mesmo sítio). |
| BD-03 | Railway ou alternativa (Render, Fly.io)? | Railway (simples, suporta Socket.IO, deploy por GitHub). |
| BD-04 | Clerk aceita os requisitos de RGPD/menores? | Confirmar antes de B4; alternativa: auth própria (mais trabalho). |
