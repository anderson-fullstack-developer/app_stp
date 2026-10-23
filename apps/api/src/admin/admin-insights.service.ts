import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { ACHIEVEMENTS } from "../progress/rules/achievements.js";
import { levelForXp } from "../progress/rules/levels.js";

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Série diária completa (dias sem dados = 0) dos últimos `days` dias, até hoje (UTC). */
function series(rows: { d: Date | string; n: number | bigint }[], days: number) {
  const byDay = new Map(rows.map((r) => [isoDay(new Date(r.d)), Number(r.n)]));
  const out: { date: string; value: number }[] = [];
  const today = Date.parse(`${isoDay(new Date())}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDay(new Date(today - i * DAY));
    out.push({ date, value: byDay.get(date) ?? 0 });
  }
  return out;
}

/** Segunda-feira desta semana (UTC). */
function mondayUtc(now = new Date()) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
    ),
  );
}

/**
 * Leitura dos dados reais para o painel (línguas, partidas, desafios, rankings,
 * conquistas, analytics, auditoria, pesquisa e regras). Só lê; as contas pesadas são
 * feitas na base de dados (agregações), não em memória.
 */
@Injectable()
export class AdminInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async languages() {
    const langs = await this.prisma.language.findMany({
      orderBy: [{ country: { order: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        altName: true,
        isoCode: true,
        region: true,
        orthography: true,
        status: true,
        country: { select: { name: true } },
        _count: {
          select: {
            vocabulary: true,
            phrases: true,
            courses: true,
            exercises: true,
            learners: true,
            dailyChallenges: true,
            arenaMatches: true,
          },
        },
      },
    });
    const [approved, withAudio, lessons] = await Promise.all([
      this.prisma.vocabulary.groupBy({
        by: ["languageId"],
        where: { status: "APPROVED" },
        _count: true,
      }),
      this.prisma.vocabulary.groupBy({
        by: ["languageId"],
        where: { audioId: { not: null } },
        _count: true,
      }),
      this.prisma.$queryRaw<{ languageId: string; n: number }[]>`
        SELECT c."languageId", count(l.id)::int AS n
        FROM lessons l JOIN units u ON u.id = l."unitId" JOIN courses c ON c.id = u."courseId"
        GROUP BY c."languageId"`,
    ]);
    const find = (list: { languageId: string; _count: number }[], id: string) =>
      list.find((r) => r.languageId === id)?._count ?? 0;
    return langs.map((l) => ({
      id: l.id,
      name: l.name,
      altName: l.altName,
      isoCode: l.isoCode,
      region: l.region,
      orthography: l.orthography,
      status: l.status,
      country: l.country.name,
      words: l._count.vocabulary,
      wordsApproved: find(approved, l.id),
      wordsWithAudio: find(withAudio, l.id),
      phrases: l._count.phrases,
      courses: l._count.courses,
      lessons: lessons.find((r) => r.languageId === l.id)?.n ?? 0,
      exercises: l._count.exercises,
      learners: l._count.learners,
      dailyChallenges: l._count.dailyChallenges,
      matches: l._count.arenaMatches,
    }));
  }

  async matches() {
    const since = new Date(Date.now() - 30 * DAY);
    const today = new Date(`${isoDay(new Date())}T00:00:00Z`);
    const [rows, byStatus, byMode, todayCount, avg, perDay] = await Promise.all([
      this.prisma.arenaMatch.findMany({
        orderBy: { startedAt: "desc" },
        take: 200,
        include: {
          players: {
            orderBy: [{ place: "asc" }],
            include: { user: { select: { username: true, name: true } } },
          },
        },
      }),
      this.prisma.arenaMatch.groupBy({ by: ["status"], _count: true }),
      this.prisma.arenaMatch.groupBy({ by: ["mode"], _count: true }),
      this.prisma.arenaMatch.count({ where: { startedAt: { gte: today } } }),
      this.prisma.$queryRaw<{ s: number | null }[]>`
        SELECT avg(extract(epoch FROM ("finishedAt" - "startedAt")))::float AS s
        FROM arena_matches WHERE status = 'FINISHED'`,
      this.prisma.$queryRaw<{ d: Date; n: number }[]>`
        SELECT date_trunc('day', "startedAt")::date AS d, count(*)::int AS n
        FROM arena_matches WHERE "startedAt" >= ${since} GROUP BY 1`,
    ]);
    const status = (s: string) => byStatus.find((r) => r.status === s)?._count ?? 0;
    const finished = status("FINISHED");
    const cancelled = status("CANCELLED");
    const totalPlayers = await this.prisma.arenaMatchPlayer.count();
    const leftPlayers = await this.prisma.arenaMatchPlayer.count({ where: { left: true } });
    return {
      kpis: {
        total: byStatus.reduce((s, r) => s + r._count, 0),
        today: todayCount,
        live: status("IN_PROGRESS"),
        finished,
        avgSeconds: Math.round(avg[0]?.s ?? 0),
        completionRate: finished + cancelled ? finished / (finished + cancelled) : null,
        abandonRate: totalPlayers ? leftPlayers / totalPlayers : null,
      },
      byMode: byMode.map((r) => ({ mode: r.mode, count: r._count })),
      perDay: series(perDay, 30),
      matches: rows.map((m) => {
        const winner = m.players.find((p) => p.place === 1);
        return {
          id: m.id,
          mode: m.mode,
          status: m.status,
          languageId: m.languageId,
          roomCode: m.roomCode,
          rounds: m.rounds,
          rewarded: m.rewarded,
          startedAt: m.startedAt.toISOString(),
          finishedAt: m.finishedAt?.toISOString() ?? null,
          winner: winner ? winner.user.username : null,
          players: m.players.map((p) => ({
            username: p.user.username,
            name: p.user.name,
            place: p.place,
            correct: p.correct,
            wrong: p.wrong,
            timeouts: p.timeouts,
            left: p.left,
            xp: p.xp,
            coins: p.coins,
          })),
        };
      }),
    };
  }

  async daily() {
    const rows = await this.prisma.dailyChallenge.findMany({
      orderBy: { date: "desc" },
      take: 60,
      include: {
        language: { select: { name: true } },
        attempts: {
          where: { status: "COMPLETED" },
          orderBy: [{ correct: "desc" }, { durationMs: "asc" }],
          select: {
            correct: true,
            total: true,
            durationMs: true,
            user: { select: { username: true } },
          },
        },
        _count: { select: { attempts: true } },
      },
    });
    return rows.map((c) => {
      const done = c.attempts;
      const avg = done.length
        ? done.reduce((s, a) => s + a.correct / a.total, 0) / done.length
        : null;
      return {
        id: c.id,
        date: isoDay(c.date),
        languageId: c.languageId,
        languageName: c.language.name,
        questions: c.exerciseIds.length,
        started: c._count.attempts,
        completed: done.length,
        avgAccuracy: avg,
        perfect: done.filter((a) => a.correct === a.total).length,
        top: done.slice(0, 3).map((a) => ({
          username: a.user.username,
          correct: a.correct,
          total: a.total,
          seconds: a.durationMs ? Math.round(a.durationMs / 1000) : null,
        })),
      };
    });
  }

  /** Top 100: XP desta semana (livro-razão) e XP total, com nível, sequência e partidas. */
  async rankings() {
    const monday = mondayUtc();
    const [week, all] = await Promise.all([
      this.prisma.xpEvent.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monday } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 100,
      }),
      this.prisma.userStats.findMany({
        where: { xpTotal: { gt: 0 }, user: { deletedAt: null } },
        orderBy: { xpTotal: "desc" },
        take: 100,
        select: { userId: true, xpTotal: true, currentStreak: true, longestStreak: true },
      }),
    ]);
    const ids = [...new Set([...week.map((w) => w.userId), ...all.map((a) => a.userId)])];
    const [users, stats, matches] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, name: true, countryCode: true },
      }),
      this.prisma.userStats.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, xpTotal: true, currentStreak: true },
      }),
      this.prisma.arenaMatchPlayer.groupBy({
        by: ["userId"],
        where: { userId: { in: ids } },
        _count: true,
      }),
    ]);
    const row = (userId: string, weekXp: number) => {
      const u = users.find((x) => x.id === userId);
      const s = stats.find((x) => x.userId === userId);
      return {
        userId,
        username: u?.username ?? "?",
        name: u?.name ?? "?",
        countryCode: u?.countryCode ?? null,
        weekXp,
        xpTotal: s?.xpTotal ?? 0,
        level: levelForXp(s?.xpTotal ?? 0).level,
        streak: s?.currentStreak ?? 0,
        matches: matches.find((m) => m.userId === userId)?._count ?? 0,
      };
    };
    return {
      weekStart: isoDay(monday),
      week: week.map((w) => row(w.userId, w._sum.amount ?? 0)),
      allTime: all.map((a) =>
        row(a.userId, week.find((w) => w.userId === a.userId)?._sum.amount ?? 0),
      ),
    };
  }

  async achievements() {
    const [earned, last, rules, users] = await Promise.all([
      this.prisma.userAchievement.groupBy({ by: ["achievementKey"], _count: true }),
      this.prisma.userAchievement.groupBy({ by: ["achievementKey"], _max: { earnedAt: true } }),
      this.prisma.rewardRule.findMany({
        where: { key: { in: ACHIEVEMENTS.map((a) => a.key) } },
        select: { key: true, xp: true, coins: true, active: true },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      users,
      achievements: ACHIEVEMENTS.map((a) => {
        const r = rules.find((x) => x.key === a.key);
        return {
          key: a.key,
          icon: a.icon,
          metric: a.metric,
          target: a.target,
          rewardXp: r?.xp ?? 0,
          rewardCoins: r?.coins ?? 0,
          active: r?.active ?? true,
          earned: earned.find((e) => e.achievementKey === a.key)?._count ?? 0,
          lastEarnedAt:
            last.find((e) => e.achievementKey === a.key)?._max.earnedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async analytics() {
    const since30 = new Date(Date.now() - 30 * DAY);
    const d7 = new Date(Date.now() - 7 * DAY);
    const today = new Date(`${isoDay(new Date())}T00:00:00Z`);
    const [
      dau,
      signups,
      lessons,
      xp,
      [active],
      [streak],
      totalUsers,
      completedLessons,
      byMode,
      retention,
      hardest,
      popular,
    ] = await Promise.all([
      this.prisma.$queryRaw<{ d: Date; n: number }[]>`
        SELECT "localDate" AS d, count(DISTINCT "userId")::int AS n
        FROM activity_days WHERE "localDate" >= ${since30}::date AND kind = 'ACTIVE' GROUP BY 1`,
      this.prisma.$queryRaw<{ d: Date; n: number }[]>`
        SELECT date_trunc('day', "createdAt")::date AS d, count(*)::int AS n
        FROM users WHERE "createdAt" >= ${since30} AND "deletedAt" IS NULL GROUP BY 1`,
      this.prisma.$queryRaw<{ d: Date; n: number }[]>`
        SELECT date_trunc('day', "completedAt")::date AS d, count(*)::int AS n
        FROM lesson_attempts WHERE status = 'COMPLETED' AND "completedAt" >= ${since30} GROUP BY 1`,
      this.prisma.$queryRaw<{ d: Date; n: number }[]>`
        SELECT "localDate" AS d, coalesce(sum(amount), 0)::int AS n
        FROM xp_events WHERE "localDate" >= ${since30}::date GROUP BY 1`,
      this.prisma.$queryRaw<{ dau: number; wau: number; mau: number }[]>`
        SELECT
          count(DISTINCT "userId") FILTER (WHERE "localDate" >= ${today}::date)::int AS dau,
          count(DISTINCT "userId") FILTER (WHERE "localDate" >= ${d7}::date)::int AS wau,
          count(DISTINCT "userId")::int AS mau
        FROM activity_days WHERE "localDate" >= ${since30}::date AND kind = 'ACTIVE'`,
      this.prisma.$queryRaw<{ avg: number | null; learners: number }[]>`
        SELECT avg("currentStreak")::float AS avg, count(*)::int AS learners
        FROM user_stats WHERE "lastActiveDate" IS NOT NULL`,
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.lessonAttempt.count({ where: { status: "COMPLETED" } }),
      this.prisma.arenaMatch.groupBy({ by: ["mode"], _count: true }),
      this.prisma.$queryRaw<{ n: number; total: number }[]>`
        SELECT n, count(*)::int AS cohort,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM activity_days a
            WHERE a."userId" = u.id AND a."localDate" >= (u."createdAt"::date + n)
          ))::int AS total
        FROM users u CROSS JOIN (VALUES (1), (7), (30)) AS t(n)
        WHERE u."deletedAt" IS NULL AND u."createdAt" <= now() - make_interval(days => n)
        GROUP BY n ORDER BY n`,
      this.prisma.$queryRaw<{ exerciseId: string; answers: number; wrong: number }[]>`
        SELECT "exerciseId", count(*)::int AS answers, count(*) FILTER (WHERE NOT correct)::int AS wrong
        FROM lesson_attempt_answers GROUP BY 1 HAVING count(*) >= 5
        ORDER BY count(*) FILTER (WHERE NOT correct)::float / count(*) DESC LIMIT 5`,
      this.prisma.lessonProgress.groupBy({
        by: ["lessonId"],
        _sum: { completions: true },
        orderBy: { _sum: { completions: "desc" } },
        take: 5,
      }),
    ]);
    const cohorts = retention as unknown as { n: number; cohort: number; total: number }[];
    const [exercises, lessonRows] = await Promise.all([
      this.prisma.exercise.findMany({
        where: { id: { in: hardest.map((h) => h.exerciseId) } },
        select: {
          id: true,
          vocabulary: {
            select: {
              word: true,
              translations: { where: { locale: "pt" }, select: { text: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.lesson.findMany({
        where: { id: { in: popular.map((p) => p.lessonId) } },
        select: { id: true, title: true, unit: { select: { title: true } } },
      }),
    ]);
    const learnersWithLessons = await this.prisma.lessonAttempt.groupBy({
      by: ["userId"],
      where: { status: "COMPLETED" },
    });
    return {
      kpis: {
        users: totalUsers,
        dau: active?.dau ?? 0,
        wau: active?.wau ?? 0,
        mau: active?.mau ?? 0,
        avgStreak: Math.round((streak?.avg ?? 0) * 10) / 10,
        lessonsCompleted: completedLessons,
        lessonsPerLearner: learnersWithLessons.length
          ? Math.round((completedLessons / learnersWithLessons.length) * 10) / 10
          : 0,
      },
      dau: series(dau, 30),
      signups: series(signups, 30),
      lessons: series(lessons, 30),
      xp: series(xp, 30),
      byMode: byMode.map((r) => ({ mode: r.mode, count: r._count })),
      retention: cohorts.map((c) => ({
        day: c.n,
        cohort: c.cohort,
        rate: c.cohort ? c.total / c.cohort : null,
      })),
      hardest: hardest.map((h) => {
        const e = exercises.find((x) => x.id === h.exerciseId);
        return {
          exerciseId: h.exerciseId,
          word: e?.vocabulary?.word ?? "?",
          gloss: e?.vocabulary?.translations[0]?.text ?? null,
          answers: h.answers,
          errorRate: h.wrong / h.answers,
        };
      }),
      popular: popular.map((p) => {
        const l = lessonRows.find((x) => x.id === p.lessonId);
        return {
          lessonId: p.lessonId,
          title: l ? `${l.unit.title} · ${l.title}` : "?",
          completions: p._sum.completions ?? 0,
        };
      }),
    };
  }

  async audit(limit = 300) {
    const rows = await this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: { name: true, username: true, roles: { select: { role: true } } },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata,
      actor: r.actor
        ? {
            name: r.actor.name,
            username: r.actor.username,
            roles: r.actor.roles.map((x) => x.role).filter((x) => x !== "USER"),
          }
        : null,
    }));
  }

  /** Regras de recompensa (XP e moedas) tal como estão na base de dados. */
  rewardRules() {
    return this.prisma.rewardRule.findMany({
      orderBy: { key: "asc" },
      select: {
        key: true,
        xp: true,
        coins: true,
        dailyLimit: true,
        active: true,
        description: true,
        updatedAt: true,
      },
    });
  }

  /** Pesquisa global no painel: pessoas, palavras, lições e partidas. */
  async search(q: string) {
    const contains = { contains: q, mode: "insensitive" as const };
    const [users, words, lessons, matches] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [{ username: contains }, { name: contains }, { email: contains }],
        },
        take: 8,
        select: { id: true, username: true, name: true },
      }),
      this.prisma.vocabulary.findMany({
        where: {
          OR: [{ word: contains }, { translations: { some: { text: contains } } }],
        },
        take: 8,
        select: {
          id: true,
          word: true,
          status: true,
          languageId: true,
          translations: { where: { locale: "pt" }, select: { text: true }, take: 1 },
        },
      }),
      this.prisma.lesson.findMany({
        where: { title: contains },
        take: 8,
        select: { id: true, title: true, unit: { select: { title: true } } },
      }),
      q.length >= 4
        ? this.prisma.arenaMatch.findMany({
            where: { OR: [{ roomCode: { equals: q.toUpperCase() } }] },
            take: 5,
            select: { id: true, mode: true, roomCode: true, startedAt: true },
          })
        : Promise.resolve([]),
    ]);
    return {
      users,
      words: words.map((w) => ({
        id: w.id,
        word: w.word,
        status: w.status,
        languageId: w.languageId,
        gloss: w.translations[0]?.text ?? null,
      })),
      lessons: lessons.map((l) => ({ id: l.id, title: l.title, unitTitle: l.unit.title })),
      matches: matches.map((m) => ({ ...m, startedAt: m.startedAt.toISOString() })),
    };
  }
}
