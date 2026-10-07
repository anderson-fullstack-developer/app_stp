Quero que atuues como Product Manager, UX/UI Designer, Software Architect e Senior Full-Stack/Mobile Developer.

Preciso que me ajudes a planear e desenvolver uma aplicação mobile completa para Android, com possibilidade futura de lançamento para iOS.

==================================================
1. VISÃO DO PRODUTO
==================================================

Quero criar uma aplicação de aprendizagem de línguas de São Tomé e Príncipe.

A aplicação NÃO será para ensinar português.

O objetivo é ensinar línguas tradicionais/nacionais de São Tomé e Príncipe através de uma experiência moderna, divertida, competitiva e gamificada.

A primeira língua do MVP será:

- Forro / Santomé

Posteriormente deverão poder ser adicionadas outras línguas de São Tomé e Príncipe, como:

- Angolar
- Lung’Ie / Principense
- outras línguas relevantes

A arquitetura deve ser criada desde o início para suportar várias línguas sem ser necessário alterar significativamente o sistema.

IMPORTANTE:
Não inventar palavras, traduções, pronúncias ou regras destas línguas.

Todo o conteúdo linguístico deverá poder ser inserido e aprovado através de um painel administrativo por falantes nativos, professores ou especialistas.

Conteúdo gerado por IA nunca deve ser automaticamente considerado correto.

==================================================
2. CONCEITO PRINCIPAL
==================================================

A aplicação deve combinar características de:

- Duolingo
- Kahoot
- jogos competitivos
- quizzes
- rankings
- desafios entre amigos
- torneios

A experiência deve fazer o utilizador querer aprender todos os dias.

O utilizador deverá poder:

- aprender palavras
- aprender frases
- ouvir pronúncias
- responder a perguntas
- completar lições
- ganhar XP
- subir de nível
- manter uma sequência diária
- ganhar moedas virtuais
- desbloquear conquistas
- adicionar amigos
- desafiar amigos
- entrar em salas privadas
- jogar quizzes em tempo real
- participar em quizzes eliminatórios
- competir em rankings
- participar em ligas semanais
- completar desafios diários
- acompanhar o seu progresso

==================================================
3. PÚBLICO-ALVO
==================================================

A aplicação deverá atender principalmente:

1. Pessoas de São Tomé e Príncipe que querem aprender ou melhorar uma língua nacional.

2. Jovens santomenses que falam principalmente português.

3. Diáspora santomense em:
   - Portugal
   - França
   - Reino Unido
   - outros países

4. Filhos e netos de santomenses que querem aprender a língua dos pais ou avós.

5. Turistas que visitam São Tomé e Príncipe.

6. Investigadores e pessoas interessadas em línguas africanas e culturas lusófonas.

==================================================
4. TECNOLOGIAS
==================================================

Utilizar preferencialmente esta stack:

MOBILE:

React Native
Expo
TypeScript

Bibliotecas:

Expo Router
NativeWind
React Query / TanStack Query
Zustand
React Hook Form
Zod

BACKEND:

Node.js
NestJS
TypeScript

DATABASE:

PostgreSQL
Prisma ORM

REAL-TIME:

Socket.IO

Usado para:

- salas
- quizzes
- desafios
- partidas
- rankings ao vivo
- torneios
- presença dos jogadores

CACHE:

Começar sem Redis se não for necessário.

Adicionar Redis posteriormente quando necessário para:

- rankings
- sessões
- matchmaking
- rate limiting
- partidas em tempo real

STORAGE:

Cloudflare R2 ou AWS S3.

Guardar:

- áudio das palavras
- áudio das frases
- imagens
- avatares
- recursos das lições

ADMIN:

Next.js
TypeScript
Tailwind CSS

O painel administrativo será uma aplicação web separada.

AUTH:

JWT
Refresh Tokens

Permitir:

- email + password
- Google Sign-In

Considerar posteriormente:

- Apple Sign-In

NOTIFICAÇÕES:

Expo Notifications / Firebase Cloud Messaging.

ANALYTICS:

Firebase Analytics ou PostHog.

ERROR MONITORING:

Sentry.

DEPLOY:

Backend:
Railway

PostgreSQL:
Railway PostgreSQL ou serviço PostgreSQL gerido.

Admin:
Vercel.

Mobile Build:

Expo EAS Build.

O resultado Android deverá gerar:

.aab

para publicação na Google Play Store.

==================================================
5. ARQUITETURA
==================================================

Criar preferencialmente uma estrutura tipo:

/apps
    /mobile
    /admin
    /api

/packages
    /types
    /validation
    /config

Ou outra arquitetura organizada caso exista uma solução melhor.

Mobile:

React Native + Expo

Admin:

Next.js

API:

NestJS

Database:

PostgreSQL + Prisma

==================================================
6. SISTEMA DE UTILIZADORES
==================================================

Cada utilizador deverá possuir:

id
username
nome
email
password hash
avatar
país
língua principal
língua que está a aprender
XP
nível
moedas
streak atual
maior streak
data da última atividade
data de criação
estado da conta
tipo de conta

Tipos:

USER
MODERATOR
LINGUIST
ADMIN
SUPER_ADMIN

==================================================
7. ONBOARDING
==================================================

Primeiro acesso:

Tela 1:

Logo da aplicação.

Mensagem:

"Aprende as línguas de São Tomé e Príncipe."

Tela 2:

Escolher idioma da interface.

Inicialmente:

Português

Posteriormente:

English
Français

Tela 3:

Qual língua queres aprender?

Forro / Santomé

Futuramente:

Angolar
Lung’Ie

Tela 4:

Por que queres aprender?

- Família
- Cultura
- Viagem
- Curiosidade
- Escola
- Quero falar melhor
- Outro

