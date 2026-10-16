import type { PrismaService } from "../database/prisma.service.js";

export interface TaskStats {
  /** Gravar: enviadas por estado. */
  pending: number;
  approved: number;
  rejected: number;
  /** Ouvir: avaliações reais (pagas) e de controlo (não pagas). */
  reviews: number;
  controls: number;
  controlsMatched: number;
}

const empty = (): TaskStats => ({
  pending: 0,
  approved: 0,
  rejected: 0,
  reviews: 0,
  controls: 0,
  controlsMatched: 0,
});

export interface StatsWindow {
  /** Só conta o que aconteceu neste período (aprovação/rejeição pela data da decisão). */
  from?: Date;
  to?: Date;
}

/**
 * Números de cada tarefa (por taskId), numa só ida à base de dados por tabela. Com janela,
 * gravações decididas contam pela data da decisão e as pendentes pela data de envio.
 */
export async function taskStats(
  prisma: PrismaService,
  taskIds: string[],
  window: StatsWindow = {},
): Promise<Map<string, TaskStats>> {
  const out = new Map(taskIds.map((id) => [id, empty()]));
  if (!taskIds.length) return out;
  const range =
    window.from || window.to
      ? { ...(window.from ? { gte: window.from } : {}), ...(window.to ? { lt: window.to } : {}) }
      : undefined;
  const [recs, revs, ok] = await Promise.all([
    prisma.recording.groupBy({
      by: ["taskId", "status"],
      where: {
        taskId: { in: taskIds },
        ...(range
          ? {
              OR: [
                { status: { in: ["APPROVED", "REJECTED"] }, decidedAt: range },
                { status: "PENDING", createdAt: range },
              ],
            }
          : {}),
      },
      _count: true,
    }),
    prisma.recordingReview.groupBy({
      by: ["taskId", "isControl"],
      where: { taskId: { in: taskIds }, ...(range ? { createdAt: range } : {}) },
      _count: true,
    }),
    prisma.recordingReview.groupBy({
      by: ["taskId"],
      where: {
        taskId: { in: taskIds },
        isControl: true,
        matched: true,
        ...(range ? { createdAt: range } : {}),
      },
      _count: true,
    }),
  ]);
  for (const r of recs) {
    const s = out.get(r.taskId!);
    if (!s) continue;
    if (r.status === "PENDING") s.pending = r._count;
    else if (r.status === "APPROVED") s.approved = r._count;
    else s.rejected = r._count;
  }
  for (const r of revs) {
    const s = out.get(r.taskId!);
    if (!s) continue;
    if (r.isControl) s.controls = r._count;
    else s.reviews = r._count;
  }
  for (const r of ok) {
    const s = out.get(r.taskId!);
    if (s) s.controlsMatched = r._count;
  }
  return out;
}

/** Unidades feitas, ganhas (já aprovadas/avaliadas) e à espera (gravações pendentes). */
export function taskMoney(
  task: { kind: "RECORD" | "REVIEW"; rateCents: number },
  s: TaskStats,
): { earnedCents: number; pendingCents: number } {
  return task.kind === "RECORD"
    ? { earnedCents: s.approved * task.rateCents, pendingCents: s.pending * task.rateCents }
    : { earnedCents: s.reviews * task.rateCents, pendingCents: 0 };
}

/** Quanto falta: gravar conta enviadas não rejeitadas; ouvir conta avaliações reais. */
export function taskRemaining(
  task: { kind: "RECORD" | "REVIEW"; target: number },
  s: TaskStats,
): number {
  const done = task.kind === "RECORD" ? s.pending + s.approved : s.reviews;
  return Math.max(0, task.target - done);
}

/** A tarefa está paga por inteiro (aprovadas ou avaliações chegaram ao pedido)? */
export function taskFinished(
  task: { kind: "RECORD" | "REVIEW"; target: number },
  s: TaskStats,
): boolean {
  return (task.kind === "RECORD" ? s.approved : s.reviews) >= task.target;
}
