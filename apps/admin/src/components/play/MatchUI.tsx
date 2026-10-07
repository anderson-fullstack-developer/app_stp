import { Eye, Heart, Users, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { MULTIPLAYER_CONFIG } from "@stp/config";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { AvatarColor } from "@/types";
import type { QuizQuestion, RoundSummary, SurvivalPlayer } from "@stp/types/multiplayer";
import { useTranslation } from "react-i18next";
import { Neto } from "@/components/app/Neto";

/* ---------- Lives ---------- */
export function LivesIndicator({
  lives,
  max,
  size = 22,
  className,
}: {
  lives: number;
  max: number;
  size?: number;
  className?: string;
}) {
  const prev = useRef(lives);
  const [lost, setLost] = useState<number | null>(null);
  useEffect(() => {
    if (lives < prev.current) {
      setLost(lives);
      const t = setTimeout(() => setLost(null), 800);
      prev.current = lives;
      return () => clearTimeout(t);
    }
    prev.current = lives;
    return undefined;
  }, [lives]);
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      aria-label={`${lives} de ${max} vidas`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < lives ? "fill-destructive text-destructive" : "fill-muted text-muted-foreground/40",
            lost === i && "animate-heart-lose fill-destructive text-destructive",
          )}
        />
      ))}
    </div>
  );
}

/* ---------- Timer ---------- */
export function GameTimer({ left, total }: { left: number; total: number }) {
  const urgent = left <= MULTIPLAYER_CONFIG.urgencySeconds;
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      role="timer"
      aria-label={`${Math.ceil(left)} segundos`}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-100 ease-linear",
          urgent ? "bg-destructive" : "bg-accent",
        )}
        style={{ width: `${(left / total) * 100}%` }}
      />
    </div>
  );
}

export function TimerCount({ left }: { left: number }) {
  const urgent = left <= MULTIPLAYER_CONFIG.urgencySeconds;
  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-bold tabular-nums",
        urgent
          ? "animate-pulse bg-destructive text-destructive-foreground"
          : "bg-surface text-foreground",
      )}
    >
      ⏱ {String(Math.ceil(left)).padStart(2, "0")}
    </span>
  );
}

/* ---------- Top bar ---------- */
export function MatchTopBar({
  round,
  alive,
  left,
  total,
  spectator,
}: {
  round: number;
  alive: number;
  left: number;
  total: number;
  spectator?: boolean;
}) {
  return (
    <div className="space-y-2.5 px-4 pt-3 safe-top">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-xl bg-cocoa px-3 py-1 font-display text-sm font-bold text-secondary-foreground">
          Round {round}
        </span>
        <PlayersRemaining alive={alive} />
        <TimerCount left={left} />
      </div>
      <GameTimer left={left} total={total} />
      {spectator && <SpectatorBadge />}
    </div>
  );
}

export const PlayersRemaining = ({ alive }: { alive: number }) => (
  <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1 text-sm font-bold">
    <Users className="size-4 text-primary" />
    {alive} vivos
  </span>
);

export const SpectatorBadge = () => (
  <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-ocean px-3 py-1 text-xs font-bold uppercase tracking-widest text-ocean-foreground">
    <Eye className="size-4" />
    Espectador
  </div>
);

