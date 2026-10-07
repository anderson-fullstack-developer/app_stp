import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Flame, Star, Swords, Trophy, UserPlus } from "lucide-react";
import { BackButton } from "@/components/app/BackButton";
import { Avatar } from "@/components/app/Badges";
import { AppButton } from "@/components/app/Buttons";
import { ErrorState, LoadingState, StatCard } from "@/components/app/Primitives";
import { useUser } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/user/$userId")({
  head: () => ({
    meta: [
      { title: `Perfil de utilizador — ${APP_NAME}` },
      { name: "description", content: "Nível, XP, sequência e conquistas de outro jogador." },
      { property: "og:title", content: `Perfil de utilizador — ${APP_NAME}` },
      { property: "og:description", content: "Vê o progresso de um amigo." },
    ],
  }),
  component: UserProfile,
});

function UserProfile() {
  const { userId } = Route.useParams();
  const { data: u, isLoading } = useUser(userId);
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={u ? `@${u.username}` : ""} />
      <main className="flex-1 px-4 pb-8">
        {isLoading ? (
          <LoadingState />
        ) : !u ? (
          <ErrorState text="Utilizador não encontrado." />
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <Avatar name={u.name} color={u.avatarColor} size={104} />
              <h1 className="mt-3 font-display text-2xl font-bold">{u.name}</h1>
              <p className="text-sm text-muted-foreground">{u.country}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatCard icon={<Star className="size-4" />} label="Nível" value={u.level} />
              <StatCard icon={<Award className="size-4" />} label="XP semana" value={u.weeklyXp} />
              <StatCard icon={<Flame className="size-4" />} label="Streak" value={u.streak} />
              <StatCard
                icon={<Trophy className="size-4" />}
                label="Vitórias"
                value={Math.round(u.level * 2.5)}
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {u.status === "friend" ? (
                <Link to="/play/private" className="col-span-2">
                  <AppButton>
                    <Swords className="size-5" />
                    Desafiar
                  </AppButton>
                </Link>
              ) : (
                <AppButton className="col-span-2">
                  <UserPlus className="size-5" />
                  Adicionar amigo
                </AppButton>
              )}
            </div>
          </>
        )}
      </main>
    </PhoneFrame>
  );
}
