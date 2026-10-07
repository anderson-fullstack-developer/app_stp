/**
 * Admin mock data. ALL linguistic content is placeholder — never real Forro.
 * Deterministic (no random/time at module scope) so it is safe on the edge runtime.
 */
import { APP_CONFIG, MULTIPLAYER_CONFIG } from "@stp/config";
import type {
  AdminAchievement,
  AdminCourse,
  AdminLanguage,
  AdminLesson,
  AdminMatch,
  AdminReport,
  AdminUnit,
  AdminUser,
  AdPlacement,
  AudioFile,
  AuditEntry,
  ContentStatus,
  DailyChallenge,
  Difficulty,
  ExerciseItem,
  ExerciseType,
  PhraseItem,
  PremiumProduct,
  RewardRules,
  VocabItem,
} from "@/admin/types";
import { languageMeta, languages as baseLanguages } from "./languages";
import { keaWiktionaryDrafts } from "./kea-wiktionary";
import { LETTERS, ph } from "./questions";
import { currentUser, people } from "./users";

const STATUSES: ContentStatus[] = [
  "APPROVED",
  "APPROVED",
  "UNDER_REVIEW",
  "DRAFT",
  "APPROVED",
  "REJECTED",
  "UNDER_REVIEW",
  "ARCHIVED",
];
const DIFF: Difficulty[] = ["Fácil", "Média", "Difícil"];
const CATS = ["Saudações", "Família", "Comida", "Números", "Natureza", "Viagem"];
const AUTHORS = ["Ana Editora", "Rui Linguista", "Telma Editora"];
const day = (n: number) => `2026-09-${String(30 - (n % 28)).padStart(2, "0")}T1${n % 10}:00:00Z`;