Tela 5:

Escolher objetivo diário.

5 minutos
10 minutos
15 minutos
20 minutos

Tela 6:

Criar conta.

==================================================
8. HOME
==================================================

A página principal deverá apresentar uma árvore/caminho de aprendizagem.

Exemplo:

UNIDADE 1
Saudações

Lição 1
Cumprimentos

Lição 2
Apresentações

Lição 3
Como estás?

TESTE DA UNIDADE

UNIDADE 2
Família

UNIDADE 3
Números

UNIDADE 4
Comida

UNIDADE 5
Casa

UNIDADE 6
Conversação

Cada unidade contém várias lições.

==================================================
9. TIPOS DE EXERCÍCIOS
==================================================

Criar sistema extensível de exercícios.

Tipos iniciais:

MULTIPLE_CHOICE

Pergunta:

O que significa "PALAVRA"?

4 alternativas.

--------------------------------------------------

LISTEN_AND_CHOOSE

O utilizador ouve um áudio e escolhe a tradução correta.

--------------------------------------------------

LISTEN_AND_TYPE

O utilizador ouve uma palavra e escreve o que ouviu.

--------------------------------------------------

TRANSLATE

Traduzir uma frase.

--------------------------------------------------

MATCH_WORDS

Associar:

palavra ↔ tradução

--------------------------------------------------

ORDER_WORDS

Organizar palavras para construir a frase correta.

--------------------------------------------------

IMAGE_SELECT

Mostrar imagens e escolher a imagem correta.

--------------------------------------------------

PRONUNCIATION

Mostrar:

palavra
áudio
botão para gravar

O utilizador repete a palavra.

No MVP não é obrigatório avaliar automaticamente a pronúncia.

Guardar arquitetura para futuramente implementar avaliação de voz.

==================================================
10. SISTEMA DE LIÇÕES
==================================================

Cada lição deverá possuir:

id
languageId
unitId
title
description
order
difficulty
XP reward
estimated duration
status

Cada lição contém exercícios.

Quando o utilizador termina:

mostrar:

Lição concluída!

+30 XP

+5 moedas

Precisão:
90%

Tempo:
3m 21s

Streak:
🔥 7 dias

==================================================
11. SISTEMA DE XP
==================================================

Exemplo:

Resposta correta:
+10 XP

Lição concluída:
+30 XP

Lição perfeita:
+20 XP extra

Desafio diário:
+50 XP

Vitória num duelo:
+30 XP

Vitória num torneio:
XP adicional.

O backend deverá ser responsável por calcular recompensas.

Nunca confiar em valores enviados pelo frontend.

==================================================
12. SISTEMA DE NÍVEIS
==================================================

Exemplo:

Level 1:
0 XP

Level 2:
100 XP

Level 3:
250 XP

Level 4:
500 XP

Level 5:
900 XP

Criar fórmula configurável.

==================================================
13. STREAK
==================================================

Criar sistema de sequência diária.

Exemplo:

🔥 1 dia
🔥 7 dias
🔥 30 dias
🔥 100 dias
🔥 365 dias

O utilizador deve completar pelo menos uma atividade válida diariamente.

Guardar:

currentStreak
longestStreak
lastActivityDate

O cálculo deve acontecer no servidor.

==================================================
14. MOEDAS
==================================================

Criar moeda virtual.

Nome temporário:

Moedas

Posteriormente deverá ser possível alterar o nome.

As moedas podem ser ganhas através de:

- lições
- desafios
- achievements
- competições

Podem ser utilizadas para:

- personalização
- avatares
- badges
- efeitos
- streak freeze
- itens cosméticos

Não permitir troca direta da moeda virtual por dinheiro real.

==================================================
15. AMIGOS
==================================================

Criar sistema social.

O utilizador pode:

- pesquisar pessoas
- enviar pedido de amizade
- aceitar
- recusar
- remover amigo
- bloquear utilizador

Página:

AMIGOS

Mostrar:

Avatar
Username
Level
XP semanal
Streak
Status online/offline

Botões:

DESAFIAR
PERFIL

==================================================
16. DUELO 1 VS 1
==================================================

Um jogador poderá desafiar outro.

Fluxo:

Jogador A
↓
Enviar desafio
↓
Jogador B aceita
↓
Servidor cria partida
↓
Countdown
3
2
1
↓
Perguntas
↓
Resultado

Pontuação deverá considerar:

resposta correta
+
velocidade

Exemplo:

Correta:
100 pontos

Bónus de velocidade:
0-50 pontos.

Servidor controla:

- pergunta atual
- tempo
- resposta
- pontuação
- vencedor

Nunca confiar no cliente.

==================================================
17. SALAS PRIVADAS
==================================================

Permitir criar salas.

Exemplo:

CRIAR SALA

Código:

STP847

O jogador pode partilhar o código.

Amigos entram através do código.

Configurações:

2-20 jogadores

Quantidade de perguntas:

5
10
15
20

Tempo:

5s
10s
15s
30s

Modo:

Quiz normal
Eliminação

==================================================
18. QUIZ EM TEMPO REAL
==================================================

Usar Socket.IO.

Fluxo:

room:create
room:join
room:leave
game:start
question:start
answer:submit
answer:result
leaderboard:update
game:end

Criar validações para impedir:

- enviar resposta duas vezes
- responder depois do tempo
- alterar score no frontend
- entrar numa partida terminada

==================================================
19. MODO ELIMINATÓRIO
==================================================

Exemplo:

10 jogadores entram.

Pergunta 1.

Jogadores que acertam continuam.

Quem erra pode ser eliminado.

Outra possibilidade:

eliminar os últimos classificados.

