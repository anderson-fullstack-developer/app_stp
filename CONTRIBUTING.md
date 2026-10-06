# Contribuir — Língua STP

Guia curto para quem continua o projeto (developer ou Claude Code). Detalhes completos em `docs/HANDOFF.md` e `README.md`.

## Regras absolutas
- **Nunca inventar** palavras, traduções ou pronúncias em Forro/Angolar/Lung'Ie. Usar placeholders rotulados até existir conteúdo aprovado no Admin.
- Só conteúdo `APPROVED` chega à app; sugestões de IA são sempre `DRAFT`.
- Sem segredos no frontend: apenas variáveis públicas `VITE_*` (ver `.env.example`).
- Anúncios nunca durante perguntas, countdowns, matchmaking, multiplayer ou lições (`src/config/ads.ts`).
- Multiplayer é server-authoritative (`src/types/game-contract.ts`).
- Modos de jogo aprovados (Sobrevivência, 1v1, 2v2, Sala Privada, Espectador): não redesenhar sem necessidade técnica.

## Onde mexer
| Precisa de… | Ficheiro |
|---|---|
| Valores/flags | `src/config/app.ts` |
| URLs da API | `src/config/api.ts` |
| Dados | `src/services/*` (nunca importar `src/mocks/` em ecrãs) |
| Tipos partilhados | `src/types/` |
| Permissões admin | `src/admin/permissions.ts` |
| Workflow de conteúdo | `src/admin/workflow.ts` |

## Comandos
```bash
bun install
bun run dev        # http://localhost:8080
bunx vitest run    # testes
```

## Commits
Mensagens curtas no imperativo (ex.: `feat(lessons): ligar lessonService à API`). Um tema por PR.
