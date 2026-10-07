import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/app/Brand";
import { APP_CONFIG } from "@stp/config";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, permissionFor } from "./nav";
import { can, ROLE_LABEL } from "./permissions";
import { adminAuth, useAdminSession } from "./store";
import type { AdminRole } from "./types";
import { Btn, Select } from "./ui";

export function AdminShell() {
  const hydrated = useHydrated();
  const session = useAdminSession();
  const navigate = useNavigate();
  const loc = useRouterState({ select: (s) => s.location });
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!session) navigate({ to: "/admin/unauthorized" });
    else if (session.expiresAt < Date.now()) navigate({ to: "/admin/session-expired" });
  }, [hydrated, session, navigate]);

  if (!hydrated || !session || session.expiresAt < Date.now()) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted text-sm text-muted-foreground">
        A carregar painel…
      </div>
    );
  }

  const allowed = can(session.role, permissionFor(loc.pathname));
  const search = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/admin/search", search: { q: q.trim() } });
  };
  const status = (loc.search as Record<string, unknown>)["status"];

  return (
    <div className="flex min-h-screen w-full bg-muted text-foreground">
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-surface transition-[width]",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <LogoMark size={32} />
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">{APP_CONFIG.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Admin
              </p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label="Navegação do Admin">
          {ADMIN_NAV.map((g, gi) => {
            const items = g.items.filter((i) => can(session.role, i.perm));
            if (!items.length) return null;
            return (
              <div key={gi}>
                {g.label && !collapsed && (
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {g.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map((i) => {
                    const active = i.search
                      ? loc.pathname === i.to && status === i.search["status"]
                      : i.to === "/admin"
                        ? loc.pathname === "/admin" || loc.pathname === "/admin/"
                        : loc.pathname.startsWith(i.to);
                    return (
                      <li key={i.label}>
                        <Link
                          to={i.to}
                          search={i.search as never}
                          title={i.label}
                          className={cn(
                            "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/80 hover:bg-muted",
                            collapsed && "justify-center",
                          )}
                        >
                          <i.icon className="size-4 shrink-0" />
                          {!collapsed && <span className="truncate">{i.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-11 items-center justify-center gap-2 border-t text-sm text-muted-foreground hover:bg-muted"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              Recolher
            </>
          )}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-surface/95 px-5 backdrop-blur">
          <form onSubmit={search} className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar palavras, frases, lições, perguntas, utilizadores, partidas…"
              className="h-9 w-full rounded-lg border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:bg-surface focus:ring-2 focus:ring-ring/30"
              aria-label="Pesquisa global"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground lg:inline">Perfil (demo):</span>
            <Select<AdminRole>
              value={session.role}
              onChange={(r) => adminAuth.switchRole(r)}
              className="h-8 w-44 text-xs"
              options={(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
            <div className="hidden text-right leading-tight md:block">
              <p className="text-sm font-semibold">{session.email}</p>
              <p className="text-[11px] text-muted-foreground">{session.role}</p>
            </div>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                adminAuth.logout();
                navigate({ to: "/admin/login" });
              }}
              aria-label="Terminar sessão"
            >
              <LogOut className="size-4" />
            </Btn>
          </div>
        </header>
        <main className="flex-1 p-6">
          {allowed ? <Outlet /> : <ForbiddenInline role={session.role} />}
        </main>
      </div>
    </div>
  );
}

function ForbiddenInline({ role }: { role: AdminRole }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-surface p-8 text-center">
      <ShieldAlert className="mx-auto size-10 text-destructive" />
      <h1 className="mt-3 text-xl font-bold">Acesso proibido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O perfil {ROLE_LABEL[role]} não tem permissão para esta área.
      </p>
      <Link to="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
