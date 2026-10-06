# apps/admin — protótipo web (painel admin + ecrãs da app como referência)

Código vindo do Lovable (congelado — ADR-01 em `docs/PLANO_DE_ENGENHARIA.md`). As regras do monorepo estão no `AGENTS.md` da raiz.

- Mock data lives only in `src/mocks/` (one file per area; demo people only in `users.ts`, placeholder question text only in `questions.ts`, others derive from them); routes/components never import mocks or `src/admin/store.ts` directly — only services. Handoff doc: `docs/HANDOFF.md` (raiz).
- All app data goes through `src/services/` (mock-backed now); swap bodies for API calls later, keep signatures — keeps UI decoupled from the future NestJS backend.
- App name/tagline live only in `@stp/config` (`packages/config/src/index.ts`) — renaming must be a one-line change.
- Every mobile app screen renders inside `PhoneFrame` (`src/layouts/AppShell.tsx`); tab screens use `TabLayout` with the bottom nav — the product must feel like a mobile app, not a website.
- Product values (prices, rewards, lives, goals) and feature flags live only in `@stp/config`; gate unfinished features with `isEnabled()`.
- Domain types live in `@stp/types` (`packages/types`); `src/types/index.ts` only re-exports them plus admin types from `src/admin/types.ts`.
- Client gamification state (XP, coins, streak, daily) lives in `src/hooks/use-game.ts`; reward animations render globally via `RewardLayer` in `__root.tsx`.
- Ads only via `AdSlot`/`RewardedAdCard`; never render them inside lessons, countdowns or multiplayer screens.
- Future integrations (Clerk, NestJS, R2, Socket.IO, RevenueCat, AdMob, PostHog, Sentry) are mapped in `src/services/integrations.ts`; only public keys in VITE_ vars.
- Admin panel lives under `/admin` (`src/admin/*` + `src/routes/admin.*`), desktop-first with `AdminShell`, never `PhoneFrame`; admin data goes through `src/services/admin.ts` over the mock store in `src/admin/store.ts`.
- Admin role permissions live only in `src/admin/permissions.ts`; content status transitions only via `src/admin/workflow.ts` (only APPROVED content may reach the app; AI output is always DRAFT).
- API URLs live only in `src/config/api.ts`; services call the backend only via `src/services/http.ts` — no URLs in components.
- Multiplayer is server-authoritative: `@stp/types/game-contract` defines the game API; the client never decides lives, score, winner, correct answer or official time. Match rules live in `@stp/game-engine` (local mock stand-in today; the NestJS server will run them).
- Ad policy (placements allowlist + blocked contexts) lives only in src/config/ads.ts; screens with questions/countdowns/multiplayer/lessons call useBlockAds — keeps the no-ads rule in one place.
