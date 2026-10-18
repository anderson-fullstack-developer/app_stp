import { Link } from "@tanstack/react-router";
import type { VoiceTaskDto } from "@stp/types/api";
import { CalendarClock, Headphones, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { euros, taskDone } from "@/services/voice-api.service";

const STATUS_TONE: Record<VoiceTaskDto["status"], string> = {
  ACTIVE: "bg-primary/10 text-primary",
  PAUSED: "bg-accent/25 text-accent-foreground",
  COMPLETED: "bg-success-soft text-success",
  CANCELLED: "bg-muted text-muted-foreground",
};

function Progress({ t }: { t: VoiceTaskDto }) {
  const pct = (n: number) => `${Math.min(100, (n / t.target) * 100)}%`;
  // Gravar: aprovadas (verde) + à espera (claro). Ouvir: avaliações.
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
      <div className="flex h-full">
        <div
          className="h-full bg-success"
          style={{ width: pct(t.kind === "RECORD" ? t.progress.approved : t.progress.reviews) }}
        />
        {t.kind === "RECORD" && (
          <div className="h-full bg-success/35" style={{ width: pct(t.progress.pending) }} />
        )}
      </div>
    </div>
  );
}

export function TaskCard({ task }: { task: VoiceTaskDto }) {
  const { t, i18n } = useTranslation();
  const Icon = task.kind === "RECORD" ? Mic : Headphones;
  const done = taskDone(task);
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = due && due.getTime() < Date.now() && task.status === "ACTIVE";
  const date = due?.toLocaleDateString(i18n.language, { day: "numeric", month: "short" });
  const price = euros(task.rateCents, i18n.language);
  const to = task.kind === "RECORD" ? "/voice/record" : "/voice/listen";
  const workable = task.status === "ACTIVE" && task.progress.remaining > 0;

  return (
    <div className="card rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl text-primary-foreground",
            task.kind === "RECORD" ? "bg-forest" : "bg-ocean-grad",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-lg font-bold leading-tight">{task.title}</p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            {task.kind === "RECORD" ? t("voice.tasks.kindRecord") : t("voice.tasks.kindReview")} ·{" "}
            {task.languageName}
            {task.unitTitle ? ` · ${task.unitTitle}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            STATUS_TONE[task.status],
          )}
        >
          {t(`voice.tasks.status.${task.status}`)}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-sm font-bold">
          <span>{t("voice.tasks.progress", { done, target: task.target })}</span>
          <span className="text-success">
            {t("voice.tasks.earned", { value: euros(task.earnedCents, i18n.language) })}
          </span>
        </div>
        <Progress t={task} />
        <div className="flex flex-wrap justify-between gap-x-3 text-xs font-semibold text-muted-foreground">
          <span>
            {task.kind === "RECORD"
              ? t("voice.tasks.rateRecord", { price })
              : t("voice.tasks.rateReview", { price })}
          </span>
          {task.pendingCents > 0 && (
            <span>
              {t("voice.tasks.waiting", { value: euros(task.pendingCents, i18n.language) })}
            </span>
          )}
          {date && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}>
              <CalendarClock className="size-3.5" />
              {overdue ? t("voice.tasks.overdue", { date }) : t("voice.tasks.due", { date })}
            </span>
          )}
        </div>
      </div>

      {task.notes && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-muted/60 px-3 py-2 text-sm">
          {task.notes}
        </p>
      )}

      {workable ? (
        <Link
          to={to}
          search={{ task: task.id }}
          className="pressable mt-3 flex h-11 items-center justify-center rounded-2xl bg-primary font-display font-semibold text-primary-foreground"
        >
          {done > 0 ? t("voice.tasks.continue") : t("voice.tasks.start")}
        </Link>
      ) : task.status === "ACTIVE" ? (
        <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">
          {t("voice.tasks.allSent")}
        </p>
      ) : task.status === "COMPLETED" ? (
        <p className="mt-3 text-center text-sm font-semibold text-success">
          {t("voice.tasks.done")}
        </p>
      ) : null}
    </div>
  );
}
