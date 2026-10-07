import { OfflineBanner } from "@/components/app/States";
import { isFeatureOn } from "@stp/config";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Swords, Trophy, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Phone-sized frame: full-screen on mobile, centered device column on larger screens. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh w-full bg-muted sm:py-6">
      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-background sm:min-h-[860px] sm:rounded-[2.5rem] sm:shadow-float sm:ring-1 sm:ring-border/70",
          className,
        )}
      >
        <OfflineBanner />
        {children}
      </div>
    </div>
  );
}

const NAV = [
  { to: "/learn", label: "Aprender", icon: BookOpen },
  { to: "/challenges", label: "Jogar", icon: Swords },
  { to: "/friends", label: "Amigos", icon: Users },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function BottomNavigation() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="z-30 shrink-0 border-t border-border/70 bg-surface/85 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl backdrop-saturate-150"
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5 px-1 pt-2">
        {NAV.filter((n) => n.to !== "/challenges" || isFeatureOn("multiplayer")).map(
          ({ to, label, icon: Icon }) => {
            const active = path.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => sound.play("tap")}
                  className="group flex flex-col items-center gap-1 py-1"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      active
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground group-active:scale-90",
                    )}
                  >
                    <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}

export function AppHeader({
  title,
  left,
  right,
}: {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/80 px-4 backdrop-blur-xl backdrop-saturate-150 safe-top box-content">
      <div className="flex min-w-10 items-center">{left}</div>
      <div className="flex-1 truncate text-center font-display text-[17px] font-bold tracking-[-0.01em]">
        {title}
      </div>
      <div className="flex min-w-10 items-center justify-end gap-2">{right}</div>
    </header>
  );
}

/**
 * Layout dos ecrãs com tabs. Como numa app nativa: a moldura tem a altura exata do ecrã,
 * só o conteúdo faz scroll e o cabeçalho e a barra inferior ficam sempre visíveis.
 * (Antes a barra era "sticky" dentro de um contentor com overflow-hidden — não colava ao
 * fundo e desaparecia nas páginas compridas.)
 */
export function TabLayout({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <PhoneFrame className="h-dvh min-h-0 sm:h-[min(860px,calc(100dvh-3rem))] sm:min-h-0">
      {header && <div className="shrink-0">{header}</div>}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </main>
      <BottomNavigation />
    </PhoneFrame>
  );
}
