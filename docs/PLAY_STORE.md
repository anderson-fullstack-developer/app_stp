# Fala Neto — Ficha da Google Play

> Guia para preencher a **Google Play Console** quando a conta de programador existir.
> Os textos estão prontos a copiar. O que depende de uma decisão tua está marcado com **⚠️ Decisão**.

## 1. Dados da app

| Campo | Valor |
|---|---|
| Nome da app | **Fala Neto** |
| Identificador (applicationId) | `com.falaneto.app` — pode mudar até ao **primeiro envio**; depois é para sempre |
| Categoria | Educação |
| Tags | Línguas, Aprendizagem de línguas, Educação |
| Email de contacto | ⚠️ Decisão: um email público de suporte (ex.: `suporte@falaneto.app`) |
| Site | ⚠️ Decisão: o domínio da web, quando estiver online |
| Política de privacidade | ⚠️ Obrigatória: um URL público (ver secção 6) |

## 2. Textos da loja

### Português (Portugal) — idioma principal

**Título (máx. 30):** `Fala Neto: aprende Kriolu` (25 caracteres)

**Descrição curta (máx. 80):**
`Aprende Kriolu e as línguas de São Tomé com lições curtas, amigos e desafios.`

**Descrição completa (máx. 4000):**

```
Aprende as línguas de Cabo Verde e de São Tomé e Príncipe com o Neto, a tartaruga que te acompanha em cada lição.

O QUE PODES FAZER
• Lições curtas e divertidas, com perguntas de escolha múltipla
• Desafio do dia: 5 perguntas, iguais para todos, com ranking diário
• Sequência de dias, XP, níveis e conquistas para não perderes o ritmo
• Amigos e rankings: semanal, global, entre amigos e por país
• Arena em tempo real: Sobrevivência, duelos 1 contra 1 e partidas 2 contra 2 com os teus amigos
• Loja: guarda proteções de sequência para os dias em que não podes praticar

LÍNGUAS
• Kriolu (Cabo Verde) — em Beta: o conteúdo ainda está a ser revisto por linguistas e está marcado como tal
• Forro, Angolar e Lung'Ie (São Tomé e Príncipe) — em breve, com conteúdo validado por falantes e linguistas

JOGO JUSTO
O Premium nunca dá vidas extra nem vantagens nas partidas. Não há anúncios durante lições nem partidas.

Feito para quem quer falar com a família, conhecer as raízes ou preparar uma viagem.
```

### English (United States)

**Title (max 30):** `Fala Neto: Learn Kriolu`

**Short description (max 80):**
`Learn Cape Verdean Kriolu and São Tomé languages with short lessons and friends.`

**Full description:**

```
Learn the languages of Cape Verde and São Tomé and Príncipe with Neto, the sea turtle who joins you in every lesson.

WHAT YOU CAN DO
• Short, fun lessons with multiple-choice questions
• Daily challenge: 5 questions, the same for everyone, with a daily leaderboard
• Streaks, XP, levels and achievements to keep you going
• Friends and leaderboards: weekly, global, friends and by country
• Real-time Arena: Survival, 1 vs 1 duels and 2 vs 2 matches with your friends
• Shop: save streak freezes for the days you can't practise

LANGUAGES
• Kriolu (Cape Verde) — in Beta: content is still being reviewed by linguists and is labelled as such
• Forro, Angolar and Lung'Ie (São Tomé and Príncipe) — coming soon, with content validated by speakers and linguists

FAIR PLAY
Premium never gives extra lives or advantages in matches. No ads during lessons or matches.

Made for anyone who wants to talk with family, connect with their roots or prepare for a trip.
```

> Regra do projeto: **nunca** escrever na ficha palavras ou frases em Forro, Angolar ou Lung'Ie sem conteúdo aprovado.

## 3. Imagens

| Recurso | Tamanho | Estado |
|---|---|---|
| Ícone da loja | 512 × 512 PNG | Gerar a partir de `apps/mobile/assets/images/icon.png` (1024²) |
| Imagem de destaque | 1024 × 500 | Por fazer (Neto + nome da app) |
| Capturas de ecrã (telemóvel) | mín. 2, ideal 6–8, 1080 × 1920 | Por tirar num telemóvel real com login |

