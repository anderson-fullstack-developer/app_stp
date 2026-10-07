import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAdminDB } from "@/services/admin";
import { PageHeader, Panel, StatusBadge } from "@/admin/ui";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin/search")({
  validateSearch: (s: Record<string, unknown>): { q: string } => ({
    q: typeof s["q"] === "string" ? s["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: `Pesquisa — Admin ${APP_NAME}` },
      { name: "description", content: "Pesquisa global no painel." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const db = useAdminDB();
  const m = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  const groups: {
    title: string;
    to: string;
    items: { id: string; label: ReactNode; status?: string }[];
  }[] = [
    {
      title: "Palavras",
      to: "/admin/vocabulary",
      items: db.vocabulary
        .filter((w) => m(w.word) || m(w.translation))
        .map((w) => ({ id: w.id, label: `${w.word} — ${w.translation}`, status: w.status })),
    },
    {
      title: "Frases",
      to: "/admin/phrases",
      items: db.phrases
        .filter((p) => m(p.original) || m(p.translation))
        .map((p) => ({ id: p.id, label: p.original, status: p.status })),
    },
    {
      title: "Lições",
      to: "/admin/lessons",
      items: db.lessons
        .filter((l) => m(l.title))
        .map((l) => ({
          id: l.id,
          label: `${db.units.find((u) => u.id === l.unitId)?.title} · ${l.title}`,
          status: l.status,
        })),
    },
    {
      title: "Perguntas",
      to: "/admin/exercises",
      items: db.exercises
        .filter((e) => m(e.question))
        .map((e) => ({ id: e.id, label: e.question, status: e.status })),
    },
    {
      title: "Utilizadores",
      to: "/admin/users",
      items: db.users
        .filter((u) => m(u.username) || m(u.email))
        .map((u) => ({ id: u.id, label: `@${u.username}`, status: u.status })),
    },
    {
      title: "Partidas",
      to: "/admin/multiplayer",
      items: db.matches
        .filter((x) => m(x.id) || m(x.winner))
        .map((x) => ({ id: x.id, label: `${x.id} · ${x.mode}`, status: x.state })),
    },
  ];
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <>
      <PageHeader title={`Pesquisa: “${q}”`} description={`${total} resultados`} />
      <div className="grid gap-4 lg:grid-cols-2">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <Panel
              key={g.title}
              title={`${g.title} (${g.items.length})`}
              actions={
                <Link to={g.to} className="text-xs font-semibold text-primary">
                  Abrir
                </Link>
              }
            >
              <ul className="space-y-1.5 text-sm">
                {g.items.slice(0, 8).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{i.label}</span>
                    {i.status && <StatusBadge status={i.status} />}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
      </div>
      {total === 0 && <p className="text-sm text-muted-foreground">Sem resultados.</p>}
    </>
  );
}
