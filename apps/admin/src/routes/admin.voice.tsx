import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME, VOICE_CONFIG } from "@stp/config";
import type {
  VoiceAdminTaskDto,
  VoicePayoutDto,
  VoicePayoutMethod,
  VoicePersonDto,
  VoiceReportDto,
  VoiceTaskKind,
  VoiceTaskStatus,
} from "@stp/types/api";
import { Download, Pause, Play, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import {
  Btn,
  type Column,
  DataTable,
  Drawer,
  Field,
  FilterBar,
  Kpi,
  PageHeader,
  Panel,
  Select,
  TextArea,
  TextInput,
} from "@/admin/ui";
import { cn } from "@/lib/utils";
import { lessonsApi } from "@/services/lessons-api.service";
import { ApiError } from "@/services/http";
import { euros, taskDone, voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/admin/voice")({
  head: () => ({
    meta: [
      { title: `Gravações — Admin ${APP_NAME}` },
      { name: "description", content: "Tarefas pagas, faladores, ouvintes e pagamentos." },
    ],
  }),
  component: VoiceAdmin,
});

const LANG = "kabuverdianu";
type Tab = "overview" | "tasks" | "people" | "payouts" | "report";
const TABS: [Tab, string][] = [
  ["overview", "Resumo"],
  ["tasks", "Tarefas"],
  ["people", "Pessoas"],
  ["payouts", "Pagamentos"],
  ["report", "Relatório"],
];
const METHOD_LABEL: Record<VoicePayoutMethod, string> = {
  SEPA: "SEPA (IBAN)",
  MBWAY: "MB WAY",
  STRIPE: "Stripe",
  OTHER: "Outro",
};
const STATUS_LABEL: Record<VoiceTaskStatus, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Em pausa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) =>
  isoDay(new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86_400_000));
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
/** "0,10" ou "0.10" → 10 cêntimos (null se inválido). */
const toCents = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};
const errorText = (e: unknown) =>
  e instanceof ApiError
    ? ((e.body as { message?: string } | undefined)?.message ?? "Erro no servidor.")
    : e
      ? "Erro de ligação."
      : null;

function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  // BOM: o Excel abre os acentos corretamente.
  const blob = new Blob(["﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function VoiceAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <>
      <PageHeader
        title="Gravações de pronúncia"
        description="Atribui tarefas pagas, acompanha a qualidade e regista pagamentos. Só gravações aprovadas chegam à app."
      />
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-surface p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              tab === id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "tasks" && <Tasks />}
      {tab === "people" && <People />}
      {tab === "payouts" && <Payouts />}
      {tab === "report" && <Report />}
    </>
  );
}

/* ---------------------------------- Resumo ---------------------------------- */