Criar configuração de jogo permitindo escolher regras diferentes.

Exemplo visual:

10 jogadores

↓

8 jogadores

↓

5 jogadores

↓

3 jogadores

↓

FINAL

↓

🏆 VENCEDOR

==================================================
20. RANKINGS
==================================================

Criar:

Ranking diário

Ranking semanal

Ranking mensal

Ranking global

Ranking entre amigos

Ranking por país

Mostrar:

posição
avatar
username
level
XP

Exemplo:

🥇 João — 3.850 XP
🥈 Maria — 3.430 XP
🥉 Carlos — 3.100 XP
4 Anderson — 2.940 XP

==================================================
21. LIGAS
==================================================

Criar futuramente sistema semelhante a ligas.

Exemplo:

Bronze
Silver
Gold
Diamond

Cada semana:

utilizadores são agrupados.

Os melhores sobem.

Os últimos descem.

==================================================
22. DESAFIO DIÁRIO
==================================================

Todos os dias gerar um desafio.

Exemplo:

DESAFIO DO DIA

5 perguntas

Recompensa:

+50 XP
+10 moedas

Mostrar ranking daquele desafio.

==================================================
23. ACHIEVEMENTS
==================================================

Exemplos:

Primeira lição

7 dias seguidos

30 dias seguidos

100 respostas corretas

1.000 respostas corretas

Primeiro amigo

Primeiro duelo

10 vitórias

100 vitórias

Primeiro torneio ganho

Level 10

Level 25

Level 50

==================================================
24. PERFIL
==================================================

Mostrar:

Avatar

Username

Level

XP total

Streak

Maior streak

Lições concluídas

Palavras aprendidas

Precisão média

Vitórias

Derrotas

Torneios ganhos

Achievements

Data de entrada

==================================================
25. CONTEÚDO CULTURAL
==================================================

Além de ensinar a língua, incluir cultura de São Tomé e Príncipe.

Podem existir pequenas cartas ou histórias sobre:

- tradições
- gastronomia
- música
- história
- provérbios
- localidades
- costumes

Todo conteúdo deverá ser verificável e administrável pelo painel.

==================================================
26. ÁUDIO
==================================================

Cada palavra/frase poderá possuir:

texto
tradução
áudio
falante
região
variante
notas

Dar preferência a gravações de falantes reais.

Criar botão:

🔊

para ouvir a pronúncia.

O áudio poderá ser armazenado em Cloudflare R2/S3.

==================================================
27. SISTEMA DE VALIDAÇÃO LINGUÍSTICA
==================================================

Esta funcionalidade é extremamente importante.

Cada conteúdo deverá possuir status:

DRAFT

UNDER_REVIEW

APPROVED

REJECTED

Somente conteúdo APPROVED poderá aparecer para utilizadores.

Guardar:

createdBy
reviewedBy
approvedAt
version

Idealmente permitir dois especialistas:

criador
+
revisor

==================================================
28. PAINEL ADMINISTRATIVO
==================================================

Criar aplicação Next.js.

Dashboard:

Utilizadores
Línguas
Cursos
Unidades
Lições
Exercícios
Palavras
Frases
Áudios
Desafios
Torneios
Reports
Assinaturas
Analytics

Admin deverá poder:

CRIAR LÍNGUA

CRIAR UNIDADE

CRIAR LIÇÃO

CRIAR EXERCÍCIO

UPLOAD DE ÁUDIO

EDITAR CONTEÚDO

APROVAR CONTEÚDO

DESATIVAR CONTEÚDO

==================================================
29. MODELO DE DADOS
==================================================

Criar Prisma Schema profissional.

Entidades principais:

User

UserProfile

Language

Course

Unit

Lesson

Exercise

ExerciseOption

Vocabulary

Phrase

AudioAsset

UserLessonProgress

UserExerciseAttempt

UserLanguageProgress

DailyActivity

Streak

Achievement

UserAchievement

Friendship

Block

GameRoom

GameParticipant

Game

GameQuestion

GameAnswer

Leaderboard

Tournament

TournamentParticipant

Notification

Subscription

Purchase

Report

AdminAuditLog

Criar relacionamentos corretos.

Adicionar:

createdAt
updatedAt

quando necessário.

Utilizar UUIDs.

Adicionar índices relevantes.

==================================================
30. SEGURANÇA
==================================================

Implementar:

password hashing com Argon2 ou bcrypt

JWT access token

refresh token

rate limiting

input validation

DTOs

Zod quando adequado

NestJS Guards

Role Based Access Control

CORS

Helmet

proteção contra brute force

validação de uploads

limites de tamanho

logs

audit logs

Nunca colocar segredos no código.

Usar .env.

Nunca confiar em:

XP
moedas
score
resultado
tempo de resposta

enviado pelo frontend.

O servidor é a fonte de verdade.

==================================================
31. ANTI-CHEAT
==================================================

Especialmente importante para competições.

O servidor deverá:

selecionar perguntas

controlar tempo

validar respostas

calcular pontuação

determinar vencedor

guardar resultados

Implementar medidas para dificultar:

respostas duplicadas

manipulação de score

replay de requests

bots

requests em excesso

==================================================
32. MONETIZAÇÃO
==================================================

A aplicação deverá ser FREEMIUM.

FREE:

lições básicas

XP

streak

amigos

ranking

desafio diário

algumas competições

publicidade moderada

PREMIUM:

sem anúncios

mais conteúdo

estatísticas avançadas

mais exercícios

treino avançado

conteúdo especial

personalização adicional

possíveis funcionalidades offline

Não bloquear a aprendizagem essencial de forma agressiva.

==================================================
33. SUBSCRIÇÕES
==================================================

