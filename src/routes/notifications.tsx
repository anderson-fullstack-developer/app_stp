import { createFileRoute } from "@tanstack/react-router";
import { BackButton } from "@/components/app/BackButton";
import { EmptyState, LoadingState } from "@/components/app/Primitives";
import { useNotifications } from "@/hooks/use-service";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Língua STP" },
      { name: "description", content: "Sequências, desafios de amigos e novidades." },
      { property: "og:title", content: "Notificações — Língua STP" },
      { property: "og:description", content: "As tuas notificações." },
    ],
  }),
  component: () => {
    const { data } = useNotifications();
    return (
      <PhoneFrame>
        <AppHeader left={<BackButton />} title="Notificações" />
        <main className="flex-1 space-y-2 px-4 pb-8">
          {!data ? <LoadingState /> : data.length === 0 ? <EmptyState title="Tudo em dia" /> : data.map((n) => (
            <div key={n.id} className={cn("flex items-center gap-3 rounded-2xl p-3.5", n.read ? "bg-surface" : "bg-primary/8 ring-2 ring-primary/30")}>
              <span className="grid size-11 place-items-center rounded-2xl bg-muted text-2xl">{n.icon}</span>
              <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.time}</p></div>
              {!n.read && <span className="size-2.5 rounded-full bg-primary" aria-label="Não lida" />}
            </div>
          ))}
        </main>
      </PhoneFrame>
    );
  },
});
