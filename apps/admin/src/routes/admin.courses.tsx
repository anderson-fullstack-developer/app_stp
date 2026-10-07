import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useAdminDB } from "@/services/admin";
import { Btn, PageHeader, Panel, Select, StatusBadge } from "@/admin/ui";
import { adminCourseService } from "@/services/admin";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({
    meta: [
      { title: "Estrutura do curso — Admin Língua STP" },
      { name: "description", content: "Editor hierárquico: língua, curso, unidade e lição." },
    ],
  }),
  component: Courses,
});

function Courses() {
  const db = useAdminDB();
  const [lang, setLang] = useState("forro");
  const language = db.languages.find((l) => l.id === lang);
  const courses = db.courses.filter((c) => c.languageId === lang).sort((a, b) => a.order - b.order);
  return (
    <>
      <PageHeader
        title="Estrutura do curso"
        description="Reorganiza unidades e lições com as setas."
        actions={
          <Select
            value={lang}
            onChange={setLang}
            options={db.languages.map((l) => ({ value: l.id, label: l.name }))}
            className="w-56"
          />
        }
      />
      <Panel title={language?.name ?? ""}>
        {courses.length === 0 && (
          <p className="text-sm text-muted-foreground">Ainda sem cursos para esta língua.</p>
        )}
        <div className="space-y-4">
          {courses.map((c) => (
            <div key={c.id} className="rounded-lg border">
              <p className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 font-semibold">
                <ChevronRight className="size-4" />
                {c.title}
              </p>
              <div className="space-y-3 p-3">
                {db.units
                  .filter((u) => u.courseId === c.id)
                  .sort((a, b) => a.order - b.order)
                  .map((u) => (
                    <div key={u.id} className="rounded-lg border">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 text-sm font-semibold">{u.title}</span>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => adminCourseService.moveUnit(u.id, -1)}
                          aria-label="Subir unidade"
                        >
                          <ArrowUp className="size-3.5" />
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => adminCourseService.moveUnit(u.id, 1)}
                          aria-label="Descer unidade"
                        >
                          <ArrowDown className="size-3.5" />
                        </Btn>
                      </div>
                      <ul className="border-t">
                        {db.lessons
                          .filter((l) => l.unitId === u.id)
                          .sort((a, b) => a.order - b.order)
                          .map((l) => (
                            <li
                              key={l.id}
                              className="flex items-center gap-2 border-b px-3 py-1.5 pl-8 text-sm last:border-b-0"
                            >
                              <span className="w-6 text-xs text-muted-foreground">{l.order}</span>
                              <Link
                                to="/admin/lessons/$lessonId"
                                params={{ lessonId: l.id }}
                                className="flex-1 font-medium hover:text-primary"
                              >
                                {l.title}
                              </Link>
                              <StatusBadge status={l.status} />
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => adminCourseService.moveLesson(l.id, -1)}
                                aria-label="Subir lição"
                              >
                                <ArrowUp className="size-3.5" />
                              </Btn>
                              <Btn
                                variant="ghost"
                                size="sm"
                                onClick={() => adminCourseService.moveLesson(l.id, 1)}
                                aria-label="Descer lição"
                              >
                                <ArrowDown className="size-3.5" />
                              </Btn>
                            </li>
                          ))}
                      </ul>
                      <div className="px-3 py-2">
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => adminCourseService.addLesson(u.id)}
                        >
                          <Plus className="size-3.5" />
                          Adicionar lição
                        </Btn>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
