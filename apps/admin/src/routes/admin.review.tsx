import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HistoryList, PlayButton, ReviewActions } from "@/admin/content";
import { useAdminDB } from "@/services/admin";
import type { ContentItem, ContentStatus } from "@/admin/types";
import { DataTable, Drawer, PageHeader, StatusBadge, type Column } from "@/admin/ui";
import { KIND_LABEL, contentTitle, contentTranslation, fmtDateTime } from "@/admin/format";

type S = Extract<ContentStatus, "UNDER_REVIEW" | "APPROVED" | "REJECTED">;
export const Route = createFileRoute("/admin/review")({
  validateSearch: (s: Record<string, unknown>): { status: S } => ({
    status: s["status"] === "APPROVED" || s["status"] === "REJECTED" ? s["status"] : "UNDER_REVIEW",
  }),
  head: () => ({
    meta: [
      { title: "Fila de revisão — Admin Língua STP" },
      { name: "description", content: "Rever, aprovar ou rejeitar conteúdo linguístico." },
    ],
  }),
  component: Review,
});

const TITLE: Record<S, string> = {
  UNDER_REVIEW: "Fila de revisão — Pendentes",
  APPROVED: "Conteúdo aprovado",
  REJECTED: "Conteúdo rejeitado",
};

function Review() {
  const { status } = Route.useSearch();
  const db = useAdminDB();
  const [openId, setOpenId] = useState<string | null>(null);
  const all: ContentItem[] = [...db.vocabulary, ...db.phrases, ...db.exercises];
  const rows = all
    .filter((c) => c.status === status)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = all.find((c) => c.id === openId) ?? null;
  const audio = open?.audioId ? db.audios.find((a) => a.id === open.audioId) : null;

  const columns: Column<ContentItem>[] = [
    {
      key: "k",
      header: "Tipo",
      cell: (c) => (
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {KIND_LABEL[c.kind]}
          {c.aiGenerated && " · IA"}
        </span>
      ),
    },
    {
      key: "t",
      header: "Conteúdo",
      cell: (c) => <span className="font-medium">{contentTitle(c)}</span>,
    },
    { key: "tr", header: "Tradução / resposta", cell: (c) => contentTranslation(c) },
    { key: "a", header: "Autor", cell: (c) => c.author },
    { key: "r", header: "Revisor", cell: (c) => c.reviewer ?? "—" },
    { key: "d", header: "Data", cell: (c) => fmtDateTime(c.updatedAt) },
    { key: "s", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={TITLE[status]}
        description="Somente conteúdo APPROVED poderá aparecer na aplicação."
        actions={(["UNDER_REVIEW", "APPROVED", "REJECTED"] as S[]).map((s) => (
          <Link
            key={s}
            to="/admin/review"
            search={{ status: s }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${s === status ? "bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {s === "UNDER_REVIEW" ? "Pendentes" : s === "APPROVED" ? "Aprovados" : "Rejeitados"} (
            {all.filter((c) => c.status === s).length})
          </Link>
        ))}
      />
      <DataTable
        rows={rows}
        columns={columns}
        onRowClick={(c) => setOpenId(c.id)}
        empty="Nada nesta fila."
      />
      {open && (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          title={`${KIND_LABEL[open.kind]} · ${open.id}`}
          wide
        >
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Item label="Conteúdo" value={contentTitle(open)} />
            <Item label="Tradução" value={contentTranslation(open)} />
            {open.kind === "exercise" && (
              <Item
                label="Opções"
                value={open.options
                  .map((o, i) => `${"ABCD"[i]}) ${o}${i === open.correctIndex ? " ✓" : ""}`)
                  .join("  ·  ")}
                wide
              />
            )}
            <Item label="Fonte" value={open.source || "—"} />
            <Item label="Autor" value={open.author} />
            <Item label="Notas" value={open.notes || "—"} wide />
            <Item label="Data" value={fmtDateTime(open.updatedAt)} />
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Áudio</dt>
              <dd className="mt-1">
                {audio ? (
                  <span className="flex items-center gap-2">
                    <PlayButton seconds={audio.seconds} />
                    {audio.file}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          <ReviewActions item={open} />
          <div>
            <p className="mb-2 text-sm font-semibold">Histórico</p>
            <HistoryList item={open} />
          </div>
        </Drawer>
      )}
    </>
  );
}

const Item = ({ label, value, wide }: { label: string; value: string; wide?: boolean }) => (
  <div className={wide ? "col-span-2" : ""}>
    <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 font-medium">{value}</dd>
  </div>
);
