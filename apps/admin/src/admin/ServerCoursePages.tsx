/**
 * Painel ligado ao servidor: cursos → unidades → lições → exercícios (palavras), e a parte
 * da fila de revisão para lições e exercícios. Tudo o que se cria fica em rascunho; só a
 * revisão por outra pessoa aprova (o servidor volta a verificar cada regra).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, BookOpen, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/services/http";
import { fmtDateTime } from "./format";
import {
  adminApi,
  type CourseTree,
  type LessonDetail,
  type ReviewItems,
  type ServerContentStatus,
  useLanguageOptions,
  useServerAdmin,
} from "./server";
import {
  Btn,
  type Column,
  DataTable,
  Drawer,
  Field,
  FilterBar,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "./ui";

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const m = (e.body as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(m)) return m.join(" ");
    if (m) return m;
  }
  return "Não foi possível. Tenta outra vez.";
}

const ErrorNote = ({ error }: { error: unknown }) =>
  error ? (
    <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
      {errorText(error)}
    </p>
  ) : null;

/** Língua escolhida no painel (lembrada só neste navegador, por conveniência). */
function useLanguagePick() {
  const languages = useLanguageOptions();
  const [picked, setPicked] = useState<string>(() => {
    try {
      return localStorage.getItem("falaneto:admin-language") ?? "";
    } catch {
      return "";
    }
  });
  const languageId = picked || languages[0]?.value || "";
  const pick = (v: string) => {
    setPicked(v);
    try {
      localStorage.setItem("falaneto:admin-language", v);
    } catch {
      /* sem armazenamento: só não fica lembrado */
    }
  };
  return { languages, languageId, pick };
}

const canPublish = (role: string | undefined) =>
  role === "LINGUIST" || role === "ADMIN" || role === "SUPER_ADMIN";

/* ------------------------------ Cursos e unidades ------------------------------ */

export function ServerCourses() {
  const qc = useQueryClient();
  const { languages, languageId, pick } = useLanguagePick();
  const role = useServerAdmin().session?.role;
  const tree = useQuery({
    queryKey: ["admin", "courses", languageId],
    queryFn: () => adminApi.courseTree(languageId),
    enabled: Boolean(languageId),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "courses"] });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
  });
  const [creating, setCreating] = useState<
    | { kind: "course" }
    | { kind: "unit"; courseId: string }
    | { kind: "lesson"; unitId: string }
    | null
  >(null);

  const setStatus = (
    kind: "courses" | "units",
    id: string,
    status: "DRAFT" | "APPROVED" | "ARCHIVED",
  ) => act.mutate(() => adminApi.updateContainer(kind, id, { status }));
  /** Troca duas unidades de lugar e renumera todas (0, 1, 2…): nunca ficam ordens repetidas. */
  const swapUnits = (course: CourseTree, i: number, j: number) => {
    const ids = course.units.map((u) => u.id);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    act.mutate(async () => {
      for (const [order, id] of ids.entries()) {
        await adminApi.updateContainer("units", id, { order });
      }
    });
  };

  return (
    <>
      <PageHeader
        title="Cursos e unidades"
        description="Estrutura do curso de cada língua. Cursos e unidades publicam-se aqui (linguistas/administradores); as lições e palavras passam pela revisão."
        actions={
          <Btn onClick={() => setCreating({ kind: "course" })} disabled={!languageId}>
            <Plus className="size-4" />
            Novo curso
          </Btn>
        }
      />
      <FilterBar>
        <Select value={languageId} onChange={pick} className="w-72" options={languages} />
      </FilterBar>
      <ErrorNote error={tree.error ?? act.error} />
      {tree.isPending ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : (tree.data ?? []).length === 0 ? (
        <Panel>
          <p className="text-sm text-muted-foreground">
            Esta língua ainda não tem cursos. Cria o primeiro com “Novo curso”.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {(tree.data ?? []).map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              publish={canPublish(role)}
              busy={act.isPending}
              onStatus={setStatus}
              onSwap={(i, j) => swapUnits(c, i, j)}
              onNewUnit={() => setCreating({ kind: "unit", courseId: c.id })}
              onNewLesson={(unitId) => setCreating({ kind: "lesson", unitId })}
            />
          ))}
        </div>
      )}
      {creating && (
        <CreateDrawer
          target={creating}
          languageId={languageId}
          onClose={() => setCreating(null)}
          onDone={() => {
            setCreating(null);
            void refresh();
          }}
        />
      )}
    </>
  );
}

