import { Link } from "@tanstack/react-router";
import { Check, Lock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { lessonStates, useKrioluCourse, useKrioluProgress } from "@/hooks/use-kriolu";
import { cn } from "@/lib/utils";

const THEME_BG = [
  "bg-forest text-primary-foreground",
  "bg-ocean-grad text-ocean-foreground",
  "bg-cocoa text-secondary-foreground",
  "bg-coral text-destructive-foreground",
  "bg-sun text-accent-foreground",
];
const WAVE = [0, 44, 64, 44, 0, -44, -64, -44];

type ThemeKey =
  "numbers" | "time" | "family" | "body" | "food" | "nature" | "home" | "describe" | "verbs";

/** Caminho de aprendizagem do Kriolu (Beta): unidades por tema, lições em sequência. */
export function KrioluPath() {
  const { t } = useTranslation();
  const course = useKrioluCourse();
  const completed = useKrioluProgress();
  const states = lessonStates(course, completed);

  return (
    <>
      {course.map((unit, ui) => {
        const done = unit.lessons.filter((l) => states.get(l.id) === "completed").length;
        const locked = unit.lessons.every((l) => states.get(l.id) === "locked");
        return (
          <section key={unit.theme.id} className="mt-7">
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl p-5 pattern-leaf",
                THEME_BG[ui % THEME_BG.length],
                locked && "opacity-70 saturate-50",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                    {t("kriolu.unit", { n: ui + 1 })}
                  </p>
                  <h2 className="font-display text-2xl font-bold">
                    {unit.theme.icon} {t(`kriolu.themes.${unit.theme.id as ThemeKey}`)}
                  </h2>
                </div>
                <span className="shrink-0 rounded-xl bg-surface/20 px-2.5 py-1 text-xs font-bold">
                  {t("kriolu.lessonsDone", { done, total: unit.lessons.length })}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-7 py-8">
              {unit.lessons.map((lesson, li) => {
                const state = states.get(lesson.id) ?? "locked";
                const Icon = state === "completed" ? Check : state === "current" ? Star : Lock;
                const node = (
                  <div
                    className="flex flex-col items-center"
                    style={{ transform: `translateX(${WAVE[(li + ui * 3) % WAVE.length] ?? 0}px)` }}
                  >
                    {state === "current" && (
                      <span className="animate-float mb-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary shadow-raised ring-1 ring-border/60">
                        {t("onboarding.start")}
                      </span>
                    )}
                    <div
                      className={cn(
                        "pressable relative grid size-[72px] rotate-45 place-items-center rounded-[28px]",
                        state === "completed" &&
                          "bg-forest text-primary-foreground shadow-[0_2px_4px_oklch(0.3_0.08_160/20%),0_12px_24px_-10px_oklch(0.45_0.12_158/55%)]",
                        state === "current" &&
                          "bg-sun text-accent-foreground shadow-[0_2px_4px_oklch(0.5_0.12_75/20%),0_14px_28px_-10px_oklch(0.72_0.15_75/70%)] ring-[6px] ring-accent/25",
                        state === "locked" &&
                          "bg-muted text-muted-foreground/70 ring-1 ring-border",
                      )}
                    >
                      <Icon className="size-7 -rotate-45" strokeWidth={2.75} />
                    </div>
                    <span
                      className={cn(
                        "mt-3 text-xs font-semibold",
                        state === "locked" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {t("kriolu.lesson", { n: lesson.index })}
                    </span>
                  </div>
                );
                return state === "locked" ? (
                  <div key={lesson.id} aria-label={t("kriolu.lesson", { n: lesson.index })}>
                    {node}
                  </div>
                ) : (
                  <Link key={lesson.id} to="/practice/kriolu" search={{ lesson: lesson.id }}>
                    {node}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
