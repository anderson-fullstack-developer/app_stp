import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogoMark } from "@/components/app/Brand";
import { AppButton } from "@/components/app/Buttons";
import { PhoneFrame } from "@/layouts/AppShell";
import { authService } from "@/services";
import { Field, GoogleG } from "./onboarding";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Língua STP" },
      { name: "description", content: "Entra na tua conta Língua STP e continua a aprender." },
      { property: "og:title", content: "Entrar — Língua STP" },
      { property: "og:description", content: "Entra e continua a tua sequência." },
    ],
  }),
  component: Login,
});

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    await authService.signIn({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    navigate({ to: "/learn" });
  };
  return (
    <PhoneFrame>
      <div className="bg-forest pattern-leaf rounded-b-[3rem] px-6 pb-10 pt-14 text-center safe-top">
        <LogoMark size={72} className="mx-auto animate-pop" />
        <h1 className="mt-4 font-display text-3xl font-bold text-primary-foreground">
          {t("login.title")}
        </h1>
        <p className="mt-1 text-sm text-primary-foreground/80">{t("login.subtitle")} 🔥</p>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col px-5 pt-8">
        <div className="space-y-3">
          <Field name="email" type="email" label={t("register.email")} autoComplete="email" />
          <Field
            name="password"
            type="password"
            label={t("register.password")}
            autoComplete="current-password"
          />
          <button type="button" className="text-sm font-bold text-primary">
            {t("login.forgot")}
          </button>
        </div>
        <div className="mt-auto space-y-3 pb-6 pt-8 safe-bottom">
          <AppButton type="submit" disabled={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={() => navigate({ to: "/learn" })}>
            <GoogleG />
            {t("register.google")}
          </AppButton>
          <Link to="/onboarding" className="block text-center text-sm font-bold text-primary">
            {t("login.createAccount")}
          </Link>
        </div>
      </form>
    </PhoneFrame>
  );
}
