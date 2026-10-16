import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME, VOICE_CONFIG } from "@stp/config";
import type { VoiceReportDto } from "@stp/types/api";
import { Download } from "lucide-react";
import { useState } from "react";
import { Btn, type Column, DataTable, FilterBar, Kpi, PageHeader, Panel } from "@/admin/ui";
import { voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/admin/voice")({
  head: () => ({
    meta: [
      { title: `Gravações — Admin ${APP_NAME}` },
      { name: "description", content: "Faladores, ouvintes, gravações e pagamentos." },
    ],
  }),
  component: VoiceAdmin,
});

const LANG = "kabuverdianu";
type Person = VoiceReportDto["people"][number] & { id: string };

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) =>
  isoDay(new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000));

/** Valor a pagar (só quando o dono definiu as taxas em VOICE_CONFIG.pay). */
function amount(p: Person): number | null {
  const { perApprovedRecording, perReview } = VOICE_CONFIG.pay;
  if (perApprovedRecording === null || perReview === null) return null;
  return Math.round((p.approved * perApprovedRecording + p.reviews * perReview) * 100) / 100;
}

const accuracy = (p: Person) =>
  p.controls ? `${Math.round((p.controlsMatched / p.controls) * 100)}% (${p.controls})` : "—";

function exportCsv(rows: Person[], from: string, to: string) {
  const head = [
    "nome",
    "username",
    "email",
    "gravadas",
    "aprovadas",
    "avaliações",
    "controlos",
    "acerto nos controlos",
    "a pagar",
  ];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((p) =>
    [
      p.name,
      p.username,
      p.email,
      p.recorded,
      p.approved,
      p.reviews,
      p.controls,
      accuracy(p),
      amount(p) ?? "",
    ]
      .map(esc)
      .join(";"),
  );
  // BOM: o Excel abre os acentos corretamente.
  const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `gravacoes_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function VoiceAdmin() {
  const today = isoDay(new Date());
  const [from, setFrom] = useState(addDays(today, -7));
  const [to, setTo] = useState(today);
  const overview = useQuery({
    queryKey: voiceKeys.overview(LANG),
    queryFn: () => voiceApi.overview(LANG),
  });
  // "até" inclui o dia escolhido.
  const report = useQuery({
    queryKey: voiceKeys.report(from, to),
    queryFn: () => voiceApi.report(from, addDays(to, 1)),
    enabled: from <= to,
  });
  const rows: Person[] = (report.data?.people ?? []).map((p) => ({ ...p, id: p.userId }));
  const pay = VOICE_CONFIG.pay;
  const o = overview.data;

  const columns: Column<Person>[] = [
    {
      key: "n",
      header: "Pessoa",
      cell: (p) => (
        <span>
          {p.name} <span className="text-muted-foreground">@{p.username}</span>
        </span>
      ),
    },
    { key: "r", header: "Gravadas", cell: (p) => p.recorded },
    { key: "a", header: "Aprovadas", cell: (p) => p.approved },
    { key: "v", header: "Avaliações", cell: (p) => p.reviews },
    {
      key: "c",
      header: "Acerto nos controlos",
      cell: (p) => (
        <span
          className={
            p.controls >= 5 && p.controlsMatched / p.controls < 0.8
              ? "font-bold text-destructive"
              : ""
          }
        >
          {accuracy(p)}
        </span>
      ),
    },
    {
      key: "p",
      header: "A pagar",
      cell: (p) => {
        const v = amount(p);
        return v === null ? "—" : `${v.toFixed(2)} ${pay.currency ?? ""}`;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Gravações de pronúncia"
        description="Faladores gravam, ouvintes aprovam (2 votos iguais decidem). Só gravações aprovadas chegam à app."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Por ouvir" value={o?.pending ?? "—"} />
        <Kpi label="Aprovadas" value={o?.approved ?? "—"} />
        <Kpi label="Rejeitadas" value={o?.rejected ?? "—"} />
        <Kpi
          label="Palavras das lições com som"
          value={o ? `${o.lessonWordsWithAudio}/${o.lessonWords}` : "—"}
          {...(o && o.lessonWords
            ? { hint: `${Math.round((o.lessonWordsWithAudio / o.lessonWords) * 100)}%` }
            : {})}
        />
      </div>

      <Panel title="Pagamentos" className="my-4">
        <FilterBar>
          <label className="text-sm">
            De{" "}
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-lg border bg-surface px-2"
            />
          </label>
          <label className="text-sm">
            até{" "}
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-lg border bg-surface px-2"
            />
          </label>
          <Btn variant="outline" disabled={!rows.length} onClick={() => exportCsv(rows, from, to)}>
            <Download className="size-4" />
            Exportar Excel (CSV)
          </Btn>
        </FilterBar>
        {pay.perApprovedRecording === null && (
          <p className="mb-3 rounded-lg bg-accent/20 px-3 py-2 text-sm">
            Taxas de pagamento ainda não definidas (VOICE_CONFIG.pay): a tabela mostra só as
            contagens.
          </p>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          empty={report.isPending ? "A carregar…" : "Sem atividade neste período."}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Paga-se por gravação aprovada e por avaliação real. As perguntas de controlo (gravações já
          decididas) não contam para pagamento: servem para medir a atenção. Acerto abaixo de 80%
          fica a vermelho.
        </p>
      </Panel>

      <Panel title="Como convidar">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>A pessoa cria conta na app.</li>
          <li>
            Em Utilizadores, dá-lhe o papel «Falador (gravações)» ou «Ouvinte (gravações)», na
            língua certa.
          </li>
          <li>
            Envia-lhe o link{" "}
            {typeof window !== "undefined" ? `${window.location.origin}/voice` : "/voice"}.
          </li>
          <li>
            Na 1.ª visita, aceita as condições ({VOICE_CONFIG.minimumAge}+ anos) e escolhe a ilha.
          </li>
        </ol>
      </Panel>
    </>
  );
}
