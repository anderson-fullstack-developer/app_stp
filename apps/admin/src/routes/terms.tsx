import { APP_NAME } from "@stp/config";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/app/LegalPage";

export const Route = createFileRoute("/terms")({
  validateSearch: (s: Record<string, unknown>): { lang?: string } =>
    typeof s["lang"] === "string" ? { lang: s["lang"] } : {},
  head: () => ({
    meta: [
      { title: `Termos de Utilização — ${APP_NAME}` },
      { name: "description", content: `As regras para usar o ${APP_NAME}.` },
      { property: "og:title", content: `Termos de Utilização — ${APP_NAME}` },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { lang } = Route.useSearch();
  return <LegalPage kind="terms" lang={lang} />;
}
