import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/app/Brand";
import { APP_CONFIG } from "@/config/app";

export function AuthScreen({ icon, title, text, children }: { icon?: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2"><LogoMark size={36} /><div className="leading-tight"><p className="font-display font-bold">{APP_CONFIG.name}</p><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Admin</p></div></div>
        {icon && <div className="mb-3">{icon}</div>}
        <h1 className="text-xl font-bold">{title}</h1>
        {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export const LoginLink = ({ label = "Iniciar sessão" }: { label?: string }) => (
  <Link to="/admin/login" className="flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-deep">{label}</Link>
);
