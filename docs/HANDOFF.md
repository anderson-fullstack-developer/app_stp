# Língua STP — HANDOFF

Documento de handoff para o próximo developer / Claude Code.
Estado: protótipo completo do frontend (app mobile + painel admin), todo mock-backed.
Sem backend real, sem auth real, sem pagamentos, sem sockets, sem base de dados. **Zero segredos no frontend.**

> **Regra absoluta de conteúdo:** NUNCA inventar palavras em Forro, traduções ou pronúncias.
> Toda amostra é placeholder rotulado ("Palavra em Forro", "Tradução em Português",
> "Áudio de exemplo") e assim permanece até existir conteúdo validado e aprovado no Admin
> (workflow DRAFT → IN_REVIEW → APPROVED; só APPROVED chega ao app).
> Conteúdo real entra pela API depois de revisão linguística (workflow de aprovação).

Comandos: `bun install` · `bun run dev` (http://localhost:8080) · `bunx vitest run`.
Ambiente: ver `.env.example` — só chaves públicas `VITE_*` pertencem ao frontend.

---

## STACK FUTURA (definitiva)

| Camada | Tecnologia |
|---|---|
| **Mobile** | React Native + Expo + TypeScript |
| **Auth** | Clerk |
| **Backend** | NestJS |
| **Database** | Neon PostgreSQL |
| **ORM** | Prisma |
| **Imagens** | Cloudinary |
| **Áudio** | Cloudflare R2 |
| **Realtime** | Socket.IO |
| **Cache / Matchmaking** | Upstash Redis |
| **Subscrições mobile** | RevenueCat + Google Play Billing |
| **Web / B2B** | Stripe |
| **Ads** | Google AdMob |
| **Analytics** | PostHog |
| **Monitoring** | Sentry |
| **Email** | Resend |

---

## 1. ARQUITETURA ATUAL

```text
Componente / rota  ->  src/services/*  ->  src/mocks/*              (hoje)
Componente / rota  ->  src/services/*  ->  NestJS REST / Socket.IO   (futuro)
```

- **Stack:** React 19 · TypeScript · TanStack Start/Router (rotas por ficheiro) · Tailwind v4 (tokens em `src/styles.css`) · Vitest · shadcn primitives (`src/components/ui`).
- **Formato:** app mobile-first (360/390/412/430px). Todo ecrã de app renderiza dentro de `PhoneFrame` (`src/layouts/AppShell.tsx`) com tab bar inferior — o produto tem de parecer app Android, não website. Exceção: `/admin` é desktop-first com `AdminShell`.
- **Regra de dados:** ecrãs nunca importam `src/mocks/*` nem `src/admin/store.ts` — só serviços. Para trocar mocks por API, substitui-se o **corpo** das funções dos serviços mantendo as assinaturas.
- **Config central:**
  - `src/config/app.ts` — único lugar de valores de produto: `APP_NAME`, `DEFAULT_LANGUAGE`, `SURVIVAL_MAX_PLAYERS (16)`, `SURVIVAL_STARTING_LIVES (3)`, `QUESTION_DURATION (10)`, `DUEL_QUESTION_COUNT (10)`, `MOCK_XP_REWARDS`, `MOCK_COIN_REWARDS`, `PREMIUM_MONTHLY/YEARLY_DISPLAY_PRICE` ("4,99" / "39,99", provisórios), e `features` (ver §8).
  - `src/config/api.ts` — único lugar de URLs: `API_BASE_URL` (de `VITE_API_URL`), `SOCKET_URL`, `API_ENDPOINTS` (`/api/v1/auth|users|languages|lessons|progress|friends|leaderboards|games|rooms|admin`), `apiUrl()`. Componentes nunca têm URLs hardcoded.
  - `src/config/ads.ts` — política de anúncios: `AD_PLACEMENTS = ["home","result","shop"]`, `AD_BLOCKED_CONTEXTS = ["question","countdown","multiplayer","lesson"]`, `adPolicy.canShow/block`. Ads só via `AdSlot`/`RewardedAdCard`.
- **Estado cliente:** `src/hooks/use-game.ts` (XP, moedas, streak, daily) em localStorage `lstp-game-v1` — substituir por `GET /me` no backend. Sessão admin em localStorage (`adminAuth`) — mock, não é segurança.
- **Contrato multiplayer:** `src/types/game-contract.ts` (`RealtimeGameService`) — server-authoritative: o servidor decide sozinho vidas, score, resultado, vencedor, resposta correta e tempo oficial (`deadlineAt`); o cliente só envia intenções e renderiza snapshots; `submitAnswer` devolve apenas `AnswerAck` (accepted/late). `src/lib/multiplayer/engine.ts` simula o servidor localmente (stand-in do demo) — portar para o backend.
- **Identidade visual:** paleta própria (verde floresta, cacau, amarelo sol, teal oceânico, coral), fontes Bricolage Grotesque + Figtree. Não copiar Duolingo. PT europeu em toda a UI.

### Mapa de pastas

| Pasta | Papel |
|---|---|
| `src/routes/` | Um ficheiro por ecrã. `admin.*` = painel admin, `play.*` = área Jogar. `routeTree.gen.ts` é gerado — nunca editar. |
| `src/layouts/AppShell.tsx` | `PhoneFrame`, `TabLayout`, nav inferior, banner offline. |
| `src/components/{app,exercises,play,ui}` | UI reutilizável. `app/States.tsx` = estados loading/error/empty/offline/success/disabled/locked. |
| `src/services/` | Camada única de dados (mock-backed hoje). |
| `src/mocks/` | Dados de demonstração (ver §5). |
| `src/types/` | `index.ts` (domínio + aliases de contrato), `multiplayer.ts`, `game-contract.ts`, `async.ts`. |
| `src/admin/` | Painel: `store.ts` (DB em memória), `permissions.ts` (papéis→permissões), `workflow.ts` (DRAFT→IN_REVIEW→APPROVED/REJECTED), `types.ts`. |
| `src/hooks/` | `use-game.ts`, `useAsync`, `useOnline`, `useBlockAds`. |
| `src/lib/multiplayer/` | `engine.ts` (regras de partida), `session-store.ts`. |
| `src/test/` | Vitest: regras de jogo, engine multiplayer, workflow admin, config. |

### Features → ficheiros

| Feature | Rotas | Lógica / serviços |
|---|---|---|
| auth | `login`, `onboarding`, `admin_.login` | `authService`, `adminAuth` |
| aprendizado / lições | `learn`, `lesson.$lessonId`, `lesson-result`, `quiz` | `lessonService`, `progressService`, `components/exercises` |
| progresso / streak | `daily`, `profile` | `use-game.ts` |
| amigos | `friends`, `user.$userId` | `friendService` |
| rankings | `ranking` | `leaderboardService` |
| conquistas | `achievements` | `achievementService` |
| premium / loja / ads | `premium`, `shop` | `subscriptionService`, `shopService`, `adsService`, `AdSlot` |
| multiplayer | `play.survival`, `play.duel`, `play.teams`, `play.private`, `play.join`, `play.results` | `game.service.ts`, `engine.ts` |
| admin | `admin.*` | `services/admin.ts`, `src/admin/*` |

## 2. FRONTEND IMPLEMENTADO

- **Estrutura de app mobile:** `PhoneFrame` (viewport 360–430px), tab bar (Aprender, Jogar, Desafios, Amigos, Perfil), navegação por rotas TanStack, overlays de recompensa globais (`RewardLayer` em `__root.tsx`: XP, moedas, streak, level-up, confetti).
- **Gamificação:** XP, moedas, streak (🔥 7 dias, "Sequência mantida!"), calendário semanal de atividade, níveis e progresso, desafio diário (+50 XP +10 moedas), anúncio recompensado (+20 moedas). Moedas **só se ganham** — nunca compráveis.
- **Estados de ecrã:** loading, error, empty, offline, success, disabled, locked (com como desbloquear: Premium / completar unidade). `AsyncView`, `AvailabilityGate`, `AppButton` com loading/disabled, faixa "Sem ligação" automática no `PhoneFrame`. Isolados dos mocks — serviços fornecem dados, estados só apresentam.
- **Premium:** ecrã de planos, paywall, gates por `subscriptionService` (nunca `user.isPremium` direto — no futuro o entitlement é verificado no servidor).
- **Anúncios:** só via `AdSlot`/`RewardedAdCard`; bloqueados automaticamente em pergunta, countdown, matchmaking, multiplayer e lição ativa (`useBlockAds`).
- **Admin desktop-first:** `/admin` com login mock, papéis (SUPER_ADMIN, ADMIN, LINGUIST, CONTENT_EDITOR, MODERATOR) em `src/admin/permissions.ts`, review workflow `DRAFT → IN_REVIEW → APPROVED/REJECTED` em `src/admin/workflow.ts` (só APPROVED chega ao app; saída de IA é sempre DRAFT), páginas de glossário/vocabulário/frases/áudios/exercícios/lições/cursos/utilizadores/rankings/anúncios/premium/relatórios/analytics/auditoria/config.
- **Onboarding:** seleção de idioma (Forro/Santomé disponível; Angolar e Lung'Ie/Principense "em breve"), preferências, primeiro login.
- **Verificação:** typecheck limpo, 23+ testes Vitest passam, build OK.

## 3. TELAS IMPLEMENTADAS

**App (dentro de `PhoneFrame`):**

| Rota | Ecrã |
|---|---|
| `index.tsx` `/` | Home Aprender: avatar, nome, 🔥 streak, ⭐ XP, 🪙 moedas, nível + progresso, caminho de aprendizagem (Unidade 1 Saudações, lições ✓/atual/🔒), banner ads (placement `home`) |
| `onboarding` | Seleção de idioma + preferências |
| `login` | Login/registro mock |
| `learn` | Catálogo de cursos/unidades |
| `lesson.$lessonId` | Lição: exercícios (escolha múltipla, ouvir-escolher, ouvir-escrever, traduzir, ligar palavras, ordenar palavras, imagem, pronúncia) |
| `lesson-result` | Resultado da lição + recompensas (placement `result`) |
| `quiz` | Quiz (redireciona para lições/fluxo atual) |
| `daily` | Desafio diário + calendário de atividade |
| `ranking` | Rankings (amigos/semanal/global/país) + ligas |
| `friends` | Amigos: pedidos, sugestões, pesquisa, desafiar |
| `user.$userId` | Perfil público de outro jogador |
| `profile` | Perfil próprio, conquistas, configurações |
| `achievements` | Conquistas (desbloqueadas/progresso) |
| `notifications` | Notificações |
| `play.*` (survival, duel, teams, private, join, results) | Área Jogar: sobrevivência (principal), 1v1, 2v2, salas privadas, entrar por código, resultados |
| `room`, `elimination` | Rotas antigas → redirecionam às atuais |
| `challenges` | Desafios a amigos |
| `premium` | Planos Premium (paywall) |
| `shop` | Loja de artigos (moedas ganhas) (placement `shop`) |
| `travel`, `schools` | Atrás de feature flags desligadas (schoolMode) |
| `settings` | Configurações da conta |

**Admin (desktop-first):** `admin.index`, `admin_.login`, `admin_.forbidden`, `admin_.unauthorized`, `admin_.session-expired`, `admin.courses`, `admin.lessons.index` + `admin.lessons.$lessonId`, `admin.vocabulary`, `admin.phrases`, `admin.audios`, `admin.exercises`, `admin.languages`, `admin.review`, `admin.users`, `admin.rankings`, `admin.multiplayer`, `admin.achievements`, `admin.daily`, `admin.premium`, `admin.ads`, `admin.reports`, `admin.analytics`, `admin.audit`, `admin.search`, `admin.settings`.

## 4. FLUXOS IMPLEMENTADOS

- **Onboarding → Login → Home:** primeiro arranque com seleção de idioma, sessão mock, entra no `/` (Aprender).
- **Home → Lição → Resultado → Home:** abrir lição, completar exercícios, ecrã de resultado com XP/moedas, regressar ao caminho com lição marcada ✓.
- **Jogar → Sobrevivência → Matchmaking → Partida → Resultado:** lobby 4/8/16 jogadores, 1–5 vidas, 5–20s por pergunta, bots progressivos, eliminação/spectator, confetti no resultado.
- **Jogar → Sala privada → Lobby → Partida:** criar sala com código, amigos entram, ready, partida server-authoritative (mock).
- **Jogar → 1v1 / 2v2:** matchmaking e lobbies equivalentes com bots derivados de `users.ts`.
- **Amigos → Desafiar:** botão "Desafiar" abre a sala privada atual.
- **Admin → Conteúdo → Revisão → Aprovação:** editor cria/submete (DRAFT→IN_REVIEW); apenas SUPER_ADMIN/ADMIN/LINGUIST aprovam; só APPROVED é servido ao app; IA só gera DRAFT.
- **Premium:** planos → compra simulada → estado premium no cliente (sem loja real).
- **Recompensas:** daily claim, rewarded ad +20 moedas, streak — todos com overlays globais.
- **Páginas sem saída:** nenhuma. Páginas de erro em PT voltam a Aprender; rotas antigas redirecionam.

## 5. MOCKS

`src/mocks/` — um ficheiro por área, **sem repetição de dados**:

| Ficheiro | Conteúdo |
|---|---|
| `users.ts` | **Única** fonte de pessoas demo (jogadores, o utilizador `currentUser`) — amigos, rankings, oponentes/bots, salas e utilizadores admin derivam daqui |
| `questions.ts` | **Única** fonte de perguntas (todas placeholder "Palavra em Forro") — lições, multiplayer e exercícios admin derivam daqui |
| `languages.ts` | Idiomas (Forro disponível; Angolar, Lung'Ie em breve) |
| `lessons.ts` | Curso Forro: unidades → lições → exercícios (derivados de `questions.ts`) |
| `friends.ts` | Derivado de `users.ts` |
| `leaderboards.ts` | Ranking + liga (derivado de `users.ts`) |
| `achievements.ts` | Conquistas demo |
| `games.ts` | Partidas/histórico demo |
| `rooms.ts` | Sala de exemplo |
| `notifications.ts` | Notificações demo |
| `admin.ts` | Semeia `src/admin/store.ts` (DB em memória, repõe no reload) |

Regra: só `src/services/*` importa `@/mocks`. Apagar tudo quando a API existir.

## 6. SERVICES

`src/services/index.ts` exporta tudo. Todos mock-backed, prontos para swap de corpos por `http.*` mantendo assinaturas:

- `authService` (`auth.service.ts`) — `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `getCurrentUser`, `getToken` (mock token). Preparado para Clerk: é a única mudança de ficheiro; ecrãs nunca leem auth do localStorage.
- `userService` — `getMe`, `getMeSnapshot` (semente do estado cliente até `GET /me`), `getById`, `getAchievements`.
- `lessonService` / `languageService` — idiomas, curso Forro, lição por id, categorias de viagem.
- `progressService` — `submitLesson(lessonId, accuracy)` (no futuro `POST /progress/lesson`; recompensas calculadas no servidor).
- `friendService` — listar, pesquisar, enviar pedido.
- `leaderboardService` (alias `rankingService`) — rankings por scope + liga.
- `achievementService`, `challengeService` (daily), `notificationService` (futuro FCM).
- `gameService` + `multiplayerService` (`game.service.ts`) — matchmaking, lobbies, respostas; callbacks = futuros eventos socket. Implementa `RealtimeGameService` (findMatch, cancelMatch, createRoom, joinRoom, leaveRoom, setReady, submitAnswer, reconnect, getGameState).
- `subscriptionService` (`subscription.service.ts`) — espelha a API do RevenueCat: `getOfferings`, `purchasePackage` (simula sucesso, sem dinheiro), `restorePurchases` (exigido pelo Google Play), `getCurrentSubscription`. Entitlement `premium`; `isPremium` será verificado no servidor, nunca confiado no cliente. Preços display-only de `config/app.ts`.
- `shopService`, `adsService` (checa `src/config/ads.ts`), `imageService`/`audioService` (`media.service.ts` — Cloudinary/R2 no futuro; uploads via signed URLs do backend, frontend só tem URLs públicos; `AUDIO_PLACEHOLDER_URL`).
- `admin.ts` — serviços do painel (idioma, curso, lição, vocabulário, frase, áudio, exercício, review, users, game, reward, report, analytics) sobre `src/admin/store.ts`.
- `http.ts` — cliente partilhado (Bearer de `authService.getToken()`, `ApiError`); `USE_MOCK_API` enquanto `VITE_API_URL` não estiver definido.
- `integrations.ts` — mapa de integrações futuras.

## 7. MODELOS DE DADOS UTILIZADOS

Tipos centrais em `src/types/index.ts` (+ `multiplayer.ts`, `game-contract.ts`, `async.ts`, `src/admin/types.ts`):

- **Utilizador:** `User` (id, name, username, email?, country, avatarColor, level, levelProgress, xp, weeklyXp, coins, streak, longestStreak, lessonsCompleted, wordsLearned, accuracy, wins, achievementsCount, isPremium), `UserProfile`, `AvatarColor`.
- **Conteúdo:** `Language`, `Course`, `Unit`, `Lesson` (`status: completed|current|locked`, `isTest?`), `Exercise` (8 tipos: multiple_choice, listen_choose, listen_type, translate, match_words, order_words, image_selection, pronunciation), `ExerciseOption`.
- **Progresso:** `UserProgress`/`LessonProgress` (courseId, completedLessonIds, currentLessonId).
- **Social:** `Friend`, `FriendRequest`, `LeaderboardEntry`, `League`, `Notification`.
- **Gamificação:** `Achievement`, `Subscription`/`PremiumPlan`.
- **Multiplayer:** `GamePlayer`, `GameRoom`, `Game`, `GameAnswer`, `Team`, `QuizQuestion`, `MatchConfig`, `MatchResult`/`GameResult`, `PrivateRoom`, `LobbyMember`, `RoomMode`, `GameRound` — e o contrato `RealtimeGameService` + `GameStateSnapshot`/`AnswerAck`.
- **Admin:** `AdminUser`, `AdminRole`, `AdminSession`, `ContentStatus`, `VocabularyItem`, `Phrase`, `AudioAsset`, `ContentReview`, `Permission`.
- **Estados:** `AsyncState<T>` (`src/types/async.ts`).

## 8. FUNCIONALIDADES SIMULADAS

Simuladas no frontend, **sem backend** (serão substituídas por serviços reais):

- Autenticação (login/registro/Google/sessão) — mock em memória.
- Multiplayer completo (matchmaking, lobbies, bots, partidas) — motor local simula o servidor; sem Socket.IO real.
- Pagamentos Premium — compra/restore simulados, sem loja nem dinheiro.
- Moedas/XP/streak — estado local (`use-game.ts`), não persistidos no servidor.
- Uploads de imagem/áudio — simulados, sem cloud.
- Notificações — lista estática, sem push.
- Anúncios — placeholders `AdSlot`/`RewardedAdCard`, sem SDK AdMob.
- Persistência — localStorage apenas; admin DB repõe no reload.
- Bots simulem oponentes (skill só existe nos mocks).
- "Desafiar um amigo" / "Jogar com amigo" — sem presença real.

## 9. FUNCIONALIDADES NÃO IMPLEMENTADAS

- Backend, API REST, base de dados, autenticação real, autorização server-side.
- Multiplayer em tempo real (Socket.IO + Redis) — engine é stand-in.
- Pagamentos reais (RevenueCat + Google Play Billing; Stripe para web/B2B).
- Ads reais (Google AdMob) e analytics/telemetria (PostHog, Sentry).
- Conteúdo linguístico real de Forro/Angolar/Lung'Ie — tudo placeholder até revisão linguística + aprovação.
- Push notifications (FCM).
- **Feature flags desligadas** (em `features` em `src/config/app.ts` — desligar nunca apaga código): `tournaments: false` (torneios "Em breve"), `schoolMode: false` (Travel/Schools "coming soon"), `aiTools: false` (botão de IA no admin inativo). Ligadas: `multiplayer`, `premium`, `ads`. No futuro os switches vêm do backend (remote config).
- Moderação de conteúdo real, verificação de entitlement server-side, backoffice de billing.

## 10. INTEGRAÇÕES FUTURAS

Mapa completo em `src/services/integrations.ts`. Ordem sugerida de implementação (backend):

1. **Auth** — Clerk (mobile + admin); NestJS valida JWT. Papéis numa tabela `user_roles` separada, validados no servidor (o login admin mock aceita qualquer coisa — **não é segurança**).
2. **API de conteúdo** — idiomas, cursos, unidades, lições, exercícios, vocabulário, frases, áudios (uploads assinados R2). Só conteúdo `APPROVED` é servido ao app.
3. **Progresso** — `POST /progress/lesson`, `GET /me` (XP, moedas, streak, daily). Recompensas calculadas no servidor a partir dos valores de `src/config/app.ts`.
4. **Social** — amigos, pedidos, rankings, ligas, notificações (FCM).
5. **Multiplayer** — Socket.IO + Redis. Servidor detém timer, validação de respostas, vidas, eliminação; portar `engine.ts`. Eventos espelham os callbacks de `game.service.ts`.
6. **Pagamentos** — RevenueCat (Google Play) + Stripe (web/B2B). Moedas não se compram.
7. **Ads / analytics / erros** — AdMob (nunca em lições, perguntas, countdowns, matchmaking, multiplayer — política em `src/config/ads.ts`), PostHog, Sentry.

| Serviço | Ponto de troca |
|---|---|
| NestJS + Prisma + Neon PostgreSQL | corpos de `src/services/*` + `src/config/api.ts` |
| Socket.IO (realtime) | `multiplayerService` (`game.service.ts`) + `SOCKET_URL` |
| Upstash Redis (cache / matchmaking) | matchmaking em `multiplayerService.findMatch` |
| Clerk | `authService` (`auth.service.ts`) |
| Cloudinary (imagens) | `imageService` (`src/services/media.service.ts`) |
| Cloudflare R2 (áudio) | `audioService` (`src/services/media.service.ts`) |
| RevenueCat + Google Play Billing | `subscriptionService` |
| Stripe | Web/B2B/escolas (não implementado) |
| Google AdMob | `adsService` + `AdSlot`/`RewardedAdCard` |
| PostHog | novos hooks de analytics |
| Sentry | `src/lib/error-capture.ts` |
| Resend | `notificationService` (email; push continua FCM) |
