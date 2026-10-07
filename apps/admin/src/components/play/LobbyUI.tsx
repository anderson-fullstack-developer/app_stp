import { Check, Copy, Crown, HeartPulse, Share2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { scaleStep, sound } from "@/lib/sound";
import { Avatar, SoonBadge } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { cn } from "@/lib/utils";
import type { AvatarColor } from "@/types";
import type { LobbyMember, MatchPlayerSeed } from "@stp/types/multiplayer";

export function GameModeCard({
  icon: Icon,
  title,
  text,
  bg,
  cta = "Jogar",
  soon,
  featured,
  plain,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  bg: string;
  cta?: string;
  soon?: boolean;
  featured?: boolean;
  /** Cartão claro (sem gradiente). */ plain?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "pressable relative h-full overflow-hidden rounded-[1.75rem] p-4",
        plain ? "card" : "pattern-leaf shadow-raised",
        bg,
        featured && "p-5",
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid place-items-center rounded-2xl",
            featured ? "size-14" : "size-11",
            plain
              ? "bg-primary/10 text-primary"
              : "bg-white/18 ring-1 ring-inset ring-white/25 backdrop-blur-sm",
          )}
        >
          <Icon className={featured ? "size-7" : "size-[22px]"} strokeWidth={2} />
        </span>
        {soon && <SoonBadge />}
      </div>
      <h2
        className={cn(
          "mt-3 font-display font-bold leading-tight tracking-[-0.01em]",
          featured ? "text-2xl" : "text-[17px]",
        )}
      >
        {title}
      </h2>
      <p className="mt-0.5 text-[13px] font-medium leading-snug opacity-80">{text}</p>
      {children}
      {featured && (
        <span className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-primary-foreground font-display font-semibold text-secondary shadow-[0_10px_24px_-12px_oklch(0_0_0/45%)]">
          {cta}
        </span>
      )}
    </div>
  );
}

export function MatchmakingAvatar({ p }: { p?: MatchPlayerSeed | undefined }) {
  if (!p)
    return (
      <div className="grid size-16 place-items-center rounded-full border-[1.5px] border-dashed border-primary-foreground/40 text-primary-foreground/50">
        ?
      </div>
    );
  return (
    <div className="animate-pop flex flex-col items-center gap-1">
      <Avatar
        name={p.name}
        color={p.color}
        size={64}
        className={cn("ring-4 ring-primary-foreground/30", p.isMe && "ring-accent")}
      />
      <span className="max-w-16 truncate text-xs font-bold">{p.isMe ? "Tu" : p.name}</span>
    </div>
  );
}

/**
 * Toca um som sempre que entra um jogador (o tom sobe a cada entrada) e um acorde quando a
 * sala fica completa. Não toca para os jogadores que já estavam quando o ecrã abriu, nem para ti.
 */
export function useJoinSounds(count: number, full: boolean) {
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current && prev.current > 0)
      sound.play("join", { pitch: scaleStep(count - 2) });
    prev.current = count;
  }, [count]);
  useEffect(() => {
    if (full) sound.play("roomFull");
  }, [full]);
}

export function MatchmakingScreen({
  players,
  size,
  full,
  onCancel,
}: {
  players: MatchPlayerSeed[];
  size: number;
  full: boolean;
  onCancel: () => void;
}) {
  const cols = size > 8 ? "grid-cols-4 gap-2" : "grid-cols-4 gap-3";
  useJoinSounds(players.length, full);
  return (
    <div className="flex flex-1 flex-col bg-forest px-5 pt-10 pb-6 text-primary-foreground safe-top">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-80">
          <HeartPulse className="size-4" />
          Sobrevivência online
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          {full ? "Sala completa!" : "À procura de jogadores…"}
        </h1>
        <p
          key={players.length}
          className="animate-pop mt-3 font-display text-6xl font-bold tabular-nums"
        >
          {players.length}/{size}
        </p>
      </div>
      <div className={cn("mx-auto mt-8 grid w-full max-w-sm justify-items-center", cols)}>
        {Array.from({ length: size }, (_, i) => (
          <MatchmakingAvatar key={players[i]?.id ?? `e${i}`} p={players[i]} />
        ))}
      </div>
      <div className="mt-auto pt-8">
        {!full && (
          <AppButton variant="light" onClick={onCancel}>
            Cancelar
          </AppButton>
        )}
      </div>
    </div>
  );
}

export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const share = () => {
    const text = `Junta-te à minha sala no Língua STP: ${code}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else copy();
  };
  return (
    <div className="rounded-[2rem] bg-ocean-grad p-5 text-center text-ocean-foreground pattern-leaf">
      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Código da sala</p>
      <p className="mt-1 font-display text-5xl font-bold tracking-[0.15em]">{code}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={copy}
          className="pressable flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ocean-foreground/20 font-bold"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copiar
            </>
          )}
        </button>
        <button
          type="button"
          onClick={share}
          className="pressable flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ocean-foreground/20 font-bold"
        >
          <Share2 className="size-4" />
          Partilhar
        </button>
      </div>
    </div>
  );
}

export function LobbyPlayer({ m }: { m: LobbyMember }) {
  return (
    <div className="animate-rise flex items-center gap-3 rounded-2xl card p-3">
      <Avatar name={m.name} color={m.color} size={44} />
      <div className="flex-1">
        <p className="flex items-center gap-1.5 font-bold">
          {m.name}
          {m.isMe && <span className="text-muted-foreground">(tu)</span>}
          {m.isHost && <Crown className="size-4 text-accent-deep" aria-label="Host" />}
        </p>
        {m.isHost && <p className="text-xs font-semibold text-muted-foreground">Host</p>}
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-bold uppercase",
          m.ready ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
        )}
      >
        {m.ready ? "Pronto" : "A preparar-se"}
      </span>
    </div>
  );
}

export function OptionPicker<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-muted-foreground">{label}</p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
      >
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={o === value}
            className={cn(
              "pressable h-12 rounded-2xl border-[1.5px] font-display font-bold",
              o === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface",
            )}
          >
            {format ? format(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TeamCard({
  name,
  players,
  tone,
  score,
  highlight,
}: {
  name: string;
  players: { id: string; name: string; color: AvatarColor; isMe?: boolean | undefined }[];
  tone: "forest" | "coral";
  score?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] p-4 text-primary-foreground",
        tone === "forest" ? "bg-forest" : "bg-coral",
        highlight && "ring-4 ring-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">{name}</p>
        {score !== undefined && (
          <p className="font-display text-2xl font-bold tabular-nums">{score}</p>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Avatar
              name={p.name}
              color={p.color}
              size={36}
              className="ring-2 ring-primary-foreground/40"
            />
            <span className="font-bold">
              {p.name}
              {p.isMe && " (tu)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
