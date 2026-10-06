import { Check, Mic, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";
import { AudioButton } from "@/components/app/Primitives";

export type AnswerState = "idle" | "correct" | "wrong";

export function QuizOption({ label, letter, selected, state, onClick }: { label: string; letter: string; selected: boolean; state: "idle" | "correct" | "wrong"; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={state !== "idle" && !selected && state !== "correct"}
      aria-pressed={selected}
      className={cn(
        "pressable flex w-full items-center gap-3 rounded-2xl border-[1.5px] bg-surface p-4 text-left font-semibold shadow-card hover:border-ocean/40",
        selected && state === "idle" && "border-ocean bg-ocean/8 ring-4 ring-ocean/10",
        state === "correct" && "border-success bg-success-soft ring-4 ring-success/10",
        state === "wrong" && "animate-shake border-destructive bg-destructive-soft ring-4 ring-destructive/10",
        !selected && state === "idle" && "border-border",
      )}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] text-[13px] font-semibold transition-colors",
        state === "correct" ? "border-success text-success" : state === "wrong" ? "border-destructive text-destructive" : "border-border text-muted-foreground")}>
        {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : letter}
      </span>
      {label}
    </button>
  );
}

function TargetCard({ text, audio }: { text?: string | undefined; audio?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl card p-4">
      {audio !== false && <AudioButton />}
      <div>
        <p className="font-display text-xl font-bold">{text ?? "Palavra em Forro"}</p>
        <p className="text-xs text-muted-foreground">Conteúdo de exemplo</p>
      </div>
    </div>
  );
}

interface Props { exercise: Exercise; checked: boolean; onReady: (ready: boolean, correct: boolean) => void }

function Choice({ exercise, checked, onReady }: Props) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <TargetCard text={exercise.targetText} />
      <div className="space-y-3">
        {exercise.options?.map((o, i) => {
          const state = !checked ? "idle" : o.isCorrect ? "correct" : sel === o.id ? "wrong" : "idle";
          return <QuizOption key={o.id} letter={"ABCD"[i] ?? ""} label={o.label} selected={sel === o.id} state={state}
            onClick={() => { if (checked) return; setSel(o.id); onReady(true, o.isCorrect); }} />;
        })}
      </div>
    </div>
  );
}

function OrderWords({ exercise, checked, onReady }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const pool = useMemo(() => [...(exercise.words ?? [])].reverse(), [exercise.words]);
  const update = (next: string[]) => { setPicked(next); onReady(next.length === pool.length, next.join(" ") === exercise.answer); };
  return (
    <div className="space-y-5">
      <TargetCard text={exercise.targetText} audio={false} />
      <div className={cn("flex min-h-24 flex-wrap content-start gap-2 border-y border-dashed border-border py-3", checked && "border-solid")}>
        {picked.map((w) => (
          <button key={w} onClick={() => !checked && update(picked.filter((x) => x !== w))} className="pressable rounded-xl border border-border bg-surface px-3 py-2 font-semibold shadow-card">{w}</button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pool.map((w) => {
          const used = picked.includes(w);
          return <button key={w} disabled={used || checked} onClick={() => update([...picked, w])}
            className={cn("pressable rounded-xl border px-3 py-2 font-semibold", used ? "border-muted bg-muted text-transparent" : "border-border bg-surface shadow-card")}>{w}</button>;
        })}
      </div>
    </div>
  );
}

function MatchWords({ exercise, checked, onReady }: Props) {
  const pairs = exercise.pairs ?? [];
  const rights = useMemo(() => [...pairs].reverse().map((p) => p.right), [pairs]);
  const [left, setLeft] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const tryRight = (r: string) => {
    if (!left || checked) return;
    const ok = pairs.find((p) => p.left === left)?.right === r;
    if (ok) { const n = [...done, left]; setDone(n); setLeft(null); onReady(n.length === pairs.length, true); }
    else { setMiss(r); setTimeout(() => setMiss(null), 400); }
  };
  const tile = "pressable w-full rounded-2xl border-[1.5px] p-3 text-sm font-semibold shadow-card";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-3">{pairs.map((p) => (
        <button key={p.left} disabled={done.includes(p.left)} onClick={() => setLeft(p.left)}
          className={cn(tile, done.includes(p.left) ? "border-success bg-success-soft opacity-60" : left === p.left ? "border-ocean bg-ocean/10" : "border-border bg-surface")}>{p.left}</button>
      ))}</div>
      <div className="space-y-3">{rights.map((r) => {
        const isDone = done.some((l) => pairs.find((p) => p.left === l)?.right === r);
        return <button key={r} disabled={isDone} onClick={() => tryRight(r)}
          className={cn(tile, isDone ? "border-success bg-success-soft opacity-60" : miss === r ? "animate-shake border-destructive bg-destructive-soft" : "border-border bg-surface")}>{r}</button>;
      })}</div>
    </div>
  );
}

function ListenType({ exercise, checked, onReady }: Props) {
  return (
    <div className="space-y-5">
      <TargetCard text={exercise.targetText ?? "Áudio de exemplo"} />
      <textarea disabled={checked} onChange={(e) => onReady(e.target.value.trim().length > 0, true)} placeholder="Escreve o que ouviste…" aria-label="Resposta"
        className="h-32 w-full resize-none rounded-2xl border border-border bg-surface p-4 font-medium shadow-card outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/10" />
    </div>
  );
}

function Pronunciation({ exercise, onReady }: Props) {
  const [rec, setRec] = useState(false);
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <TargetCard text={exercise.targetText} />
      <button onClick={() => { setRec(true); setTimeout(() => { setRec(false); onReady(true, true); }, 1500); }} aria-label="Gravar"
        className={cn("pressable grid size-28 place-items-center rounded-full bg-coral text-destructive-foreground shadow-[0_4px_10px_oklch(0.45_0.17_25/25%),0_20px_40px_-14px_oklch(0.6_0.18_28/65%)]", rec && "animate-pulse ring-8 ring-destructive/25")}>
        <Mic className="size-12" />
      </button>
      <p className="text-sm font-semibold text-muted-foreground">{rec ? "A gravar…" : "Toca para gravar · reconhecimento em breve"}</p>
    </div>
  );
}

/** Renders the right exercise for its type. Translate / image selection reuse the choice layout for now. */
export function ExerciseRenderer(props: Props) {
  switch (props.exercise.type) {
    case "order_words": return <OrderWords {...props} />;
    case "match_words": return <MatchWords {...props} />;
    case "listen_type": case "translate": return <ListenType {...props} />;
    case "pronunciation": return <Pronunciation {...props} />;
    default: return <Choice {...props} />;
  }
}
