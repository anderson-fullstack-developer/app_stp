import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, FlaskConical, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import data from "@content/sources/wiktionary-kea/entries.json";
import { useBlockAds } from "@/config/ads";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { BottomSheet, ProgressBar } from "@/components/app/Primitives";
import { DisabledState } from "@/components/app/States";
import { QuizOption } from "@/components/exercises/Exercises";
import { PhoneFrame } from "@/layouts/AppShell";
import { buildPreviewQuiz, PREVIEW_ENABLED, type SourceEntry } from "@/lib/preview-quiz";
import { sound } from "@/lib/sound";

/**
 * PRÉ-VISUALIZAÇÃO INTERNA do Kriolu com rascunhos NÃO revistos (Wiktionary, CC BY-SA 4.0).
 * Só existe em desenvolvimento — numa versão publicada mostra "indisponível".
 * Não atribui XP, moedas nem streak (não é conteúdo aprovado).
 */
export const Route = createFileRoute("/preview/kriolu")({
  head: () => ({
    meta: [
      { title: "Pré-visualização Kriolu (interno)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KrioluPreview,
});

const QUESTIONS = 10;

function KrioluPreview() {
  useBlockAds("lesson");
  const [seed, setSeed] = useState(() => Date.now());
  const quiz = useMemo(
    () => buildPreviewQuiz(data.entries as SourceEntry[], QUESTIONS, seed),
    [seed],
  );
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [hits, setHits] = useState(0);

  if (!PREVIEW_ENABLED) {
    return (
      <PhoneFrame>
        <DisabledState text="Esta pré-visualização só existe no ambiente de desenvolvimento." />
      </PhoneFrame>
    );
  }

  const restart = () => {
    setSeed(Date.now());
    setI(0);
    setSelected(null);
    setChecked(false);
    setHits(0);
  };

  if (i >= quiz.length) {
    return (
      <PhoneFrame className="bg-forest pattern-leaf">
        <div className="flex flex-1 flex-col items-center px-6 pt-16 text-center text-primary-foreground">
          <FlaskConical className="size-14 text-accent" />
          <h1 className="mt-4 font-display text-3xl font-bold">Teste concluído</h1>
          <p className="mt-2 text-primary-foreground/80">
            Acertaste {hits} de {quiz.length}
          </p>
          <p className="mt-6 max-w-xs text-xs text-primary-foreground/70">
            Pré-visualização com rascunhos não revistos. Sem XP nem moedas — o conteúdo real chega
            depois da aprovação por falantes nativos.
          </p>
          <div className="mt-auto w-full space-y-3 pb-6 pt-8">
            <AppButton variant="light" onClick={restart}>
              <RotateCcw className="size-4" />
              Jogar outra vez
            </AppButton>
            <Link to="/onboarding">
              <AppButton
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                Voltar
              </AppButton>
            </Link>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const q = quiz[i]!;
  const correct = selected === q.correctIndex;
  const letters = ["A", "B", "C", "D"];
  const optionState = (k: number) =>
    !checked ? "idle" : k === q.correctIndex ? "correct" : k === selected ? "wrong" : "idle";

  return (
    <PhoneFrame>
      <div className="flex items-center gap-3 px-4 pt-3">
        <BackButton close />
        <ProgressBar value={((i + (checked ? 1 : 0)) / quiz.length) * 100} />
      </div>

      <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl border border-accent/50 bg-accent/15 px-3 py-2 text-[12px] leading-snug text-accent-foreground">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Pré-visualização interna</strong> · rascunho não revisto (Wiktionary, CC BY-SA
          4.0). Não é conteúdo aprovado.
        </span>
      </div>

      <div className="px-5 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kriolu · Pergunta {i + 1} de {quiz.length}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          {q.prompt} <span className="text-primary">«{q.target}»</span>?
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{q.hint}</p>
      </div>

      <div key={q.id} className="animate-rise flex-1 space-y-3 px-5 pb-40 pt-5">
        {q.options.map((label, k) => (
          <QuizOption
            key={label}
            label={label}
            letter={letters[k]!}
            selected={selected === k}
            state={optionState(k)}
            onClick={() => !checked && setSelected(k)}
          />
        ))}
      </div>

      {!checked && (
        <div className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background px-5 pb-5 pt-4">
          <AppButton
            disabled={selected === null}
            onClick={() => {
              setChecked(true);
              sound.play(correct ? "correct" : "wrong");
              if (correct) setHits((h) => h + 1);
            }}
          >
            Verificar
          </AppButton>
        </div>
      )}

      <BottomSheet open={checked} tone={correct ? "success" : "error"}>
        <div className="flex items-start gap-3">
          {correct ? (
            <CheckCircle2 className="size-9 animate-pop text-success" />
          ) : (
            <XCircle className="size-9 animate-pop text-destructive" />
          )}
          <div className="flex-1">
            <p
              className={`font-display text-2xl font-bold ${correct ? "text-success" : "text-destructive"}`}
            >
              {correct ? "Boa!" : "Quase!"}
            </p>
            {!correct && (
              <p className="text-sm font-semibold text-destructive">
                Resposta: <span className="font-bold">{q.options[q.correctIndex]}</span>
              </p>
            )}
            <a
              href={q.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline"
            >
              Ver na fonte <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <AppButton
          className="mt-4"
          variant={correct ? "primary" : "danger"}
          onClick={() => {
            setI(i + 1);
            setSelected(null);
            setChecked(false);
          }}
        >
          Continuar
        </AppButton>
      </BottomSheet>
    </PhoneFrame>
  );
}
