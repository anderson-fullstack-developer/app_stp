import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/admin/AdminShell";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `Admin — ${APP_NAME}` },
      {
        name: "description",
        content: `Painel de gestão de conteúdo, utilizadores e multiplayer da ${APP_NAME}.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminShell,
});
