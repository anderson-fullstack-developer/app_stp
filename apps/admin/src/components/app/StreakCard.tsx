import { Check, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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
  const todayDone = week[todayIndex];
  return (
    <div className="card rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid size-12 place-items-center rounded-2xl",
            todayDone ? "bg-coral text-destructive-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Flame className={cn("size-7", todayDone && "fill-current animate-float")} />
        </div>
        <div className="flex-1">
          <p className="font-display text-xl font-bold">{streak} dias</p>
          <p className="text-xs font-semibold text-muted-foreground">
            {todayDone ? "Sequência mantida hoje ✓" : "Faz uma lição para manter a sequência"}
          </p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Trophy className="size-3.5" />
            Recorde
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
