import { createFileRoute, Navigate } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import { ServerDailyPlay } from "@/components/app/ServerDaily";
import { useServerLessonsEnabled } from "@/hooks/use-server-lessons";

/** Jogar o desafio do dia (só com sessão: o servidor corrige e paga). */
export const Route = createFileRoute("/daily_/play")({
  head: () => ({ meta: [{ title: `Desafio do Dia — ${APP_NAME}` }] }),
  component: DailyPlay,
});

function DailyPlay() {
  const server = useServerLessonsEnabled();
  if (!server) return <Navigate to="/daily" />;
  return <ServerDailyPlay />;
}
