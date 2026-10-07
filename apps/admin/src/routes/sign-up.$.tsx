import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AuthScreen } from "@/components/app/AuthScreen";

export const Route = createFileRoute("/sign-up/$")({
  component: Page,
});

/** Registo direto (quem chega sem passar pelo onboarding). */
function Page() {
  const { t } = useTranslation();
  return (
    <AuthScreen title={t("register.title")}>
      <SignUp signInUrl="/sign-in" forceRedirectUrl="/learn" />
    </AuthScreen>
  );
}
