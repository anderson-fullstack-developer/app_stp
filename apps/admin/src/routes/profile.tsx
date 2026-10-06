import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpen, Flame, Languages, Settings, Star, Target, Trophy, Zap } from "lucide-react";
import { Avatar } from "@/components/app/Badges";
import { AchievementBadge, PremiumCard } from "@/components/app/Cards";
import { LoadingState, ProgressBar, SectionTitle, StatCard } from "@/components/app/Primitives";
import { useAchievements, useMe } from "@/hooks/use-service";
import { levelInfo, useGame } from "@/hooks/use-game";
import { CoinBadge } from "@/components/app/Badges";
import { AppHeader, TabLayout } from "@/layouts/AppShell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Língua STP" },
      { name: "description", content: "As tuas estatísticas, sequência e conquistas." },
      { property: "og:title", content: "Perfil — Língua STP" },
      { property: "og:description", content: "O teu progresso em Forro / Santomé." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { data: u } = useMe();
  const { data: ach } = useAchievements();
  const g = useGame();
  const lvl = levelInfo(g.xp);
  return (
    <TabLayout header={<AppHeader title="Perfil" right={<Link to="/settings" aria-label="Definições" className="grid size-10 place-items-center rounded-full hover:bg-muted"><Settings className="size-5" /></Link>} />}>
      {!u ? <LoadingState /> : (
        <>
          <div className="relative overflow-hidden rounded-[2rem] bg-forest p-5 text-primary-foreground pattern-leaf">
            <div className="flex items-center gap-4">
              <Avatar name={u.name} color="sun" size={80} />
              <div>
                <h1 className="font-display text-2xl font-extrabold">{u.name}</h1>
                <p className="text-sm opacity-80">@{u.username}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold"><Languages className="size-3.5" />Forro / Santomé</p>
                <CoinBadge value={g.coins} className="mt-2 bg-primary-foreground/90" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="font-display font-extrabold">Nível {lvl.level}</span>
              <ProgressBar value={lvl.progress} tone="light" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard icon={<Star className="size-4" />} label="XP total" value={g.xp.toLocaleString("pt-PT")} />
            <StatCard icon={<Flame className="size-4" />} label="Streak atual" value={g.streak} />
            <StatCard icon={<Zap className="size-4" />} label="Maior streak" value={g.longestStreak} />
            <StatCard icon={<BookOpen className="size-4" />} label="Lições" value={u.lessonsCompleted} />
            <StatCard icon={<Languages className="size-4" />} label="Palavras estudadas" value={u.wordsLearned} />
            <StatCard icon={<Target className="size-4" />} label="Precisão" value={`${u.accuracy}%`} />
            <StatCard icon={<Trophy className="size-4" />} label="Vitórias multiplayer" value={u.wins} />
            <StatCard icon={<Award className="size-4" />} label="Conquistas" value={u.achievementsCount} />
          </div>
          <div className="mt-4"><PremiumCard /></div>
          <SectionTitle action={<Link to="/achievements" className="text-sm font-bold text-primary">Ver todas</Link>}>Conquistas</SectionTitle>
          <div className="grid grid-cols-3 gap-3">{ach?.slice(0, 6).map((a) => <AchievementBadge key={a.id} a={a} />)}</div>
        </>
      )}
    </TabLayout>
  );
}
