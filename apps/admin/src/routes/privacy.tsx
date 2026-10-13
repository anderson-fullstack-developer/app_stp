import { APP_NAME } from "@stp/config";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/app/LegalPage";

export const Route = createFileRoute("/privacy")({
  validateSearch: (s: Record<string, unknown>): { lang?: string } =>
    typeof s["lang"] === "string" ? { lang: s["lang"] } : {},
  head: () => ({
    meta: [
      { title: `Política de Privacidade — ${APP_NAME}` },
      {
        name: "description",
        content: `Que dados o ${APP_NAME} recolhe, para quê e como os apagar.`,
      },
      { property: "og:title", content: `Política de Privacidade — ${APP_NAME}` },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { lang } = Route.useSearch();
  return <LegalPage kind="privacy" lang={lang} />;
}
