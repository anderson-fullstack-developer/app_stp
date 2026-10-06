import { isFeatureOn } from "@stp/config";
import { Link } from "@tanstack/react-router";
import { Check, Crown, Flame, Lock, Star, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Achievement, Friend, GamePlayer, LeaderboardEntry, Lesson } from "@/types";
import { Avatar } from "./Badges";
import { AppButton } from "./Buttons";

export function LessonNode({ lesson, offset }: { lesson: Lesson; offset: number }) {
  const { status } = lesson;
  const Icon = lesson.isTest ? Trophy : status === "completed" ? Check : status === "current" ? Star : Lock;
  const node = (
    <div className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
      {status === "current" && (
        <span className="animate-float mb-2 rounded-xl bg-surface px-3 py-1 text-xs font-bold text-primary shadow-soft">Começar</span>
      )}
      <div className={cn(
        "pressable relative grid size-[72px] place-items-center rounded-[28px] rotate-45",
        status === "completed" && "bg-primary text-primary-foreground shadow-[0_5px_0_0_var(--primary-deep)]",
        status === "current" && "bg-accent text-accent-foreground shadow-[0_5px_0_0_var(--accent-deep)] ring-4 ring-accent/30",
        status === "locked" && "bg-muted text-muted-foreground shadow-[0_5px_0_0_var(--border)]",
      )}>
        <Icon className="size-7 -rotate-45" strokeWidth={2.75} />
      </div>
      <span className={cn("mt-3 text-xs font-semibold", status === "locked" ? "text-muted-foreground" : "text-foreground")}>{lesson.title}</span>
    </div>
  );
  if (status === "locked") return <div aria-label={`${lesson.title} — bloqueada`}>{node}</div>;
  return <Link to="/lesson/$lessonId" params={{ lessonId: lesson.id }} aria-label={lesson.title}>{node}</Link>;
}

export function UserCard({ friend }: { friend: Friend }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={friend.name} color={friend.avatarColor} size={52} />
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold">{friend.name}</p>
          <p className="text-xs font-semibold text-muted-foreground">@{friend.username}</p>
          <p className="text-xs text-muted-foreground">Nível {friend.level} · {friend.weeklyXp} XP esta semana</p>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-destructive"><Flame className="size-4 fill-current" />{friend.streak}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {friend.status === "friend" && (
          <Link to="/play/private"><AppButton size="sm" className="w-full"><Swords className="size-4" />Desafiar</AppButton></Link>
        )}
        {friend.status === "request" && <AppButton size="sm">Aceitar</AppButton>}
        {friend.status === "suggestion" && <AppButton size="sm">Adicionar</AppButton>}
        <Link to="/user/$userId" params={{ userId: friend.id }}><AppButton variant="secondary" size="sm" className="w-full">Ver perfil</AppButton></Link>
      </div>
    </div>
  );
}

export function LeaderboardCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", entry.isCurrentUser ? "bg-primary/10 ring-2 ring-primary" : "bg-surface")}>
      <span className="w-6 text-center font-display font-extrabold text-muted-foreground">{entry.rank}</span>
      <Avatar name={entry.name} color={entry.avatarColor} size={40} />
      <span className="flex-1 font-semibold">{entry.name}{entry.isCurrentUser && <span className="ml-1 text-xs text-primary">(tu)</span>}</span>
      <span className="font-display font-bold">{entry.xp.toLocaleString("pt-PT")} XP</span>
    </div>
  );
}

export function AchievementBadge({ a }: { a: Achievement }) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border-2 p-3 text-center", a.unlocked ? "border-accent/60 bg-surface" : "border-dashed border-border bg-muted/50")}>
      <div className={cn("relative grid size-16 place-items-center rounded-2xl text-3xl", a.unlocked ? "bg-sun" : "bg-muted grayscale opacity-60")}>
        {a.icon}
        {!a.unlocked && <Lock className="absolute -bottom-1 -right-1 size-5 rounded-full bg-surface p-0.5 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-xs font-bold leading-tight">{a.title}</p>
      {!a.unlocked && a.progress !== undefined && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-border"><div className="h-full rounded-full bg-accent-deep" style={{ width: `${a.progress}%` }} /></div>
      )}
    </div>
  );
}

export function RoomPlayer({ p }: { p: GamePlayer }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
      <Avatar name={p.name} color={p.avatarColor} size={40} />
      <span className="flex-1 font-semibold">{p.name}</span>
      {p.isHost ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-bold text-accent-foreground"><Crown className="size-3" />HOST</span>
      ) : (
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", p.ready ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>{p.ready ? "PRONTO" : "À ESPERA"}</span>
      )}
    </div>
  );
}

export function PremiumCard() {
  if (!isFeatureOn("premium")) return null;
  return (
    <Link to="/premium" className="pressable block overflow-hidden rounded-3xl bg-cocoa p-5 text-secondary-foreground">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-sun text-accent-foreground"><Crown /></div>
        <div className="flex-1">
          <p className="font-display text-lg font-extrabold">Língua STP Premium</p>
          <p className="text-sm opacity-80">Sem anúncios e mais exercícios</p>
        </div>
      </div>
    </Link>
  );
}
