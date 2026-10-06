# Língua STP — regras do monorepo

Antes de trabalhar, ler: `documentation.md` (requisitos), `docs/PLANO_DE_ENGENHARIA.md` (plano, ADRs, passo atual) e o `AGENTS.md` da app em que vais mexer.

## Regras absolutas
- **Nunca inventar** palavras, traduções ou pronúncias em Forro/Angolar/Lung'Ie. Só placeholders rotulados até existir conteúdo `APPROVED`.
- Só conteúdo `APPROVED` chega à app; IA gera sempre `DRAFT`; quem cria não aprova.
- **Servidor autoritativo:** o cliente nunca decide XP, moedas, streak, vidas, pontuação, resposta correta, tempo oficial ou vencedor.
- Sem segredos no repositório (é público). Só chaves públicas nos `.env.example`.
- Sem anúncios em perguntas, contagens, matchmaking, multiplayer e lições.
- Não reescrever histórico já enviado (sem force push, rebase ou amend de commits publicados).

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `apps/admin` | Protótipo web do Lovable (painel admin + ecrãs da app como referência visual) |
| `apps/mobile` | App Expo / React Native |
| `packages/types` | `@stp/types` — tipos de domínio, multiplayer, contrato do jogo |
| `packages/config` | `@stp/config` — valores de produto e feature flags (fonte única) |
| `packages/game-engine` | `@stp/game-engine` — regras puras da Arena (o servidor vai usá-las) |
| `packages/tsconfig` | `@stp/tsconfig` — configuração TypeScript estrita partilhada |

Os pacotes são consumidos como código-fonte TypeScript (sem build próprio).

## Comandos (pnpm + Turborepo)
```bash
pnpm install
pnpm dev:admin      # http://localhost:8080
pnpm dev:mobile     # Expo
pnpm typecheck      # todos os pacotes
pnpm test
pnpm build
pnpm lint
```
Adicionar dependências: `pnpm --filter @stp/<pacote> add <dep>`; no mobile usar `pnpm --filter @stp/mobile exec expo install <dep>`.

## Fluxo
- Cada alteração: commit pequeno (Conventional Commits, em português) e push para `main` depois de typecheck/testes verdes.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
