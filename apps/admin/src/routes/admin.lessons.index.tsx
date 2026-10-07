import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAdminDB } from "@/services/admin";
import type { AdminLesson } from "@/admin/types";
import { DataTable, PageHeader, StatusBadge, type Column } from "@/admin/ui";

export const Route = createFileRoute("/admin/lessons/")({
  head: () => ({
    meta: [
      { title: "Lições — Admin Língua STP" },
      { name: "description", content: "Lista e editor de lições." },
    ],
  }),
  component: Lessons,
});

function Lessons() {
  const db = useAdminDB();
  const navigate = useNavigate();
  const unit = (id: string) => db.units.find((u) => u.id === id);
  const course = (id: string) => db.courses.find((c) => c.id === unit(id)?.courseId);
  const columns: Column<AdminLesson>[] = [
    { key: "t", header: "Título", cell: (l) => <span className="font-medium">{l.title}</span> },
    { key: "c", header: "Curso", cell: (l) => course(l.unitId)?.title },
    { key: "u", header: "Unidade", cell: (l) => unit(l.unitId)?.title },
    { key: "d", header: "Dificuldade", cell: (l) => l.difficulty },
    { key: "x", header: "XP", cell: (l) => l.xp },
    {
      key: "e",
      header: "Exercícios",
      cell: (l) => db.exercises.filter((e) => e.lessonId === l.id).length,
    },
    { key: "s", header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
  ];
  return (
    <>
      <PageHeader title="Lições" />
      <DataTable
        rows={db.lessons}
        columns={columns}
        onRowClick={(l) => navigate({ to: "/admin/lessons/$lessonId", params: { lessonId: l.id } })}
      />
    </>
  );
}
