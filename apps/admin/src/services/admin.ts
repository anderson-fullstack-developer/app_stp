/**
 * Admin services (mock). Keep signatures when swapping bodies for NestJS REST calls.
 * Audio uploads will go to Cloudflare R2 via signed URLs from the API.
 */
import { getDB, mutate } from "@/admin/store";
import { adminAuth } from "@/admin/store";
/** Reactive reads + mock session, re-exported so screens never import the store directly. Future: TanStack Query hooks over the API. */
export { adminAuth, resetDB, useAdminDB, useAdminSession } from "@/admin/store";
import { applyReview, suggestQuizzes, type ReviewAction } from "@/admin/workflow";
import type {
  AdminAchievement, AdminLanguage, AdminLesson, AdPlacement, AudioFile, ContentItem, DailyChallenge, ExerciseItem,
  PhraseItem, PremiumProduct, ReportStatus, RewardRules, UserStatus, VocabItem,
} from "@/admin/types";

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const me = () => adminAuth.get()?.name ?? "Admin";
const uid = (p: string) => `${p}${Date.now().toString(36)}`;

export const adminLanguageService = {
  list: async () => getDB().languages,
  save: async (l: AdminLanguage) => { await wait(); mutate((d) => ({ languages: d.languages.some((x) => x.id === l.id) ? d.languages.map((x) => (x.id === l.id ? l : x)) : [...d.languages, l] }), { action: "Guardou língua", object: l.name }); },
};

export const adminCourseService = {
  tree: async () => { const d = getDB(); return { courses: d.courses, units: d.units, lessons: d.lessons }; },
  moveLesson: (id: string, dir: -1 | 1) => mutate((d) => {
    const l = d.lessons.find((x) => x.id === id)!;
    const sib = d.lessons.filter((x) => x.unitId === l.unitId).sort((a, b) => a.order - b.order);
    const i = sib.findIndex((x) => x.id === id); const j = i + dir;
    if (j < 0 || j >= sib.length) return {};
    const other = sib[j]!;
    return { lessons: d.lessons.map((x) => (x.id === l.id ? { ...x, order: other.order } : x.id === other.id ? { ...x, order: l.order } : x)) };
  }, { action: "Reordenou lição", object: id }),
  moveUnit: (id: string, dir: -1 | 1) => mutate((d) => {
    const u = d.units.find((x) => x.id === id)!;
    const sib = d.units.filter((x) => x.courseId === u.courseId).sort((a, b) => a.order - b.order);
    const j = sib.findIndex((x) => x.id === id) + dir;
    if (j < 0 || j >= sib.length) return {};
    const o = sib[j]!;
    return { units: d.units.map((x) => (x.id === u.id ? { ...x, order: o.order } : x.id === o.id ? { ...x, order: u.order } : x)) };
  }, { action: "Reordenou unidade", object: id }),
  addLesson: (unitId: string) => mutate((d) => {
    const n = d.lessons.filter((x) => x.unitId === unitId).length + 1;
    return { lessons: [...d.lessons, { id: uid("ls"), unitId, title: `Lição ${n}`, description: "", difficulty: "Fácil", order: n, xp: d.rewards.lessonXp, minutes: 5, status: "DRAFT" }] };
  }, { action: "Criou lição", object: unitId }),
};

export const adminLessonService = {
  get: async (id: string) => getDB().lessons.find((l) => l.id === id) ?? null,
  save: async (l: AdminLesson) => { await wait(); mutate((d) => ({ lessons: d.lessons.map((x) => (x.id === l.id ? l : x)) }), { action: "Editou lição", object: l.title }); },
};

function saveContent(item: ContentItem, action: string) {
  const key = item.kind === "word" ? "vocabulary" : item.kind === "phrase" ? "phrases" : "exercises";
  mutate((d) => {
    const list = d[key] as ContentItem[];
    const next = list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
    return { [key]: next } as Partial<typeof d>;
  }, { action, object: `${item.kind === "word" ? "Palavra" : item.kind === "phrase" ? "Frase" : "Exercício"} ${item.id}` });
}

export const adminVocabularyService = {
  list: async () => getDB().vocabulary,
  save: async (w: VocabItem) => { await wait(); saveContent({ ...w, updatedAt: now() }, "Guardou rascunho"); },
  duplicate: (w: VocabItem) => saveContent({ ...w, id: uid("w"), status: "DRAFT", reviewer: null, history: [], author: me(), updatedAt: now() }, "Duplicou conteúdo"),
  newId: () => uid("w"),
};
export const adminPhraseService = {
  list: async () => getDB().phrases,
  save: async (p: PhraseItem) => { await wait(); saveContent({ ...p, updatedAt: now() }, "Guardou rascunho"); },
  newId: () => uid("p"),
};

