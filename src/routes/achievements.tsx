import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { AchievementBadge } from "@/components/app/Cards";
import { LoadingState } from "@/components/app/Primitives";
import { useAchievements } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Conquistas — Língua STP" },
      { name: "description", content: "Todas as medalhas que podes desbloquear." },
      { property: "og:title", content: "Conquistas — Língua STP" },
      { property: "og:description", content: "Desbloqueia medalhas ao aprender." },
    ],
  }),
  component: () => {
    const { data } = useAchievements();
    const n = data?.filter((a) => a.unlocked).length ?? 0;
    return (
      <PhoneFrame>
        <AppHeader left={<BackButton />} title="Conquistas" />
        <main className="flex-1 px-4 pb-8">
          <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">{n} de {data?.length ?? 0} desbloqueadas</p>
          {!data ? <LoadingState /> : <div className="grid grid-cols-3 gap-3">{data.map((a) => <AchievementBadge key={a.id} a={a} />)}</div>}
        </main>
      </PhoneFrame>
    );
  },
});
