import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AudioPicker, HistoryList, PlayButton, ReviewActions } from "@/admin/content";
import { adminAuth, useAdminDB } from "@/services/admin";
import type { ContentStatus, Difficulty, VocabItem } from "@/admin/types";
import { Btn, DataTable, Drawer, Field, FilterBar, PageHeader, PlaceholderNote, Select, StatusBadge, TextArea, TextInput, fmtDate, type Column } from "@/admin/ui";
import { adminReviewService, adminVocabularyService } from "@/services/admin";

export const Route = createFileRoute("/admin/vocabulary")({
  head: () => ({ meta: [{ title: "Vocabulário — Admin Língua STP" }, { name: "description", content: "Gestão de palavras, traduções, áudios e revisão." }] }),
  component: Vocabulary,
});

const STATUSES = ["Todos", "DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"] as const;
const DIFFS: Difficulty[] = ["Fácil", "Média", "Difícil"];

function blank(languageId: string): VocabItem {
  return { id: adminVocabularyService.newId(), kind: "word", languageId, word: "", translation: "", category: "", difficulty: "Fácil", variant: "", notes: "", source: "", audioId: null, speaker: "", status: "DRAFT", author: adminAuth.get()?.name ?? "", reviewer: null, updatedAt: new Date().toISOString(), history: [] };
}

