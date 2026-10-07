import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppButton } from "@/components/app/Buttons";
import { Neto } from "@/components/app/Neto";
import { useGame } from "@/hooks/use-game";
import { BackButton } from "@/components/app/BackButton";
import { EmptyState, LoadingState } from "@/components/app/Primitives";
import { useNotifications } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: `Notificações — ${APP_NAME}` },
      { name: "description", content: "Sequências, desafios de amigos e novidades." },
      { property: "og:title", content: `Notificações — ${APP_NAME}` },
      { property: "og:description", content: "As tuas notificações." },
    ],
  }),
  component: function NotificationsPage() {
    const { data } = useNotifications();
    const { t } = useTranslation();
    const g = useGame();
    const practisedToday = g.week[g.todayIndex];
    return (
      <PhoneFrame>
        <AppHeader left={<BackButton />} title="Notificações" />
        <main className="flex-1 space-y-2 px-4 pb-8">
          {!practisedToday && (
            <div className="card mb-3 flex items-center gap-3 rounded-3xl p-4 ring-2 ring-warning/50">
              <Neto mood="worried" size={72} className="animate-float" />
              <div className="flex-1">
                <p className="font-display text-lg font-bold leading-tight">
                  {t("neto.reminderTitle")}
                </p>
                <p className="text-sm text-muted-foreground">{t("neto.reminderText")}</p>
                <Link to="/learn" className="mt-2 block">
                  <AppButton size="md">{t("neto.reminderCta")}</AppButton>
                </Link>
              </div>
            </div>
          )}
          {!data ? (
            <LoadingState />
          ) : data.length === 0 ? (
            <EmptyState title={t("neto.allCaughtUp")} />
          ) : (
            data.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-3.5",
                  n.read ? "bg-surface" : "bg-primary/8 ring-2 ring-primary/30",
                )}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-muted text-2xl">
                  {n.icon}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.time}</p>
                </div>
                {!n.read && (
                  <span className="size-2.5 rounded-full bg-primary" aria-label="Não lida" />
                )}
              </div>
            ))
          )}
        </main>
      </PhoneFrame>
    );
  },
});
