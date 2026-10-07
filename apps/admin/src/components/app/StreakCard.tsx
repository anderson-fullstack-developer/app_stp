import { Check, Flame, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Neto } from "./Neto";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Sequência da semana. Se hoje ainda não houve atividade, o Neto aparece preocupado
 * a lembrar ("Ainda não praticaste hoje!"); depois de praticar, volta a chama.
 */
export function StreakCard({
  streak,
  longest,
  week,
  todayIndex,
}: {
  streak: number;
  longest: number;
  week: boolean[];
  todayIndex: number;
}) {
  const { t } = useTranslation();
  const todayDone = week[todayIndex];
  return (
    <div className={cn("card rounded-3xl p-4", !todayDone && "ring-2 ring-warning/50")}>
      <div className="flex items-center gap-3">
        {todayDone ? (
          <div className="grid size-12 place-items-center rounded-2xl bg-coral text-destructive-foreground">
            <Flame className="size-7 animate-float fill-current" />
          </div>
        ) : (
          <Neto mood="worried" size={56} className="-my-1 animate-float" />
        )}
        <div className="flex-1">
          <p className="font-display text-xl font-bold">
            {t("neto.streakDays", { count: streak })}
          </p>
          <p
            className={cn(
              "text-xs font-semibold",
              todayDone ? "text-muted-foreground" : "text-accent-deep",
            )}
          >
            {todayDone
              ? t("neto.streakDone")
              : streak > 0
                ? `${t("neto.streakRiskTitle")} ${t("neto.streakRiskText")}`
                : t("neto.streakStartText")}
          </p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Trophy className="size-3.5" />
            {t("neto.record")}
          </p>
          <p className="font-display font-bold">{longest}</p>
        </div>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {DAYS.map((d, i) => (
          <li key={d} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "text-[11px] font-semibold",
                i === todayIndex ? "text-primary" : "text-muted-foreground",
              )}
            >
              {d}
            </span>
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full transition-colors",
                week[i]
                  ? "bg-coral text-destructive-foreground shadow-[0_6px_14px_-6px_oklch(0.6_0.18_28/60%)]"
                  : i === todayIndex
                    ? "border-[1.5px] border-dashed border-primary bg-primary/5"
                    : "bg-muted",
              )}
              aria-label={`${d}: ${week[i] ? "concluído" : "sem atividade"}`}
            >
              {week[i] && <Check className="size-4" strokeWidth={3} />}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
