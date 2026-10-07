import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AuthScreen, LoginLink } from "@/admin/AuthScreen";

export const Route = createFileRoute("/admin_/forbidden")({
  head: () => ({
    meta: [
      { title: "Acesso proibido — Admin Língua STP" },
      { name: "description", content: "O teu perfil não tem permissão para esta área." },
      { property: "og:title", content: "Acesso proibido — Admin Língua STP" },
      { property: "og:description", content: "O teu perfil não tem permissão para esta área." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthScreen
      icon={<ShieldAlert className="size-10 text-destructive" />}
      title="Acesso proibido"
      text="O teu perfil não tem permissão para esta área."
    >
      <LoginLink />
    </AuthScreen>
  );
}
