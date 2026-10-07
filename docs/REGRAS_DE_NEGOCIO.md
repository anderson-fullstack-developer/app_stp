# Regras de negócio — progresso, XP, níveis, streak, moedas

> Estado: **versão 1 (2026-10-07)**. É a fonte de verdade para o passo **B2 parte 2** (tabelas de
> progresso) e para os endpoints de progresso. Os **valores** (quanto XP, quantas moedas) são
> provisórios até à decisão D-09; as **regras** (quando, como, quem decide) são para cumprir.
> Base: especificação (`documentation.md`, secções 10–14, 22–23, 31–35), `docs/MONETIZACAO.md`
> e os problemas P-06, P-07, P-08, P-10 e P-15 do plano de engenharia.

## 1. Princípios (valem para todas as regras)

| # | Regra |
|---|---|
| RN-01 | **O servidor decide tudo.** XP, moedas, nível, streak, conquistas, correção das respostas e tempo oficial são calculados na API. O cliente só mostra o que a API devolve. Nenhum endpoint aceita "XP" ou "moedas" vindos do cliente. |
| RN-02 | **Livro-razão, não contadores soltos.** Cada ganho ou gasto de XP/moedas é uma linha imutável (`xp_events`, `coin_transactions`) com motivo e origem. Os totais em `user_stats` são uma cópia de conveniência, atualizada na **mesma transação** — e reconstruível a partir do livro-razão. |
| RN-03 | **Idempotência.** Cada recompensa tem uma chave única (utilizador + motivo + origem). Repetir o mesmo pedido (rede instável, duplo toque, *replay*) nunca paga duas vezes. |
| RN-04 | **Valores configuráveis.** Os valores das recompensas vivem numa tabela (`reward_rules`) e a curva de níveis em configuração do servidor — nunca espalhados pelo código (P-07, P-08). As funções de cálculo são puras e vivem em `apps/api/src/progress/rules/`, com testes (o cliente não as usa: só mostra o que a API devolve). |
| RN-05 | **O "dia" é o dia local do utilizador** (campo `timezone`, IANA, ex.: `Europe/Lisbon`, `Atlantic/Cape_Verde`, `Africa/Sao_Tome`). Streak, desafio diário e limites diários usam esse dia (P-10). |
| RN-06 | **Não bloquear a aprendizagem.** Nada de pagar para aprender o essencial; o Premium nunca dá vantagem em competição (`MONETIZACAO.md`). |
| RN-07 | **Só conteúdo visível conta.** Recompensas só se ganham com conteúdo que a API pode mostrar (APPROVED; em línguas Beta, rascunhos marcados — ADR-14). |

## 2. Atividade válida

Uma **atividade válida** é o que mantém a streak e conta para o "dia ativo":

- concluir uma lição (todos os exercícios respondidos — ver §5);
- concluir o desafio diário;
- *(Fase 2)* terminar uma partida da Arena até ao fim (não conta abandonar).

Não contam: abrir a app, ver um anúncio, comprar na loja, responder a parte de uma lição.

## 3. XP

| Motivo (`reason`) | XP | Notas |
|---|---|---|
| `ANSWER_CORRECT` | **+10** por resposta certa **à primeira tentativa** numa lição | Corrigir depois de errar não dá XP. |
| `LESSON_COMPLETE` | **+30** | Por lição concluída. |
| `LESSON_PERFECT` | **+20** | Lição concluída sem nenhum erro. |
| `DAILY_CHALLENGE` | **+50** | Uma vez por dia local. |
| `ACHIEVEMENT` | variável | Ver §8. |
| `DUEL_WIN` *(Fase 2)* | **+30** | Vitória em duelo 1v1. |
| `ARENA_PLACE` *(Fase 2)* | por posição | Tabela em `MULTIPLAYER_CONFIG` → passa para `reward_rules`. |

- **Repetir uma lição já concluída:** dá **50 %** do XP das respostas e da conclusão, **sem bónus de perfeita e sem moedas**. Serve para rever sem permitir "farmar" XP.
- Exemplo: lição de 10 exercícios, 8 certos à primeira → 80 + 30 = **110 XP**; perfeita → 100 + 30 + 20 = **150 XP**.
- O XP nunca desce (não há penalizações em XP).

## 4. Níveis

O nível é derivado do XP total (nunca guardado como fonte de verdade). Curva configurável (P-08):

| Nível | XP total | Diferença |
|---|---|---|
| 1 | 0 | — |
| 2 | 100 | 100 |
| 3 | 250 | 150 |
| 4 | 500 | 250 |
| 5 | 900 | 400 |
| 6 | 1 400 | 500 |
| 7 | 2 000 | 600 |
| 8 | 2 700 | 700 |
| 9 | 3 550 | 850 |
| 10 | 4 550 | 1 000 |

