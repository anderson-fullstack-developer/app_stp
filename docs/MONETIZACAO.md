# Língua STP — Plano de Monetização

> Objetivo: tornar a app financeiramente sustentável — pagar linguistas, servidores e desenvolvimento — e gerar lucro, **sem bloquear a aprendizagem essencial** (secção 32 da especificação).
>
> Todos os preços e números abaixo são **propostas e hipóteses** para validar com dados reais. Os preços finais vivem na Google Play / RevenueCat, nunca no código.

---

## 1. A realidade do mercado (ler primeiro)

| Segmento | Tamanho | Capacidade de pagar | Como chegar |
|---|---|---|---|
| **Residentes em São Tomé e Príncipe** | País pequeno (~230 mil habitantes) | **Baixa** (pagamentos digitais pouco comuns, preços em euros pesam) | Escolas, operadoras móveis, rádio/TV, influenciadores locais |
| **Diáspora** (Portugal, França, Reino Unido…) | Comunidade significativa | **Média/alta** — e motivação forte (identidade, filhos) | Associações, igrejas, eventos, grupos de Facebook/WhatsApp, Instagram/TikTok |
| **Filhos e netos da diáspora** | Quem aprende; quem paga são os pais | Pais pagam por educação | Plano Família, marketing dirigido a pais |
| **Cabo Verde e diáspora cabo-verdiana** (EUA — sobretudo Massachusetts —, Portugal, Países Baixos, França, Luxemburgo) | País e diáspora maiores do que os de STP | **Média/alta na diáspora** | Associações, eventos culturais, igrejas, redes sociais; **interface em inglês** torna-se prioritária para a diáspora nos EUA |
| **Turistas** | Fluxo crescente para STP | Alta, compra única | Hotéis, agências, companhias aéreas, guias de viagem |
| **Instituições** | Escolas, universidades, ministério, ONG culturais | Orçamentos próprios, subsídios | Venda direta (B2B), propostas de financiamento |

**Cabo Verde (Adendo B)** aumenta bastante o mercado: diáspora grande e com poder de compra, e turismo forte (Sal, Boa Vista). O Pack Viagem e o Plano Família ganham peso.

**Conclusão honesta:** os residentes em STP vão ser a maioria dos utilizadores, mas **não a maioria da receita**. O dinheiro vem sobretudo de **(1) diáspora e famílias**, **(2) instituições e financiamento cultural** e **(3) turismo e patrocínios**. A app gratuita e boa para os residentes é o que cria comunidade, conteúdo partilhado e credibilidade — e isso vende aos outros segmentos.

---

## 2. Princípios (não negociáveis)

1. **A aprendizagem essencial é sempre gratuita.** Ninguém deixa de aprender a sua língua por não pagar.
2. **Competição justa:** o Premium nunca dá vidas, pontos ou vantagem nas partidas.
3. **Sem apostas** e sem competições a dinheiro entre jogadores.
4. **Moedas virtuais só se ganham** — não se compram nem se trocam por dinheiro (evita "pagar para ganhar" e gastos de menores).
5. **Anúncios moderados**, nunca durante perguntas, contagens, partidas ou lições.
6. **Patrocínio sempre identificado** ("Patrocinado por…").
7. **Respeito pela comunidade:** parte da receita paga os falantes nativos que criam e revêem o conteúdo — é também um argumento de venda.

---

## 3. Fontes de receita

Ordenadas por **potencial × facilidade**.

### A. Premium individual (assinatura) — *principal fonte no consumidor*

| Produto | Preço proposto (UE) | Notas |
|---|---|---|
| Premium Mensal | **€4,99** | Igual à especificação |
| Premium Anual | **€39,99** (≈ €3,33/mês, −33%) | Destacar como "melhor valor"; **7 dias grátis** só no anual |

- **Preços por país (Google Play):** em STP e países com menor poder de compra, preço muito mais baixo (ex.: o equivalente a ~€0,99–1,49/mês). Mais assinantes > preço alto que ninguém paga.
- Gerido por **RevenueCat + Google Play Billing**; o servidor decide quem é Premium.

### B. Plano Família — *a diáspora paga pelos filhos*

| Produto | Preço proposto | Notas |
|---|---|---|
| Premium Família Anual | **€59,99/ano** até 6 contas | Mensagem: "Ensina aos teus filhos a língua dos avós." Painel simples para os pais verem o progresso dos filhos. |

### C. Pack Viagem — *compra única para turistas*

| Produto | Preço proposto | Notas |
|---|---|---|
| Pack Viagem (por língua: Forro, Kriolu…) | **€6,99 compra única** | Frases essenciais (saudações, restaurante, hotel, transportes, mercado, emergências), áudio **offline**, guia cultural curto. Não é assinatura — turistas não querem assinaturas. O ecrã já existe no protótipo (desligado). |

