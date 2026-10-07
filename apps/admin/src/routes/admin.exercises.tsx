import { isFeatureOn } from "@stp/config";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HistoryList, ReviewActions } from "@/admin/content";
import { adminAuth, useAdminDB } from "@/services/admin";
import type { Difficulty, ExerciseItem, ExerciseType, ExerciseUsage } from "@/admin/types";
import {
  AiNotice,
  Btn,
  DataTable,
  Drawer,
  Field,
  FilterBar,
  PageHeader,
  PlaceholderNote,
  Select,
  StatusBadge,
  TextInput,
  fmtDate,
  type Column,
} from "@/admin/ui";
import { cn } from "@/lib/utils";
import { adminExerciseService } from "@/services/admin";

export const Route = createFileRoute("/admin/exercises")({
  head: () => ({
    meta: [
      { title: "Exercícios — Admin Língua STP" },
      { name: "description", content: "Editor de exercícios e sugestões de quiz com IA." },
    ],
  }),
  component: Exercises,
});

const TYPES: ExerciseType[] = [
  "MULTIPLE_CHOICE",
  "LISTEN_AND_CHOOSE",
  "LISTEN_AND_TYPE",
  "TRANSLATE",
  "MATCH_WORDS",
  "ORDER_WORDS",
  "IMAGE_SELECT",
  "PRONUNCIATION",
  "TRUE_FALSE",
];
const USAGE: { id: ExerciseUsage; label: string }[] = [
  { id: "learning", label: "Aprendizagem" },
  { id: "daily", label: "Desafio Diário" },
  { id: "arena", label: "Arena Online" },
  { id: "duel", label: "1v1" },
  { id: "teams", label: "2v2" },
  { id: "survival", label: "Sobrevivência" },
];
const DIFFS: Difficulty[] = ["Fácil", "Média", "Difícil"];

const blank = (): ExerciseItem => ({
  id: adminExerciseService.newId(),
  kind: "exercise",
  languageId: "forro",
  type: "MULTIPLE_CHOICE",
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  lessonId: null,
  usage: ["learning"],
  category: "",
  difficulty: "Fácil",
  variant: "",
  notes: "",
  source: "",
  audioId: null,
  status: "DRAFT",
  author: adminAuth.get()?.name ?? "",
  reviewer: null,
  updatedAt: new Date().toISOString(),
  history: [],
});

