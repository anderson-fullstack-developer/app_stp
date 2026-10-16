/** Ecrãs do painel ligados ao servidor (painel inicial, revisão, vocabulário/frases, utilizadores). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Send, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/services/http";
import { ReviewLessonsAndExercises } from "./ServerCoursePages";
import { fmtDateTime } from "./format";
import { ROLE_LABEL } from "./permissions";
import {
  adminApi,
  type AdminUserRow,
  type ContentInput,
  type ReviewAction,
  type ServerContentKind,
  type ServerContentRow,
  type ServerContentStatus,
  useLanguageOptions,
  useServerAdmin,
} from "./server";
import type { AdminRole } from "./types";
import {
  Btn,
  type Column,
  Confirm,
  DataTable,
  Drawer,
  Field,
  FilterBar,
  Kpi,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
} from "./ui";

const KIND_LABEL: Record<ServerContentKind, string> = { vocabulary: "Palavra", phrase: "Frase" };
const STATUS_LABEL: Record<ServerContentStatus, string> = {
  DRAFT: "Rascunho",
  UNDER_REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  ARCHIVED: "Arquivado",
};
const ACTION_LABEL: Record<string, string> = {
  SUBMITTED: "Submeteu para revisão",
  APPROVED: "Aprovou",
  CHANGES_REQUESTED: "Pediu alterações",
  REJECTED: "Rejeitou",
  ARCHIVED: "Arquivou",
};

/** Mensagem do servidor (código estável → texto) para mostrar no painel. */
function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { message?: string | string[] } | undefined;
    const m = body?.message;
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

/* ---------------------------------- Painel inicial ---------------------------------- */

