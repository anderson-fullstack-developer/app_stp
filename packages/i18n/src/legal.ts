/**
 * Política de Privacidade e Termos de Utilização (pt, en), partilhados pela web e pela app.
 * Rascunho honesto, alinhado com o que a app faz hoje (ver docs/PLAY_STORE.md §4) —
 * deve ser revisto por um jurista antes do lançamento público.
 *
 * Marcadores substituídos por `fillLegal`: {{app}}, {{controller}}, {{age}}, {{email}}, {{date}}.
 * Atualizar estes textos sempre que a app passar a recolher dados novos (anúncios, analytics, pagamentos).
 */
import type { AvailableLocale } from "./index";

export interface LegalSection {
  heading: string;
  /** Parágrafos; os que começam por "• " mostram-se como itens de lista. */
  body: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = "privacy" | "terms";

const pt: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Política de Privacidade",
    updated: "Última atualização: {{date}}",
    intro:
      "Esta política explica que dados o {{app}} recolhe, para quê, quem os trata e como os podes apagar. Escrevemo-la para ser lida, não para esconder coisas.",
    sections: [
      {
        heading: "1. Quem somos",
        body: [
          "O {{app}} é uma app para aprender as línguas de Cabo Verde e de São Tomé e Príncipe. O responsável pelo tratamento dos dados é {{controller}}.",
          "Contacto: {{email}}.",
        ],
      },
      {
        heading: "2. Que dados recolhemos",
        body: [
          "• Conta: nome, email, nome de utilizador e um identificador interno. Se entrares com a Google, recebemos o nome e o email dessa conta.",
          "• Perfil (opcional): país, línguas que falas, língua que estás a aprender, fuso horário e cor do avatar.",
          "• Atividade: lições feitas, respostas, XP, moedas, sequência de dias, conquistas, desafio do dia, partidas na Arena e itens da loja (comprados com moedas virtuais).",
          "• Social: amigos, pedidos de amizade, bloqueios, convites para partidas e notificações.",
          "• Dados técnicos: endereço IP e dados do pedido nos registos do servidor, usados para segurança e para corrigir erros.",
          "As preferências de som, vibração e idioma ficam guardadas só no teu dispositivo.",
          "Não recolhemos a tua localização, contactos, fotografias, gravações de voz nem o identificador de publicidade. Esta versão não tem anúncios nem ferramentas de análise de terceiros.",
        ],
      },
      {
        heading: "3. Para que usamos os dados",
        body: [
          "• Para te dar o serviço: guardar o teu progresso, lições, desafios, amigos e partidas.",
          "• Para manter o jogo justo: XP, moedas, sequências, pontuações e vencedores são calculados no nosso servidor, nunca no teu dispositivo.",
          "• Para mostrar o teu perfil público a outras pessoas: nome de utilizador, nome, país (se o indicares), nível, sequência e estatísticas de jogo.",
          "• Para segurança, prevenção de abuso e correção de erros.",
          "Fazemo-lo para cumprir o contrato contigo (os Termos de Utilização) e, na segurança, por interesse legítimo. Não vendemos os teus dados nem os usamos para publicidade.",
        ],
      },
      {
        heading: "4. Quem trata os dados por nós",
        body: [
          "Usamos prestadores de serviços que tratam os dados apenas segundo as nossas instruções:",
          "• Clerk — contas e início de sessão (Estados Unidos).",
          "• Neon — base de dados (União Europeia).",
          "• Railway — servidor da app (União Europeia).",
          "Quando há transferência para fora do Espaço Económico Europeu, é feita com as garantias previstas na lei, como as cláusulas contratuais-tipo da Comissão Europeia.",
        ],
      },
      {
        heading: "5. Quanto tempo guardamos",
        body: [
          "Guardamos os dados enquanto a tua conta existir.",
          "Quando eliminas a conta, apagamo-la no serviço de contas e removemos de imediato o teu nome, email, país, línguas e papéis. Fica apenas um registo anónimo da atividade, sem ligação a ti, para manter certos os rankings e as estatísticas.",
          "Os registos técnicos do servidor são guardados só o tempo necessário para segurança e diagnóstico.",
        ],
      },
      {
        heading: "6. Os teus direitos",
        body: [
          "Podes pedir acesso, correção, portabilidade ou apagamento dos teus dados e opor-te a certos tratamentos.",
          "Para apagar tudo, usa Definições → Eliminar conta, na app ou na web. Para os outros pedidos, escreve para {{email}}.",
          "Podes também apresentar reclamação à autoridade de proteção de dados do teu país (em Portugal, a CNPD).",
        ],
      },
      {
        heading: "7. Idade mínima",
        body: [
          "O {{app}} destina-se a pessoas com {{age}} anos ou mais. Se soubermos que uma conta pertence a alguém mais novo, eliminamo-la.",
        ],
      },
      {
        heading: "8. Segurança",
        body: [
          "As ligações são cifradas (HTTPS e WSS), o acesso aos dados é restrito e as palavras-passe são geridas pelo serviço de contas — nunca as vemos.",
        ],
      },
      {
        heading: "9. Alterações",
        body: [
          "Se esta política mudar de forma importante, avisamos na app antes de a mudança se aplicar.",
        ],
      },
    ],
  },
  terms: {
    title: "Termos de Utilização",
    updated: "Última atualização: {{date}}",
    intro: "Ao criar uma conta ou usar o {{app}}, aceitas estes termos. São curtos de propósito.",
    sections: [
      {
        heading: "1. A tua conta",
        body: [
          "Tens de ter {{age}} anos ou mais. Usa dados verdadeiros e um nome de utilizador respeitoso. És responsável pelo que acontece na tua conta.",
        ],
      },
      {
        heading: "2. O conteúdo das línguas",
        body: [
          "O conteúdo é preparado e revisto por falantes e linguistas. O Kriolu está em Beta e pode ainda ter erros; as línguas de São Tomé e Príncipe chegam mais tarde.",
          "O {{app}} ajuda a aprender, mas não substitui o ensino formal nem uma tradução profissional.",
        ],
      },
      {
        heading: "3. Jogo justo",
        body: [
          "É proibido fazer batota: automatizar respostas, explorar falhas, usar várias contas para ganhar vantagem ou combinar resultados.",
          "Os resultados oficiais são os do servidor. Podemos anular resultados, recompensas ou posições em rankings obtidos de forma indevida.",
        ],
      },
      {
        heading: "4. Respeito pelos outros",
        body: [
          "Não uses nomes ofensivos nem incomodes outras pessoas. Podes bloquear quem quiseres. Podemos suspender contas que não respeitem estas regras.",
        ],
      },
      {
        heading: "5. Moedas e itens virtuais",
        body: [
          "As moedas e os itens da loja servem só para usar na app: não têm valor em dinheiro, não se trocam por dinheiro e não se transferem para outras contas. Podemos ajustar preços e itens.",
          "Se no futuro houver compras com dinheiro real (Premium), terão condições próprias, mostradas antes de pagares.",
        ],
      },
      {
        heading: "6. Propriedade",
        body: [
          "A app, o Neto e os conteúdos pertencem ao {{app}} ou aos seus autores e só podem ser usados para aprendizagem pessoal, não comercial.",
        ],
      },
      {
        heading: "7. Disponibilidade e responsabilidade",
        body: [
          "Fazemos o possível para que o serviço funcione bem, mas é fornecido tal como está e pode mudar, ter interrupções ou terminar.",
          "Na medida permitida por lei, não respondemos por perdas indiretas resultantes do uso da app. Nada nestes termos limita os direitos que a lei do teu país te garante como consumidor.",
        ],
      },
      {
        heading: "8. Terminar",
        body: [
          "Podes eliminar a conta a qualquer momento em Definições → Eliminar conta. O que acontece aos dados está na Política de Privacidade.",
        ],
      },
      {
        heading: "9. Alterações e contacto",
        body: [
          "Se estes termos mudarem de forma importante, avisamos na app antes. Dúvidas: {{email}}.",
        ],
      },
    ],
  },
};

