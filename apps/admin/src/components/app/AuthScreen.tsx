import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/app/Brand";
import { PhoneFrame } from "@/layouts/AppShell";

/** Moldura dos ecrãs de autenticação do Clerk (login, registo direto). */
export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
      <div className="bg-forest pattern-leaf rounded-b-[3rem] px-6 pb-10 pt-14 text-center">
        <LogoMark size={64} className="mx-auto animate-pop" />
        <h1 className="mt-4 font-display text-3xl font-bold text-primary-foreground">{title}</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">{t("login.subtitle")} 🔥</p>
      </div>
      <div className="flex flex-1 justify-center px-4 pb-8 pt-6">{children}</div>
    </PhoneFrame>
  );
}