Como a app será publicada na Google Play Store, preparar a arquitetura para compras digitais através do sistema adequado da Google Play.

Usar preferencialmente:

RevenueCat

integrado com:

Google Play Billing.

Criar produtos como:

Premium Monthly

Premium Yearly

Family futuramente.

O backend deverá validar o estado da subscrição.

==================================================
34. PREÇOS INICIAIS PARA TESTE
==================================================

Os preços devem ser configuráveis.

Exemplo inicial:

Premium mensal:
€4,99

Premium anual:
€39,99

Não colocar estes valores diretamente no código.

Guardar configuração de produtos no backend / RevenueCat / Google Play.

==================================================
35. PUBLICIDADE
==================================================

Utilizar futuramente:

Google AdMob.

Não mostrar publicidade durante uma questão ou enquanto o utilizador está a responder.

Locais possíveis:

depois de determinada quantidade de lições

resultado de desafio

áreas gratuitas específicas

Premium remove anúncios.

==================================================
36. OUTRAS FONTES DE RECEITA
==================================================

Arquitetura de negócio também deverá considerar:

licenciamento para escolas

parcerias culturais

instituições

turismo

patrocínio de campeonatos

conteúdo patrocinado claramente identificado

programas educacionais

Não implementar apostas.

Não permitir competições em que utilizadores coloquem dinheiro diretamente para tentar ganhar dinheiro de outros jogadores.

==================================================
37. UI / UX
==================================================

Quero uma interface:

moderna
simples
colorida
jovem
premium
divertida

Mas NÃO copiar visualmente o Duolingo.

Criar identidade própria inspirada em São Tomé e Príncipe.

Utilizar referências culturais de forma respeitosa.

A interface deverá funcionar bem em:

Android pequeno
Android médio
tablets futuramente

Usar:

rounded cards
micro animations
progress bars
feedback visual
haptic feedback
animações de XP

==================================================
38. NAVEGAÇÃO MOBILE
==================================================

Bottom Navigation:

APRENDER

DESAFIOS

AMIGOS

RANKING

PERFIL

==================================================
39. TELAS PRINCIPAIS
==================================================

Criar design e posteriormente código para:

Splash Screen

Onboarding

Login

Register

Forgot Password

Choose Language

Home

Course Path

Lesson

Exercise

Lesson Result

Daily Challenge

Friends

Friend Search

Friend Requests

User Profile

1v1 Challenge

Room Lobby

Live Quiz

Elimination Game

Game Result

Leaderboard

Achievements

Notifications

Profile

Settings

Premium

Subscription

Help

Report User

==================================================
40. NOTIFICAÇÕES
==================================================

Exemplos:

🔥 Não percas a tua sequência!

O João desafiou-te para uma partida.

🏆 Subiste para o Top 10!

O desafio diário está disponível.

O torneio começa em 30 minutos.

Criar preferências para utilizador poder desativar categorias.

==================================================
41. MVP
==================================================

NÃO desenvolver tudo inicialmente.

FASE 1 deverá ter:

Autenticação

Onboarding

1 língua:
Forro / Santomé

Sistema de:

curso
unidades
lições
exercícios

Áudio

XP

níveis

streak

moedas

perfil

ranking

amigos

desafio diário

painel administrativo

analytics básico

Preparação para Google Play.

==================================================
42. FASE 2
==================================================

Adicionar:

1 vs 1

salas privadas

Socket.IO

quiz multiplayer

leaderboards avançados

achievements

notificações

Premium

Google Play Billing

AdMob

==================================================
43. FASE 3
==================================================

Adicionar:

modo eliminatório

torneios

ligas semanais

matchmaking

Redis

mais línguas

pronúncia

IA opcional

conteúdo cultural avançado

instituições/escolas

==================================================
44. GOOGLE PLAY
==================================================

Preparar aplicação para lançamento na Google Play Store.

Utilizar:

Expo EAS Build

Gerar:

Android App Bundle (.aab)

Preparar:

applicationId único

versionCode

versionName

ícone

adaptive icon

splash screen

privacy policy

terms of service

data safety

permissões Android

testes internos

closed testing

produção

Nunca solicitar permissões que não sejam necessárias.

==================================================
45. PERFORMANCE
==================================================

Implementar:

lazy loading

paginação

cache

React Query

compressão de imagens

stream/download adequado de áudio

queries otimizadas

índices PostgreSQL

evitar chamadas desnecessárias

==================================================
46. OFFLINE
==================================================

No MVP poderá ser limitado.

Preparar arquitetura futura para permitir:

lições descarregadas

áudios offline

sincronização posterior do progresso

Não confiar em progresso offline sem validação ao sincronizar.

==================================================
47. TESTES
==================================================

Criar:

unit tests

integration tests

API tests

E2E tests para fluxos críticos.

Prioridades:

Auth

XP

Streak

Progress

Subscriptions

Game scoring

Quiz rooms

Admin permissions

Usar ferramentas adequadas ao ecossistema.

==================================================
48. API
==================================================

Criar REST API inicialmente.

Exemplo:

/auth
/users
/languages
/courses
/units
/lessons
/exercises
/progress
/friends
/leaderboards
/daily-challenges
/achievements
/rooms
/games
/tournaments
/subscriptions
/admin

Usar versionamento:

/api/v1/

==================================================
49. PADRÃO DE CÓDIGO
==================================================

Quero código:

limpo
modular
escalável
fortemente tipado
documentado onde necessário
sem duplicação
sem overengineering

Usar princípios como:

SOLID quando fizer sentido

separação de responsabilidades

DTOs

services

repositories quando necessário

guards

interceptors

modules NestJS

==================================================
50. OBJETIVO DO PRODUTO
==================================================