Venda cruzada: hotéis/agências podem oferecer o pack aos clientes (ver G).

### D. Publicidade (AdMob) — *complemento, não a base*

- **Banners/nativos** só nos sítios permitidos (início, resultados, loja) e **intersticial no máximo após cada 3 lições**.
- **Anúncio recompensado** (ver vídeo → +moedas), com **limite diário** (ex.: 3 por dia).
- Receita por anúncio é baixa em STP; maior na diáspora europeia. Serve sobretudo para **monetizar quem nunca paga** e empurrar para o Premium ("Remove anúncios").
- Consentimento RGPD obrigatório para utilizadores na UE/UK.

### E. Escolas e instituições (B2B) — *receita maior por contrato*

| Produto | Modelo | Notas |
|---|---|---|
| **Licença Escola** | Por aluno/ano ou por escola/ano (ex.: €2–5 por aluno/ano; preço especial para escolas públicas de STP) | Painel do professor: turmas, progresso, desafios de turma. |
| **Licença Institucional** | Contrato anual | Ministério da Educação/Cultura de STP, câmaras, universidades, centros culturais, escolas portuguesas com alunos santomenses. |

Pago por **fatura / transferência / Stripe** (fora da app). Requer empresa constituída para faturar (ver secção 8).

### F. Financiamento para preservação de línguas — *muitas vezes a maior fonte para línguas minoritárias*

A app documenta e ensina línguas com poucos falantes — isso é exatamente o que vários programas financiam. A investigar e candidatar:

- Iniciativas da **UNESCO** (Década Internacional das Línguas Indígenas 2022–2032).
- Fundos de documentação de línguas em perigo (ex.: *Endangered Languages Documentation Programme*, *Endangered Language Fund*).
- Programas culturais e educativos da **União Europeia**, embaixadas e cooperação (Portugal, França, CPLP).
- Fundações de empresas e fundos de impacto social.