export const adminAudioService = {
  list: async () => getDB().audios,
  /** Mock upload. Future: request signed R2 URL from API, PUT file, then register metadata. */
  upload: async (file: { name: string }, linkedTo: string, speaker: string): Promise<AudioFile> => {
    await wait(600);
    const a: AudioFile = { id: uid("au"), file: file.name, linkedTo, speaker, variant: "Padrão", seconds: 2, status: "DRAFT", date: now() };
    mutate((d) => ({ audios: [a, ...d.audios] }), { action: "Carregou áudio", object: file.name });
    return a;
  },
};

export const adminExerciseService = {
  list: async () => getDB().exercises,
  save: async (e: ExerciseItem) => { await wait(); saveContent({ ...e, updatedAt: now() }, "Guardou exercício"); },
  newId: () => uid("e"),
  /** Mock AI: returns DRAFT suggestions only. Never publishes. */
  generateSuggestions: async () => { await wait(1200); const d = getDB(); return suggestQuizzes([...d.vocabulary, ...d.phrases], "IA (sugestão)"); },
};

export const adminReviewService = {
  all: () => { const d = getDB(); return [...d.vocabulary, ...d.phrases, ...d.exercises] as ContentItem[]; },
  act: async (item: ContentItem, action: ReviewAction, comment?: string) => {
    const s = adminAuth.get(); if (!s) throw new Error("Sem sessão");
    await wait();
    const next = applyReview(item, action, { name: s.name, role: s.role }, comment);
    const label = { SUBMIT: "Enviou para revisão", APPROVE: "Aprovou conteúdo", REQUEST_CHANGES: "Pediu alterações", REJECT: "Rejeitou conteúdo", ARCHIVE: "Arquivou conteúdo" }[action];
    saveContent(next, label);
    return next;
  },
};

export const adminUserService = {
  list: async () => getDB().users,
  setStatus: async (id: string, status: UserStatus) => { await wait(); mutate((d) => ({ users: d.users.map((u) => (u.id === id ? { ...u, status } : u)) }), { action: `Alterou estado para ${status}`, object: id }); },
};

export const adminGameService = {
  matches: async () => getDB().matches,
  live: async () => ({ online: 214, active: 18, today: 362, avgMinutes: 6.4, abandonRate: 7.2 }),
};

export const adminRewardService = {
  get: async () => getDB().rewards,
  save: async (r: RewardRules) => { await wait(); mutate(() => ({ rewards: r }), { action: "Alterou recompensas", object: "Regras e recompensas" }); },
  saveDaily: (c: DailyChallenge) => mutate((d) => ({ daily: d.daily.some((x) => x.id === c.id) ? d.daily.map((x) => (x.id === c.id ? c : x)) : [c, ...d.daily] }), { action: "Guardou desafio diário", object: c.date }),
  saveAchievement: (a: AdminAchievement) => mutate((d) => ({ achievements: d.achievements.some((x) => x.id === a.id) ? d.achievements.map((x) => (x.id === a.id ? a : x)) : [...d.achievements, a] }), { action: "Guardou achievement", object: a.name }),
  savePremium: (p: PremiumProduct) => mutate((d) => ({ premium: d.premium.map((x) => (x.id === p.id ? p : x)) }), { action: "Editou produto Premium", object: p.name }),
  saveAds: (ads: AdPlacement[]) => mutate(() => ({ ads }), { action: "Alterou publicidade", object: "Locais de anúncios" }),
};

export const adminReportService = {
  list: async () => getDB().reports,
  setStatus: async (id: string, status: ReportStatus) => { await wait(); mutate((d) => ({ reports: d.reports.map((r) => (r.id === id ? { ...r, status } : r)) }), { action: `Denúncia → ${status}`, object: id }); },
};

const series = (base: number, n: number, step: number) => Array.from({ length: n }, (_, i) => Math.round(base + Math.sin(i / 1.7) * step + i * step * 0.4));
export const adminAnalyticsService = {
  overview: async () => ({
    dau: series(820, 14, 90), wau: series(3900, 8, 260), mau: series(12500, 6, 700), lessons: series(2100, 14, 240), matches: series(310, 14, 45),
    retention: [100, 62, 48, 41, 36, 33, 31], premiumConversion: [2.1, 2.4, 2.3, 2.8, 3.0, 3.2],
    avgStreak: 6.3, lessonsPerUser: 4.1, matchCompletion: 92.8,
    byMode: [{ label: "Sobrevivência", value: 48 }, { label: "1v1", value: 27 }, { label: "2v2", value: 15 }, { label: "Sala Privada", value: 10 }],
  }),
};