- Níveis 1–5 seguem a especificação; a partir do 6, a diferença cresce **20 %** por nível, arredondada a múltiplos de 50.
- Sem nível máximo. Subir de nível não dá moedas (as conquistas de nível dão — §8).

## 5. Lições

1. **Início:** o cliente pede `POST /lessons/:id/attempts`. O servidor cria a tentativa (`startedAt` do servidor), escolhe e baralha os exercícios e devolve-os **sem a resposta correta**, com opções identificadas por id (P-05).
2. **Respostas:** cada resposta é enviada com o id da opção (ou o texto). O servidor corrige, regista e devolve se acertou e a correção. Responder duas vezes ao mesmo exercício da mesma volta é recusado.
3. **Erros:** um exercício errado volta ao fim da lição até ser acertado (como no Duolingo). Só a **primeira tentativa** conta para XP e precisão.
4. **Conclusão:** quando todos os exercícios estão certos, o servidor fecha a tentativa e calcula:
   - precisão = certas à primeira ÷ total de exercícios;
   - tempo = `completedAt − startedAt` (relógio do servidor);
   - XP e moedas (§3, §7), streak (§6) e conquistas (§8) — **tudo numa transação**.
5. **Desbloqueio:** concluir uma lição desbloqueia a seguinte da unidade; concluir a última lição desbloqueia o teste da unidade e, depois, a unidade seguinte.
6. **Anti-batota:**
   - tentativa com mais de **24 h** expira e não paga;
   - duração implausível (menos de **2 s** por exercício em média) conclui mas fica **marcada** (`flagged`) e **não paga** — para rever mais tarde;
   - no máximo **1 tentativa ativa** por lição e utilizador.
7. **Vidas nas lições:** **não existem no MVP** (D-06, P-15). Errar nunca impede de continuar a aprender. Vidas existem só como regra de partidas da Arena.

## 6. Streak (sequência diária)

Guardado em `user_stats`: `currentStreak`, `longestStreak`, `lastActiveDate` (data local), `streakFreezes`.

Ao registar uma atividade válida no dia local `D`:

| Situação | Resultado |
|---|---|
| `lastActiveDate = D` | Nada muda (já contou hoje). |
| `lastActiveDate = D − 1` | `currentStreak + 1`. |
| Faltaram `k` dias e há ≥ `k` proteções | Gasta `k` proteções; `currentStreak + 1`. Os dias protegidos ficam registados. |
| Faltaram dias sem proteções suficientes | `currentStreak = 1`. |
| Primeira atividade de sempre | `currentStreak = 1`. |

- `longestStreak = max(longestStreak, currentStreak)` sempre.
- **A streak perdida só se vê ao abrir:** a API calcula a streak "efetiva" ao ler (`GET /me`) sem esperar pela próxima atividade.
- **Proteção de streak (*streak freeze*):** compra-se com moedas (**200**) e só se podem ter **2** guardadas. Premium recebe **1 automática por semana**, também até ao máximo de 2.
- **Mudança de fuso horário:** permitida, mas só conta a partir do dia seguinte e no máximo **1 vez por 24 h**. Evita "ganhar" dias a saltar entre fusos.
- **Marcos:** 7, 30, 100 e 365 dias dão conquistas (§8).

## 7. Moedas

- **Só se ganham, nunca se compram nem se trocam por dinheiro** (especificação §14, M-03).
- O saldo nunca fica negativo: um gasto sem saldo é recusado na mesma transação.

| Motivo | Moedas | Limite |
|---|---|---|
| `LESSON_COMPLETE` | **+5** | Só na primeira conclusão de cada lição. |
| `DAILY_CHALLENGE` | **+10** | 1 por dia local. |
| `ACHIEVEMENT` | variável (§8) | 1 por conquista. |
| `REWARDED_AD` | **+20** | **3 por dia local**; só com confirmação do servidor do AdMob (SSV), nunca só porque o cliente diz que viu. Nunca para Premium (não vê anúncios). |
| `ARENA_PLACE` *(Fase 2)* | por posição | Limite diário de partidas premiadas (§9). |
| Gasto: `STREAK_FREEZE` | **−200** | Máximo 2 guardadas. |
| Gasto: `SHOP_ITEM` | preço do item | Só itens cosméticos. |

## 8. Conquistas

Atribuídas pelo servidor quando o evento acontece; cada uma só uma vez (chave única).

