# Língua STP — "Aprende. Joga. Preserva."

Aplicação mobile para aprender as línguas de São Tomé e Príncipe (Forro/Santomé primeiro; depois Angolar e Lung'Ie/Principense), com gamificação, cultura, amigos e competição.

> **Regra de conteúdo:** nenhuma palavra, tradução ou pronúncia é inventada. Todo o conteúdo de exemplo é um placeholder rotulado até ser aprovado por falantes nativos no painel admin.

## Estado

Protótipo frontend completo (mock), a caminho do backend real. Plano, decisões e passo atual em **[docs/PLANO_DE_ENGENHARIA.md](docs/PLANO_DE_ENGENHARIA.md)**.

## Estrutura

```text
apps/
  admin/          protótipo web: painel admin + ecrãs da app (referência visual)
  mobile/         app Expo / React Native
packages/
  types/          @stp/types        — tipos de domínio e contrato do jogo
  config/         @stp/config       — valores de produto e feature flags
  game-engine/    @stp/game-engine  — regras puras da Arena
  tsconfig/       @stp/tsconfig     — TypeScript estrito partilhado
docs/             plano de engenharia, handoff
documentation.md  requisitos de produto (+ Adendo A — Arena Online)
```

## Começar

Requisitos: Node.js 20+ e pnpm 10.

```bash
pnpm install
pnpm dev:admin      # app web + /admin em http://localhost:8080
pnpm dev:mobile     # Expo (prima "w" para web ou leia o QR code com o Expo Go)
```

Verificações: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lint`.

## Documentação

| Documento | Para quê |
|---|---|
| [documentation.md](documentation.md) | Requisitos de produto |
| [docs/PLANO_DE_ENGENHARIA.md](docs/PLANO_DE_ENGENHARIA.md) | Plano, ADRs, riscos, checklist Google Play |
| [docs/BACKEND.md](docs/BACKEND.md) | Serviços, alojamento, ambientes e passos do backend |
| [docs/MONETIZACAO.md](docs/MONETIZACAO.md) | Como a app gera receita: Premium, Família, Pack Viagem, anúncios, escolas, financiamento, patrocínios |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Mapa do protótipo Lovable |
| [AGENTS.md](AGENTS.md) / [CONTRIBUTING.md](CONTRIBUTING.md) | Regras de trabalho |
| [apps/admin/README.md](apps/admin/README.md) | Detalhes do protótipo web |
