// Dados FICTÍCIOS apenas para visualizar a interface.
// Nenhum conteúdo em Forro é inventado aqui: as palavras são placeholders
// que serão substituídos por conteúdo APPROVED vindo da API.

export type LessonState = 'done' | 'current' | 'locked';

export interface MockLesson {
  id: string;
  title: string;
  state: LessonState;
  isTest?: boolean;
}

export interface MockUnit {
  id: string;
  order: number;
  title: string;
  color: string;
  lessons: MockLesson[];
}

export const me = {
  username: 'anderson',
  name: 'Anderson',
  country: 'São Tomé e Príncipe',
  level: 4,
  xp: 620,
  nextLevelXp: 900,
  levelStartXp: 500,
  coins: 85,
  streak: 7,
  longestStreak: 12,
  lessonsDone: 9,
  wordsLearned: 54,
  accuracy: 87,
  wins: 6,
  losses: 4,
  tournamentsWon: 0,
  joined: 'Outubro 2026',
  learning: 'Forro / Santomé',
};

export const units: MockUnit[] = [
  {
    id: 'u1',
    order: 1,
    title: 'Saudações',
    color: '#0E7C5A',
    lessons: [
      { id: 'l1', title: 'Cumprimentos', state: 'done' },
      { id: 'l2', title: 'Apresentações', state: 'done' },
      { id: 'l3', title: 'Como estás?', state: 'current' },
      { id: 'l4', title: 'Teste da unidade', state: 'locked', isTest: true },
    ],
  },
  {
    id: 'u2',
    order: 2,
    title: 'Família',
    color: '#1C8FB0',
    lessons: [
      { id: 'l5', title: 'Pais e filhos', state: 'locked' },
      { id: 'l6', title: 'Avós', state: 'locked' },
      { id: 'l7', title: 'Teste da unidade', state: 'locked', isTest: true },
    ],
  },
  {
    id: 'u3',
    order: 3,
    title: 'Números',
    color: '#7A4A2B',
    lessons: [
      { id: 'l8', title: '1 a 10', state: 'locked' },
      { id: 'l9', title: 'Teste da unidade', state: 'locked', isTest: true },
    ],
  },
  { id: 'u4', order: 4, title: 'Comida', color: '#EF4B3F', lessons: [{ id: 'l10', title: 'Mercado', state: 'locked' }] },
  { id: 'u5', order: 5, title: 'Casa', color: '#D99A0B', lessons: [{ id: 'l11', title: 'Divisões', state: 'locked' }] },
  { id: 'u6', order: 6, title: 'Conversação', color: '#095C43', lessons: [{ id: 'l12', title: 'Diálogos', state: 'locked' }] },
];

export interface MockOption {
  id: string;
  label: string;
}

export interface MockQuestion {
  id: string;
  prompt: string;
  term: string;
  options: MockOption[];
  correctOptionId: string;
}

// Exercícios MULTIPLE_CHOICE com placeholders.
export const lessonQuestions: MockQuestion[] = [1, 2, 3, 4, 5].map((n) => ({
  id: `q${n}`,
  prompt: 'O que significa',
  term: `«Palavra ${n}»`,
  options: ['A', 'B', 'C', 'D'].map((l) => ({ id: `q${n}-${l}`, label: `Tradução ${l}` })),
  correctOptionId: `q${n}-${['A', 'B', 'C', 'D'][(n * 3) % 4]}`,
}));

export interface MockFriend {
  id: string;
  name: string;
  level: number;
  weeklyXp: number;
  streak: number;
  online: boolean;
  color: string;
}

export const friends: MockFriend[] = [
  { id: 'f1', name: 'Maria', level: 7, weeklyXp: 940, streak: 21, online: true, color: '#EF4B3F' },
  { id: 'f2', name: 'João', level: 9, weeklyXp: 1210, streak: 45, online: true, color: '#1C8FB0' },
  { id: 'f3', name: 'Carlos', level: 5, weeklyXp: 410, streak: 3, online: false, color: '#7A4A2B' },
  { id: 'f4', name: 'Ana', level: 3, weeklyXp: 220, streak: 2, online: false, color: '#D99A0B' },
];

export const friendRequests = [{ id: 'r1', name: 'Beatriz', level: 2, color: '#095C43' }];

export const leaderboard = [
  { name: 'João', level: 12, xp: 3850, color: '#1C8FB0' },
  { name: 'Maria', level: 11, xp: 3430, color: '#EF4B3F' },
  { name: 'Carlos', level: 10, xp: 3100, color: '#7A4A2B' },
  { name: 'Anderson', level: 4, xp: 2940, color: '#0E7C5A', isMe: true },
  { name: 'Ana', level: 8, xp: 2610, color: '#D99A0B' },
  { name: 'Beatriz', level: 6, xp: 2050, color: '#095C43' },
  { name: 'Rui', level: 5, xp: 1720, color: '#6B7A72' },
];

export const achievements = [
  { icon: '🎓', title: 'Primeira lição', unlocked: true },
  { icon: '🔥', title: '7 dias seguidos', unlocked: true },
  { icon: '🌋', title: '30 dias seguidos', unlocked: false },
  { icon: '✅', title: '100 respostas corretas', unlocked: true },
  { icon: '🤝', title: 'Primeiro amigo', unlocked: true },
  { icon: '⚔️', title: 'Primeiro duelo', unlocked: true },
  { icon: '🏆', title: '10 vitórias', unlocked: false },
  { icon: '⭐', title: 'Level 10', unlocked: false },
];