export function createSeed() {
  const languages: AdminLanguage[] = [
    ...baseLanguages.map((l) => ({
      id: l.id,
      name: l.name,
      ...languageMeta[l.id]!,
      image: "",
      status: (l.available ? "ATIVO" : "EM PREPARAÇÃO") as AdminLanguage["status"],
    })),
  ];
  const courses: AdminCourse[] = [
    { id: "c1", languageId: "forro", title: "Curso Iniciante", order: 1 },
    { id: "c2", languageId: "forro", title: "Curso Intermédio", order: 2 },
  ];
  const units: AdminUnit[] = [
    { id: "un1", courseId: "c1", title: "Unidade 1 — Saudações", order: 1 },
    { id: "un2", courseId: "c1", title: "Unidade 2 — Família", order: 2 },
    { id: "un3", courseId: "c2", title: "Unidade 1 — Mercado", order: 1 },
  ];
  const lessons: AdminLesson[] = [];
  units.forEach((u, ui) => {
    for (let i = 1; i <= 3; i++) {
      lessons.push({
        id: `ls${ui + 1}${i}`,
        unitId: u.id,
        title: `Lição ${i}`,
        description: "Descrição da lição (placeholder).",
        difficulty: DIFF[(ui + i) % 3]!,
        order: i,
        xp: APP_CONFIG.rewards.lessonXp,
        minutes: 5,
        status: STATUSES[(ui * 3 + i) % 5]!,
      });
    }
  });

  const audios: AudioFile[] = Array.from({ length: 10 }, (_, i) => ({
    id: `au${i + 1}`,
    file: `audio_${String(i + 1).padStart(3, "0")}.mp3`,
    linkedTo: ph.word(i + 1),
    speaker: `Falante ${(i % 3) + 1}`,
    variant: i % 4 === 0 ? "Região placeholder" : "Padrão",
    seconds: 1 + (i % 4),
    status: STATUSES[i % STATUSES.length]!,
    date: day(i),
  }));

  const vocabulary: VocabItem[] = Array.from({ length: 24 }, (_, i) => {
    const status = STATUSES[i % STATUSES.length]!;
    return {
      id: `w${i + 1}`,
      kind: "word",
      languageId: "forro",
      word: ph.word(i + 1),
      translation: ph.translation(i + 1),
      category: CATS[i % CATS.length]!,
      difficulty: DIFF[i % 3]!,
      variant: i % 5 === 0 ? "Região placeholder" : "Padrão",
      notes: "",
      source: "Fonte placeholder",
      audioId: i < 10 ? `au${i + 1}` : null,
      speaker: i < 10 ? `Falante ${(i % 3) + 1}` : "",
      status,
      author: AUTHORS[i % 3]!,
      reviewer: status === "APPROVED" || status === "REJECTED" ? "Rui Linguista" : null,
      updatedAt: day(i),
      history: [],
    };
  });

  const phrases: PhraseItem[] = Array.from({ length: 12 }, (_, i) => {
    const status = STATUSES[(i + 2) % STATUSES.length]!;
    return {
      id: `p${i + 1}`,
      kind: "phrase",
      languageId: "forro",
      original: ph.phrase(i + 1),
      translation: `Tradução da frase ${i + 1}`,
      context: "Contexto placeholder",
      explanation: "Explicação placeholder",
      level: `Nível ${(i % 3) + 1}`,
      category: CATS[i % CATS.length]!,
      difficulty: DIFF[i % 3]!,
      variant: "Padrão",
      notes: "",
      source: "Fonte placeholder",
      audioId: null,
      status,
      author: AUTHORS[(i + 1) % 3]!,
      reviewer: status === "APPROVED" ? "Rui Linguista" : null,
      updatedAt: day(i + 3),
      history: [],
    };
  });

  const TYPES: ExerciseType[] = [
    "MULTIPLE_CHOICE",
    "LISTEN_AND_CHOOSE",
    "LISTEN_AND_TYPE",
    "TRANSLATE",
    "MATCH_WORDS",
    "ORDER_WORDS",
    "IMAGE_SELECT",
    "PRONUNCIATION",
    "TRUE_FALSE",
  ];
  const exercises: ExerciseItem[] = Array.from({ length: 18 }, (_, i) => {
    const status = STATUSES[(i + 1) % STATUSES.length]!;
    return {
      id: `e${i + 1}`,
      kind: "exercise",
      languageId: "forro",
      type: i < 9 ? TYPES[i]! : "MULTIPLE_CHOICE",
      question: ph.meaningPrompt(i + 1),
      options: LETTERS.map(ph.option),
      correctIndex: i % 4,
      lessonId: lessons[i % lessons.length]!.id,
      usage: i % 2 ? ["learning", "survival", "duel"] : ["learning", "daily"],
      category: CATS[i % CATS.length]!,
      difficulty: DIFF[i % 3]!,
      variant: "Padrão",
      notes: "",
      source: "Fonte placeholder",
      audioId: null,
      status,
      author: AUTHORS[i % 3]!,
      reviewer: status === "APPROVED" ? "Rui Linguista" : null,
      updatedAt: day(i + 5),
      history: [],
    };
  });

  /** Same demo people as the app — usernames come from ./users. */
  const NAMES = [currentUser.username, ...people.map((p) => p.username)];
  const users: AdminUser[] = NAMES.map((u, i) => ({
    id: `usr${i + 1}`,
    username: u,
    email: `${u.replace(/[._]/g, "")}@exemplo.st`,
    level: 1 + ((i * 3) % 12),
    xp: 400 + ((i * 731) % 9000),
    coins: 50 + ((i * 47) % 600),
    streak: (i * 5) % 40,
    premium: i % 4 === 0,
    status: i === 7 ? "SUSPENSO" : i === 12 ? "BLOQUEADO" : "ATIVO",
    createdAt: `2026-0${1 + (i % 8)}-1${i % 10}`,
    lastActive: day(i),
    friends: (i * 3) % 25,
    matches: (i * 7) % 90,
    achievements: (i * 2) % 18,
    reports: i === 7 || i === 12 ? 3 : i % 6 === 0 ? 1 : 0,
    progress: 10 + ((i * 13) % 85),
  }));

  const MODES = ["Sobrevivência", "1v1", "2v2", "Sala Privada"] as const;
  const matches: AdminMatch[] = Array.from({ length: 14 }, (_, i) => {
    const mode = MODES[i % 4]!;
    const n = mode === "1v1" ? 2 : mode === "2v2" ? 4 : mode === "Sala Privada" ? 4 : 8;
    const players = Array.from({ length: n }, (_, k) => {
      const place = k + 1;
      const r =
        MULTIPLAYER_CONFIG.survivalRewards.find((x) => x.place === place) ??
        MULTIPLAYER_CONFIG.participationReward;
      return {
        username: NAMES[(i + k) % NAMES.length]!,
        place,
        lives: k === 0 ? 1 + (i % 3) : 0,
        correct: 12 - k,
        wrong: 1 + k,
        avgMs: 2400 + k * 310,
        xp: r.xp,
        coins: r.coins,
      };
    });
    return {
      id: `GM-${String(1040 + i)}`,
      mode,
      state: i === 0 ? "A DECORRER" : i % 6 === 5 ? "ABANDONADA" : "TERMINADA",
      date: day(i),
      winner: players[0]!.username,
      players,
    };
  });

  const REPORT_TYPES = [
    "Utilizador",
    "Username",
    "Abuso",
    "Pergunta incorreta",
    "Tradução incorreta",
    "Áudio incorreto",
    "Bug",
    "Outro",
  ] as const;
  const reports: AdminReport[] = REPORT_TYPES.map((t, i) => ({
    id: `r${i + 1}`,
    type: t,
    target: i < 3 ? `@${NAMES[(i + 7) % NAMES.length]}` : i < 6 ? `Conteúdo e${i + 1}` : "App",
    reporter: `@${NAMES[i]}`,
    description: "Descrição da denúncia (exemplo).",
    status: (
      ["OPEN", "IN_REVIEW", "OPEN", "RESOLVED", "OPEN", "DISMISSED", "IN_REVIEW", "OPEN"] as const
    )[i]!,
    date: day(i),
  }));

  const audit: AuditEntry[] = [
    {
      id: "a1",
      admin: "Rui Linguista",
      role: "LINGUIST",
      action: "Aprovou conteúdo",
      object: "Palavra w1",
      at: day(1),
    },
    {
      id: "a2",
      admin: "Rui Linguista",
      role: "LINGUIST",
      action: "Rejeitou tradução",
      object: "Palavra w6",
      at: day(2),
    },
    {
      id: "a3",
      admin: "Marta Moderadora",
      role: "MODERATOR",
      action: "Bloqueou utilizador",
      object: "@nuno",
      at: day(3),
    },
    {
      id: "a4",
      admin: "Anderson Admin",
      role: "ADMIN",
      action: "Alterou recompensa",
      object: "XP por lição",
      at: day(4),
    },
  ];

  const rewards: RewardRules = {
    lessonXp: APP_CONFIG.rewards.lessonXp,
    answerXp: APP_CONFIG.rewards.correctAnswerXp,
    dailyXp: APP_CONFIG.rewards.dailyXp,
    multiplayerXp: MULTIPLAYER_CONFIG.matchRewards.win.xp,
    lessonCoins: APP_CONFIG.rewards.lessonCoins,
    dailyCoins: APP_CONFIG.rewards.dailyCoins,
    placeRewards: MULTIPLAYER_CONFIG.survivalRewards.map((r) => ({ ...r })),
    startingLives: MULTIPLAYER_CONFIG.publicSurvival.lives,
    questionSeconds: MULTIPLAYER_CONFIG.publicSurvival.seconds,
    maxPlayers: MULTIPLAYER_CONFIG.publicSurvival.players,
  };

  const daily: DailyChallenge[] = [
    {
      id: "d1",
      date: "2026-10-06",
      exerciseIds: ["e2", "e4", "e6"],
      xp: APP_CONFIG.rewards.dailyXp,
      coins: APP_CONFIG.rewards.dailyCoins,
      status: "ATIVO",
    },
    {
      id: "d2",
      date: "2026-10-07",
      exerciseIds: ["e8", "e10"],
      xp: APP_CONFIG.rewards.dailyXp,
      coins: APP_CONFIG.rewards.dailyCoins,
      status: "AGENDADO",
    },
    {
      id: "d3",
      date: "2026-10-05",
      exerciseIds: ["e1", "e3", "e5"],
      xp: APP_CONFIG.rewards.dailyXp,
      coins: APP_CONFIG.rewards.dailyCoins,
      status: "TERMINADO",
    },
  ];

  const achievements: AdminAchievement[] = [
    {
      id: "ac1",
      name: "Primeiros passos",
      description: "Completa 1 lição",
      icon: "🌱",
      type: "Lições",
      condition: 1,
      rewardXp: 20,
      rewardCoins: 5,
      status: "ATIVO",
    },
    {
      id: "ac2",
      name: "Fogo constante",
      description: "Sequência de 7 dias",
      icon: "🔥",
      type: "Streak",
      condition: 7,
      rewardXp: 50,
      rewardCoins: 10,
      status: "ATIVO",
    },
    {
      id: "ac3",
      name: "Sobrevivente",
      description: "Vence 1 partida de Sobrevivência",
      icon: "💀",
      type: "Vitórias",
      condition: 1,
      rewardXp: 80,
      rewardCoins: 15,
      status: "ATIVO",
    },
    {
      id: "ac4",
      name: "Pódio",
      description: "Fica no Top 3 cinco vezes",
      icon: "🥉",
      type: "Top 3",
      condition: 5,
      rewardXp: 60,
      rewardCoins: 10,
      status: "INATIVO",
    },
  ];

  const premium: PremiumProduct[] = [
    {
      id: "premium_monthly",
      name: "Premium Monthly",
      displayPrice: `€${APP_CONFIG.pricing.monthly}/mês`,
      benefits: ["Sem anúncios", "Vidas ilimitadas nas lições", "Estatísticas avançadas"],
      status: "ATIVO",
    },
    {
      id: "premium_yearly",
      name: "Premium Yearly",
      displayPrice: `€${APP_CONFIG.pricing.yearly}/ano`,
      benefits: ["Sem anúncios", "Vidas ilimitadas nas lições", "Estatísticas avançadas"],
      status: "ATIVO",
    },
  ];

  const ads: AdPlacement[] = [
    {
      id: "after_activities",
      label: "Depois de algumas atividades",
      enabled: true,
      frequency: APP_CONFIG.adEveryNLessons,
    },
    { id: "result", label: "Ecrã de resultado", enabled: true, frequency: 1 },
    { id: "play_menu", label: "Menu Jogar", enabled: true, frequency: 1 },
    { id: "rewarded", label: "Anúncio recompensado", enabled: true, frequency: 1 },
  ];

  return {
    languages,
    courses,
    units,
    lessons,
    audios,
    // Rascunhos importados do Wiktionary (Kabuverdianu) — DRAFT, à espera de revisão.
    vocabulary: [...vocabulary, ...keaWiktionaryDrafts("2026-10-07T00:00:00.000Z")],
    phrases,
    exercises,
    users,
    matches,
    reports,
    audit,
    rewards,
    daily,
    achievements,
    premium,
    ads,
  };
}

export type AdminDB = ReturnType<typeof createSeed>;