function Exercises() {
  const db = useAdminDB();
  const [type, setType] = useState<"Todos" | ExerciseType>("Todos");
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState<ExerciseItem | null>(null);
  const [ai, setAi] = useState<ExerciseItem[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const rows = useMemo(
    () =>
      db.exercises.filter(
        (e) => (type === "Todos" || e.type === type) && (status === "Todos" || e.status === status),
      ),
    [db.exercises, type, status],
  );

  const generate = async () => {
    setGenerating(true);
    setAi(await adminExerciseService.generateSuggestions());
    setGenerating(false);
  };

  const columns: Column<ExerciseItem>[] = [
    {
      key: "q",
      header: "Pergunta",
      cell: (e) => (
        <span className="font-medium">
          {e.question}
          {e.aiGenerated && (
            <span className="ml-2 rounded bg-accent/25 px-1.5 text-[10px] font-bold">IA</span>
          )}
        </span>
      ),
    },
    { key: "t", header: "Tipo", cell: (e) => <code className="text-xs">{e.type}</code> },
    {
      key: "u",
      header: "Disponível em",
      cell: (e) => (
        <span className="text-xs">
          {e.usage.map((u) => USAGE.find((x) => x.id === u)?.label).join(", ")}
        </span>
      ),
    },
    { key: "d", header: "Dificuldade", cell: (e) => e.difficulty },
    { key: "s", header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
    { key: "dt", header: "Alterado", cell: (e) => fmtDate(e.updatedAt) },
  ];

  return (
    <>
      <PageHeader
        title="Exercícios"
        description="Cada exercício pode ser usado na aprendizagem, no desafio diário e no multiplayer."
        actions={
          <>
            {isFeatureOn("aiTools") && (
              <Btn variant="outline" onClick={generate} disabled={generating}>
                <Sparkles className="size-4" />
                {generating ? "A gerar…" : "Gerar sugestões com IA"}
              </Btn>
            )}
            <Btn onClick={() => setEditing(blank())}>
              <Plus className="size-4" />
              Novo exercício
            </Btn>
          </>
        }
      />
      <PlaceholderNote />
      <div className="mt-4">
        <FilterBar>
          <Select value={type} onChange={setType} options={["Todos", ...TYPES]} className="!w-52" />
          <Select
            value={status}
            onChange={setStatus}
            options={["Todos", "DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]}
          />
        </FilterBar>
        <DataTable rows={rows} columns={columns} onRowClick={setEditing} />
      </div>
      {editing && <McEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
      {ai && (
        <AiDrawer
          items={ai}
          onClose={() => setAi(null)}
          onEdit={(e) => {
            setAi(ai.filter((x) => x.id !== e.id));
            setEditing(e);
          }}
        />
      )}
    </>
  );
}

function AiDrawer({
  items,
  onClose,
  onEdit,
}: {
  items: ExerciseItem[];
  onClose: () => void;
  onEdit: (e: ExerciseItem) => void;
}) {
  const [list, setList] = useState(items);
  const save = async (e: ExerciseItem) => {
    await adminExerciseService.save(e);
    setList((l) => l.filter((x) => x.id !== e.id));
    toast.success("Guardado como rascunho — segue para revisão humana");
  };
  return (
    <Drawer open onClose={onClose} title="Sugestões de quiz (IA)" wide>
      <AiNotice />
      <p className="text-sm text-muted-foreground">
        Geradas a partir de conteúdo APPROVED. A IA nunca publica: cada sugestão fica DRAFT e tem de
        ser revista.
      </p>
      {list.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Sem sugestões pendentes.</p>
      )}
      {list.map((e) => (
        <div key={e.id} className="space-y-2 rounded-lg border p-3">
          <p className="font-medium">{e.question}</p>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {e.options.map((o, i) => (
              <li
                key={i}
                className={cn(
                  "rounded border px-2 py-1",
                  i === e.correctIndex && "border-success bg-success-soft",
                )}
              >
                {"ABCD"[i]}) {o}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Dificuldade sugerida: {e.difficulty} · Categoria sugerida: {e.category}
          </p>
          <div className="flex gap-2">
            <Btn size="sm" variant="outline" onClick={() => onEdit(e)}>
              Editar
            </Btn>
            <Btn size="sm" onClick={() => save(e)}>
              Guardar como rascunho
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => setList((l) => l.filter((x) => x.id !== e.id))}
            >
              Descartar
            </Btn>
          </div>
        </div>
      ))}
    </Drawer>
  );
}

function McEditor({ item, onClose }: { item: ExerciseItem; onClose: () => void }) {
  const db = useAdminDB();
  const live = db.exercises.find((e) => e.id === item.id);
  const [f, setF] = useState<ExerciseItem>(live ?? item);
  const set = <K extends keyof ExerciseItem>(k: K, v: ExerciseItem[K]) => setF({ ...f, [k]: v });
  const editable = f.status === "DRAFT" || f.status === "REJECTED";
  const valid = f.question.trim() && f.options.every((o) => o.trim());
  const toggle = (u: ExerciseUsage) =>
    set("usage", f.usage.includes(u) ? f.usage.filter((x) => x !== u) : [...f.usage, u]);
  return (
    <Drawer
      open
      onClose={onClose}
      title={live ? "Editar exercício" : "Novo exercício"}
      wide
      footer={
        editable && (
          <Btn
            disabled={!valid}
            onClick={async () => {
              await adminExerciseService.save(f);
              toast.success("Rascunho guardado");
            }}
          >
            Guardar rascunho
          </Btn>
        )
      }
    >
      {f.aiGenerated && <AiNotice />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select value={f.type} onChange={(v) => set("type", v)} options={TYPES} />
        </Field>
        <Field label="Lição">
          <Select
            value={f.lessonId ?? ""}
            onChange={(v) => set("lessonId", v || null)}
            options={[
              { value: "", label: "— Nenhuma —" },
              ...db.lessons.map((l) => ({
                value: l.id,
                label: `${db.units.find((u) => u.id === l.unitId)?.title} · ${l.title}`,
              })),
            ]}
          />
        </Field>
        <Field label="Pergunta" className="col-span-2">
          <TextInput
            disabled={!editable}
            value={f.question}
            onChange={(e) => set("question", e.target.value)}
            placeholder='Ex.: O que significa "Expressão em Forro"?'
          />
        </Field>
        {f.type === "LISTEN_AND_CHOOSE" && (
          <p className="col-span-2 text-xs text-muted-foreground">
            🔊 Este tipo requer um áudio associado (Áudios).
          </p>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-semibold text-muted-foreground">
          Respostas — seleciona a correta
        </legend>
        {f.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={f.correctIndex === i}
              onChange={() => set("correctIndex", i)}
              disabled={!editable}
              aria-label={`Resposta ${"ABCD"[i]} correta`}
              className="size-4 accent-[var(--primary)]"
            />
            <span className="w-5 text-sm font-semibold">{"ABCD"[i]}</span>
            <TextInput
              disabled={!editable}
              value={o}
              placeholder={`Resposta ${"ABCD"[i]}`}
              onChange={(e) =>
                set(
                  "options",
                  f.options.map((x, j) => (j === i ? e.target.value : x)),
                )
              }
            />
          </div>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria">
          <TextInput
            disabled={!editable}
            value={f.category}
            onChange={(e) => set("category", e.target.value)}
          />
        </Field>
        <Field label="Dificuldade">
          <Select value={f.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFS} />
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Disponível em</p>
        <div className="grid grid-cols-3 gap-2">
          {USAGE.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={f.usage.includes(u.id)}
                onChange={() => toggle(u.id)}
                disabled={!editable}
                className="accent-[var(--primary)]"
              />
              {u.label}
            </label>
          ))}
        </div>
      </div>
      {live ? (
        <ReviewActions item={live} onDone={(n) => setF(n as ExerciseItem)} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Guarda o rascunho para o poderes enviar para revisão.
        </p>
      )}
      {live && <HistoryList item={live} />}
    </Drawer>
  );
}