| Conquista | Condição | Recompensa |
|---|---|---|
| Primeira lição | 1.ª lição concluída | 10 moedas |
| 7 dias seguidos | `currentStreak` ≥ 7 | 25 moedas |
| 30 dias seguidos | ≥ 30 | 100 moedas |
| 100 dias seguidos | ≥ 100 | 250 moedas |
| 365 dias seguidos | ≥ 365 | 500 moedas |
| 100 respostas certas | total ≥ 100 | 25 moedas |
| 1 000 respostas certas | total ≥ 1 000 | 150 moedas |
| Nível 10 / 25 / 50 | nível atingido | 50 / 150 / 400 moedas |
| Primeiro amigo *(B8)* | 1.ª amizade aceite | 10 moedas |
| Primeiro duelo, 10 vitórias, 100 vitórias, primeiro torneio *(Fase 2)* | — | a definir |

As conquistas não dão XP (evita que o XP de conquistas distorça os rankings semanais).

## 9. Desafio diário, rankings e Arena

- **Desafio diário:** 5 perguntas da língua que o utilizador aprende, só de conteúdo visível (RN-07). É o mesmo desafio para todos nesse dia UTC, para haver ranking comum. A recompensa paga-se uma vez por dia local. O ranking do desafio ordena por certas e, em empate, pelo tempo do servidor.
- **Ranking semanal:** soma do XP com `createdAt` na semana **ISO em UTC** (segunda 00:00 UTC). Igual para todos os países, para ser justo. Empates: quem chegou primeiro a esse XP fica à frente.
- **Rankings** diário, mensal, global, por país e entre amigos: mesma soma de `xp_events`, com outro intervalo ou filtro. Contas eliminadas ou banidas saem dos rankings.
- **Ligas:** Fase 2.
- **Arena (Fase 2):**
  - recompensas por posição só em partidas **públicas** (matchmaking) ou em salas privadas com **≥ 4 jogadores reais**;
  - no máximo **10 partidas premiadas por dia local**; depois disso joga-se na mesma, sem recompensa;
  - abandonar não dá recompensa de participação;
  - o Premium não altera nada na partida.

## 10. Premium e menores

- **Premium:** sem anúncios, 1 proteção de streak automática por semana, estatísticas avançadas e conteúdo extra. **Não** dá mais XP, mais moedas, vidas nem vantagem em partidas.
- **Menores (D-05, pendente):** enquanto não houver decisão, sem anúncios personalizados para ninguém. O registo pede apenas o que já pede.

## 11. Consequências para a base de dados (B2 parte 2)

| Tabela | Para quê | Pontos-chave |
|---|---|---|
| `user_stats` | Totais atuais | `xpTotal`, `coins` (≥ 0), `currentStreak`, `longestStreak`, `lastActiveDate` (date), `streakFreezes` (0–2), `correctAnswers`, `lessonsCompleted`, `timezoneChangedAt` |
| `xp_events` | Livro-razão de XP | `amount > 0`, `reason`, `sourceType`, `sourceId`, `localDate`; único (`userId`, `reason`, `sourceType`, `sourceId`); índice (`createdAt`) para rankings |
| `coin_transactions` | Livro-razão de moedas | `amount` ≠ 0, `balanceAfter`, `reason`, `sourceType`, `sourceId`; mesma chave única |
| `activity_days` | Um registo por dia ativo ou protegido | (`userId`, `localDate`) único; `kind` = `ACTIVE` ou `FROZEN` — calendário e auditoria da streak |
| `lesson_progress` | Estado por lição | `status` (`LOCKED`/`UNLOCKED`/`COMPLETED`), `bestAccuracy`, `completions`, `firstCompletedAt` |
| `lesson_attempts` | Cada tentativa | `startedAt`, `completedAt`, `expiresAt`, `total`, `correctFirstTry`, `flagged`, `status` |
| `lesson_attempt_answers` | Cada resposta | `exerciseId`, `round`, `optionId`/`text`, `correct`, `answeredAt`; único (`attemptId`, `exerciseId`, `round`) |
| `user_achievements` | Conquistas ganhas | (`userId`, `achievementKey`) único |
| `reward_rules` | Valores das recompensas | `key` único, `xp`, `coins`, `dailyLimit`, `active` — editável no admin (B7) |

## 12. Casos que os testes têm de cobrir

- Pedir a conclusão da mesma lição duas vezes → paga uma vez.
- Repetir uma lição concluída → 50 % do XP, 0 moedas, sem bónus de perfeita.
- Streak:
  - atividade às 23:59 e às 00:01 locais conta como dois dias;
  - em Lisboa e em São Tomé o "dia" é calculado no fuso de cada utilizador;
  - mudar de fuso duas vezes no mesmo dia → a segunda mudança é recusada.
- Falhar 2 dias com 1 proteção → a streak volta a 1 e a proteção não é gasta. As proteções só se gastam se cobrirem a falha toda.
- Comprar uma proteção sem saldo, ou já com 2 guardadas → recusado e o saldo não muda.
- 4.º anúncio recompensado no mesmo dia → não paga.
- Tentativa expirada ou rápida demais → não paga e fica marcada.
- O total em `user_stats` é igual à soma do livro-razão (teste de consistência).