/* ---------- Question & options ---------- */
export function QuestionCard({ q }: { q: QuizQuestion }) {
  return (
    <div className="rounded-[1.75rem] card p-5 text-center shadow-soft">
      {q.type === "LISTEN_AND_CHOOSE" && (
        <button
          type="button"
          className="pressable mx-auto mb-3 flex items-center gap-2 rounded-2xl bg-ocean px-5 py-3 font-display font-bold text-ocean-foreground"
          aria-label="Ouvir áudio (em breve)"
        >
          <Volume2 className="size-6" />
          Ouvir
        </button>
      )}
      <p className="font-display text-xl font-bold leading-snug">{q.prompt}</p>
      {q.type === "LISTEN_AND_CHOOSE" && (
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Áudio de exemplo — disponível em breve
        </p>
      )}
    </div>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dim";
const LETTERS = ["A", "B", "C", "D"];

export function QuizOption({
  index,
  label,
  state,
  disabled,
  onClick,
}: {
  index: number;
  label: string;
  state: OptionState;
  disabled?: boolean;
  onClick: () => void;
}) {
  const cls = {
    idle: "border-border bg-surface shadow-card",
    selected: "border-primary bg-primary/8 ring-4 ring-primary/10",
    correct: "border-success bg-success-soft ring-4 ring-success/10 animate-pop",
    wrong: "border-destructive bg-destructive-soft ring-4 ring-destructive/10 animate-shake",
    dim: "border-border bg-surface opacity-50",
  }[state];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        sound.play("select");
        onClick();
      }}
      className={cn(
        "pressable flex min-h-16 w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left text-base font-semibold disabled:cursor-default",
        cls,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-display font-bold">
        {LETTERS[index]}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

/* ---------- Opponents panel (compact, expandable) ---------- */
export function PlayersPanel({
  players,
  maxLives,
}: {
  players: SurvivalPlayer[];
  maxLives: number;
}) {
  const [open, setOpen] = useState(false);
  const alive = players.filter((p) => p.lives > 0);
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[28px] border-t border-border/70 bg-surface/90 px-4 pt-2 backdrop-blur-xl shadow-[0_-12px_40px_-20px_oklch(0.3_0.04_70/30%)] safe-bottom pb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1.5"
        aria-expanded={open}
      >
        <div className="flex -space-x-2">
          {alive.slice(0, 7).map((p) => (
            <Avatar
              key={p.id}
              name={p.name}
              color={p.color}
              size={30}
              className="ring-2 ring-surface"
            />
          ))}
        </div>
        <span className="text-sm font-bold text-primary">
          {open ? "Fechar" : `Jogadores (${alive.length})`}
        </span>
      </button>
      {open && (
        <ul className="animate-rise mt-2 max-h-64 space-y-1.5 overflow-y-auto">
          {[...players]
            .sort((a, b) => b.lives - a.lives)
            .map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-1.5",
                  p.isMe && "bg-primary/10",
                )}
              >
                <Avatar name={p.name} color={p.color} size={32} dim={p.lives === 0} />
                <span
                  className={cn(
                    "flex-1 font-bold",
                    p.lives === 0 && "text-muted-foreground line-through",
                  )}
                >
                  {p.name}
                  {p.isMe && " (tu)"}
                </span>
                {p.lives > 0 ? (
                  <LivesIndicator lives={p.lives} max={maxLives} size={16} />
                ) : (
                  <span className="text-sm">💀</span>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Overlays ---------- */
function Overlay({
  children,
  tone = "dark",
}: {
  children: ReactNode;
  tone?: "dark" | "forest" | "sun";
}) {
  const bg = {
    dark: "bg-foreground/85 text-background",
    forest: "bg-forest text-primary-foreground",
    sun: "bg-sun text-accent-foreground",
  }[tone];
  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center",
        bg,
      )}
    >
      {children}
    </div>
  );
}

export function CountdownOverlay({
  value,
  title,
}: {
  value: number | "go";
  title?: string | undefined;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    sound.play(value === "go" ? "go" : "tick");
  }, [value]);
  return (
    <Overlay tone="forest">
      {title && (
        <>
          <Neto mood="happy" size={96} className="animate-float" />
          <p className="animate-rise font-display text-2xl font-bold">{title}</p>
          <p className="text-sm font-semibold opacity-80">{t("neto.arenaReady")}</p>
        </>
      )}
      <p
        key={String(value)}
        className="animate-pop font-display text-[7rem] font-bold leading-none"
      >
        {value === "go" ? "Já!" : value}
      </p>
    </Overlay>
  );
}

export function AnswerFeedback({
  kind,
  lives,
  maxLives,
}: {
  kind: "correct" | "wrong" | "timeout";
  lives: number;
  maxLives: number;
}) {
  const map = {
    correct: {
      title: "✅ Correto",
      text: "Continuas vivo!",
      cls: "bg-success-soft text-foreground",
    },
    wrong: { title: "❌ Errado", text: "-1 vida", cls: "bg-destructive-soft text-foreground" },
    timeout: {
      title: "⏱ Tempo esgotado",
      text: "-1 vida",
      cls: "bg-destructive-soft text-foreground",
    },
  }[kind];
  return (
    <div
      className={cn(
        "animate-sheet absolute inset-x-0 bottom-0 z-30 rounded-t-3xl px-5 pt-5 pb-8 safe-bottom",
        map.cls,
      )}
      role="status"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-2xl font-bold">{map.title}</p>
          <p className={cn("font-bold", kind !== "correct" && "text-destructive")}>{map.text}</p>
        </div>
        <LivesIndicator lives={lives} max={maxLives} size={26} />
      </div>
    </div>
  );
}

export function RoundResult({
  summary,
  survivors,
  names,
}: {
  summary: RoundSummary;
  survivors: SurvivalPlayer[];
  names: Record<string, string>;
}) {
  return (
    <Overlay>
      <p className="text-sm font-bold opacity-70">Fim do round {summary.round}</p>
      <div className="grid w-full grid-cols-3 gap-2">
        {[
          ["✅", summary.correct, "acertaram"],
          ["❌", summary.wrong, "erraram"],
          ["⏱", summary.noAnswer, "não respond."],
        ].map(([e, n, l]) => (
          <div key={String(l)} className="animate-rise rounded-2xl bg-background/10 p-3">
            <p className="text-xl">{e}</p>
            <p className="font-display text-2xl font-bold">{n}</p>
            <p className="text-xs font-semibold opacity-80">{l}</p>
          </div>
        ))}
      </div>
      {summary.voided && (
        <p className="text-sm font-bold text-accent">Todos falharam — ninguém perde vida!</p>
      )}
      {summary.eliminated.length > 0 && (
        <p className="font-bold text-destructive-soft">
          💀 Eliminados: {summary.eliminated.map((id) => names[id]).join(", ")}
        </p>
      )}
      <p className="animate-pop font-display text-3xl font-bold">
        🔥 {summary.alive} {summary.alive === 1 ? "jogador restante" : "jogadores restantes"}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {survivors.map((p) => (
          <Avatar
            key={p.id}
            name={p.name}
            color={p.color}
            size={40}
            className={cn(p.isMe && "ring-4 ring-accent")}
          />
        ))}
      </div>
    </Overlay>
  );
}

export function PlayerEliminatedOverlay({
  place,
  correct,
  wrong,
  onWatch,
  onLeave,
}: {
  place: number;
  correct: number;
  wrong: number;
  onWatch: () => void;
  onLeave: () => void;
}) {
  const total = correct + wrong;
  const { t } = useTranslation();
  return (
    <Overlay>
      <Neto mood="sad" size={120} className="animate-pop" />
      <p className="font-display text-4xl font-bold">{t("neto.eliminatedTitle")}</p>
      <p className="text-lg font-bold">{t("neto.eliminatedPlace", { place })}</p>
      <p className="text-sm font-semibold opacity-80">{t("neto.eliminatedText")}</p>
      <div className="grid w-full grid-cols-3 gap-2">
        {[
          [correct, "corretas"],
          [wrong, "erradas"],
          [`${total ? Math.round((correct / total) * 100) : 0}%`, "precisão"],
        ].map(([v, l]) => (
          <div key={String(l)} className="rounded-2xl bg-background/10 p-3">
            <p className="font-display text-2xl font-bold">{v}</p>
            <p className="text-xs font-semibold opacity-80">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 w-full space-y-3">
        <AppButton variant="sun" onClick={onWatch}>
          <Eye className="size-5" />
          Continuar a assistir
        </AppButton>
        <AppButton variant="secondary" onClick={onLeave}>
          Sair da partida
        </AppButton>
      </div>
    </Overlay>
  );
}

export function FinalBattle({
  a,
  b,
  maxLives,
}: {
  a: SurvivalPlayer;
  b: SurvivalPlayer;
  maxLives: number;
}) {
  return (
    <Overlay tone="sun">
      <p className="animate-pop font-display text-4xl font-bold">⚡ Final</p>
      <div className="flex w-full items-center justify-around">
        {[a, b].map((p, i) => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            {i === 1 && null}
            <Avatar
              name={p.name}
              color={p.color}
              size={84}
              className="animate-rise ring-4 ring-surface"
            />
            <p className="font-display text-xl font-bold">{p.name}</p>
            <LivesIndicator lives={p.lives} max={maxLives} size={20} />
          </div>
        ))}
      </div>
      <p className="absolute font-display text-3xl font-bold">VS</p>
    </Overlay>
  );
}

export function Confetti() {
  const colors = ["bg-accent", "bg-primary", "bg-ocean", "bg-destructive", "bg-surface"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "animate-confetti absolute top-0 block h-3 w-2 rounded-sm",
            colors[i % colors.length],
          )}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export function WinnerOverlay({
  name,
  color,
  isMe,
}: {
  name: string;
  color: AvatarColor;
  isMe?: boolean | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Overlay tone="forest">
      <Confetti />
      <p className="font-display text-lg font-bold">🏆 Último sobrevivente</p>
      <Avatar name={name} color={color} size={130} className="animate-pop ring-8 ring-accent" />
      <p className="animate-rise font-display text-4xl font-bold">
        {isMe ? t("neto.winnerMe") : t("neto.winnerOther", { name })}
      </p>
      <div className="flex items-center gap-2">
        <Neto mood="celebrate" size={72} className="animate-float" />
        <p className="text-sm font-semibold opacity-90">{t("neto.winnerCheer")}</p>
      </div>
    </Overlay>
  );
}