function Overview() {
  const o = useQuery({
    queryKey: voiceKeys.overview(LANG),
    queryFn: () => voiceApi.overview(LANG),
  }).data;
  const people = useQuery({ queryKey: voiceKeys.people, queryFn: voiceApi.people }).data ?? [];
  const owed = people.reduce((s, p) => s + Math.max(0, p.balanceCents), 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Por ouvir" value={o?.pending ?? "—"} />
        <Kpi label="Aprovadas" value={o?.approved ?? "—"} />
        <Kpi label="Tarefas ativas" value={o?.activeTasks ?? "—"} />
        <Kpi label="Por pagar (total)" value={euros(owed)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Rejeitadas" value={o?.rejected ?? "—"} />
        <Kpi
          label="Palavras das lições com som"
          value={o ? `${o.lessonWordsWithAudio}/${o.lessonWords}` : "—"}
          {...(o && o.lessonWords
            ? { hint: `${Math.round((o.lessonWordsWithAudio / o.lessonWords) * 100)}%` }
            : {})}
        />
        <Kpi label="Pessoas com papel" value={people.length} />
        <Kpi label="Aceitaram as condições" value={o?.contributors ?? "—"} />
      </div>
      <Panel title="Como funciona" className="mt-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>A pessoa cria conta no site.</li>
          <li>
            Em <b>Utilizadores</b>, dás-lhe o papel «Falador (gravações)» ou «Ouvinte (gravações)»
            na língua certa.
          </li>
          <li>
            Aqui, em <b>Tarefas</b>, crias uma tarefa para ela: quantidade, preço por unidade e
            prazo.
          </li>
          <li>
            Envias-lhe o link{" "}
            <code>
              {typeof window !== "undefined" ? `${window.location.origin}/voice` : "/voice"}
            </code>
            . Na 1.ª visita aceita as condições ({VOICE_CONFIG.minimumAge}+) e indica como quer
            receber.
          </li>
          <li>
            Em <b>Pessoas</b> vês o saldo de cada uma; pagas por fora (SEPA, MB WAY…) e carregas em
            «Registar pagamento».
          </li>
        </ol>
      </Panel>
    </>
  );
}

/* ---------------------------------- Tarefas ---------------------------------- */

function Tasks() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<VoiceTaskStatus | "ALL">("ACTIVE");
  const [creating, setCreating] = useState(false);
  const tasks = useQuery({
    queryKey: voiceKeys.adminTasks(status),
    queryFn: () => voiceApi.adminTasks(status === "ALL" ? undefined : status),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; status: VoiceTaskStatus }) =>
      voiceApi.updateTask(v.id, { status: v.status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["voice-admin"] }),
  });
  const rows = tasks.data ?? [];
  const columns: Column<VoiceAdminTaskDto>[] = [
    {
      key: "t",
      header: "Tarefa",
      cell: (t) => (
        <div>
          <p className="font-medium">{t.title}</p>
          <p className="text-xs text-muted-foreground">
            {t.kind === "RECORD" ? "🎙️ Gravar" : "🎧 Ouvir"} · {t.languageName}
            {t.unitTitle ? ` · ${t.unitTitle}` : ""}
          </p>
        </div>
      ),
    },
    { key: "a", header: "Pessoa", cell: (t) => `${t.assignee.name} (@${t.assignee.username})` },
    {
      key: "p",
      header: "Progresso",
      cell: (t) => (
        <div className="w-32">
          <p className="text-xs font-semibold">
            {taskDone(t)}/{t.target}
            {t.kind === "RECORD" && ` · ✅ ${t.progress.approved} ❌ ${t.progress.rejected}`}
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, (taskDone(t) / t.target) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    { key: "r", header: "Preço", cell: (t) => euros(t.rateCents) },
    { key: "e", header: "Ganho", cell: (t) => euros(t.earnedCents) },
    {
      key: "d",
      header: "Prazo",
      cell: (t) => (t.dueAt ? new Date(t.dueAt).toLocaleDateString("pt-PT") : "—"),
    },
    { key: "s", header: "Estado", cell: (t) => STATUS_LABEL[t.status] },
    {
      key: "x",
      header: "",
      cell: (t) => (
        <div className="flex gap-1">
          {t.status === "ACTIVE" && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => update.mutate({ id: t.id, status: "PAUSED" })}
            >
              Pausar
            </Btn>
          )}
          {t.status === "PAUSED" && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => update.mutate({ id: t.id, status: "ACTIVE" })}
            >
              Retomar
            </Btn>
          )}
          {(t.status === "ACTIVE" || t.status === "PAUSED") && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => update.mutate({ id: t.id, status: "CANCELLED" })}
            >
              Cancelar
            </Btn>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <FilterBar>
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: "ALL", label: "Todas" },
            ...(Object.keys(STATUS_LABEL) as VoiceTaskStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            })),
          ]}
        />
        <Btn onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nova tarefa
        </Btn>
      </FilterBar>
      {errorText(update.error) && (
        <p className="mb-2 text-sm text-destructive">{errorText(update.error)}</p>
      )}
      <DataTable
        rows={rows}
        columns={columns}
        empty={tasks.isPending ? "A carregar…" : "Sem tarefas."}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        O preço não muda depois de criada a tarefa (o trabalho já feito foi aceite a esse preço).
        Para outro preço, cria uma tarefa nova. Uma tarefa fecha sozinha quando a quantidade pedida
        fica toda aprovada.
      </p>
      {creating && <NewTask onClose={() => setCreating(false)} />}
    </>
  );
}

