import { useAuth } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BackButton } from "@/components/app/BackButton";
import { AppButton } from "@/components/app/Buttons";
import { LoadingState } from "@/components/app/Primitives";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

/** Moldura das áreas de gravação: só com sessão (são para pessoas convidadas). */
export function VoicePage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={title} />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        {!isLoaded ? (
          <LoadingState />
        ) : !isSignedIn ? (
          <Link to="/sign-in/$" params={{ _splat: "" }}>
            <AppButton>
              <LogIn className="size-5" />
              {t("login.submit")}
            </AppButton>
          </Link>
        ) : (
          children
        )}
      </main>
    </PhoneFrame>
  );
}
