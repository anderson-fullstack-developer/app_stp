import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { euros, taskDone, voiceApi, voiceKeys } from "@/services/voice-api.service";

/** Topo dos ecrãs de trabalho: a tarefa, quanto falta e quanto já rendeu. */
export function TaskHeader({ taskId }: { taskId: string }) {
  const { t, i18n } = useTranslation();
  const task = useQuery({ queryKey: voiceKeys.tasks, queryFn: voiceApi.tasks }).data?.find(
    (x) => x.id === taskId,
  );
  return (
    <div className="space-y-2">
      <Link to="/voice" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
        <ArrowLeft className="size-4" />
        {t("voice.tasks.back")}
      </Link>
      {task && (
        <div className="card rounded-2xl p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-display font-bold">{task.title}</p>
            <p className="shrink-0 text-sm font-bold text-success">
              {euros(task.earnedCents, i18n.language)}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, (taskDone(task) / task.target) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {t("voice.tasks.progress", { done: taskDone(task), target: task.target })} ·{" "}
            {task.kind === "RECORD"
              ? t("voice.tasks.rateRecord", { price: euros(task.rateCents, i18n.language) })
              : t("voice.tasks.rateReview", { price: euros(task.rateCents, i18n.language) })}
          </p>
        </div>
      )}
    </div>
  );
}
