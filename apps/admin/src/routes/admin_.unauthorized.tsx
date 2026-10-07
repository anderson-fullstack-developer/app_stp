import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AuthScreen, LoginLink } from "@/admin/AuthScreen";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin_/unauthorized")({
  head: () => ({
    meta: [
      { title: `Não autenticado — Admin ${APP_NAME}` },
      { name: "description", content: "Precisas de iniciar sessão para aceder ao painel." },
      { property: "og:title", content: `Não autenticado — Admin ${APP_NAME}` },
      { property: "og:description", content: "Precisas de iniciar sessão para aceder ao painel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthScreen
      icon={<Lock className="size-10 text-destructive" />}
      title="Não autenticado"
      text="Precisas de iniciar sessão para aceder ao painel."
    >
      <LoginLink />
    </AuthScreen>
  );
}