A aplicação deve transmitir:

"Aprender uma língua de São Tomé e Príncipe pode ser divertido, social e competitivo."

O diferencial não deve ser apenas ensinar vocabulário.

O diferencial é:

LÍNGUA
+
CULTURA
+
GAMIFICAÇÃO
+
AMIGOS
+
COMPETIÇÃO

==================================================
51. IMPORTANTE SOBRE O DESENVOLVIMENTO
==================================================

Não quero que cries toda a aplicação numa única resposta.

Vamos desenvolver passo a passo.

Antes de escrever código:

1. Analisa todos os requisitos.

2. Apresenta a arquitetura completa.

3. Mostra a estrutura das pastas.

4. Propõe o modelo da base de dados.

5. Identifica riscos técnicos.

6. Separa MVP e funcionalidades futuras.

7. Define o fluxo das principais telas.

8. Define as APIs necessárias.

9. Só depois começa a implementação.

Ao implementar cada funcionalidade:

- explicar o objetivo
- indicar ficheiros criados
- apresentar código completo
- não utilizar pseudocódigo quando for pedida implementação real
- manter compatibilidade com código anterior
- não destruir funcionalidades existentes
- utilizar TypeScript corretamente
- tratar erros
- validar inputs
- considerar segurança
- considerar escalabilidade

==================================================
52. PRIMEIRA TAREFA
==================================================

Começa agora SEM escrever toda a aplicação.

Quero primeiro:

1. Nome provisório para o projeto.

2. Resumo profissional da ideia.

3. Arquitetura técnica.

4. Diagrama textual da arquitetura.

5. Estrutura completa do monorepo.

6. Modelo inicial da base de dados.

7. Principais módulos do NestJS.

8. Estrutura do React Native/Expo.

9. Estrutura do painel Next.js.

10. Fluxo completo desde criar conta até terminar a primeira lição.

11. Roadmap do MVP.

12. Ordem exata em que devemos programar as funcionalidades.

13. Estimativa da dificuldade de cada módulo.

Depois aguarda a minha autorização para começarmos a programar.



##################################################
##################################################
ADENDO A — ARENA ONLINE (MULTIPLAYER ONLINE)
##################################################
##################################################

Quero adicionar ao projeto uma funcionalidade importante de MULTIPLAYER ONLINE.

Não quero que alteres a arquitetura principal da aplicação.
Quero que integres este novo sistema no projeto existente.

==================================================
A1. CONCEITO
==================================================

Quero criar uma área chamada provisoriamente:

ARENA ONLINE

O utilizador entra numa fila de matchmaking e é colocado automaticamente numa sala com outros jogadores.

Quando a sala atingir o número necessário de jogadores, começa automaticamente uma partida de quiz.

O objetivo é sobreviver até ser o último jogador com vidas.

É um modo:

QUIZ
+
TEMPO REAL
+
VIDAS
+
ELIMINAÇÃO
+
MATCHMAKING

==================================================
A2. EXEMPLO DO FLUXO
==================================================

Utilizador entra em:

JOGAR

↓

ARENA ONLINE

↓

SOBREVIVÊNCIA

↓

Botão:

"PROCURAR PARTIDA"

↓

MATCHMAKING

Mostrar:

"À procura de jogadores..."

1/8 jogadores
3/8 jogadores
6/8 jogadores
8/8 jogadores

↓

Quando atingir:

8/8

bloquear entrada de novos jogadores.

Esperar aproximadamente 3 segundos.

Mostrar:

"Sala completa!"

↓

Countdown:

3
2
1

↓

COMEÇAR PARTIDA AUTOMATICAMENTE

Não é necessário alguém carregar num botão para iniciar.

==================================================
A3. TAMANHO DAS SALAS
==================================================

Começar com:

8 jogadores por partida.

Mas criar de forma configurável.

No futuro quero permitir:

4 jogadores
8 jogadores
16 jogadores

Por isso NÃO colocar 8 hardcoded em toda a aplicação.

Criar:

maxPlayers

como configuração da sala/modo.

==================================================
A4. SISTEMA DE VIDAS
==================================================

Cada jogador começa, por exemplo, com:

3 vidas

Visual:

❤️ ❤️ ❤️

Também deve ser configurável.

Exemplo:

startingLives = 3

Cada resposta errada:

-1 vida

Cada pergunta sem resposta dentro do tempo:

-1 vida

Resposta correta:

não perde vida.

Exemplo:

Jogador:

❤️❤️❤️

Erra.

↓

❤️❤️

Erra novamente.

↓

❤️

Erra novamente.

↓

0

↓

ELIMINADO

==================================================
A5. ELIMINAÇÃO
==================================================

Quando jogador chegar a:

0 vidas

estado:

ELIMINATED

Ele deixa de poder responder às perguntas.

Mas NÃO deve ser expulso da sala.

Ele passa automaticamente para:

SPECTATOR MODE

Poderá continuar a assistir à partida.

Mostrar:

"Foste eliminado"

"Ficaste em 6.º lugar"

Botão:

"CONTINUAR A ASSISTIR"

==================================================
A6. CONDIÇÃO DE VITÓRIA
==================================================

A partida continua enquanto existirem:

2 ou mais jogadores vivos.

Quando restar apenas:

1 jogador

↓

PARTIDA TERMINA

↓

Esse jogador é:

WINNER

Mostrar:

🏆 ÚLTIMO SOBREVIVENTE

==================================================
A7. NÃO EXISTE NÚMERO FIXO DE PERGUNTAS
==================================================

No modo Sobrevivência não quero necessariamente:

10 perguntas e acabou.

A partida poderá continuar enquanto existirem pelo menos dois jogadores vivos.

Exemplo:

