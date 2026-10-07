# Fala Neto — "Aprende. Joga. Preserva."

Aplicação mobile de ensino das línguas de São Tomé e Príncipe (Forro/Santomé primeiro; depois Angolar e Lung'Ie/Principense), que combina **aprendizagem, gamificação, cultura, amigos e competição**.

> **Começa por [docs/HANDOFF.md](docs/HANDOFF.md)** — o documento de handoff com o mapa detalhado de ficheiros, endpoints futuros e ordem sugerida do trabalho backend.

**Regra de conteúdo (crítica):** nenhuma palavra, tradução ou pronúncia de Forro foi inventada. Todo o conteúdo de amostra é um *placeholder* rotulado ("Palavra em Forro", "Tradução em Portugês", "Áudio de exemplo"). O conteúdo real entra pela API, depois de revisão linguística.

---

## 1. O que é o Fala Neto

Um protótipo **frontend completo e clicável** do app, com o feel de uma aplicação Android (não um site responsivo):

- **Aprender** — caminho de aprendizagem (idioma → curso → unidade → lições), lições com exercícios, XP, moedas, streak, meta diária.
- **Jogar** — multiplayer: sobrevivência, 1v1, 2v2, salas privadas e torneios (flag desligada).
- **Social** — amigos, rankings, conquistas, notificações, desafios.
- **Premium / Loja** — paywall, loja de recompensas (moedas apenas se ganham, nunca se compram), anúncios simulados.
- **/admin** — painel desktop de gestão de conteúdo com papéis, fluxo de revisão (DRAFT → UNDER_REVIEW → APPROVED) e sugestões de IA (sempre DRAFT).

Todo o estado é **mock** (memória + `localStorage`); o backend real será NestJS + Prisma + Neon, Socket.IO, Clerk, etc. — ver secção 12.

## 2. Stack atual

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start v1 (React 19, Vite 7) |
| Router | TanStack Router (rotas por ficheiro em `src/routes/`) |
| UI | Tailwind CSS v4 (tokens em `src/styles.css`), shadcn primitives (`src/components/ui`) |
| Fontes | Bricolage Grotesque + Figtree (carregadas no `head()` do `__root`) |
| Estado | Hooks React (`use-game.ts`, `use-service.ts`); TanStack Query disponível |
| Testes | Vitest (`src/test/` — regras de jogo, engine multiplayer, workflow admin, routing) |
| Dados | Mocks em `src/mocks/` + store em memória do admin |

Alvos futuros: React Native + Expo, NestJS + Prisma + Neon, Clerk, R2, Socket.IO + Redis, RevenueCat, Stripe, AdMob, PostHog, Sentry (mapa em `src/services/integrations.ts`).

## 3. Como executar localmente

```sh
# dependências (Bun recomendado; npm também funciona)
bun install          # ou: npm i

# servidor de desenvolvimento
bun run dev          # ou: npm run dev  → http://localhost:8080

# testes
bunx vitest run
```

Requisitos: Node.js 20+ (ou Bun). Não é preciso nenhuma chave nem base de dados — tudo corre com mocks. `.env.example` lista apenas **chaves públicas** (`VITE_*`); segredos ficam só no backend.

App mobile: renderiza dentro de um `PhoneFrame` (mobile-first, 360–430 px; tablets/desktop são secundários). **Exceção:** `/admin` é desktop-first.

## 4. Estrutura de pastas

```text
src/
  config/         # valores centralizados (única fonte de verdade no frontend)
    app.ts         # nome, preços, recompensas, vidas, timers, feature flags
    api.ts         # API_BASE_URL, SOCKET_URL, API_ENDPOINTS, apiUrl()
    ads.ts         # política de anúncios (placements permitidos + contextos bloqueados)
  routes/         # uma rota por ecrã (learn.tsx, play.*, admin.*)
  layouts/        # AppShell.tsx — PhoneFrame, TabLayout, bottom nav
  components/     # app/ (estados, gating), exercises/, play/, ui/ (shadcn)
  services/       # TODOS os dados passam por aqui (mock-backed hoje)
  mocks/          # dados de demonstração, um ficheiro por área
  hooks/          # use-game (XP/streak), use-async, use-service, use-online
  lib/            # multiplayer/engine.ts (regras puras), utils
  admin/          # painel admin: shell, store, permissions, workflow, types
  types/          # domínio (User, Lesson, …), multiplayer, game-contract, async
  test/           # Vitest
docs/HANDOFF.md    # handoff para o backend
```

Convenções que valem regra:

- Componentes/routes **nunca** importam `src/mocks/*` nem `src/admin/store.ts` — só `src/services/`.
- Nenhum URL hardcoded em componentes; valores de produto (preços, recompensas, vidas) só em `src/config/app.ts`.
- Anúncios apenas via `AdSlot`/`RewardedAdCard`, com a política de `src/config/ads.ts`.
- Desligar uma feature = mudar um flag para `false` (`src/config/app.ts`) — **nunca apagar código**.

## 5. Principais páginas

| Rota | Ecrã |
|---|---|
| `/` → `/onboarding` → `/login` | Entrada no app (fluxo first-run) |
| `/learn` | **Home APRENDER** — avatar, streak 🔥, XP ⭐, moedas 🪙, nível, caminho de aprendizagem |
| `/lesson/$lessonId` → `/lesson-result` | Lição (exercícios) → resultado |
| `/play` | **Jogar** — modos multiplayer (ver secção 9) |
| `/daily`, `/ranking`, `/achievements`, `/friends`, `/notifications`, `/challenges` | Diário, ranking, conquistas, amigos, notificações, desafios |
| `/shop`, `/premium`, `/travel`, `/schools` | Loja, Premium, Viajar e Escolas (travel/schools atrás de flags) |
| `/profile`, `/settings`, `/user/$userId` | Perfil, definições, perfil público |
| `/admin` (e `admin.*`) | Painel de gestão de conteúdo (desktop) |

Rotas antigas (`room`, `quiz`, `elimination`) redirecionam para os ecrãs atuais — nenhum beco sem saída. Páginas de erro (404/500) estão em português e voltam a `/learn`.

## 6. Como funcionam os mocks

- **Um ficheiro por área** em `src/mocks/`: `users`, `languages`, `lessons`, `questions`, `friends`, `leaderboards`, `achievements`, `games`, `rooms`, `notifications`, `admin`.
- **Deduplicação por derivação:** todas as pessoas demo (amigos, ranking, oponentes/bots, salas, utilizadores admin) derivam da **única** lista em `mocks/users.ts`; todas as perguntas (lições, multiplayer, exercícios do admin) derivam da **única** lista em `mocks/questions.ts`. Nunca se repetem jogadores ou perguntas.
- **Acesso:** apenas os services importam `@/mocks`. Ecrãs pedem sempre ao service correspondente.
- **Estado mutável:** XP, moedas, streak e meta diária vivem em `src/hooks/use-game.ts` (`localStorage` `lstp-game-v1`); a store do admin (`src/admin/store.ts`) é em memória e repõe-se ao recarregar.
- **Placeholders Forro:** os mocks contêm apenas texto rotulado — nenhum conteúdo linguístico real foi criado.

## 7. Como funcionam os services

- Camada única de dados: routes/components → `src/services/*` → mocks (hoje) ou REST/Socket.IO (futuro).
- `services/index.ts` agrega: `authService`, `userService`, `languageService`, `lessonService`, `progressService`, `friendService`, `leaderboardService`, `achievementService`, `notificationService`, `challengeService`, `multiplayerService`, `roomService`, `subscriptionService`, `shopService`, `adsService`; `services/admin.ts` cobre o painel.
- `auth.service.ts`: `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `getCurrentUser`, `getToken` — mock (token `mock-token`), pronto para trocar por Clerk sem alterar ecrãs.
- `http.ts`: cliente partilhado (header `Authorization: Bearer <token>`, erro tipado `ApiError`), usado só quando `USE_MOCK_API` está desligado.
- `media.service.ts`: `imageService`/`audioService` (Cloudinary / R2 no futuro) — devolvem `MediaAsset {url, key}`; uploads futuros via signed URLs do backend.
- `subscription.service.ts`: espelha a API do RevenueCat (`getOfferings`, `purchasePackage`, `restorePurchases`) sem compras reais; `isPremium` será sempre verificado no servidor.
- `game.service.ts` + `types/game-contract.ts`: ver secção 9.

## 8. Como substituir mocks pela API

A troca é **por corpo de função, sem mudar assinaturas** — os ecrãs não mudam:

1. Definir `VITE_API_URL` (`.env.example`) → `USE_MOCK_API` desliga-se automaticamente em `src/config/api.ts`.
2. Para cada service, substituir o corpo: mocks → `http.get(API_ENDPOINTS.users)` etc. As assinaturas (tipos de `src/types/index.ts`) mantêm-se, por isso o TypeScript aponta o que falta.
3. Endpoints previstos: `/api/v1/auth`, `/users`, `/languages`, `/lessons`, `/progress`, `/friends`, `/leaderboards`, `/games`, `/rooms`, `/admin` (constantes em `API_ENDPOINTS`).
4. Remover `src/mocks/` quando a API cobrir tudo. O estado do `use-game.ts` passa para `GET /me` / `POST /progress/lesson`.
5. Multiplayer: substituir as callbacks mock do `game.service.ts` por eventos Socket.IO — o contrato (`RealtimeGameService`) já está definido.

## 9. Modos multiplayer existentes

A área **Jogar** (`/play`) inclui:

- **Sobrevivência** (modo principal) — matchmaking global, vidas partilhadas, eliminação progressiva.
- **1v1 (Duelo)** — pergunta a pergunta, `DUEL_QUESTION_COUNT` perguntas.
- **2v2 (Equipas)** — battle por equipas.
- **Salas privadas** — criar/juntar por código, lobby com `setReady`, partida na hora.
- **Torneios** — atrás de flag (`tournaments: false`), preview "Em breve".

Contrato **server-authoritative** (`src/types/game-contract.ts` — `RealtimeGameService`): `findMatch`, `cancelMatch`, `createRoom`, `joinRoom`, `leaveRoom`, `setReady`, `submitAnswer`, `reconnect`, `getGameState`. **O servidor é a única fonte de verdade** para vidas, pontuação, resultado, vencedor, resposta correta e tempo oficial (`deadlineAt`); o cliente envia intenções e renderiza `GameStateSnapshot`s — `submitAnswer` devolve apenas `AnswerAck` (aceite/atrasada), nunca a correção.

Hoje, `src/lib/multiplayer/engine.ts` simula o servidor localmente para o demo (bots progressivos, lobby 4/8/16 jogadores, 1–5 vidas, 5–20 s por pergunta). Portar essas regras para o backend é o passo seguinte — os eventos devem espelhar as callbacks do `game.service.ts`.

## 10. Admin existente (`/admin`)

Painel **desktop-first** (exceção ao PhoneFrame), em `src/admin/*` + `src/routes/admin.*`:

- **Papéis** (`src/admin/permissions.ts`): `SUPER_ADMIN`, `ADMIN`, `LINGUIST`, `CONTENT_EDITOR`, `MODERATOR` — matriz de permissões por papel (espelhar no servidor; no backend os papéis ficam numa tabela `user_roles` separada, nunca no perfil).
- **Login mock** (`admin_.login`): aceita qualquer credencial — **não é segurança**; sessão em `localStorage`.
- **Fluxo de conteúdo** (`src/admin/workflow.ts`): `DRAFT → UNDER_REVIEW → APPROVED / REJECTED`; editores criam e submetem mas **não aprovam**; **só conteúdo APPROVED chega ao app**; saída de IA é sempre `DRAFT`.
- **Secções:** dashboard, idiomas, cursos, lições, exercícios, vocabulário, frases, áudios, revisão, utilizadores, multiplayer, rankings, conquistas, diário, premium, anúncios, relatórios, pesquisa, auditoria, analytics, definições.
- Dados via `src/services/admin.ts` sobre a store em memória (`src/admin/store.ts`, semeada de `src/mocks/admin.ts`) — repõe-se ao recarregar.

## 11. Funcionalidades ainda simuladas

Nada disto é real hoje — tudo mock, sem chamadas de rede:

- **Auth** — login/registo/sessão mock (Clerk depois; mock admin aceita tudo).
- **Multiplayer** — oponentes são bots; o "servidor" é o `engine.ts` local; sem Socket.IO.
- **Pagamentos/Premium** — `subscriptionService` simula compra/restauro; sem Google Play, sem RevenueCat, sem Stripe. Preços provisórios em `src/config/app.ts` (€4,99/mês, €39,99/ano).
- **Moedas** — só se ganham (lições, rewarded ad +20); nunca compráveis; loja é mock.
- **Anúncios** — banners/ofertas simulados via `AdSlot`/`RewardedAdCard`; sem AdMob. Bloqueados durante perguntas, countdown, matchmaking, multiplayer e lição ativa (`src/config/ads.ts`).
- **Uploads** — imagem/áudio simulados; sem Cloudinary/R2.
- **Persistência** — só `localStorage` (`lstp-game-v1`) e memória; sem base de dados.
- **Notificações** — lista mock; sem push (FCM depois).
- **Travel / Schools / Torneios / Ferramentas IA** — atrás de feature flags desligadas.
- **Recompensas multiplayer** — XP/moedas de partida são placeholders configuráveis; o backend definira os valores finais.

## 12. Serviços a integrar posteriormente

| Integração | Papel no produto | Ponto de troca |
|---|---|---|
| **NestJS + Prisma + Neon** | API REST `/api/v1/*`, autoridade de dados e regras | `src/services/*` (corpos), `src/config/api.ts` |
| **Socket.IO + Redis** | Realtime multiplayer (server-authoritative) | `src/services/game.service.ts` (callbacks → eventos); portar `src/lib/multiplayer/engine.ts` |
| **Clerk** | Auth no app e no admin (JWT verificado pelo NestJS) | `src/services/auth.service.ts` |
| **Cloudflare R2** | Áudio das lições (uploads via backend, signed URLs) | `audioService` em `src/services/media.service.ts` |
| **Cloudinary** | Imagens (via backend, signed URLs) | `imageService` em `src/services/media.service.ts` |
| **RevenueCat + Google Play Billing** | Assinatura Premium (Android) | `src/services/subscription.service.ts` |
| **Stripe** | Pagamentos web/B2B | futuro serviço dedicado |
| **Google AdMob** | Anúncios reais (respeitando a política de `src/config/ads.ts`) | `adsService` + `AdSlot`/`RewardedAdCard` |
| **PostHog** | Product analytics | mapa em `src/services/integrations.ts` |
| **Sentry** | Captura de erros | hooks em `src/lib/error-capture.ts` |
| **FCM** | Push notifications | `notificationService` |

Somente chaves públicas (`VITE_*`) no frontend — ver `.env.example`. Segredos ficam no backend.

---

*Protótipo construído com [Lovable](https://lovable.dev) — frontend completo, mock-backed, pronto para handoff do backend.*