function NewTask({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const people = useQuery({ queryKey: voiceKeys.people, queryFn: voiceApi.people }).data ?? [];
  const course = useQuery({
    queryKey: ["voice-admin", "course", LANG],
    queryFn: () => lessonsApi.course(LANG, "pt"),
    staleTime: 5 * 60_000,
  }).data;
  const [kind, setKind] = useState<VoiceTaskKind>("RECORD");
  const role = kind === "RECORD" ? "VOICE_SPEAKER" : "VOICE_LISTENER";
  const eligible = people.filter((p) =>
    p.roles.some((r) => r.role === role && (r.languageId === null || r.languageId === LANG)),
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("100");
  const [price, setPrice] = useState(kind === "RECORD" ? "0,10" : "0,02");
  const [unitId, setUnitId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const rateCents = toCents(price);
  const qty = Number.parseInt(target, 10);
  const valid = assigneeId && title.trim().length >= 3 && rateCents && qty > 0;
  const create = useMutation({
    mutationFn: () =>
      voiceApi.createTask({
        kind,
        assigneeId,
        languageId: LANG,
        title: title.trim(),
        notes: notes.trim() || null,
        target: qty,
        rateCents: rateCents!,
        unitId: kind === "RECORD" && unitId ? unitId : null,
        dueAt: dueAt ? new Date(`${dueAt}T23:59:00`).toISOString() : null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["voice-admin"] });
      onClose();
    },
  });
  return (
    <Drawer
      open
      onClose={onClose}
      title="Nova tarefa"
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "A criar…" : "Atribuir tarefa"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Tipo">
          <Select
            value={kind}
            onChange={(k) => {
              setKind(k);
              setAssigneeId("");
              setPrice(k === "RECORD" ? "0,10" : "0,02");
            }}
            options={[
              { value: "RECORD", label: "🎙️ Gravar palavras (paga por gravação aprovada)" },
              { value: "REVIEW", label: "🎧 Ouvir gravações (paga por avaliação)" },
            ]}
          />
        </Field>
        <Field
          label="Pessoa"
          {...(eligible.length === 0
            ? {
                hint: `Ninguém tem o papel «${kind === "RECORD" ? "Falador" : "Ouvinte"} (gravações)». Dá-o em Utilizadores.`,
              }
            : {})}
        >
          <Select
            value={assigneeId}
            onChange={setAssigneeId}
            options={[
              { value: "", label: "Escolhe…" },
              ...eligible.map((p) => ({
                value: p.userId,
                label: `${p.name} (@${p.username})${p.paused ? " — em pausa" : ""}${p.consented ? "" : " — ainda não aceitou as condições"}`,
              })),
            ]}
          />
        </Field>
        <Field label="Título (a pessoa vê)">
          <TextInput
            value={title}
            maxLength={120}
            placeholder={
              kind === "RECORD" ? "Ex.: Gravar 200 palavras — Comida" : "Ex.: Ouvir 500 gravações"
            }
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "RECORD" ? "Quantidade de gravações" : "Quantidade de avaliações"}>
            <TextInput
              type="number"
              min={1}
              max={10000}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <Field label="Preço por unidade (€)">
            <TextInput
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>
        {rateCents && qty > 0 && (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            Valor máximo da tarefa: <b>{euros(rateCents * qty)}</b>
            {kind === "RECORD" ? " (se todas forem aprovadas)" : ""}
          </p>
        )}
        {kind === "RECORD" && (
          <Field
            label="Palavras de"
            hint="Vazio = qualquer palavra da língua (as das lições primeiro)."
          >
            <Select
              value={unitId}
              onChange={setUnitId}
              options={[
                { value: "", label: "Toda a língua" },
                ...(course?.units ?? []).map((u) => ({
                  value: u.id,
                  label: `Unidade: ${u.title}`,
                })),
              ]}
            />
          </Field>
        )}
        <Field label="Prazo (opcional)">
          <TextInput type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <Field label="Instruções (opcional, a pessoa vê)">
          <TextArea value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {errorText(create.error) && (
          <p className="text-sm text-destructive">{errorText(create.error)}</p>
        )}
      </div>
    </Drawer>
  );
}

/* ---------------------------------- Pessoas ---------------------------------- */

function People() {
  const qc = useQueryClient();
  const people = useQuery({ queryKey: voiceKeys.people, queryFn: voiceApi.people });
  const [paying, setPaying] = useState<VoicePersonDto | null>(null);
  const pause = useMutation({
    mutationFn: (p: VoicePersonDto) => voiceApi.pause(p.userId, !p.paused),
    onSuccess: () => void qc.invalidateQueries({ queryKey: voiceKeys.people }),
  });
  const rows = (people.data ?? []).map((p) => ({ ...p, id: p.userId }));
  const columns: Column<VoicePersonDto & { id: string }>[] = [
    {
      key: "n",
      header: "Pessoa",
      cell: (p) => (
        <div>
          <p className="font-medium">
            {p.name} {p.paused && <span className="text-xs text-destructive">(em pausa)</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            @{p.username} ·{" "}
            {p.roles.map((r) => (r.role === "VOICE_SPEAKER" ? "Falador" : "Ouvinte")).join(", ")}
            {p.region ? ` · ${p.region}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "q",
      header: "Qualidade",
      cell: (p) => (
        <div className="text-xs">
          {p.approved + p.rejected > 0 && (
            <p>
              Aprovação: <b>{pct(p.approvalRate)}</b> ({p.approved}/{p.approved + p.rejected})
            </p>
          )}
          {p.controls > 0 && (
            <p
              className={cn(
                p.controls >= 5 && (p.controlAccuracy ?? 1) < 0.8 && "font-bold text-destructive",
              )}
            >
              Controlos: {pct(p.controlAccuracy)} ({p.controls})
            </p>
          )}
          {p.approved + p.rejected === 0 && p.controls === 0 && "—"}
        </div>
      ),
    },
    { key: "e", header: "Ganho", cell: (p) => euros(p.earnedCents) },
    { key: "w", header: "À espera", cell: (p) => euros(p.pendingCents) },
    { key: "pd", header: "Pago", cell: (p) => euros(p.paidCents) },
    {
      key: "b",
      header: "Saldo",
      cell: (p) => (
        <b className={p.balanceCents > 0 ? "text-primary" : ""}>{euros(p.balanceCents)}</b>
      ),
    },
    {
      key: "m",
      header: "Recebe por",
      cell: (p) =>
        p.payoutMethod ? (
          <div className="text-xs">
            <p className="font-medium">{METHOD_LABEL[p.payoutMethod]}</p>
            <p className="font-mono">{p.payoutDetails}</p>
          </div>
        ) : (
          <span className="text-xs text-destructive">Não indicou</span>
        ),
    },
    {
      key: "x",
      header: "",
      cell: (p) => (
        <div className="flex gap-1">
          <Btn size="sm" variant="outline" onClick={() => setPaying(p)}>
            <Wallet className="size-3.5" />
            Registar pagamento
          </Btn>
          {p.consented && (
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => pause.mutate(p)}
              title={p.paused ? "Retomar" : "Pausar"}
            >
              {p.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </Btn>
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        empty={people.isPending ? "A carregar…" : "Ninguém tem papéis de gravação."}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Controlos = gravações já decididas misturadas na fila dos ouvintes; medem a atenção e não
        são pagos. Abaixo de 80% fica a vermelho. Pausar impede trabalho novo sem apagar nada.
      </p>
      {paying && <NewPayout person={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function NewPayout({ person, onClose }: { person: VoicePersonDto; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(
    person.balanceCents > 0 ? (person.balanceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [method, setMethod] = useState<VoicePayoutMethod>(person.payoutMethod ?? "SEPA");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const cents = toCents(amount);
  const create = useMutation({
    mutationFn: () =>
      voiceApi.createPayout({
        userId: person.userId,
        amountCents: cents!,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["voice-admin"] });
      onClose();
    },
  });
  return (
    <Drawer
      open
      onClose={onClose}
      title={`Pagamento a ${person.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn disabled={!cents || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "A registar…" : "Registar pagamento"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          Saldo atual: <b>{euros(person.balanceCents)}</b> · Recebe por:{" "}
          {person.payoutMethod
            ? `${METHOD_LABEL[person.payoutMethod]} — ${person.payoutDetails}`
            : "não indicou"}
        </p>
        <p className="text-xs text-muted-foreground">
          Faz primeiro a transferência (no banco, MB WAY…). Aqui só fica registado — a pessoa vê-o
          logo no histórico dela.
        </p>
        <Field label="Valor pago (€)">
          <TextInput
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {cents && cents > person.balanceCents && (
          <p className="text-xs font-semibold text-destructive">
            Atenção: é mais do que o saldo (adiantamento).
          </p>
        )}
        <Field label="Método">
          <Select
            value={method}
            onChange={setMethod}
            options={(VOICE_CONFIG.pay.methods as readonly VoicePayoutMethod[]).map((m) => ({
              value: m,
              label: METHOD_LABEL[m],
            }))}
          />
        </Field>
        <Field label="Referência da transferência (opcional)">
          <TextInput
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
        <Field label="Nota (opcional, a pessoa vê)">
          <TextInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {errorText(create.error) && (
          <p className="text-sm text-destructive">{errorText(create.error)}</p>
        )}
      </div>
    </Drawer>
  );
}

/* --------------------------------- Pagamentos --------------------------------- */

function Payouts() {
  const payouts = useQuery({ queryKey: voiceKeys.payouts, queryFn: () => voiceApi.payouts() });
  const rows = payouts.data ?? [];
  const columns: Column<VoicePayoutDto>[] = [
    { key: "d", header: "Data", cell: (p) => new Date(p.paidAt).toLocaleDateString("pt-PT") },
    { key: "n", header: "Pessoa", cell: (p) => `${p.name} (@${p.username})` },
    { key: "v", header: "Valor", cell: (p) => <b>{euros(p.amountCents)}</b> },
    {
      key: "m",
      header: "Método",
      cell: (p) => METHOD_LABEL[p.method as VoicePayoutMethod] ?? p.method,
    },
    { key: "r", header: "Referência", cell: (p) => p.reference ?? "—" },
    { key: "b", header: "Registado por", cell: (p) => p.createdBy },
  ];
  return (
    <>
      <FilterBar>
        <Btn
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              `pagamentos_${isoDay(new Date())}.csv`,
              [
                "data",
                "nome",
                "username",
                "valor (€)",
                "método",
                "referência",
                "nota",
                "registado por",
              ],
              rows.map((p) => [
                isoDay(new Date(p.paidAt)),
                p.name,
                p.username,
                (p.amountCents / 100).toFixed(2).replace(".", ","),
                p.method,
                p.reference ?? "",
                p.note ?? "",
                p.createdBy,
              ]),
            )
          }
        >
          <Download className="size-4" />
          Exportar Excel (CSV)
        </Btn>
      </FilterBar>
      <DataTable
        rows={rows}
        columns={columns}
        empty={payouts.isPending ? "A carregar…" : "Ainda não há pagamentos."}
      />
      <p className="mt-2 text-sm">
        Total pago: <b>{euros(rows.reduce((s, p) => s + p.amountCents, 0))}</b>
      </p>
    </>
  );
}

/* --------------------------------- Relatório --------------------------------- */

function Report() {
  const today = isoDay(new Date());
  const [from, setFrom] = useState(addDays(today, -7));
  const [to, setTo] = useState(today);
  // "até" inclui o dia escolhido.
  const report = useQuery({
    queryKey: voiceKeys.report(from, to),
    queryFn: () => voiceApi.report(from, addDays(to, 1)),
    enabled: from <= to,
  });
  type Row = VoiceReportDto["people"][number] & { id: string };
  const rows: Row[] = (report.data?.people ?? []).map((p) => ({ ...p, id: p.userId }));
  const columns: Column<Row>[] = [
    { key: "n", header: "Pessoa", cell: (p) => `${p.name} (@${p.username})` },
    { key: "r", header: "Gravadas", cell: (p) => p.recorded },
    { key: "a", header: "Aprovadas", cell: (p) => p.approved },
    { key: "v", header: "Avaliações", cell: (p) => p.reviews },
    {
      key: "c",
      header: "Controlos",
      cell: (p) => (p.controls ? `${pct(p.controlsMatched / p.controls)} (${p.controls})` : "—"),
    },
    { key: "e", header: "Ganho no período", cell: (p) => <b>{euros(p.earnedCents)}</b> },
  ];
  return (
    <Panel title="Trabalho e valores por período">
      <FilterBar>
        <label className="text-sm">
          De{" "}
          <TextInput type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          até{" "}
          <TextInput type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <Btn
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              `gravacoes_${from}_${to}.csv`,
              [
                "nome",
                "username",
                "email",
                "gravadas",
                "aprovadas",
                "avaliações",
                "controlos",
                "ganho (€)",
              ],
              rows.map((p) => [
                p.name,
                p.username,
                p.email,
                p.recorded,
                p.approved,
                p.reviews,
                p.controls,
                (p.earnedCents / 100).toFixed(2).replace(".", ","),
              ]),
            )
          }
        >
          <Download className="size-4" />
          Exportar Excel (CSV)
        </Btn>
      </FilterBar>
      <DataTable
        rows={rows}
        columns={columns}
        empty={report.isPending ? "A carregar…" : "Sem atividade neste período."}
      />
    </Panel>
  );
}
