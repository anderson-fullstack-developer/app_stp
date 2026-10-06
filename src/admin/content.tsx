import { Pause, Play, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { adminAudioService, adminReviewService } from "@/services/admin";
import { useAdminDB, useAdminSession } from "./store";
import type { ContentItem } from "./types";
import { Btn, Field, StatusBadge, TextArea, fmtDateTime } from "./ui";
import { canPerform, type ReviewAction } from "./workflow";

export function PlayButton({ seconds = 2 }: { seconds?: number }) {
  const [playing, setPlaying] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <Btn variant="outline" size="sm" aria-label={playing ? "Pausar" : "Ouvir"} onClick={(e) => { e.stopPropagation(); setPlaying(!playing); clearTimeout(t.current); if (!playing) t.current = setTimeout(() => setPlaying(false), seconds * 1000); }}>
      {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{playing ? "A tocar…" : "Ouvir"}
    </Btn>
  );
}

export function AudioPicker({ audioId, linkedTo, speaker, onChange }: { audioId: string | null; linkedTo: string; speaker: string; onChange: (id: string | null) => void }) {
  const db = useAdminDB();
  const audio = db.audios.find((a) => a.id === audioId);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    const a = await adminAudioService.upload({ name: f.name }, linkedTo || "—", speaker || "—");
    setUploading(false); onChange(a.id); toast.success("Áudio carregado (simulação)");
  };
  return (
    <Field label="Áudio" hint="Upload simulado. Futuramente guardado no Cloudflare R2.">
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5">
        {audio ? (
          <>
            <PlayButton seconds={audio.seconds} />
            <span className="flex-1 truncate text-sm">{audio.file}</span>
            <Btn variant="ghost" size="sm" onClick={() => onChange(null)}>Remover</Btn>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-muted-foreground">{uploading ? "A carregar…" : "Nenhum áudio"}</span>
            <Btn variant="outline" size="sm" disabled={uploading} onClick={() => input.current?.click()}><Upload className="size-3.5" />Carregar áudio</Btn>
          </>
        )}
        <input ref={input} type="file" accept="audio/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} aria-label="Ficheiro de áudio" />
      </div>
    </Field>
  );
}

export function HistoryList({ item }: { item: ContentItem }) {
  if (!item.history.length) return <p className="text-sm text-muted-foreground">Sem histórico de revisão.</p>;
  const label = { SUBMITTED: "Enviado para revisão", APPROVED: "Aprovado", REJECTED: "Rejeitado", CHANGES_REQUESTED: "Alterações pedidas" };
  return (
    <ol className="space-y-2">
      {item.history.map((h, i) => (
        <li key={i} className="rounded-lg border bg-muted/30 p-2.5 text-sm">
          <p><b>{label[h.action]}</b> por {h.by} · <span className="text-muted-foreground">{fmtDateTime(h.at)}</span></p>
          {h.comment && <p className="mt-1 text-muted-foreground">“{h.comment}”</p>}
        </li>
      ))}
    </ol>
  );
}

export function ReviewActions({ item, onDone }: { item: ContentItem; onDone?: (next: ContentItem) => void }) {
  const session = useAdminSession();
  const [comment, setComment] = useState("");
  if (!session) return null;
  const allowed = (a: ReviewAction) => canPerform(session.role, a, item.status);
  const run = async (a: ReviewAction) => {
    const next = await adminReviewService.act(item, a, comment || undefined);
    toast.success({ SUBMIT: "Enviado para revisão", APPROVE: "Aprovado — pronto para a app", REQUEST_CHANGES: "Alterações pedidas", REJECT: "Rejeitado", ARCHIVE: "Arquivado" }[a]);
    setComment(""); onDone?.(next);
  };
  const reviewing = allowed("APPROVE");
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between"><p className="text-sm font-semibold">Revisão</p><StatusBadge status={item.status} /></div>
      {item.reviewer && <p className="text-xs text-muted-foreground">Revisor: {item.reviewer} · {fmtDateTime(item.updatedAt)}</p>}
      {reviewing && <Field label="Comentário do revisor"><TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Opcional" /></Field>}
      <div className="flex flex-wrap gap-2">
        {allowed("SUBMIT") && <Btn onClick={() => run("SUBMIT")}>Enviar para revisão</Btn>}
        {reviewing && <Btn variant="success" onClick={() => run("APPROVE")}>Aprovar</Btn>}
        {allowed("REQUEST_CHANGES") && <Btn variant="outline" onClick={() => run("REQUEST_CHANGES")}>Pedir alterações</Btn>}
        {allowed("REJECT") && <Btn variant="danger" onClick={() => run("REJECT")}>Rejeitar</Btn>}
        {allowed("ARCHIVE") && <Btn variant="ghost" onClick={() => run("ARCHIVE")}>Arquivar</Btn>}
      </div>
      {item.status === "UNDER_REVIEW" && !reviewing && <p className="text-xs text-muted-foreground">A aguardar revisão por um Linguista ou Admin.</p>}
      {item.status === "APPROVED" && <p className="text-xs font-medium text-success">✓ Pronto para ser utilizado na app.</p>}
    </div>
  );
}

export const contentTitle = (c: ContentItem) => (c.kind === "word" ? c.word : c.kind === "phrase" ? c.original : c.question);
export const contentTranslation = (c: ContentItem) => (c.kind === "exercise" ? c.options[c.correctIndex] ?? "" : c.translation);
export const KIND_LABEL = { word: "Palavra", phrase: "Frase", exercise: "Exercício" } as const;
