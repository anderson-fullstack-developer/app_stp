import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { AchievementBadge } from "@/components/app/Cards";
import { LoadingState } from "@/components/app/Primitives";
import { useTranslation } from "react-i18next";
import { useProfileView } from "@/hooks/use-profile-view";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: `Conquistas — ${APP_NAME}` },
      { name: "description", content: "Todas as medalhas que podes desbloquear." },
      { property: "og:title", content: `Conquistas — ${APP_NAME}` },
      { property: "og:description", content: "Desbloqueia medalhas ao aprender." },
    ],
  }),
  component: function AchievementsPage() {
    const { t } = useTranslation();
    const data = useProfileView()?.achievements;
    const n = data?.filter((a) => a.unlocked).length ?? 0;
    return (
      <PhoneFrame>
        <AppHeader left={<BackButton />} title={t("profile.achievements")} />
        <main className="flex-1 px-4 pb-8">
          <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">
            {t("profile.unlockedOf", { n, total: data?.length ?? 0 })}
          </p>
          {!data ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {data.map((a) => (
                <AchievementBadge key={a.id} a={a} />
              ))}
            </div>
          )}
        </main>
      </PhoneFrame>
    );
  },
});
