import { createFileRoute } from "@tanstack/react-router";
import { TimerOff } from "lucide-react";
import { AuthScreen, LoginLink } from "@/admin/AuthScreen";

export const Route = createFileRoute("/admin_/session-expired")({
  head: () => ({
    meta: [
      { title: "Sessão expirada — Admin Língua STP" },
      { name: "description", content: "Por segurança a tua sessão terminou. Inicia sessão novamente." },
      { property: "og:title", content: "Sessão expirada — Admin Língua STP" },
      { property: "og:description", content: "Por segurança a tua sessão terminou. Inicia sessão novamente." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthScreen icon={<TimerOff className="size-10 text-destructive" />} title="Sessão expirada" text="Por segurança a tua sessão terminou. Inicia sessão novamente.">
      <LoginLink />
    </AuthScreen>
  );
}