Usar para: pagar linguistas e gravações de áudio, conteúdo de novas línguas (Angolar, Lung'Ie). **Não depende de código — pode começar já.**

### G. Patrocínios e parcerias — *empresas que querem associar-se à cultura de STP*

| Formato | Exemplo de parceiro (a contactar) |
|---|---|
| **Campeonato/torneio patrocinado** ("Taça [Marca] de Forro") com prémios em espécie | Operadoras móveis, bancos, companhias aéreas |
| **Desafio diário patrocinado** (identificado) | Marcas locais |
| **Conteúdo cultural patrocinado** (gastronomia, música, turismo) — claramente identificado | Turismo, restaurantes, festivais |
| **Packs oferecidos por hotéis/agências** aos hóspedes | Hotéis, resorts, agências de viagem |
| **Dados móveis grátis para a app** (*zero-rating*) | Operadoras móveis em STP — aumenta uso, dá visibilidade à operadora |

Prémios dos campeonatos: **nunca dinheiro dos jogadores**; podem ser prémios oferecidos pelo patrocinador (verificar regras legais de concursos).

### H. Outras (mais tarde)

- **Cosméticos Premium** (avatares, molduras, temas) incluídos no Premium — não vendidos à peça no início.
- **Merchandising** cultural (t-shirts, cadernos) em parceria.
- **Doações "Apoiar a língua"** — só fora da app ou através de entidade sem fins lucrativos (verificar regras da Google Play antes).

---

## 4. Gratuito vs Premium

| Funcionalidade | Gratuito | Premium |
|---|---|---|
| Curso principal (todas as unidades essenciais) | ✅ | ✅ |
| Áudio de pronúncia | ✅ | ✅ |
| XP, níveis, streak, conquistas | ✅ | ✅ |
| Amigos, rankings, desafio diário | ✅ | ✅ |
| Arena: partidas públicas | ✅ (limite diário generoso, ex.: 10) | ✅ ilimitadas |
| Salas privadas | Entrar ✅ · Criar: limitado | Criar ilimitadas, mais opções |
| Anúncios | Moderados | **Sem anúncios** |
| Treino de erros (rever o que falhaste) | Básico | **Avançado e ilimitado** |
| Estatísticas de progresso | Básicas | **Avançadas** |
| Conteúdo extra (provérbios, histórias, música, cultura) | Amostra | **Completo** |
| Streak Freeze | Ganhar com moedas | **1 automático por semana** |
| Lições e áudios offline | — | ✅ |
| Personalização (temas, molduras) | Algumas | **Todas** |
| Vantagem nas partidas | ❌ | ❌ (nunca) |

O Premium vende **conforto, profundidade e cultura** — não acesso à língua.

---

## 5. Quando ativar cada fonte

| Fase | O que fazer | Porquê |
|---|---|---|
| **Já (sem código)** | Candidaturas a financiamento (F), conversas com patrocinadores e escolas (E, G), constituir a empresa | Demora meses — começar cedo; não depende da app estar pronta |
| **MVP (lançamento)** | App **gratuita, sem anúncios nem paywall**; ecrã "Premium — em breve" com lista de espera | Ganhar utilizadores, avaliações na Play Store e dados de retenção; precisamos de conteúdo suficiente antes de cobrar "mais conteúdo" |
| **Fase 2** (≈ 1–3 meses após lançamento) | Premium mensal/anual + preços por país; AdMob moderado + recompensados | Já há conteúdo e utilizadores fiéis |
| **Fase 3** | Plano Família, Pack Viagem, primeiros patrocínios dentro da app | Diáspora e turistas |
| **Fase 3+** | Licenças para escolas (painel do professor) | Exige funcionalidades de turma |

---

## 6. Números a acompanhar

| Métrica | O que diz | Meta inicial (hipótese) |
|---|---|---|
| Retenção D1 / D7 / D30 | A app agarra? (sem isto, nada vende) | 40% / 20% / 10% |
| Conversão gratuito → pago | Quantos pagam | 2–5% dos ativos mensais |
| Receita média por utilizador pago | Preço efetivo | — |
| Cancelamento mensal (churn) | Quantos deixam de pagar | < 10%/mês |
| Utilizadores ativos por país | Onde estão os pagantes | — |
| eCPM de anúncios por país | Quanto rendem os anúncios | — |

**Exemplo ilustrativo (não é previsão):** 10.000 utilizadores ativos/mês × 3% pagantes = 300 assinantes. A ~€3,30/mês médio (maioria anual) ≈ **€1.000/mês brutos**, menos a comissão da Google (15% em assinaturas) ≈ **€840/mês**. Por isso **B2B, financiamento e patrocínios são essenciais** — um único contrato institucional pode valer mais do que centenas de assinaturas.

---

## 7. Custos a cobrir

- Comissão da Google Play (assinaturas: 15%) e, acima de certo volume, RevenueCat.
- Servidores e serviços (ver `docs/BACKEND.md`) — baixos no início.
- **Linguistas e gravações de áudio** — o maior custo real e o que dá valor ao produto.
- Marketing (redes sociais, eventos da diáspora).
- Contabilidade e IVA (vendas fora da Google Play).

---

## 8. Requisitos legais e de negócio

- **Empresa constituída** (em Portugal ou STP — decidir com contabilista) para receber da Google, faturar escolas e assinar patrocínios.
- Conta de **comerciante** na Google Play Console (para vender assinaturas).
- **IVA:** nas vendas dentro da app a Google trata do IVA ao consumidor; nas vendas diretas (escolas, Stripe) é responsabilidade da empresa.
- Termos de serviço e política de privacidade com as regras de assinatura, renovação e reembolso.
- Menores: se o público incluir crianças, regras mais apertadas de anúncios (Families Policy) e consentimento parental.

---

## 9. Impacto técnico (para o plano do backend)

| Necessidade | Onde |
|---|---|
| Tabela de produtos/planos e entitlements (Premium, Família, Pack Viagem) | B2 (modelo de dados) + B13 |
| Webhook RevenueCat → estado Premium no servidor | B13 |
| Limites diários (Arena gratuita, anúncios recompensados) | Regras de negócio + B8 |
| Contas Família (dono + membros) | B2/B13 |
| Organizações/turmas (escolas) e painel do professor | Fase 3+ |
| Patrocínios: campo "patrocinado por" em desafios/torneios/conteúdo | B5/B9 |
| Lista de espera do Premium (email) | B10 (Resend) |
| Analytics do funil de compra | B10 (PostHog) |

---

## 10. Decisões para o dono do produto

| # | Pergunta | Recomendação |
|---|---|---|
| M-01 | Lançar o MVP gratuito, sem anúncios nem paywall? | Sim — crescer primeiro, cobrar quando houver conteúdo. |
| M-02 | Preços: €4,99 / €39,99 / Família €59,99 / Pack Viagem €6,99, com preços reduzidos em STP? | Sim, como ponto de partida para testar. |
| M-03 | Moedas: só se ganham (nunca vendidas)? | Sim. |
| M-04 | Onde constituir a empresa (Portugal ou STP)? | Decidir com contabilista; afeta faturação, IVA e conta Google. |
| M-05 | Quem trata das candidaturas a financiamento e dos contactos com patrocinadores/escolas? | Definir responsável já — é a fonte com maior impacto a curto prazo. |
| M-06 | Limite diário de partidas gratuitas na Arena (ex.: 10)? | Começar generoso e ajustar com dados. |
