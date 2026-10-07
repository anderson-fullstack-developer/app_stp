import { useBlockAds } from "@/config/ads";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Heart, XCircle } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { BottomSheet, ErrorState, LoadingState, ProgressBar } from "@/components/app/Primitives";
import { ExerciseRenderer } from "@/components/exercises/Exercises";
import { useLesson } from "@/hooks/use-service";
import { PhoneFrame } from "@/layouts/AppShell";
import { APP_CONFIG } from "@stp/config";
import { game } from "@/hooks/use-game";
import { sound } from "@/lib/sound";
import { z } from "zod";

export const Route = createFileRoute("/lesson/$lessonId")({
  validateSearch: (s) => z.object({ daily: z.boolean().optional().catch(undefined) }).parse(s),
  head: () => ({
    meta: [
      { title: "Lição — Língua STP" },
      { name: "description", content: "Pratica com exercícios de escolha, áudio, ordem de palavras e pronúncia." },
      { property: "og:title", content: "Lição — Língua STP" },
      { property: "og:description", content: "Uma lição curta de Forro / Santomé." },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  useBlockAds("lesson");
  const { lessonId } = Route.useParams();
  const { daily } = Route.useSearch();
  const [lives, setLives] = useState<number>(APP_CONFIG.maxLives);
  const { data: lesson, isLoading } = useLesson(lessonId);
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hits, setHits] = useState(0);
  const [start] = useState(() => Date.now());

  if (isLoading) return <PhoneFrame><LoadingState rows={5} /></PhoneFrame>;
  if (!lesson) return <PhoneFrame><ErrorState text="Lição não encontrada." /></PhoneFrame>;

  const ex = lesson.exercises[i];
  if (!ex) return <PhoneFrame><ErrorState text="Lição sem exercícios." /></PhoneFrame>;
  const total = lesson.exercises.length;
  const next = () => {
    const h = hits + (correct ? 1 : 0);
    if (i + 1 >= total) {
      if (daily) game.completeDaily();
      else game.completeLesson(APP_CONFIG.rewards.lessonXp, APP_CONFIG.rewards.lessonCoins);
      navigate({ to: "/lesson-result", search: { daily: !!daily, acc: Math.round((h / total) * 100), t: Math.round((Date.now() - start) / 1000) } });
      return;
    }
    setHits(h); setI(i + 1); setReady(false); setChecked(false); setCorrect(false);
  };
  const correctLabel = ex.options?.find((o) => o.isCorrect)?.label ?? ex.answer;

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-3 safe-top">
        <BackButton close />
        <ProgressBar value={((i + (checked ? 1 : 0)) / total) * 100} />
        <span className="inline-flex items-center gap-1 font-display font-bold text-destructive"><Heart className="size-5 fill-current" />{lives}</span>
      </div>
      <div className="px-5 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{lesson.title} · Exercício {i + 1} de {total}</p>
        <h1 className="mt-1 font-display text-2xl font-bold">{ex.prompt}</h1>
      </div>
      <div key={ex.id} className="animate-rise flex-1 px-5 pb-40 pt-5">
        <ExerciseRenderer exercise={ex} checked={checked} onReady={(r, c) => { setReady(r); setCorrect(c); }} />
      </div>
      {!checked && (
        <div className="absolute inset-x-0 bottom-0 border-t-2 border-border bg-background px-5 pt-4 safe-bottom pb-5">
          <AppButton disabled={!ready} onClick={() => { setChecked(true); sound.play(correct ? "correct" : "wrong"); if (correct) game.addXp(APP_CONFIG.rewards.correctAnswerXp); else setLives((l) => Math.max(0, l - 1)); }}>Verificar</AppButton>
        </div>
      )}
      <BottomSheet open={checked} tone={correct ? "success" : "error"}>
        <div className="flex items-start gap-3">
          {correct ? <CheckCircle2 className="size-9 text-success animate-pop" /> : <XCircle className="size-9 text-destructive animate-pop" />}
          <div className="flex-1">
            <p className={correct ? "font-display text-2xl font-bold text-success" : "font-display text-2xl font-bold text-destructive"}>{correct ? "Boa!" : "Quase!"}</p>
            {correct ? <p className="animate-pop font-bold text-success">+{APP_CONFIG.rewards.correctAnswerXp} XP</p> : (
              <p className="text-sm font-semibold text-destructive">Resposta correta: <span className="font-bold">{correctLabel}</span></p>
            )}
          </div>
        </div>
        <AppButton className="mt-4" variant={correct ? "primary" : "danger"} onClick={next}>Continuar</AppButton>
      </BottomSheet>
    </PhoneFrame>
  );
}
