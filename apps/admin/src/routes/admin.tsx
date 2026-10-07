import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Língua STP" },
      {
        name: "description",
        content: "Painel de gestão de conteúdo, utilizadores e multiplayer da Língua STP.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminShell,
});