function CourseCard({
  course,
  publish,
  busy,
  onStatus,
  onSwap,
  onNewUnit,
  onNewLesson,
}: {
  course: CourseTree;
  publish: boolean;
  busy: boolean;
  onStatus: (kind: "courses" | "units", id: string, s: "DRAFT" | "APPROVED" | "ARCHIVED") => void;
  onSwap: (i: number, j: number) => void;
  onNewUnit: () => void;
  onNewLesson: (unitId: string) => void;
}) {
  const lessons = course.units.flatMap((u) => u.lessons);
  return (
    <Panel
      title={`${course.title} · ${course.units.length} unidades · ${lessons.length} lições`}
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge status={course.status} />
          <PublishButtons
            enabled={publish}
            busy={busy}
            status={course.status}
            onStatus={(s) => onStatus("courses", course.id, s)}
          />
          <Btn size="sm" variant="outline" onClick={onNewUnit}>
            <Plus className="size-3.5" />
            Unidade
          </Btn>
        </div>
      }
    >
      {course.units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem unidades ainda.</p>
      ) : (
        <div className="space-y-3">
          {course.units.map((u, i) => (
            <div key={u.id} className="rounded-lg border">
              <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <span className="text-lg">{u.icon ?? "📘"}</span>
                <span className="font-semibold">{u.title}</span>
                <StatusBadge status={u.status} />
                <div className="ml-auto flex items-center gap-1">
                  <Btn
                    size="sm"
                    variant="ghost"
                    aria-label="Subir unidade"
                    disabled={busy || i === 0}
                    onClick={() => onSwap(i, i - 1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    aria-label="Descer unidade"
                    disabled={busy || i === course.units.length - 1}
                    onClick={() => onSwap(i, i + 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Btn>
                  <PublishButtons
                    enabled={publish}
                    busy={busy}
                    status={u.status}
                    onStatus={(s) => onStatus("units", u.id, s)}
                  />
                  <Btn size="sm" variant="outline" onClick={() => onNewLesson(u.id)}>
                    <Plus className="size-3.5" />
                    Lição
                  </Btn>
                </div>
              </div>
              {u.lessons.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">Sem lições.</p>
              ) : (
                <ul className="divide-y">
                  {u.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <Link
                        to="/admin/lessons/$lessonId"
                        params={{ lessonId: l.id }}
                        className="flex-1 font-medium text-primary hover:underline"
                      >
                        {l.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {l.approvedExercises}/{l.exercises} palavras aprovadas ·{" "}
                        {l.estimatedMinutes} min
                      </span>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PublishButtons({
  enabled,
  busy,
  status,
  onStatus,
}: {
  enabled: boolean;
  busy: boolean;
  status: ServerContentStatus;
  onStatus: (s: "DRAFT" | "APPROVED" | "ARCHIVED") => void;
}) {
  if (!enabled) return null;
  return status === "APPROVED" ? (
    <Btn size="sm" variant="outline" disabled={busy} onClick={() => onStatus("DRAFT")}>
      Despublicar
    </Btn>
  ) : (
    <Btn size="sm" variant="success" disabled={busy} onClick={() => onStatus("APPROVED")}>
      Publicar
    </Btn>
  );
}

function CreateDrawer({
  target,
  languageId,
  onClose,
  onDone,
}: {
  target:
    { kind: "course" } | { kind: "unit"; courseId: string } | { kind: "lesson"; unitId: string };
  languageId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [minutes, setMinutes] = useState("5");
  const save = useMutation({
    mutationFn: () => {
      const d = description.trim() ? { description: description.trim() } : {};
      if (target.kind === "course") return adminApi.createCourse({ languageId, title, ...d });
      if (target.kind === "unit") {
        return adminApi.createUnit({
          courseId: target.courseId,
          title,
          ...d,
          ...(icon.trim() ? { icon: icon.trim() } : {}),
        });
      }
      return adminApi.createLesson({
        unitId: target.unitId,
        title,
        ...d,
        estimatedMinutes: Number(minutes) || 5,
      });
    },
    onSuccess: onDone,
  });
  const label = { course: "Novo curso", unit: "Nova unidade", lesson: "Nova lição" }[target.kind];
  return (
    <Drawer
      open
      onClose={onClose}
      title={label}
      footer={
        <Btn disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>
          Criar
        </Btn>
      }
    >
      <ErrorNote error={save.error} />
      <Field label="Título" hint="Em português (é texto da interface, não da língua ensinada).">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>
      <Field label="Descrição (opcional)">
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {target.kind === "unit" && (
        <Field label="Ícone (emoji, opcional)">
          <TextInput value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={8} />
        </Field>
      )}
      {target.kind === "lesson" && (
        <Field label="Minutos estimados">
          <TextInput
            type="number"
            min={1}
            max={60}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </Field>
      )}
    </Drawer>
  );
}

/* ----------------------------------- Lições ----------------------------------- */

export function ServerLessons() {
  const { languages, languageId, pick } = useLanguagePick();
  const tree = useQuery({
    queryKey: ["admin", "courses", languageId],
    queryFn: () => adminApi.courseTree(languageId),
    enabled: Boolean(languageId),
  });
  type Row = CourseTree["units"][number]["lessons"][number] & { unit: string; course: string };
  const rows: Row[] = (tree.data ?? []).flatMap((c) =>
    c.units.flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.title, course: c.title }))),
  );
  const columns: Column<Row>[] = [
    {
      key: "t",
      header: "Lição",
      cell: (l) => (
        <Link
          to="/admin/lessons/$lessonId"
          params={{ lessonId: l.id }}
          className="font-medium text-primary hover:underline"
        >
          {l.title}
        </Link>
      ),
    },
    { key: "u", header: "Unidade", cell: (l) => `${l.course} › ${l.unit}` },
    {
      key: "e",
      header: "Palavras",
      cell: (l) => `${l.approvedExercises}/${l.exercises} aprovadas`,
    },
    { key: "m", header: "Minutos", cell: (l) => l.estimatedMinutes },
    { key: "s", header: "Estado", cell: (l) => <StatusBadge status={l.status} /> },
  ];
  return (
    <>
      <PageHeader
        title="Lições"
        description="Todas as lições da língua. Cria lições em Cursos e unidades."
        actions={
          <Link to="/admin/courses" className="text-sm font-semibold text-primary">
            Ir para Cursos e unidades →
          </Link>
        }
      />
      <FilterBar>
        <Select value={languageId} onChange={pick} className="w-72" options={languages} />
      </FilterBar>
      <ErrorNote error={tree.error} />
      <DataTable
        rows={rows}
        columns={columns}
        empty={tree.isPending ? "A carregar…" : "Ainda não há lições nesta língua."}
      />
    </>
  );
}

export function ServerLessonEditor({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const lesson = useQuery({
    queryKey: ["admin", "lesson", lessonId],
    queryFn: () => adminApi.lesson(lessonId),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
  });
  const l = lesson.data;
  if (lesson.isPending) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (!l) return <ErrorNote error={lesson.error} />;

  const editable = l.status === "DRAFT" || l.status === "REJECTED";
  const ids = l.exercises.map((e) => e.id);
  const swap = (i: number, j: number) => {
    const next = [...ids];
    [next[i], next[j]] = [next[j]!, next[i]!];
    act.mutate(() => adminApi.reorder(l.id, next));
  };
  const drafts = l.exercises.filter((e) => e.status === "DRAFT" || e.status === "REJECTED");

  return (
    <>
      <PageHeader
        title={l.title}
        description={`${l.course.title} › ${l.unit.title} · versão ${l.version} · por @${l.author.username}`}
        actions={
          <>
            <StatusBadge status={l.status} />
            {editable && (
              <Btn
                disabled={act.isPending}
                onClick={() => act.mutate(() => adminApi.review("lesson", l.id, "submit"))}
              >
                <Send className="size-4" />
                Enviar lição para revisão
              </Btn>
            )}
          </>
        }
      />
      <ErrorNote error={act.error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel
          title={`Palavras da lição (${l.exercises.length})`}
          actions={
            drafts.length > 0 ? (
              <Btn
                size="sm"
                variant="outline"
                disabled={act.isPending}
                onClick={() =>
                  act.mutate(async () => {
                    for (const e of drafts) await adminApi.review("exercise", e.id, "submit");
                  })
                }
              >
                <Send className="size-3.5" />
                Enviar {drafts.length} para revisão
              </Btn>
            ) : null
          }
        >
          {l.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda sem palavras. Junta palavras do vocabulário desta língua (ao lado). Uma lição
              precisa de pelo menos 4 para se poder jogar.
            </p>
          ) : (
            <ol className="divide-y">
              {l.exercises.map((e, i) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.vocabulary?.word ?? e.prompt}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.vocabulary?.translations.pt ?? "—"}
                      {e.vocabulary?.translations.en ? ` · ${e.vocabulary.translations.en}` : ""}
                      {e.vocabulary && e.vocabulary.status !== "APPROVED" && (
                        <span className="ml-1 font-semibold text-accent-deep">
                          (palavra ainda por aprovar)
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                  <Btn
                    size="sm"
                    variant="ghost"
                    aria-label="Subir"
                    disabled={act.isPending || i === 0}
                    onClick={() => swap(i, i - 1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    aria-label="Descer"
                    disabled={act.isPending || i === l.exercises.length - 1}
                    onClick={() => swap(i, i + 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Btn>
                  {(e.status === "DRAFT" || e.status === "REJECTED") && (
                    <Btn
                      size="sm"
                      variant="ghost"
                      aria-label="Tirar da lição"
                      disabled={act.isPending}
                      onClick={() => act.mutate(() => adminApi.removeExercise(e.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </Btn>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <div className="space-y-4">
          <AddWord lesson={l} onAdded={() => void refresh()} />
          <LessonDetails lesson={l} editable={editable} onSaved={() => void refresh()} />
        </div>
      </div>
    </>
  );
}

function AddWord({ lesson, onAdded }: { lesson: LessonDetail; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const inLesson = new Set(lesson.exercises.map((e) => e.vocabulary?.id));
  const found = useQuery({
    queryKey: ["admin", "content", "vocabulary", lesson.languageId, "", q.trim()],
    queryFn: () => adminApi.list("vocabulary", { languageId: lesson.languageId, q: q.trim() }),
    enabled: q.trim().length >= 1,
  });
  const add = useMutation({
    mutationFn: (vocabularyId: string) => adminApi.addWord(lesson.id, vocabularyId),
    onSuccess: onAdded,
  });
  const options = (found.data ?? []).filter(
    (v) => !inLesson.has(v.id) && v.status !== "REJECTED" && v.status !== "ARCHIVED",
  );
  return (
    <Panel title="Juntar palavra">
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Procurar no vocabulário…"
        aria-label="Procurar palavra"
      />
      <ErrorNote error={add.error} />
      <ul className="mt-2 max-h-72 divide-y overflow-y-auto">
        {options.slice(0, 30).map((v) => (
          <li key={v.id} className="flex items-center gap-2 py-1.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{v.text}</p>
              <p className="truncate text-xs text-muted-foreground">{v.translations.pt ?? "—"}</p>
            </div>
            <StatusBadge status={v.status} />
            <Btn size="sm" disabled={add.isPending} onClick={() => add.mutate(v.id)}>
              <Plus className="size-3.5" />
            </Btn>
          </li>
        ))}
      </ul>
      {q.trim() && found.data && options.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nenhuma palavra encontrada. Cria-a em{" "}
          <Link to="/admin/vocabulary" className="font-semibold text-primary">
            Vocabulário
          </Link>
          .
        </p>
      )}
    </Panel>
  );
}

function LessonDetails({
  lesson,
  editable,
  onSaved,
}: {
  lesson: LessonDetail;
  editable: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [minutes, setMinutes] = useState(String(lesson.estimatedMinutes));
  const [difficulty, setDifficulty] = useState(lesson.difficulty);
  const save = useMutation({
    mutationFn: () =>
      adminApi.updateLesson(lesson.id, {
        title: title.trim(),
        description: description.trim(),
        estimatedMinutes: Number(minutes) || lesson.estimatedMinutes,
        difficulty,
      }),
    onSuccess: onSaved,
  });
  return (
    <Panel title="Detalhes da lição">
      {!editable && (
        <p className="mb-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
          Em revisão ou aprovada: o conteúdo não se edita (a ordem das palavras sim).
        </p>
      )}
      <ErrorNote error={save.error} />
      <fieldset disabled={!editable} className="space-y-3">
        <Field label="Título">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Descrição">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Minutos">
            <TextInput
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </Field>
          <Field label="Dificuldade">
            <Select
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "EASY", label: "Fácil" },
                { value: "MEDIUM", label: "Média" },
                { value: "HARD", label: "Difícil" },
              ]}
            />
          </Field>
        </div>
        <Btn disabled={save.isPending || !title.trim()} onClick={() => save.mutate()}>
          Guardar
        </Btn>
      </fieldset>
    </Panel>
  );
}

/* ---------------------------------- Exercícios ---------------------------------- */

export function ServerExercises() {
  const [status, setStatus] = useState<ServerContentStatus>("UNDER_REVIEW");
  const items = useQuery({
    queryKey: ["admin", "review-items", status],
    queryFn: () => adminApi.reviewItems(status),
  });
  type Row = ReviewItems["exercises"][number];
  const columns: Column<Row>[] = [
    { key: "p", header: "Palavra", cell: (e) => <span className="font-medium">{e.prompt}</span> },
    { key: "t", header: "Tradução", cell: (e) => e.translations.pt ?? e.translations.en ?? "—" },
    {
      key: "l",
      header: "Lição",
      cell: (e) =>
        e.lesson ? (
          <Link
            to="/admin/lessons/$lessonId"
            params={{ lessonId: e.lesson.id }}
            className="text-primary hover:underline"
          >
            {e.lesson.title}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "a", header: "Autor", cell: (e) => `@${e.author.username}` },
    { key: "d", header: "Atualizado", cell: (e) => fmtDateTime(e.updatedAt) },
    {
      key: "v",
      header: "Palavra",
      cell: (e) => (e.vocabularyStatus ? <StatusBadge status={e.vocabularyStatus} /> : "—"),
    },
  ];
  return (
    <>
      <PageHeader
        title="Exercícios"
        description="Cada exercício pratica uma palavra numa lição (escolha múltipla). Juntam-se às lições no editor de cada lição."
      />
      <FilterBar>
        <Select
          value={status}
          onChange={setStatus}
          className="w-56"
          options={[
            { value: "DRAFT", label: "Rascunho" },
            { value: "UNDER_REVIEW", label: "Em revisão" },
            { value: "APPROVED", label: "Aprovados" },
            { value: "REJECTED", label: "Rejeitados" },
          ]}
        />
      </FilterBar>
      <ErrorNote error={items.error} />
      <DataTable
        rows={items.data?.exercises ?? []}
        columns={columns}
        empty={items.isPending ? "A carregar…" : "Nada neste estado."}
      />
    </>
  );
}

/* ------------------------------------ Áudios ------------------------------------ */

export function ServerAudios() {
  return (
    <>
      <PageHeader title="Áudios" description="Gravações de pronúncia para palavras e frases." />
      <Panel>
        <p className="text-sm">
          O carregamento de gravações precisa de um armazenamento de ficheiros (por exemplo
          Cloudflare R2) com chaves próprias, que se configura no fim, junto com as outras chaves da
          produção. As gravações já importadas (Lingua Libre) continuam a tocar nas lições.
        </p>
      </Panel>
    </>
  );
}

/* ------------------------- Revisão: lições e exercícios ------------------------- */

export function ReviewLessonsAndExercises({
  status,
}: {
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const qc = useQueryClient();
  const me = useServerAdmin().session;
  const items = useQuery({
    queryKey: ["admin", "review-items", status],
    queryFn: () => adminApi.reviewItems(status),
  });
  const [open, setOpen] = useState<{
    kind: "lesson" | "exercise";
    id: string;
    title: string;
    authorId: string;
  } | null>(null);
  const [comment, setComment] = useState("");
  const act = useMutation({
    mutationFn: (action: "approve" | "request_changes" | "reject") =>
      adminApi.review(open!.kind, open!.id, action, comment.trim() || undefined),
    onSuccess: () => {
      setOpen(null);
      setComment("");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const data = items.data;
  if (!data || (data.lessons.length === 0 && data.exercises.length === 0)) return null;
  const pending = status === "UNDER_REVIEW";

  return (
    <div className="mt-6 space-y-4">
      {data.lessons.length > 0 && (
        <Panel title={`Lições (${data.lessons.length})`}>
          <ul className="divide-y">
            {data.lessons.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                <BookOpen className="size-4 text-muted-foreground" />
                <Link
                  to="/admin/lessons/$lessonId"
                  params={{ lessonId: l.id }}
                  className="flex-1 font-medium text-primary hover:underline"
                >
                  {l.title} <span className="text-muted-foreground">· {l.unit}</span>
                </Link>
                <span className="text-xs text-muted-foreground">
                  {l.exercises} palavras · @{l.author.username}
                </span>
                {pending && (
                  <Btn
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setOpen({ kind: "lesson", id: l.id, title: l.title, authorId: l.author.id })
                    }
                  >
                    Rever
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {data.exercises.length > 0 && (
        <Panel title={`Exercícios (${data.exercises.length})`}>
          <ul className="divide-y">
            {data.exercises.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{e.prompt}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {e.translations.pt ?? e.translations.en ?? "—"}
                    {e.lesson ? ` · ${e.lesson.title}` : ""}
                  </span>
                </span>
                {e.vocabularyStatus && e.vocabularyStatus !== "APPROVED" && (
                  <span className="text-xs font-semibold text-accent-deep">
                    palavra por aprovar
                  </span>
                )}
                {pending && (
                  <Btn
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setOpen({
                        kind: "exercise",
                        id: e.id,
                        title: e.prompt,
                        authorId: e.author.id,
                      })
                    }
                  >
                    Rever
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          title={`${open.kind === "lesson" ? "Lição" : "Exercício"} · ${open.title}`}
          footer={
            me?.id === open.authorId ? null : (
              <>
                <Btn variant="danger" disabled={act.isPending} onClick={() => act.mutate("reject")}>
                  Rejeitar
                </Btn>
                <Btn
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => act.mutate("request_changes")}
                >
                  Pedir alterações
                </Btn>
                <Btn
                  variant="success"
                  disabled={act.isPending}
                  onClick={() => act.mutate("approve")}
                >
                  <ShieldCheck className="size-4" />
                  Aprovar
                </Btn>
              </>
            )
          }
        >
          {me?.id === open.authorId ? (
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              Foste tu que criaste: outra pessoa tem de rever.
            </p>
          ) : (
            <Field label="Comentário (opcional)">
              <TextArea value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
          )}
          <ErrorNote error={act.error} />
        </Drawer>
      )}
    </div>
  );
}