const en: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: {{date}}",
    intro:
      "This policy explains what data {{app}} collects, why, who processes it and how you can delete it. We wrote it to be read, not to hide things.",
    sections: [
      {
        heading: "1. Who we are",
        body: [
          "{{app}} is an app for learning the languages of Cape Verde and São Tomé and Príncipe. The data controller is {{controller}}.",
          "Contact: {{email}}.",
        ],
      },
      {
        heading: "2. What data we collect",
        body: [
          "• Account: name, email, username and an internal identifier. If you sign in with Google, we receive that account's name and email.",
          "• Profile (optional): country, languages you speak, the language you are learning, time zone and avatar colour.",
          "• Activity: lessons completed, answers, XP, coins, streak, achievements, daily challenge, Arena matches and shop items (bought with virtual coins).",
          "• Social: friends, friend requests, blocks, match invitations and notifications.",
          "• Technical data: IP address and request details in server logs, used for security and to fix errors.",
          "Sound, vibration and language preferences are stored only on your device.",
          "We do not collect your location, contacts, photos, voice recordings or advertising ID. This version has no ads and no third-party analytics.",
        ],
      },
      {
        heading: "3. How we use the data",
        body: [
          "• To provide the service: saving your progress, lessons, challenges, friends and matches.",
          "• To keep the game fair: XP, coins, streaks, scores and winners are calculated on our server, never on your device.",
          "• To show your public profile to other people: username, name, country (if you add it), level, streak and game statistics.",
          "• For security, abuse prevention and fixing errors.",
          "We do this to perform our contract with you (the Terms of Use) and, for security, on the basis of legitimate interest. We do not sell your data or use it for advertising.",
        ],
      },
      {
        heading: "4. Who processes data for us",
        body: [
          "We use service providers that process data only on our instructions:",
          "• Clerk — accounts and sign-in (United States).",
          "• Neon — database (European Union).",
          "• Railway — app server (European Union).",
          "When data is transferred outside the European Economic Area, it is done with the safeguards required by law, such as the European Commission's standard contractual clauses.",
        ],
      },
      {
        heading: "5. How long we keep data",
        body: [
          "We keep your data for as long as your account exists.",
          "When you delete your account, we delete it from the account service and immediately remove your name, email, country, languages and roles. Only an anonymous activity record remains, not linked to you, to keep leaderboards and statistics correct.",
          "Technical server logs are kept only as long as needed for security and diagnostics.",
        ],
      },
      {
        heading: "6. Your rights",
        body: [
          "You can request access to, correction, portability or deletion of your data, and object to certain processing.",
          "To delete everything, use Settings → Delete account, in the app or on the web. For other requests, write to {{email}}.",
          "You can also complain to the data protection authority in your country.",
        ],
      },
      {
        heading: "7. Minimum age",
        body: [
          "{{app}} is intended for people aged {{age}} or over. If we learn that an account belongs to someone younger, we delete it.",
        ],
      },
      {
        heading: "8. Security",
        body: [
          "Connections are encrypted (HTTPS and WSS), access to data is restricted and passwords are handled by the account service — we never see them.",
        ],
      },
      {
        heading: "9. Changes",
        body: [
          "If this policy changes in an important way, we will let you know in the app before the change applies.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    updated: "Last updated: {{date}}",
    intro:
      "By creating an account or using {{app}}, you accept these terms. They are short on purpose.",
    sections: [
      {
        heading: "1. Your account",
        body: [
          "You must be {{age}} or over. Use truthful details and a respectful username. You are responsible for what happens on your account.",
        ],
      },
      {
        heading: "2. Language content",
        body: [
          "Content is prepared and reviewed by speakers and linguists. Kriolu is in Beta and may still contain mistakes; the languages of São Tomé and Príncipe are coming later.",
          "{{app}} helps you learn, but it does not replace formal teaching or professional translation.",
        ],
      },
      {
        heading: "3. Fair play",
        body: [
          "Cheating is not allowed: automating answers, exploiting bugs, using several accounts to gain an advantage or fixing results.",
          "Official results are the server's. We may cancel results, rewards or leaderboard positions obtained improperly.",
        ],
      },
      {
        heading: "4. Respect for others",
        body: [
          "Do not use offensive names or harass other people. You can block anyone. We may suspend accounts that break these rules.",
        ],
      },
      {
        heading: "5. Coins and virtual items",
        body: [
          "Coins and shop items can only be used in the app: they have no cash value, cannot be exchanged for money and cannot be transferred to other accounts. We may adjust prices and items.",
          "If real-money purchases (Premium) are added in the future, they will have their own conditions, shown before you pay.",
        ],
      },
      {
        heading: "6. Ownership",
        body: [
          "The app, Neto and the content belong to {{app}} or their authors and may only be used for personal, non-commercial learning.",
        ],
      },
      {
        heading: "7. Availability and liability",
        body: [
          "We do our best to keep the service working well, but it is provided as is and may change, be interrupted or end.",
          "To the extent permitted by law, we are not liable for indirect losses arising from use of the app. Nothing in these terms limits the rights your country's law gives you as a consumer.",
        ],
      },
      {
        heading: "8. Ending",
        body: [
          "You can delete your account at any time in Settings → Delete account. What happens to your data is explained in the Privacy Policy.",
        ],
      },
      {
        heading: "9. Changes and contact",
        body: [
          "If these terms change in an important way, we will let you know in the app first. Questions: {{email}}.",
        ],
      },
    ],
  },
};

export const LEGAL_DOCS: Record<AvailableLocale, Record<LegalKind, LegalDoc>> = { pt, en };

export interface LegalVars {
  app: string;
  controller: string;
  age: number;
  /** null enquanto não houver email público: mostra um aviso em vez de um contacto falso. */
  email: string | null;
  /** AAAA-MM-DD */
  date: string;
}

const NO_EMAIL: Record<AvailableLocale, string> = {
  pt: "[email de suporte a definir]",
  en: "[support email to be confirmed]",
};

/** Devolve o documento com os marcadores preenchidos. */
export function fillLegal(locale: AvailableLocale, kind: LegalKind, vars: LegalVars): LegalDoc {
  const values: Record<string, string> = {
    app: vars.app,
    controller: vars.controller,
    age: String(vars.age),
    email: vars.email ?? NO_EMAIL[locale],
    date: new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${vars.date}T00:00:00Z`)),
  };
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k: string) => values[k] ?? m);
  const doc = LEGAL_DOCS[locale][kind];
  return {
    title: fill(doc.title),
    updated: fill(doc.updated),
    intro: fill(doc.intro),
    sections: doc.sections.map((s) => ({ heading: fill(s.heading), body: s.body.map(fill) })),
  };
}
