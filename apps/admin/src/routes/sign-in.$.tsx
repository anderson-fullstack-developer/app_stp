import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AuthScreen } from "@/components/app/AuthScreen";

export const Route = createFileRoute("/sign-in/$")({
  component: Page,
});

/** Login real (Clerk): email + palavra-passe, código por email, Google e recuperação. */
function Page() {
  const { t } = useTranslation();
  return (
    <AuthScreen title={t("login.title")}>
      <SignIn signUpUrl="/onboarding" forceRedirectUrl="/learn" />
    </AuthScreen>
  );
}
