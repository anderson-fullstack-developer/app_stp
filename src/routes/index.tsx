import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/app/Brand";
import { PhoneFrame } from "@/layouts/AppShell";
import { APP_CONFIG } from "@/config/app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_CONFIG.name} — Aprende Forro e as línguas de São Tomé e Príncipe` },
      { name: "description", content: "Aprende as línguas de São Tomé e Príncipe com lições, jogos, amigos e desafios." },
      { property: "og:title", content: `${APP_CONFIG.name} — ${APP_CONFIG.tagline}` },
      { property: "og:description", content: "Aprende as línguas de São Tomé e Príncipe com lições, jogos e amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => { const t = setTimeout(() => navigate({ to: "/onboarding" }), 2200); return () => clearTimeout(t); }, [navigate]);
  return (
    <PhoneFrame className="bg-forest pattern-leaf">
      <button onClick={() => navigate({ to: "/onboarding" })} className="flex flex-1 flex-col items-center justify-center" aria-label="Entrar">
        <div className="animate-pop"><Logo light /></div>
        <div className="mt-16 flex gap-1.5">
          {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${i * 0.2}s` }} />)}
        </div>
      </button>
    </PhoneFrame>
  );
}