Pergunta 1
8 jogadores

Pergunta 2
8 jogadores

Pergunta 3
7 jogadores

Pergunta 4
6 jogadores

Pergunta 5
4 jogadores

Pergunta 6
3 jogadores

Pergunta 7
2 jogadores

Pergunta 8
1 jogador

↓

FIM

Se necessário, evitar partidas infinitas através de uma regra configurável como:

maxRounds

ou morte súbita.

==================================================
A8. TIPOS DE QUIZ
==================================================

Inicialmente, no multiplayer competitivo, quero principalmente perguntas de:

MULTIPLE CHOICE

Uma pergunta e 4 respostas:

A
B
C
D

Apenas uma correta.

Exemplo visual:

Pergunta 4

⏱ 08 segundos

"Qual é a tradução correta?"

[A]
[B]
[C]
[D]

IMPORTANTE:

Não inventar palavras ou traduções em Forro.

Utilizar apenas perguntas APPROVED existentes na base de dados.

==================================================
A9. FUTUROS TIPOS DE PERGUNTAS
==================================================

Preparar arquitetura para futuramente permitir:

MULTIPLE_CHOICE

LISTEN_AND_CHOOSE

IMAGE_SELECT

TRUE_FALSE

Mas no MVP multiplayer utilizar principalmente:

MULTIPLE_CHOICE

porque é mais simples e justo para competição em tempo real.

==================================================
A10. TEMPO POR PERGUNTA
==================================================

Cada pergunta terá um tempo limitado.

Exemplo inicial:

10 segundos.

Deve ser configurável:

questionDurationSeconds

Mostrar contador:

10
9
8
7
...

Quando chegar a:

0

bloquear respostas.

Quem não respondeu perde uma vida.

==================================================
A11. TODOS RECEBEM A MESMA PERGUNTA
==================================================

Para ser justo:

todos os jogadores vivos da sala recebem a mesma pergunta.

Ao mesmo tempo.

O servidor deverá controlar:

qual pergunta está ativa

quando começou

quando termina

qual é a resposta correta.

O frontend NÃO deverá decidir isto.

==================================================
A12. ENVIO DAS RESPOSTAS
==================================================

Quando o utilizador toca numa opção:

enviar imediatamente ao servidor.

Exemplo:

answer:submit

Dados necessários:

gameId
roundId
questionId
selectedOptionId

O cliente NÃO envia:

isCorrect
score
lives

O servidor determina tudo.

==================================================
A13. RESPOSTA DUPLICADA
==================================================

Cada jogador só pode responder:

1 vez

por pergunta.

Se tentar enviar novamente:

ignorar/rejeitar.

Depois de responder:

bloquear os botões.

==================================================
A14. RESULTADO DA PERGUNTA
==================================================

Depois que todos os jogadores vivos responderem ou o tempo acabar:

o servidor calcula os resultados.

Mostrar:

✅ Correto

ou

❌ Errado

Se errado:

-1 ❤️

Também mostrar rapidamente:

"5 jogadores acertaram"

"2 jogadores erraram"

"1 jogador não respondeu"

==================================================
A15. INTERVALO ENTRE PERGUNTAS
==================================================

Depois do resultado:

esperar aproximadamente:

2-4 segundos

Mostrar jogadores restantes.

Exemplo:

🔥 5 JOGADORES RESTANTES

Depois iniciar próxima pergunta.

==================================================
A16. TELA DURANTE O JOGO
==================================================

Topo:

ROUND 6

⏱ 08

👤 5 jogadores vivos

Mostrar:

❤️❤️

para as vidas do jogador.

Depois pergunta.

Depois:

4 alternativas grandes.

Em baixo pode existir mini indicador dos jogadores:

Anderson ❤️❤️
Maria ❤️
João ❤️❤️❤️
Carlos ❤️
Ana ❤️❤️

Não mostrar informações que prejudiquem a leitura da pergunta.

==================================================
A17. JOGADOR ELIMINADO
==================================================

Depois de eliminado:

mudar interface.

Mostrar:

💀 ELIMINADO

"Terminaste em 5.º lugar"

Depois:

MODO ESPECTADOR

Mostrar:

jogadores restantes

vidas

pergunta atual

resultado

Mas espectador:

NÃO pode enviar respostas.

==================================================
A18. CLASSIFICAÇÃO
==================================================

Quando alguém é eliminado, guardar a sua posição.

Exemplo:

8 jogadores.

Primeiro eliminado:

8.º

Segundo:

7.º

etc.

Quando restar apenas um:

1.º vencedor.

Guardar:

placement

Exemplo final:

🥇 Maria

🥈 Anderson

🥉 João

4.º Carlos

5.º Ana

...

==================================================
A19. RECOMPENSAS
==================================================

Criar recompensas baseadas na posição.

Valores apenas como configuração inicial.

Exemplo:

1.º
+250 XP
+50 moedas

2.º
+150 XP
+30 moedas

3.º
+100 XP
+20 moedas

4.º-5.º
+60 XP

restantes:
+30 XP

Mas não colocar diretamente no frontend.

Backend calcula.

Criar tabela/configuração de recompensas.

==================================================
A20. MATCHMAKING
==================================================

Fluxo:

Utilizador toca:

PROCURAR PARTIDA

↓

entra numa fila.

Servidor procura uma sala:

WAITING

que ainda possua vagas.

Se existir:

entra.

Se não existir:

criar sala.

Quando:

currentPlayers === maxPlayers

↓

status:

STARTING

↓

countdown

↓

status:

IN_PROGRESS

==================================================
A21. CANCELAR MATCHMAKING
==================================================

Enquanto sala ainda estiver:

WAITING

utilizador pode:

CANCELAR