export function ServerDashboard() {
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: adminApi.overview });
  const o = overview.data;
  const n = (v: number | undefined) => (v ?? 0).toLocaleString("pt-PT");
  const pending = o
    ? (o.content.vocabulary.UNDER_REVIEW ?? 0) +
      (o.content.phrase.UNDER_REVIEW ?? 0) +
      (o.content.exercise.UNDER_REVIEW ?? 0)
    : 0;
  return (
    <>
      <PageHeader title="Dashboard" description="Dados reais do servidor." />
      {!o ? (
        <p className="text-sm text-muted-foreground">
          {overview.isError ? errorText(overview.error) : "A carregar…"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Utilizadores ativos" value={n(o.users.active)} />
            <Kpi label="Novos esta semana" value={n(o.users.newThisWeek)} />
            <Kpi label="Praticaram esta semana" value={n(o.users.activeThisWeek)} />
            <Kpi label="À espera de revisão" value={n(pending)} />
          </div>
          <Panel title="Conteúdo por estado" className="mt-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Tipo</th>
                  {(Object.keys(STATUS_LABEL) as ServerContentStatus[]).map((s) => (
                    <th key={s} className="py-1 text-right">
                      {STATUS_LABEL[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["vocabulary", "phrase", "exercise"] as const).map((k) => (
                  <tr key={k} className="border-t">
                    <td className="py-2 font-medium">
                      {k === "vocabulary"
                        ? "Vocabulário"
                        : k === "phrase"
                          ? "Frases"
                          : "Exercícios"}
                    </td>
                    {(Object.keys(STATUS_LABEL) as ServerContentStatus[]).map((s) => (
                      <td key={s} className="py-2 text-right tabular-nums">
                        {n(o.content[k][s])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          {pending > 0 && (
            <Link
              to="/admin/review"
              search={{ status: "UNDER_REVIEW" }}
              className="mt-4 inline-block text-sm font-semibold text-primary"
            >
              Abrir a fila de revisão →
            </Link>
          )}
        </>
      )}
    </>
  );
}

/* ----------------------------- Vocabulário e frases ----------------------------- */

const STATUS_FILTER = [
  { value: "", label: "Todos os estados" },
  ...(Object.keys(STATUS_LABEL) as ServerContentStatus[]).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  })),
] as const;

const POS = [
  "NOUN",
  "VERB",
  "ADJECTIVE",
  "ADVERB",
  "PRONOUN",
  "PREPOSITION",
  "CONJUNCTION",
  "INTERJECTION",
  "NUMERAL",
  "PROPER_NOUN",
  "OTHER",
] as const;

export function ServerContentManager({ kind }: { kind: ServerContentKind }) {
  const languages = useLanguageOptions();
  const [languageId, setLanguageId] = useState("");
  const [status, setStatus] = useState<"" | ServerContentStatus>("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ServerContentRow | "new" | null>(null);
  const list = useQuery({
    queryKey: ["admin", "content", kind, languageId, status, q],
    queryFn: () =>
      adminApi.list(kind, {
        ...(languageId ? { languageId } : {}),
        ...(status ? { status } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      }),
  });
  const langName = (id: string) => languages.find((l) => l.value === id)?.label ?? id;

  const columns: Column<ServerContentRow>[] = [
    {
      key: "t",
      header: KIND_LABEL[kind],
      cell: (r) => <span className="font-medium">{r.text}</span>,
    },
    { key: "pt", header: "Português", cell: (r) => r.translations.pt ?? "—" },
    { key: "en", header: "Inglês", cell: (r) => r.translations.en ?? "—" },
    { key: "l", header: "Língua", cell: (r) => langName(r.languageId) },
    { key: "a", header: "Autor", cell: (r) => `@${r.author.username}` },
    { key: "d", header: "Atualizado", cell: (r) => fmtDateTime(r.updatedAt) },
    { key: "s", header: "Estado", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={kind === "vocabulary" ? "Vocabulário" : "Frases"}
        description="Tudo o que se cria fica em rascunho. Só conteúdo aprovado por outra pessoa chega à app."
        actions={
          <Btn onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            {kind === "vocabulary" ? "Nova palavra" : "Nova frase"}
          </Btn>
        }
      />
      <FilterBar>
        <Select
          value={languageId}
          onChange={setLanguageId}
          className="w-64"
          options={[{ value: "", label: "Todas as línguas" }, ...languages]}
        />
        <Select
          value={status}
          onChange={(v) => setStatus(v as "" | ServerContentStatus)}
          className="w-48"
          options={STATUS_FILTER}
        />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar…"
          className="w-64"
          aria-label="Pesquisar"
        />
      </FilterBar>
      {list.isError ? (
        <ErrorNote error={list.error} />
      ) : (
        <DataTable
          rows={list.data ?? []}
          columns={columns}
          onRowClick={(r) => setEditing(r)}
          empty={list.isPending ? "A carregar…" : "Ainda não há conteúdo aqui."}
        />
      )}
      {editing && (
        <ContentEditor
          kind={kind}
          row={editing === "new" ? null : editing}
          languages={languages}
          defaultLanguage={languageId || languages[0]?.value || ""}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ContentEditor({
  kind,
  row,
  languages,
  defaultLanguage,
  onClose,
}: {
  kind: ServerContentKind;
  row: ServerContentRow | null;
  languages: { value: string; label: string }[];
  defaultLanguage: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editable = !row || row.status === "DRAFT" || row.status === "REJECTED";
  const [form, setForm] = useState<ContentInput>(() => ({
    languageId: row?.languageId ?? defaultLanguage,
    text: row?.text ?? "",
    translations: { pt: row?.translations.pt ?? "", en: row?.translations.en ?? "" },
    partOfSpeech: row?.partOfSpeech ?? "NOUN",
    difficulty: row?.difficulty ?? "EASY",
    category: row?.category ?? "",
    notes: row?.notes ?? "",
    sourceRef: row?.sourceRef ?? "",
  }));
  const set = (patch: Partial<ContentInput>) => setForm((f) => ({ ...f, ...patch }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const save = useMutation({
    mutationFn: async (submitAfter: boolean) => {
      // A classe gramatical só existe no vocabulário.
      const { partOfSpeech, ...rest } = form;
      const body: ContentInput =
        kind === "vocabulary" && partOfSpeech ? { ...rest, partOfSpeech } : rest;
      const id = row
        ? (await adminApi.update(kind, row.id, body)).id
        : (await adminApi.create(kind, body)).id;
      if (submitAfter) await adminApi.review(kind, id, "submit");
    },
    onSuccess: () => {
      void refresh();
      onClose();
    },
  });
  const archive = useMutation({
    mutationFn: () => adminApi.review(kind, row!.id, "archive"),
    onSuccess: () => {
      void refresh();
      onClose();
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={
        row
          ? `${KIND_LABEL[kind]} · ${row.text}`
          : kind === "vocabulary"
            ? "Nova palavra"
            : "Nova frase"
      }
      footer={
        editable ? (
          <>
            <Btn variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>
              Guardar rascunho
            </Btn>
            <Btn disabled={save.isPending || !form.text.trim()} onClick={() => save.mutate(true)}>
              <Send className="size-4" />
              Guardar e enviar para revisão
            </Btn>
          </>
        ) : row?.status === "APPROVED" ? (
          <Btn variant="outline" disabled={archive.isPending} onClick={() => archive.mutate()}>
            Arquivar
          </Btn>
        ) : null
      }
    >
      {row && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={row.status} />
          <span className="text-muted-foreground">
            Versão {row.version} · por @{row.author.username}
            {row.reviewer ? ` · revisto por @${row.reviewer.username}` : ""}
          </span>
        </div>
      )}
      {!editable && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          {row?.status === "UNDER_REVIEW"
            ? "Em revisão: espera pela decisão de um linguista (na fila de revisão)."
            : "Conteúdo aprovado ou arquivado não se edita. Para mudar, arquiva e cria um novo."}
        </p>
      )}
      <ErrorNote error={save.error ?? archive.error} />
      <fieldset disabled={!editable} className="grid grid-cols-2 gap-3">
        <Field label="Língua" className="col-span-2">
          {row ? (
            <TextInput
              value={languages.find((l) => l.value === form.languageId)?.label ?? form.languageId}
              readOnly
            />
          ) : (
            <Select
              value={form.languageId}
              onChange={(v) => set({ languageId: v })}
              options={languages}
            />
          )}
        </Field>
        <Field label={kind === "vocabulary" ? "Palavra" : "Frase"} className="col-span-2">
          <TextInput
            value={form.text}
            onChange={(e) => set({ text: e.target.value })}
            maxLength={300}
          />
        </Field>
        <Field label="Tradução (português)">
          <TextInput
            value={form.translations.pt ?? ""}
            onChange={(e) => set({ translations: { ...form.translations, pt: e.target.value } })}
          />
        </Field>
        <Field label="Tradução (inglês)">
          <TextInput
            value={form.translations.en ?? ""}
            onChange={(e) => set({ translations: { ...form.translations, en: e.target.value } })}
          />
        </Field>
        {kind === "vocabulary" && (
          <Field label="Classe gramatical">
            <Select
              value={form.partOfSpeech ?? "NOUN"}
              onChange={(v) => set({ partOfSpeech: v })}
              options={POS}
            />
          </Field>
        )}
        <Field label="Dificuldade">
          <Select
            value={form.difficulty ?? "EASY"}
            onChange={(v) => set({ difficulty: v })}
            options={[
              { value: "EASY", label: "Fácil" },
              { value: "MEDIUM", label: "Média" },
              { value: "HARD", label: "Difícil" },
            ]}
          />
        </Field>
        {kind === "vocabulary" && (
          <Field label="Categoria">
            <TextInput
              value={form.category ?? ""}
              onChange={(e) => set({ category: e.target.value })}
            />
          </Field>
        )}
        <Field label="Fonte (referência)" hint="Livro, dicionário, pessoa consultada…">
          <TextInput
            value={form.sourceRef ?? ""}
            onChange={(e) => set({ sourceRef: e.target.value })}
          />
        </Field>
        <Field label={kind === "vocabulary" ? "Notas" : "Explicação"} className="col-span-2">
          <TextArea value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </fieldset>
      {row && <History kind={kind} id={row.id} />}
    </Drawer>
  );
}

function History({ kind, id }: { kind: ServerContentKind; id: string }) {
  const h = useQuery({
    queryKey: ["admin", "history", kind, id],
    queryFn: () => adminApi.history(kind, id),
  });
  if (!h.data?.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Histórico</p>
      <ol className="space-y-1.5 text-sm">
        {h.data.map((e, i) => (
          <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">
            <span className="font-medium">@{e.actor.username}</span>{" "}
            {ACTION_LABEL[e.action] ?? e.action}
            <span className="text-muted-foreground"> · {fmtDateTime(e.createdAt)}</span>
            {e.comment && <p className="mt-0.5 text-muted-foreground">“{e.comment}”</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------- Revisão ---------------------------------- */

type ReviewStatus = "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export function ServerReviewQueue({ status }: { status: ReviewStatus }) {
  const languages = useLanguageOptions();
  const [open, setOpen] = useState<ServerContentRow | null>(null);
  const fetchKind = (kind: ServerContentKind) => adminApi.list(kind, { status });
  const vocab = useQuery({
    queryKey: ["admin", "content", "vocabulary", "", status, ""],
    queryFn: () => fetchKind("vocabulary"),
  });
  const phrases = useQuery({
    queryKey: ["admin", "content", "phrase", "", status, ""],
    queryFn: () => fetchKind("phrase"),
  });
  const rows = [...(vocab.data ?? []), ...(phrases.data ?? [])].sort((a, b) =>
    status === "UNDER_REVIEW"
      ? a.updatedAt.localeCompare(b.updatedAt)
      : b.updatedAt.localeCompare(a.updatedAt),
  );
  const langName = (id: string) => languages.find((l) => l.value === id)?.label ?? id;
  const columns: Column<ServerContentRow>[] = [
    {
      key: "k",
      header: "Tipo",
      cell: (r) => (
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {KIND_LABEL[r.kind]}
          {r.aiGenerated && " · IA"}
        </span>
      ),
    },
    { key: "t", header: "Conteúdo", cell: (r) => <span className="font-medium">{r.text}</span> },
    { key: "tr", header: "Tradução", cell: (r) => r.translations.pt ?? r.translations.en ?? "—" },
    { key: "l", header: "Língua", cell: (r) => langName(r.languageId) },
    { key: "a", header: "Autor", cell: (r) => `@${r.author.username}` },
    { key: "r", header: "Revisor", cell: (r) => (r.reviewer ? `@${r.reviewer.username}` : "—") },
    { key: "d", header: "Data", cell: (r) => fmtDateTime(r.updatedAt) },
  ];
  const TITLE: Record<ReviewStatus, string> = {
    UNDER_REVIEW: "Fila de revisão — Pendentes",
    APPROVED: "Conteúdo aprovado",
    REJECTED: "Conteúdo rejeitado",
  };
  return (
    <>
      <PageHeader
        title={TITLE[status]}
        description="Só conteúdo APPROVED aparece na app. Quem criou não pode rever o próprio conteúdo."
        actions={(["UNDER_REVIEW", "APPROVED", "REJECTED"] as ReviewStatus[]).map((s) => (
          <Link
            key={s}
            to="/admin/review"
            search={{ status: s }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${s === status ? "bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {s === "UNDER_REVIEW" ? "Pendentes" : s === "APPROVED" ? "Aprovados" : "Rejeitados"}
          </Link>
        ))}
      />
      <ErrorNote error={vocab.error ?? phrases.error} />
      <DataTable
        rows={rows}
        columns={columns}
        onRowClick={setOpen}
        empty={vocab.isPending || phrases.isPending ? "A carregar…" : "Nada nesta fila."}
      />
      {open && <ReviewDrawer row={open} onClose={() => setOpen(null)} langName={langName} />}
      <ReviewLessonsAndExercises status={status} />
    </>
  );
}

function ReviewDrawer({
  row,
  onClose,
  langName,
}: {
  row: ServerContentRow;
  onClose: () => void;
  langName: (id: string) => string;
}) {
  const qc = useQueryClient();
  const me = useServerAdmin().session;
  const [comment, setComment] = useState("");
  const act = useMutation({
    mutationFn: (action: ReviewAction) =>
      adminApi.review(row.kind, row.id, action, comment.trim() || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    },
  });
  const isAuthor = me?.id === row.author.id;
  const pending = row.status === "UNDER_REVIEW";
  return (
    <Drawer
      open
      onClose={onClose}
      wide
      title={`${KIND_LABEL[row.kind]} · ${row.text}`}
      footer={
        pending && !isAuthor ? (
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
            <Btn variant="success" disabled={act.isPending} onClick={() => act.mutate("approve")}>
              <ShieldCheck className="size-4" />
              Aprovar
            </Btn>
          </>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status} />
        {row.aiGenerated && (
          <span className="text-xs font-semibold text-accent-deep">
            Gerado por IA — rever com cuidado
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Item label="Conteúdo" value={row.text} wide />
        <Item label="Português" value={row.translations.pt ?? "—"} />
        <Item label="Inglês" value={row.translations.en ?? "—"} />
        <Item label="Língua" value={langName(row.languageId)} />
        <Item label="Classe" value={row.partOfSpeech ?? "—"} />
        <Item label="Autor" value={`${row.author.name} (@${row.author.username})`} />
        <Item label="Fonte" value={row.sourceRef ?? "—"} />
        <Item
          label={row.kind === "vocabulary" ? "Notas" : "Explicação"}
          value={row.notes ?? "—"}
          wide
        />
      </dl>
      {pending && isAuthor && (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          Foste tu que criaste este conteúdo: outra pessoa tem de o rever.
        </p>
      )}
      {pending && !isAuthor && (
        <Field
          label="Comentário (opcional)"
          hint="Explica o que deve mudar, se pedires alterações ou rejeitares."
        >
          <TextArea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
        </Field>
      )}
      <ErrorNote error={act.error} />
      <History kind={row.kind} id={row.id} />
    </Drawer>
  );
}

const Item = ({ label, value, wide }: { label: string; value: string; wide?: boolean }) => (
  <div className={wide ? "col-span-2" : ""}>
    <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 font-medium">{value}</dd>
  </div>
);

/* --------------------------------- Utilizadores --------------------------------- */

const GRANTABLE: AdminRole[] = [
  "MODERATOR",
  "CONTENT_EDITOR",
  "LINGUIST",
  "VOICE_SPEAKER",
  "VOICE_LISTENER",
  "ADMIN",
  "SUPER_ADMIN",
];

export function ServerUsers() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AdminUserRow | null>(null);
  const users = useQuery({
    queryKey: ["admin", "users", q.trim()],
    queryFn: () => adminApi.users(q.trim()),
  });
  const columns: Column<AdminUserRow>[] = [
    {
      key: "u",
      header: "Utilizador",
      cell: (u) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-muted-foreground">@{u.username}</p>
        </div>
      ),
    },
    { key: "e", header: "Email", cell: (u) => u.email },
    {
      key: "r",
      header: "Papéis",
      cell: (u) =>
        u.roles.length
          ? u.roles
              .map((r) => ROLE_LABEL[r.role] + (r.languageId ? ` (${r.languageId})` : ""))
              .join(", ")
          : "—",
    },
    { key: "l", header: "Nível", cell: (u) => u.level },
    { key: "d", header: "Registo", cell: (u) => fmtDateTime(u.createdAt) },
    {
      key: "s",
      header: "Estado",
      cell: (u) => <StatusBadge status={u.status === "SUSPENDED" ? "SUSPENSO" : "ATIVO"} />,
    },
  ];
  const current = open ? (users.data?.find((u) => u.id === open.id) ?? open) : null;
  return (
    <>
      <PageHeader title="Utilizadores" description="Pesquisar contas, dar papéis e moderar." />
      <FilterBar>
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="@username, nome ou email"
          className="w-80"
          aria-label="Pesquisar utilizadores"
        />
      </FilterBar>
      <ErrorNote error={users.error} />
      <DataTable
        rows={users.data ?? []}
        columns={columns}
        onRowClick={setOpen}
        empty={users.isPending ? "A carregar…" : "Ninguém encontrado."}
      />
      {current && <UserDrawer user={current} onClose={() => setOpen(null)} />}
    </>
  );
}

function UserDrawer({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const server = useServerAdmin();
  const languages = useLanguageOptions();
  const myRole = server.session?.role;
  const isAdmin = myRole === "ADMIN" || myRole === "SUPER_ADMIN";
  const isSuper = myRole === "SUPER_ADMIN";
  const [role, setRole] = useState<AdminRole>("LINGUIST");
  const [languageId, setLanguageId] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const perLanguage = ["LINGUIST", "CONTENT_EDITOR", "VOICE_SPEAKER", "VOICE_LISTENER"].includes(
    role,
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const grant = useMutation({
    mutationFn: () => adminApi.grant(user.id, role, perLanguage && languageId ? languageId : null),
    onSuccess: () => void refresh(),
  });
  const revoke = useMutation({
    mutationFn: (roleId: string) => adminApi.revoke(roleId),
    onSuccess: () => void refresh(),
  });
  const status = useMutation({
    mutationFn: (s: "ACTIVE" | "SUSPENDED") => adminApi.setStatus(user.id, s),
    onSuccess: () => void refresh(),
  });
  const isSelf = server.session?.id === user.id;

  return (
    <Drawer open onClose={onClose} title={`${user.name} · @${user.username}`}>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Item label="Email" value={user.email} wide />
        <Item label="Nível" value={String(user.level)} />
        <Item label="XP total" value={user.xpTotal.toLocaleString("pt-PT")} />
        <Item label="Sequência" value={String(user.streak)} />
        <Item label="País" value={user.countryCode ?? "—"} />
      </dl>
      <ErrorNote error={grant.error ?? revoke.error ?? status.error} />
      <div>
        <p className="mb-2 text-sm font-semibold">Papéis</p>
        {user.roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Utilizador normal (sem papéis).</p>
        ) : (
          <ul className="space-y-1.5">
            {user.roles.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <span>
                  {ROLE_LABEL[r.role]}
                  {r.languageId
                    ? ` · ${languages.find((l) => l.value === r.languageId)?.label ?? r.languageId}`
                    : " · todas as línguas"}
                </span>
                {isAdmin && (
                  <Btn
                    variant="ghost"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(r.id)}
                  >
                    Tirar
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {isAdmin && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-semibold">Dar papel</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={role}
              onChange={setRole}
              options={GRANTABLE.filter(
                (r) => isSuper || (r !== "ADMIN" && r !== "SUPER_ADMIN"),
              ).map((r) => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
            {perLanguage ? (
              <Select
                value={languageId}
                onChange={setLanguageId}
                options={[{ value: "", label: "Todas as línguas" }, ...languages]}
              />
            ) : (
              <span />
            )}
          </div>
          <Btn size="sm" disabled={grant.isPending} onClick={() => grant.mutate()}>
            <Plus className="size-4" />
            Dar papel
          </Btn>
        </div>
      )}
      {!isSelf && (
        <div className="border-t pt-3">
          {user.status === "SUSPENDED" ? (
            <Btn
              variant="outline"
              disabled={status.isPending}
              onClick={() => status.mutate("ACTIVE")}
            >
              Reativar conta
            </Btn>
          ) : (
            <Btn
              variant="danger"
              disabled={status.isPending}
              onClick={() => setConfirmSuspend(true)}
            >
              <UserX className="size-4" />
              Suspender conta
            </Btn>
          )}
        </div>
      )}
      <Confirm
        open={confirmSuspend}
        danger
        title="Suspender conta?"
        text={`${user.name} deixa de conseguir usar a app até ser reativado.`}
        confirmLabel="Suspender"
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => {
          setConfirmSuspend(false);
          status.mutate("SUSPENDED");
        }}
      />
    </Drawer>
  );
}
