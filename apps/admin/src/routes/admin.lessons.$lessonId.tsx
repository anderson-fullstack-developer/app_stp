import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAdminDB } from "@/services/admin";
import type { AdminLesson, ContentStatus, Difficulty } from "@/admin/types";
import { Btn, Field, PageHeader, Panel, Select, StatusBadge, TextArea, TextInput } from "@/admin/ui";
import { adminLessonService } from "@/services/admin";

export const Route = createFileRoute("/admin/lessons/$lessonId")({
  head: () => ({ meta: [{ title: "Editor de lição — Admin Língua STP" }, { name: "description", content: "Editar lição e exercícios associados." }] }),
  component: LessonEditor,
});

function LessonEditor() {
  const { lessonId } = Route.useParams();
  const db = useAdminDB();
  const lesson = db.lessons.find((l) => l.id === lessonId);
  if (!lesson) return <p className="text-sm text-muted-foreground">Lição não encontrada. <Link to="/admin/lessons" className="text-primary">Voltar</Link></p>;
  return <Editor key={lesson.id} lesson={lesson} />;
}

function Editor({ lesson }: { lesson: AdminLesson }) {
  const db = useAdminDB();
  const [f, setF] = useState(lesson);
  const set = <K extends keyof AdminLesson>(k: K, v: AdminLesson[K]) => setF({ ...f, [k]: v });
  const unit = db.units.find((u) => u.id === f.unitId);
  const course = db.courses.find((c) => c.id === unit?.courseId);
  const exercises = db.exercises.filter((e) => e.lessonId === f.id);
  return (
    <>
      <Link to="/admin/lessons" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Lições</Link>
      <PageHeader title={f.title} description={`${course?.title} · ${unit?.title}`} actions={<Btn onClick={async () => { await adminLessonService.save(f); toast.success("Lição guardada"); }}>Guardar</Btn>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Detalhes">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Título" className="col-span-2"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Descrição" className="col-span-2"><TextArea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Língua"><TextInput disabled value={db.languages.find((l) => l.id === course?.languageId)?.name ?? ""} /></Field>
            <Field label="Curso"><TextInput disabled value={course?.title ?? ""} /></Field>
            <Field label="Unidade"><Select value={f.unitId} onChange={(v) => set("unitId", v)} options={db.units.map((u) => ({ value: u.id, label: u.title }))} /></Field>
            <Field label="Dificuldade"><Select<Difficulty> value={f.difficulty} onChange={(v) => set("difficulty", v)} options={["Fácil", "Média", "Difícil"]} /></Field>
            <Field label="Ordem"><TextInput type="number" value={f.order} onChange={(e) => set("order", Number(e.target.value))} /></Field>
            <Field label="XP" hint="Valor provisório, configurável."><TextInput type="number" value={f.xp} onChange={(e) => set("xp", Number(e.target.value))} /></Field>
            <Field label="Duração estimada (min)"><TextInput type="number" value={f.minutes} onChange={(e) => set("minutes", Number(e.target.value))} /></Field>
            <Field label="Status"><Select<ContentStatus> value={f.status} onChange={(v) => set("status", v)} options={["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]} /></Field>
          </div>
        </Panel>
        <Panel title={`Exercícios (${exercises.length})`} actions={<Link to="/admin/exercises"><Btn size="sm"><Plus className="size-3.5" />Adicionar exercício</Btn></Link>}>
          <ul className="space-y-2">
            {exercises.map((e) => (
              <li key={e.id} className="rounded-lg border p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2"><code className="text-[11px]">{e.type}</code><StatusBadge status={e.status} /></div>
                <p className="mt-1 font-medium">{e.question}</p>
              </li>
            ))}
            {exercises.length === 0 && <p className="text-sm text-muted-foreground">Sem exercícios associados.</p>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