e sair.

Quando estiver:

STARTING

ou

IN_PROGRESS

já não pode simplesmente cancelar sem penalização futura.

No MVP pode apenas marcar como disconnected.

==================================================
A22. DESCONEXÃO
==================================================

Tratar casos de internet cair.

Se jogador desconectar:

não eliminar imediatamente.

Dar alguns segundos para reconectar.

Exemplo:

reconnectGracePeriod = 10 segundos

Se voltar:

retomar partida.

Se não voltar:

marcar como:

DISCONNECTED

e aplicar regra definida.

Por exemplo:

eliminar após timeout.

==================================================
A23. SALAS PÚBLICAS
==================================================

ARENA ONLINE será:

PUBLIC MATCHMAKING

Não existe código.

Jogadores são encontrados automaticamente.

==================================================
A24. SALAS PRIVADAS
==================================================

Quero também arquitetura para:

PRIVATE ROOM

Utilizador cria sala.

Servidor gera código:

STP482

Amigos podem entrar com código.

Exemplo:

CRIAR SALA

↓

Código:

STP482

↓

Partilhar código

↓

Amigos entram

↓

Host escolhe:

4 jogadores
8 jogadores

vidas:
1
2
3
5

tempo:
5s
10s
15s

Quando todos estiverem prontos:

host começa.

No modo privado NÃO é obrigatório esperar encher todas as vagas.

==================================================
A25. DIFERENÇA ENTRE PÚBLICA E PRIVADA
==================================================

PUBLIC:

matchmaking automático

número fixo de jogadores

começa automaticamente quando fica completa.

PRIVATE:

código

amigos

host

configurações personalizadas

host pode começar quando houver jogadores suficientes.

==================================================
A26. MODOS DE JOGO
==================================================

Criar arquitetura extensível para:

SURVIVAL

1V1

2V2

FREE_FOR_ALL

TOURNAMENT

Inicialmente implementar principalmente:

SURVIVAL

Mas não criar arquitetura que impeça os outros modos futuramente.

==================================================
A27. FUTURO 2V2
==================================================

Quero também posteriormente:

2 jogadores

VS

2 jogadores.

Cada pessoa responde individualmente.

Pontos somam para a equipa.

Preparar conceito:

Team

TeamPlayer

teamScore

Mas NÃO é obrigatório implementar 2v2 agora.

==================================================
A28. SOCKET.IO
==================================================

Usar:

NestJS + Socket.IO

Criar eventos bem definidos.

Exemplo:

matchmaking:join

matchmaking:leave

room:joined

room:playerJoined

room:playerLeft

room:full

game:starting

game:start

round:start

answer:submit

answer:received

round:end

player:lifeLost

player:eliminated

player:disconnected

player:reconnected

game:playersRemaining

game:end

==================================================
A29. SERVIDOR COMO FONTE DA VERDADE
==================================================

Isto é extremamente importante.

O frontend nunca deve decidir:

vidas

quem ganhou

quem perdeu

se resposta está certa

pontuação

posição

tempo oficial

pergunta seguinte

O servidor controla tudo.

==================================================
A30. ANTI-CHEAT
==================================================

Implementar proteção básica.

Não enviar a resposta correta para o frontend antes do final da pergunta.

Validar:

jogador pertence à partida

jogador está vivo

pergunta está ativa

opção pertence à pergunta

ainda está dentro do tempo

ainda não respondeu

Utilizar timestamps do servidor.

Não confiar no relógio do telemóvel.

Adicionar rate limiting quando necessário.

==================================================
A31. QUESTÕES DA BASE DE DADOS
==================================================

As perguntas usadas no modo online deverão vir da base de dados.

Apenas perguntas:

ACTIVE

e:

APPROVED

podem entrar.

Nunca utilizar conteúdo linguístico:

DRAFT

UNDER_REVIEW

REJECTED

==================================================
A32. NÍVEL DAS PERGUNTAS
==================================================

No início da partida:

questões mais fáceis.

Com o tempo:

dificuldade aumenta.

Exemplo:

Rounds 1-3:

EASY

Rounds 4-7:

MEDIUM

Rounds 8+:

HARD

Não precisa ser exatamente esta regra.

Criar sistema configurável.

==================================================
A33. NÃO REPETIR PERGUNTAS
==================================================

Dentro da mesma partida:

não repetir a mesma pergunta.

Guardar perguntas já utilizadas.

==================================================
A34. MORTE SÚBITA
==================================================

Pode acontecer de dois bons jogadores demorarem demasiado para serem eliminados.

Criar possibilidade futura de:

SUDDEN DEATH

Exemplo:

depois de 20 rounds:

todos ficam com:

1 vida.

Ou:

tempo por pergunta reduz.

Exemplo:

10s
↓
7s
↓
5s

Criar arquitetura que permita isto.

==================================================
A35. MODELO DE DADOS
==================================================

Rever o Prisma Schema existente e acrescentar entidades adequadas.

Sugestão conceitual:

GameRoom

id
type
mode
status
maxPlayers
currentPlayers
startingLives
questionDuration
createdAt
startedAt
endedAt

Game

id
roomId
status
winnerId
currentRound
startedAt
endedAt

GamePlayer

id
gameId
userId
lives
status
placement
correctAnswers
wrongAnswers
missedAnswers
joinedAt
eliminatedAt
disconnectedAt

GameRound

id
gameId
questionId
roundNumber
status
startedAt
expiresAt
endedAt

GameAnswer

id
roundId
playerId
selectedOptionId
isCorrect
responseTimeMs
submittedAt

Não seguir cegamente este modelo se encontrares uma modelação melhor.

Explica as decisões.

==================================================
A36. STATUS
==================================================