function Vocabulary() {
  const db = useAdminDB();
  const [lang, setLang] = useState("forro");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Todos");
  const [cat, setCat] = useState("Todas");
  const [diff, setDiff] = useState("Todas");
  const [author, setAuthor] = useState("Todos");
  const [reviewer, setReviewer] = useState("Todos");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<VocabItem | null>(null);

  const cats = ["Todas", ...new Set(db.vocabulary.map((w) => w.category))];
  const authors = ["Todos", ...new Set(db.vocabulary.map((w) => w.author))];
  const reviewers = ["Todos", ...new Set(db.vocabulary.map((w) => w.reviewer).filter((x): x is string => !!x))];
  const rows = useMemo(() => db.vocabulary.filter((w) =>
    w.languageId === lang && (status === "Todos" || w.status === status) && (cat === "Todas" || w.category === cat) && (diff === "Todas" || w.difficulty === diff)
    && (author === "Todos" || w.author === author) && (reviewer === "Todos" || w.reviewer === reviewer)
    && (!q || `${w.word} ${w.translation}`.toLowerCase().includes(q.toLowerCase()))), [db.vocabulary, lang, status, cat, diff, author, reviewer, q]);

  const columns: Column<VocabItem>[] = [
    { key: "w", header: "Palavra", cell: (w) => <span className="font-medium">{w.word}</span> },
    { key: "t", header: "Tradução", cell: (w) => w.translation },
    { key: "c", header: "Categoria", cell: (w) => w.category },
    { key: "d", header: "Dificuldade", cell: (w) => w.difficulty },
    { key: "v", header: "Variante", cell: (w) => w.variant || "—" },
    { key: "a", header: "Áudio", cell: (w) => (w.audioId ? <PlayButton /> : <span className="text-muted-foreground">—</span>) },
    { key: "s", header: "Status", cell: (w) => <StatusBadge status={w.status} /> },
    { key: "au", header: "Autor", cell: (w) => w.author },
    { key: "r", header: "Revisor", cell: (w) => w.reviewer ?? "—" },
    { key: "u", header: "Última alteração", cell: (w) => fmtDate(w.updatedAt) },
    { key: "x", header: "Ações", cell: (w) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Btn variant="ghost" size="sm" onClick={() => setEditing(w)} aria-label="Editar"><Pencil className="size-3.5" /></Btn>
        <Btn variant="ghost" size="sm" onClick={() => { adminVocabularyService.duplicate(w); toast.success("Duplicado como rascunho"); }} aria-label="Duplicar"><Copy className="size-3.5" /></Btn>
        {w.status !== "ARCHIVED" && <Btn variant="ghost" size="sm" onClick={() => adminReviewService.act(w, "ARCHIVE").then(() => toast.success("Arquivado")).catch(() => toast.error("Sem permissão para arquivar"))}>Arquivar</Btn>}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Vocabulário" description="Palavras e traduções. Só conteúdo APPROVED aparece na app." actions={<Btn onClick={() => setEditing(blank(lang))}><Plus className="size-4" />Nova palavra</Btn>} />
      <PlaceholderNote />
      <div className="mt-4">
        <FilterBar>
          <TextInput placeholder="Pesquisar…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Select value={lang} onChange={setLang} options={db.languages.map((l) => ({ value: l.id, label: l.name }))} />
          <Select value={status} onChange={setStatus} options={STATUSES} />
          <Select value={cat} onChange={setCat} options={cats} />
          <Select value={diff} onChange={setDiff} options={["Todas", ...DIFFS]} />
          <Select value={author} onChange={setAuthor} options={authors} />
          <Select value={reviewer} onChange={setReviewer} options={reviewers} />
        </FilterBar>
        <DataTable rows={rows} columns={columns} onRowClick={setEditing} empty="Sem palavras para estes filtros." />
      </div>
      {editing && <WordDrawer key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function WordDrawer({ item, onClose }: { item: VocabItem; onClose: () => void }) {
  const db = useAdminDB();
  const live = db.vocabulary.find((w) => w.id === item.id);
  const [f, setF] = useState<VocabItem>(live ?? item);
  const set = <K extends keyof VocabItem>(k: K, v: VocabItem[K]) => setF({ ...f, [k]: v });
  const editable = f.status === "DRAFT" || f.status === "REJECTED";
  const valid = f.word.trim() && f.translation.trim();
  const saveDraft = async () => { await adminVocabularyService.save(f); toast.success("Rascunho guardado"); };
  const submit = async () => { await adminVocabularyService.save(f); const cur = { ...f }; await adminReviewService.act(cur, "SUBMIT"); toast.success("Enviado para revisão"); onClose(); };
  const current = db.vocabulary.find((w) => w.id === f.id);

  return (
    <Drawer open onClose={onClose} title={live ? "Editar palavra" : "Nova palavra"} wide
      footer={editable && <>
        <Btn variant="outline" disabled={!valid} onClick={saveDraft}>Guardar rascunho</Btn>
        <Btn disabled={!valid} onClick={submit}>Enviar para revisão</Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Língua" className="col-span-2"><Select value={f.languageId} onChange={(v) => set("languageId", v)} options={db.languages.map((l) => ({ value: l.id, label: l.name }))} /></Field>
        <Field label="Palavra"><TextInput disabled={!editable} value={f.word} onChange={(e) => set("word", e.target.value)} placeholder="Palavra em Forro" /></Field>
        <Field label="Tradução"><TextInput disabled={!editable} value={f.translation} onChange={(e) => set("translation", e.target.value)} placeholder="Tradução em Português" /></Field>
        <Field label="Categoria"><TextInput disabled={!editable} value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Ex.: Saudações" /></Field>
        <Field label="Dificuldade"><Select value={f.difficulty} onChange={(v) => set("difficulty", v)} options={DIFFS} /></Field>
        <Field label="Variante / Região (opcional)"><TextInput disabled={!editable} value={f.variant} onChange={(e) => set("variant", e.target.value)} /></Field>
        <Field label="Falante"><TextInput disabled={!editable} value={f.speaker} onChange={(e) => set("speaker", e.target.value)} /></Field>
        <Field label="Fonte" className="col-span-2"><TextInput disabled={!editable} value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="Ex.: falante nativo, dicionário…" /></Field>
        <Field label="Notas" className="col-span-2"><TextArea disabled={!editable} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <div className="col-span-2"><AudioPicker audioId={f.audioId} linkedTo={f.word} speaker={f.speaker} onChange={(id) => set("audioId", id)} /></div>
      </div>
      {current && current.status !== "DRAFT" && <ReviewActions item={current} onDone={(n) => setF(n as VocabItem)} />}
      {!current && <p className="text-xs text-muted-foreground">Status: <StatusBadge status={"DRAFT" as ContentStatus} /> — guarda o rascunho e envia para revisão.</p>}
      {current && <div><p className="mb-2 text-sm font-semibold">Histórico</p><HistoryList item={current} /></div>}
    </Drawer>
  );
}
