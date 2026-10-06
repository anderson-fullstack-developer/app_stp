import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Shield } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/app/Badges";
import { LeaderboardCard } from "@/components/app/Cards";
import { LoadingState, Tabs } from "@/components/app/Primitives";
import { useLeague, useRanking } from "@/hooks/use-service";
import { AppHeader, TabLayout } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ranking")({
  head: () => ({
    meta: [
      { title: "Ranking — Língua STP" },
      { name: "description", content: "Rankings de amigos, semanal, global e por país, com ligas." },
      { property: "og:title", content: "Ranking — Língua STP" },
      { property: "og:description", content: "Sobe de liga e chega ao topo." },
    ],
  }),
  component: Ranking,
});

type Scope = "friends" | "weekly" | "global" | "country";
const TIERS = ["Bronze", "Silver", "Gold", "Diamond"] as const;
const tierCls = { Bronze: "bg-bronze", Silver: "bg-silver", Gold: "bg-gold", Diamond: "bg-ocean" };

function Ranking() {
  const [scope, setScope] = useState<Scope>("weekly");
  const { data } = useRanking(scope);
  const { data: league } = useLeague();
  const top = data?.slice(0, 3) ?? [];
  const podium = [top[1], top[0], top[2]].filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <TabLayout header={<AppHeader title="Ranking" />}>
      {league && (
        <div className="rounded-3xl bg-primary-deep p-4 text-primary-foreground">
          <div className="flex justify-center gap-3">
            {TIERS.map((t) => (
              <div key={t} className={cn("grid size-12 place-items-center rounded-2xl", tierCls[t], t === league.tier ? "scale-115 ring-4 ring-primary-foreground/40" : "opacity-35")}>
                <Shield className="size-6 fill-primary-foreground/40 text-primary-foreground" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-center font-display text-xl font-extrabold">Liga {league.tier}</p>
          <p className="text-center text-sm opacity-80">Termina em {league.endsIn}</p>
          <div className="mt-3 flex justify-center gap-4 text-xs font-bold">
            <span className="inline-flex items-center gap-1 text-accent"><ArrowUp className="size-4" />Top {league.promoteTop} sobem</span>
            <span className="inline-flex items-center gap-1 opacity-75"><ArrowDown className="size-4" />Últimos {league.demoteBottom} descem</span>
          </div>
        </div>
      )}
      <div className="mt-4"><Tabs value={scope} onChange={setScope} items={[{ value: "friends", label: "Amigos" }, { value: "weekly", label: "Semanal" }, { value: "global", label: "Global" }, { value: "country", label: "País" }]} /></div>
      {!data ? <LoadingState /> : (
        <>
          <div className="mt-6 flex items-end justify-center gap-3">
            {podium.map((e) => {
              const h = { 1: "h-28", 2: "h-20", 3: "h-14" }[e.rank as 1 | 2 | 3];
              const medal = { 1: "🥇", 2: "🥈", 3: "🥉" }[e.rank as 1 | 2 | 3];
              const bg = { 1: "bg-gold", 2: "bg-silver", 3: "bg-bronze" }[e.rank as 1 | 2 | 3];
              return (
                <div key={e.userId} className="animate-rise flex w-24 flex-col items-center">
                  <span className="text-2xl">{medal}</span>
                  <Avatar name={e.name} color={e.avatarColor} size={e.rank === 1 ? 64 : 52} />
                  <p className="mt-1 text-sm font-bold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.xp.toLocaleString("pt-PT")} XP</p>
                  <div className={cn("mt-2 w-full rounded-t-2xl", h, bg)} />
                </div>
              );
            })}
          </div>
          <div className="space-y-2 pt-4">{data.slice(3).map((e) => <LeaderboardCard key={e.userId} entry={e} />)}</div>
        </>
      )}
    </TabLayout>
  );
}