RoomStatus:

WAITING
STARTING
IN_PROGRESS
FINISHED
CANCELLED

PlayerStatus:

WAITING
ALIVE
ELIMINATED
DISCONNECTED
SPECTATING

RoundStatus:

WAITING
ACTIVE
FINISHED

==================================================
A37. FRONTEND
==================================================

Criar fluxo mobile:

JOGAR

↓

ARENA ONLINE

↓

SOBREVIVÊNCIA

↓

PROCURAR PARTIDA

↓

MATCHMAKING

↓

SALA COMPLETA

↓

3
2
1

↓

QUIZ

↓

PERGUNTA

↓

RESPOSTA

↓

RESULTADO

↓

VIDAS

↓

PRÓXIMA PERGUNTA

↓

ELIMINAÇÃO

↓

MODO ESPECTADOR

ou

↓

🏆 VITÓRIA

==================================================
A38. TELA FINAL
==================================================

Mostrar:

RESULTADOS

🏆 1.º Maria

🥈 2.º Anderson

🥉 3.º João

...

Para o jogador:

"Ficaste em 2.º!"

+150 XP

+30 moedas

Respostas corretas:

12

Respostas erradas:

2

Maior sequência:

7

Botões:

JOGAR NOVAMENTE

VOLTAR

==================================================
A39. EXPERIÊNCIA VISUAL
==================================================

Quero que este modo tenha sensação de:

competição

tensão

velocidade

sobrevivência

Mas sem perder o foco educativo.

Usar:

countdown

animação de perda de vida

animação de eliminação

indicador de jogadores vivos

efeito visual quando restam poucos jogadores

tela especial quando chega à final.

==================================================
A40. ÁUDIO
==================================================

Posteriormente perguntas também podem possuir áudio.

Exemplo:

🔊 ouvir palavra

↓

escolher significado correto.

Garantir que todos tenham tempo para carregar o áudio antes do cronómetro iniciar.

Considerar pré-carregamento.

==================================================
A41. FAIRNESS
==================================================

Como é uma competição:

todos devem receber:

mesma pergunta

mesmas opções

mesmo tempo oficial

mesmo início da ronda.

O servidor controla o tempo.

==================================================
A42. RECONEXÃO
==================================================

Pensar na reconexão Socket.IO.

Se aplicação perder ligação por alguns segundos:

tentar voltar à mesma:

roomId
gameId

e sincronizar:

round atual

tempo restante

vidas

status

jogadores restantes.

==================================================
A43. ESCALABILIDADE
==================================================

No MVP podemos começar simples.

NestJS
Socket.IO
PostgreSQL

Mas preparar arquitetura para posteriormente utilizar:

Redis

Socket.IO Redis Adapter

filas

múltiplas instâncias da API

caso tenhamos muitos jogadores simultâneos.

Não implementar infraestrutura complexa desnecessariamente agora.

==================================================
A44. ANALYTICS
==================================================

Guardar métricas como:

partidas iniciadas

partidas concluídas

tempo médio

jogadores por partida

taxa de abandono

round médio de eliminação

perguntas com maior erro

quantas pessoas procuram nova partida depois de terminar.

==================================================
A45. IMPORTANTE
==================================================

Não inventar conteúdo em Forro.

Este pedido é sobre:

MECÂNICA DO JOGO

MATCHMAKING

SALAS

SOCKET.IO

VIDAS

ELIMINAÇÃO

TEMPO REAL

e não sobre gerar conteúdo linguístico.

==================================================
A46. PRIMEIRA TAREFA (ARENA ONLINE)
==================================================

Antes de implementar código:

1. Analisa este modo de jogo.

2. Diz se existe algum problema lógico que devamos corrigir.

3. Desenha a arquitetura do multiplayer.

4. Define o fluxo completo de estados da partida.

5. Define os eventos Socket.IO.

6. Define o modelo Prisma necessário.

7. Define como funcionará matchmaking.

8. Define como controlarás o cronómetro no servidor.

9. Define como funcionará eliminação e classificação.

10. Define reconexão.

11. Define mecanismos anti-cheat.

12. Mostra o fluxo frontend.

13. Explica como integrar isto com o sistema atual de XP e moedas.

14. Separa o que entra no MVP do que deve ficar para versões posteriores.

Depois aguarda a minha autorização antes de começar a implementar.


##################################################
##################################################
ADENDO B — PLATAFORMA MULTILÍNGUE (2026-10-07)
##################################################
##################################################

O objetivo passa a ser uma plataforma com VÁRIAS LÍNGUAS, de vários países.

Por enquanto:

SÃO TOMÉ E PRÍNCIPE
- Forro / Santomé (primeira língua do MVP)
- Angolar
- Lung'Ie / Principense

CABO VERDE
- Kriolu / Crioulo cabo-verdiano (Kabuverdianu), com variantes por ilha
  (ex.: Santiago, São Vicente). A variante de cada conteúdo é indicada e revista.

Mais países e línguas poderão ser adicionados no futuro sem alterar a arquitetura.

Regras que se mantêm para TODAS as línguas:
- Não inventar palavras, traduções, pronúncias ou regras.
- Todo o conteúdo é criado e aprovado por falantes nativos/especialistas de cada língua
  (criador + revisor), através do painel administrativo.
- Só conteúdo APPROVED chega aos utilizadores.

Consequências:
- O modelo de dados tem PAÍS → LÍNGUA → VARIANTE → CURSO → UNIDADE → LIÇÃO.
- O onboarding agrupa as línguas por país.
- O nome provisório da app ("Língua STP") deixa de servir — o nome final deve
  funcionar para vários países (decisão D-10).
- Cada língua precisa da sua própria equipa de linguistas.