Capturas sugeridas, por esta ordem: Aprender (caminho de lições) · uma pergunta da lição · resultado com o Neto · desafio do dia · Arena (partida) · ranking · amigos · perfil.

## 4. Segurança dos dados (formulário "Data safety")

| Pergunta | Resposta |
|---|---|
| A app recolhe ou partilha dados? | **Sim, recolhe** |
| Dados encriptados em trânsito? | **Sim** (HTTPS e WSS) |
| A pessoa pode pedir para apagar os dados? | **Sim** — dentro da app: Definições → Eliminar conta (apaga no Clerk e anonimiza no servidor) |

**Dados recolhidos** (todos para **funcionalidade da app** e **gestão da conta**; nenhum para publicidade; nenhum vendido):

| Tipo | Dado | Obrigatório? |
|---|---|---|
| Informações pessoais | Nome, email, ID de utilizador | Sim (conta) |
| Informações pessoais | País e línguas faladas (escolhidos no registo) | Não |
| Atividade na app | Lições feitas, respostas, XP, sequência, partidas | Sim |
| Atividade na app | Amigos e pedidos de amizade | Não |

**Partilha com terceiros:** não. Os fornecedores que tratam os dados em nosso nome (Clerk para contas, Neon para a base de dados, Railway para o servidor) contam como "prestadores de serviços" e **não** se declaram como partilha.

> ⚠️ Quando entrar o **AdMob** (anúncios recompensados) ou analytics, este formulário tem de ser atualizado antes de publicar essa versão.

## 5. Classificação de conteúdo (questionário IARC)

| Pergunta | Resposta |
|---|---|
| Violência, sexo, linguagem imprópria, drogas, jogo a dinheiro | Não |
| Os utilizadores podem interagir? | **Sim** — amigos, convites e partidas em tempo real (sem chat de texto livre) |
| Partilha de localização | Não |
| Compras digitais | Ainda não (Premium chega mais tarde; atualizar então) |

Resultado esperado: **PEGI 3 / Todos**, com o aviso "Os utilizadores interagem".

## 6. Público-alvo e menores

⚠️ **Decisão D-05 (pendente):** a quem se destina a app?

- **Recomendação:** **13 anos ou mais** no lançamento. Abaixo dos 13 a app entra no programa "Famílias" da Google, que tem regras extra (anúncios só certificados para crianças, sem analytics normais, consentimento parental). Pode alargar-se depois, com essas regras cumpridas.
- O registo deve então pedir a confirmação da idade mínima, e a política de privacidade deve dizê-lo.

**Política de privacidade (obrigatória antes de publicar):** um texto público que diga que dados se recolhem (secção 4), para quê, quem os trata (Clerk, Neon, Railway), quanto tempo se guardam, como apagar a conta e um contacto. Publicar na web (ex.: `/privacidade`) quando o site estiver online.

## 7. Lista de verificação até à publicação

1. [ ] Conta de programador Google Play (25 USD, uma vez) e verificação de identidade
2. [ ] Conta Expo (EAS Build) — gerar o AAB de produção
3. [ ] Servidor online (Railway) e `EXPO_PUBLIC_API_URL` de produção na build
4. [ ] Webhook do Clerk configurado e chaves de produção do Clerk
5. [ ] Política de privacidade publicada e URL na ficha
6. [ ] Decisão D-05 (idade mínima) e público-alvo preenchido
7. [ ] Ficha da loja: textos (secção 2), imagens (secção 3)
8. [ ] Formulário de segurança dos dados (secção 4) e classificação (secção 5)
9. [ ] **Teste fechado:** pelo menos **12 pessoas durante 14 dias seguidos** (obrigatório para contas pessoais novas)
10. [ ] Pedir acesso à produção e publicar

Já feito na app: identificador e versão, só 3 permissões (internet, vibração, som), ícones 1024², ecrã de abertura, textos em português e inglês, botão voltar seguro nas partidas.
