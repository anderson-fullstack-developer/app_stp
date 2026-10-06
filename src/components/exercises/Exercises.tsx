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
        "pressable flex w-full items-center gap-3 rounded-2xl border-2 bg-surface p-4 text-left font-semibold shadow-[0_3px_0_0_var(--border)] active:shadow-none",
        selected && state === "idle" && "border-ocean bg-ocean/10 shadow-[0_3px_0_0_var(--ocean)]",
        state === "correct" && "border-success bg-success-soft shadow-[0_3px_0_0_var(--success)]",
        state === "wrong" && "animate-shake border-destructive bg-destructive-soft shadow-[0_3px_0_0_var(--destructive)]",
        !selected && state === "idle" && "border-border",
      )}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold",
        state === "correct" ? "border-success text-success" : state === "wrong" ? "border-destructive text-destructive" : "border-border text-muted-foreground")}>
        {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : letter}
      </span>
      {label}
    </button>
  );
}

function TargetCard({ text, audio }: { text?: string | undefined; audio?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border-2 border-border bg-surface p-4">
      {audio !== false && <AudioButton />}
      <div>
        <p className="font-display text-xl font-extrabold">{text ?? "Palavra em Forro"}</p>
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
      <div className={cn("flex min-h-24 flex-wrap content-start gap-2 border-y-2 border-dashed py-3", checked && "border-solid")}>
        {picked.map((w) => (
          <button key={w} onClick={() => !checked && update(picked.filter((x) => x !== w))} className="pressable rounded-xl border-2 border-border bg-surface px-3 py-2 font-semibold shadow-[0_3px_0_0_var(--border)]">{w}</button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pool.map((w) => {
          const used = picked.includes(w);
          return <button key={w} disabled={used || checked} onClick={() => update([...picked, w])}
            className={cn("pressable rounded-xl border-2 px-3 py-2 font-semibold", used ? "border-muted bg-muted text-transparent" : "border-border bg-surface shadow-[0_3px_0_0_var(--border)]")}>{w}</button>;
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
  const tile = "pressable w-full rounded-2xl border-2 p-3 text-sm font-semibold shadow-[0_3px_0_0_var(--border)]";
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
        className="h-32 w-full resize-none rounded-2xl border-2 border-border bg-surface p-4 font-semibold outline-none focus:border-ocean" />
    </div>
  );
}

function Pronunciation({ exercise, onReady }: Props) {
  const [rec, setRec] = useState(false);
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <TargetCard text={exercise.targetText} />
      <button onClick={() => { setRec(true); setTimeout(() => { setRec(false); onReady(true, true); }, 1500); }} aria-label="Gravar"
        className={cn("pressable grid size-28 place-items-center rounded-full bg-coral text-destructive-foreground shadow-[0_6px_0_0_oklch(0.45_0.17_25)]", rec && "animate-pulse ring-8 ring-destructive/25")}>
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
