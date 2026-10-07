import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PlayButton } from "@/admin/content";
import { useAdminDB } from "@/services/admin";
import type { AudioFile } from "@/admin/types";
import {
  Btn,
  DataTable,
  FilterBar,
  PageHeader,
  Select,
  StatusBadge,
  type Column,
} from "@/admin/ui";
import { adminAudioService } from "@/services/admin";
import { fmtDate } from "@/admin/format";

export const Route = createFileRoute("/admin/audios")({
  head: () => ({
    meta: [
      { title: "Áudios — Admin Língua STP" },
      { name: "description", content: "Biblioteca de áudio (futuro Cloudflare R2)." },
    ],
  }),
  component: Audios,
});

function Audios() {
  const db = useAdminDB();
  const [status, setStatus] = useState("Todos");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rows = db.audios.filter((a) => status === "Todos" || a.status === status);
  const columns: Column<AudioFile>[] = [
    { key: "p", header: "", cell: (a) => <PlayButton seconds={a.seconds} /> },
    {
      key: "f",
      header: "Ficheiro",
      cell: (a) => <span className="font-mono text-xs">{a.file}</span>,
    },
    { key: "l", header: "Palavra / frase", cell: (a) => a.linkedTo },
    { key: "s", header: "Falante", cell: (a) => a.speaker },
    { key: "v", header: "Variante", cell: (a) => a.variant },
    { key: "d", header: "Duração", cell: (a) => `${a.seconds}s` },
    { key: "st", header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
    { key: "dt", header: "Data", cell: (a) => fmtDate(a.date) },
  ];
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    await adminAudioService.upload({ name: f.name }, "— por associar —", "—");
    setBusy(false);
    toast.success("Áudio carregado (simulação)");
  };
  return (
    <>
      <PageHeader
        title="Áudios"
        description="Upload simulado. Os ficheiros serão guardados no Cloudflare R2."
        actions={
          <Btn disabled={busy} onClick={() => input.current?.click()}>
            <Upload className="size-4" />
            {busy ? "A carregar…" : "Carregar áudio"}
          </Btn>
        }
      />
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
        aria-label="Ficheiro de áudio"
      />
      <FilterBar>
        <Select
          value={status}
          onChange={setStatus}
          options={["Todos", "DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]}
        />
      </FilterBar>
      <DataTable rows={rows} columns={columns} />
    </>
  );
}
