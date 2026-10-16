import { ServerSearch } from "@/components/play/ServerArena";
import { useBlockAds } from "@/config/ads";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/play/search")({
  head: () => ({
    meta: [
      { title: `Procurar partida — ${APP_NAME}` },
      {
        name: "description",
        content: "Sobrevivência online com jogadores de todo o mundo. A partida começa sozinha.",
      },
      { property: "og:title", content: `Procurar partida — ${APP_NAME}` },
      { property: "og:description", content: "Joga contra pessoas reais." },
    ],
  }),
  component: Search,
});

/** Com sessão, a fila real do servidor; sem sessão, a demonstração (com bots). */
function Search() {
  useBlockAds("multiplayer");
  const server = useServerLessonsEnabled();
  return server ? <ServerSearch /> : <Navigate to="/play/survival" />;
}
