import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import type { AuthUser } from "../users/users.service.js";
import { taskMoney, taskRemaining, taskStats } from "./voice-progress.js";

type Kind = "RECORD" | "REVIEW";
type Status = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

/**
 * Painel das gravações: tarefas pagas, pessoas (qualidade, saldo, dados de pagamento),
 * pagamentos registados e relatório. Tudo o que mexe em dinheiro fica na auditoria.
 */
@Injectable()
export class VoiceAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(languageId: string) {
    const [pending, approved, rejected, words, withAudio, contributors, activeTasks] =
      await Promise.all([
        this.prisma.recording.count({ where: { languageId, status: "PENDING" } }),
        this.prisma.recording.count({ where: { languageId, status: "APPROVED" } }),
        this.prisma.recording.count({ where: { languageId, status: "REJECTED" } }),
        this.prisma.vocabulary.count({ where: { languageId, exercises: { some: {} } } }),
        this.prisma.vocabulary.count({
          where: { languageId, exercises: { some: {} }, audio: { status: "APPROVED" } },
        }),
        this.prisma.voiceContributor.count(),
        this.prisma.voiceTask.count({ where: { languageId, status: "ACTIVE" } }),
      ]);
    return {
      pending,
      approved,
      rejected,
      lessonWords: words,
      lessonWordsWithAudio: withAudio,
      contributors,
      activeTasks,
    };
  }

  /* ---------------------------------- tarefas ---------------------------------- */

  async tasks(filter: { status?: Status | undefined; assigneeId?: string | undefined }) {
    const tasks = await this.prisma.voiceTask.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        assignee: { select: { id: true, name: true, username: true } },
        language: { select: { name: true } },
        unit: { select: { title: true } },
      },
    });
    const stats = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
    );
    return tasks.map((t) => {
      const s = stats.get(t.id)!;
      return {
        id: t.id,
        kind: t.kind,
        title: t.title,
        notes: t.notes,
        assignee: t.assignee,
        languageId: t.languageId,
        languageName: t.language.name,
        unitId: t.unitId,
        unitTitle: t.unit?.title ?? null,
        target: t.target,
        rateCents: t.rateCents,
        currency: t.currency,
        dueAt: t.dueAt?.toISOString() ?? null,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString() ?? null,
        progress: { ...s, remaining: taskRemaining(t, s) },
        ...taskMoney(t, s),
      };
    });
  }

  async createTask(
    actor: AuthUser,
    input: {
      kind: Kind;
      assigneeId: string;
      languageId: string;
      title: string;
      notes: string | null;
      target: number;
      rateCents: number;
      unitId: string | null;
      dueAt: string | null;
    },
  ) {
    const role = input.kind === "RECORD" ? "VOICE_SPEAKER" : "VOICE_LISTENER";
    const assignee = await this.prisma.user.findUnique({
      where: { id: input.assigneeId },
      select: { id: true, roles: { select: { role: true, languageId: true } } },
    });
    if (!assignee) throw new NotFoundException("Pessoa não encontrada.");
    const hasRole = assignee.roles.some(
      (r) => r.role === role && (r.languageId === null || r.languageId === input.languageId),
    );
    if (!hasRole) {
      throw new BadRequestException({
        code: "MISSING_ROLE",
        message:
          input.kind === "RECORD"
            ? "Dá primeiro o papel «Falador (gravações)» nesta língua (em Utilizadores)."
            : "Dá primeiro o papel «Ouvinte (gravações)» nesta língua (em Utilizadores).",
      });
    }
    if (input.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: input.unitId },
        select: { course: { select: { languageId: true } } },
      });
      if (unit?.course.languageId !== input.languageId) {
        throw new BadRequestException({
          code: "BAD_UNIT",
          message: "Essa unidade não é desta língua.",
        });
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.voiceTask.create({
        data: {
          kind: input.kind,
          assigneeId: input.assigneeId,
          languageId: input.languageId,
          title: input.title,
          notes: input.notes,
          target: input.target,
          rateCents: input.rateCents,
          unitId: input.unitId,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          createdById: actor.id,
        },
        select: { id: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          action: "voice.task_create",
          entityType: "VOICE_TASK",
          entityId: task.id,
          metadata: {
            kind: input.kind,
            assigneeId: input.assigneeId,
            target: input.target,
            rateCents: input.rateCents,
          },
        },
      });
      return task;
    });
  }

  /**
   * Mudar estado, quantidade, prazo ou notas. O preço não muda depois de criada (o que já foi
   * feito foi aceite a esse preço): para outro preço, cria-se outra tarefa.
   */
  async updateTask(
    actor: AuthUser,
    id: string,
    patch: {
      status?: Status | undefined;
      target?: number | undefined;
      dueAt?: string | null | undefined;
      notes?: string | null | undefined;
      title?: string | undefined;
    },
  ) {
    const task = await this.prisma.voiceTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException("Tarefa não encontrada.");
    await this.prisma.$transaction([
      this.prisma.voiceTask.update({
        where: { id },
        data: {
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.status === "COMPLETED" ? { completedAt: new Date() } : {}),
          ...(patch.status === "ACTIVE" ? { completedAt: null } : {}),
          ...(patch.target !== undefined ? { target: patch.target } : {}),
          ...(patch.dueAt !== undefined
            ? { dueAt: patch.dueAt ? new Date(patch.dueAt) : null }
            : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
        },
      }),
      this.prisma.adminAuditLog.create({
        data: {
          actorId: actor.id,
          action: "voice.task_update",
          entityType: "VOICE_TASK",
          entityId: id,
          metadata: { from: { status: task.status, target: task.target }, patch },
        },
      }),
    ]);
    return { ok: true };
  }

  /* ---------------------------------- pessoas ---------------------------------- */

  /** Quem tem papel de Falador/Ouvinte: qualidade, ganhos, pago, saldo e como recebe. */
  async people() {
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { role: { in: ["VOICE_SPEAKER", "VOICE_LISTENER"] } } } },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roles: {
          where: { role: { in: ["VOICE_SPEAKER", "VOICE_LISTENER"] } },
          select: { role: true, languageId: true },
        },
        voiceProfile: true,
      },
      orderBy: { name: "asc" },
    });
    const ids = users.map((u) => u.id);
    const [tasks, paid] = await Promise.all([
      this.prisma.voiceTask.findMany({
        where: { assigneeId: { in: ids } },
        select: {
          id: true,
          assigneeId: true,
          kind: true,
          rateCents: true,
          target: true,
          status: true,
        },
      }),
      this.prisma.voicePayout.groupBy({
        by: ["userId"],
        where: { userId: { in: ids } },
        _sum: { amountCents: true },
      }),
    ]);
    const stats = await taskStats(
      this.prisma,
      tasks.map((t) => t.id),
    );
    return users.map((u) => {
      const mine = tasks.filter((t) => t.assigneeId === u.id);
      const sum = {
        approved: 0,
        rejected: 0,
        pending: 0,
        reviews: 0,
        controls: 0,
        controlsMatched: 0,
      };
      let earned = 0;
      let pendingCents = 0;
      for (const t of mine) {
        const s = stats.get(t.id)!;
        sum.approved += s.approved;
        sum.rejected += s.rejected;
        sum.pending += s.pending;
        sum.reviews += s.reviews;
        sum.controls += s.controls;
        sum.controlsMatched += s.controlsMatched;
        const m = taskMoney(t, s);
        earned += m.earnedCents;
        pendingCents += m.pendingCents;
      }
      const paidCents = paid.find((p) => p.userId === u.id)?._sum.amountCents ?? 0;
      const decided = sum.approved + sum.rejected;
      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        roles: u.roles,
        displayName: u.voiceProfile?.displayName ?? null,
        region: u.voiceProfile?.region ?? null,
        consented: Boolean(u.voiceProfile),
        paused: u.voiceProfile?.paused ?? false,
        payoutMethod: u.voiceProfile?.payoutMethod ?? null,
        payoutDetails: u.voiceProfile?.payoutDetails ?? null,
        activeTasks: mine.filter((t) => t.status === "ACTIVE").length,
        ...sum,
        /** Falador: aprovadas / decididas. */
        approvalRate: decided ? sum.approved / decided : null,
        /** Ouvinte: acerto nas perguntas de controlo. */
        controlAccuracy: sum.controls ? sum.controlsMatched / sum.controls : null,
        earnedCents: earned,
        pendingCents,
        paidCents,
        balanceCents: earned - paidCents,
      };
    });
  }

  async setPaused(actor: AuthUser, userId: string, paused: boolean) {
    const profile = await this.prisma.voiceContributor.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException("Esta pessoa ainda não aceitou as condições.");
    }
    await this.prisma.$transaction([
      this.prisma.voiceContributor.update({ where: { userId }, data: { paused } }),
      this.prisma.adminAuditLog.create({
        data: {
          actorId: actor.id,
          action: paused ? "voice.pause" : "voice.resume",
          entityType: "USER",
          entityId: userId,
        },
      }),
    ]);
    return { ok: true };
  }

  /* --------------------------------- pagamentos --------------------------------- */

  /** Registar um pagamento já feito por fora (SEPA, MB WAY…). */
  async createPayout(
    actor: AuthUser,
    input: {
      userId: string;
      amountCents: number;
      method: string;
      reference: string | null;
      note: string | null;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("Pessoa não encontrada.");
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.voicePayout.create({
        data: { ...input, createdById: actor.id },
        select: { id: true },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          action: "voice.payout",
          entityType: "USER",
          entityId: input.userId,
          metadata: { payoutId: payout.id, amountCents: input.amountCents, method: input.method },
        },
      });
      return payout;
    });
  }

  async payouts(userId: string | undefined) {
    const rows = await this.prisma.voicePayout.findMany({
      where: userId ? { userId } : {},
      orderBy: { paidAt: "desc" },
      take: 300,
      include: {
        user: { select: { name: true, username: true } },
        createdBy: { select: { name: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      username: p.user.username,
      amountCents: p.amountCents,
      currency: p.currency,
      method: p.method,
      reference: p.reference,
      note: p.note,
      paidAt: p.paidAt.toISOString(),
      createdBy: p.createdBy.name,
    }));
  }

  /* --------------------------------- relatório --------------------------------- */

  /**
   * Período [from, to): por pessoa, o trabalho feito e o valor ganho nesse período
   * (gravações pela data da aprovação; avaliações pela data do voto). Controlos não pagam.
   */
  async report(from: Date, to: Date) {
    const tasks = await this.prisma.voiceTask.findMany({
      select: {
        id: true,
        kind: true,
        rateCents: true,
        assignee: { select: { id: true, name: true, username: true, email: true } },
      },
    });
    const [stats, recorded] = await Promise.all([
      taskStats(
        this.prisma,
        tasks.map((t) => t.id),
        { from, to },
      ),
      this.prisma.recording.groupBy({
        by: ["speakerId"],
        where: { createdAt: { gte: from, lt: to } },
        _count: true,
      }),
    ]);
    const people = new Map<
      string,
      {
        userId: string;
        username: string;
        name: string;
        email: string;
        recorded: number;
        approved: number;
        reviews: number;
        controls: number;
        controlsMatched: number;
        earnedCents: number;
      }
    >();
    for (const t of tasks) {
      const s = stats.get(t.id)!;
      const p = people.get(t.assignee.id) ?? {
        userId: t.assignee.id,
        username: t.assignee.username,
        name: t.assignee.name,
        email: t.assignee.email,
        recorded: recorded.find((r) => r.speakerId === t.assignee.id)?._count ?? 0,
        approved: 0,
        reviews: 0,
        controls: 0,
        controlsMatched: 0,
        earnedCents: 0,
      };
      p.approved += s.approved;
      p.reviews += s.reviews;
      p.controls += s.controls;
      p.controlsMatched += s.controlsMatched;
      p.earnedCents += taskMoney(t, s).earnedCents;
      people.set(t.assignee.id, p);
    }
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      people: [...people.values()]
        .filter((p) => p.recorded + p.approved + p.reviews + p.controls > 0)
        .sort((a, b) => b.earnedCents - a.earnedCents),
    };
  }
}
