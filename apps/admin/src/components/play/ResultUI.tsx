import { Avatar, CoinBadge, XPBadge } from "@/components/app/Badges";
import { cn } from "@/lib/utils";
import type { Reward, Standing } from "@stp/types/multiplayer";

export function Podium({ top }: { top: Standing[] }) {
  const order = [top[1], top[0], top[2]].filter((x): x is Standing => !!x);
  const h = { 1: "h-28 bg-gold", 2: "h-20 bg-silver", 3: "h-14 bg-bronze" } as Record<number, string>;
  const medal = { 1: "🥇", 2: "🥈", 3: "🥉" } as Record<number, string>;
  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((s) => (
        <div key={s.id} className="flex w-24 flex-col items-center gap-1.5 animate-rise">
          <Avatar name={s.name} color={s.color} size={s.place === 1 ? 72 : 56} className={cn(s.isMe && "ring-4 ring-accent")} />
          <p className="max-w-full truncate font-bold">{s.name}</p>
          <div className={cn("grid w-full place-items-start justify-center rounded-t-2xl pt-2 text-3xl", h[s.place])}>{medal[s.place]}</div>
        </div>
      ))}
    </div>
  );
}

export function RewardRow({ reward }: { reward: Reward }) {
  return (
    <div className="flex justify-center gap-3">
      <XPBadge value={reward.xp} className="px-4 py-2 text-base" />
      <CoinBadge value={reward.coins} className="px-4 py-2 text-base" />
    </div>
  );
}

export function GameResultStats({ items }: { items: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([l, v]) => (
        <div key={l} className="rounded-2xl card p-3 text-center">
          <p className="font-display text-2xl font-bold">{v}</p>
          <p className="text-sm font-semibold text-muted-foreground">{l}</p>
        </div>
      ))}
    </div>
  );
}

export function TeamScore({ a, b, labelA = "Equipa A", labelB = "Equipa B" }: { a: number; b: number; labelA?: string; labelB?: string }) {
  const total = a + b || 1;
  return (
    <div>
      <div className="flex justify-between font-display text-sm font-bold">
        <span className="text-primary">{labelA} · {a}</span><span className="text-destructive">{b} · {labelB}</span>
      </div>
      <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary transition-all duration-500" style={{ width: `${(a / total) * 100}%` }} />
        <div className="bg-destructive transition-all duration-500" style={{ width: `${(b / total) * 100}%` }} />
      </div>
    </div>
  );
}
