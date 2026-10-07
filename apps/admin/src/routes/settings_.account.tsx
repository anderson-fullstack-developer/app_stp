import { UserProfile } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BackButton } from "@/components/app/BackButton";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

/**
 * Gestão da conta (Clerk): nome e foto, email, palavra-passe, contas ligadas (Google),
 * sessões ativas e eliminar conta — este último é obrigatório na Google Play.
 */
export const Route = createFileRoute("/settings_/account")({
  component: AccountPage,
});

function AccountPage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={t("settings.account")} />
      <main className="flex flex-1 justify-center px-2 pb-8">
        <UserProfile routing="hash" />
      </main>
    </PhoneFrame>
  );
}
