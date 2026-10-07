import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AudioPicker, HistoryList, ReviewActions } from "@/admin/content";
import { adminAuth, useAdminDB } from "@/services/admin";
import type { Difficulty, PhraseItem } from "@/admin/types";
import {
  Btn,
  DataTable,
  Drawer,
  Field,
  FilterBar,
  PageHeader,
  PlaceholderNote,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
  type Column,
} from "@/admin/ui";
import { adminPhraseService } from "@/services/admin";
import { fmtDate } from "@/admin/format";
import { APP_NAME } from "@stp/config";

export const Route = createFileRoute("/admin/phrases")({
  head: () => ({
    meta: [
      { title: `Frases — Admin ${APP_NAME}` },
      { name: "description", content: "Gestão de frases, contexto, explicação e revisão." },
    ],
  }),
  component: Phrases,
});

const blank = (): PhraseItem => ({
  id: adminPhraseService.newId(),
  kind: "phrase",
  languageId: "forro",
  original: "",
  translation: "",
  context: "",
  explanation: "",
  level: "Nível 1",
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

function Phrases() {
  const db = useAdminDB();
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState<PhraseItem | null>(null);
  const rows = db.phrases.filter((p) => status === "Todos" || p.status === status);
  const columns: Column<PhraseItem>[] = [
    {
      key: "o",
      header: "Frase original",
      cell: (p) => <span className="font-medium">{p.original}</span>,
    },
    { key: "t", header: "Tradução", cell: (p) => p.translation },
    { key: "c", header: "Categoria", cell: (p) => p.category },
    { key: "l", header: "Nível", cell: (p) => p.level },
    { key: "a", header: "Autor", cell: (p) => p.author },
    { key: "r", header: "Revisor", cell: (p) => p.reviewer ?? "—" },
    { key: "s", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "u", header: "Alterado", cell: (p) => fmtDate(p.updatedAt) },
  ];
  return (
    <>
      <PageHeader
        title="Frases"
        actions={
          <Btn onClick={() => setEditing(blank())}>
            <Plus className="size-4" />
            Nova frase
          </Btn>
        }
      />
      <PlaceholderNote />
      <div className="mt-4">
        <FilterBar>
          <Select
            value={status}
            onChange={setStatus}
            options={["Todos", "DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]}
          />
        </FilterBar>
        <DataTable rows={rows} columns={columns} onRowClick={setEditing} />
      </div>
      {editing && <PhraseDrawer key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PhraseDrawer({ item, onClose }: { item: PhraseItem; onClose: () => void }) {
  const db = useAdminDB();
  const live = db.phrases.find((p) => p.id === item.id);
  const [f, setF] = useState<PhraseItem>(live ?? item);
  const set = <K extends keyof PhraseItem>(k: K, v: PhraseItem[K]) => setF({ ...f, [k]: v });
  const editable = f.status === "DRAFT" || f.status === "REJECTED";
  return (
    <Drawer
      open
      onClose={onClose}
      title={live ? "Editar frase" : "Nova frase"}
      wide
      footer={
        editable && (
          <Btn
            disabled={!f.original || !f.translation}
            onClick={async () => {
              await adminPhraseService.save(f);
              toast.success("Rascunho guardado");
            }}
          >
            Guardar rascunho
          </Btn>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frase original" className="col-span-2">
          <TextInput
            disabled={!editable}
            value={f.original}
            onChange={(e) => set("original", e.target.value)}
            placeholder="Frase em Forro"
          />
        </Field>
        <Field label="Tradução" className="col-span-2">
          <TextInput
            disabled={!editable}
            value={f.translation}
            onChange={(e) => set("translation", e.target.value)}
            placeholder="Tradução em Português"
          />
        </Field>
        <Field label="Contexto">
          <TextInput
            disabled={!editable}
            value={f.context}
            onChange={(e) => set("context", e.target.value)}
          />
        </Field>
        <Field label="Categoria">
          <TextInput
            disabled={!editable}
            value={f.category}
            onChange={(e) => set("category", e.target.value)}
          />
        </Field>
        <Field label="Nível">
          <Select
            value={f.level}
            onChange={(v) => set("level", v)}
            options={["Nível 1", "Nível 2", "Nível 3"]}
          />
        </Field>
        <Field label="Dificuldade">
          <Select<Difficulty>
            value={f.difficulty}
            onChange={(v) => set("difficulty", v)}
            options={["Fácil", "Média", "Difícil"]}
          />
        </Field>
        <Field label="Variante">
          <TextInput
            disabled={!editable}
            value={f.variant}
            onChange={(e) => set("variant", e.target.value)}
          />
        </Field>
        <Field label="Fonte">
          <TextInput
            disabled={!editable}
            value={f.source}
            onChange={(e) => set("source", e.target.value)}
          />
        </Field>
        <Field label="Explicação" className="col-span-2">
          <TextArea
            disabled={!editable}
            value={f.explanation}
            onChange={(e) => set("explanation", e.target.value)}
          />
        </Field>
        <div className="col-span-2">
          <AudioPicker
            audioId={f.audioId}
            linkedTo={f.original}
            speaker=""
            onChange={(id) => set("audioId", id)}
          />
        </div>
      </div>
      {live ? (
        <ReviewActions item={live} onDone={(n) => setF(n as PhraseItem)} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Guarda o rascunho para o poderes enviar para revisão.
        </p>
      )}
      {live && <HistoryList item={live} />}
    </Drawer>
  );
}
