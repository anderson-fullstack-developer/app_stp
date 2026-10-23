/**
 * Páginas do painel ligadas aos dados reais do servidor (só leitura): línguas, Arena,
 * desafios do dia, rankings, conquistas, analytics, auditoria, regras e pesquisa.
 * Premium, anúncios e denúncias ainda não existem na app: mostram isso, sem números falsos.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { features, MULTIPLAYER_CONFIG, VOICE_CONFIG } from "@stp/config";

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { fmtDateTime } from "./format";
import {
  type InsightAudit,
  type InsightDaily,
  type InsightMatch,
  type InsightRankRow,
  insightsApi,
  MODE_LABEL,
} from "./insights";
import { ROLE_LABEL } from "./permissions";
import type { AdminRole } from "./types";
import {
  BarChart,
  type Column,
  DataTable,
  Drawer,
  FilterBar,
  Kpi,
  LineChart,
  PageHeader,
  Panel,
  Select,
} from "./ui";
import { cn } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("pt-PT");
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });

function Loading({ error }: { error?: unknown }) {
  return (
    <p className="text-sm text-muted-foreground">
      {error ? "Não foi possível carregar os dados do servidor." : "A carregar…"}
    </p>
  );
}

const LANG_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: "Ativa", tone: "bg-success-soft text-success" },
  BETA: { label: "Beta", tone: "bg-accent/25 text-accent-foreground" },
  COMING_SOON: { label: "Em breve", tone: "bg-muted text-muted-foreground" },
  INACTIVE: { label: "Inativa", tone: "bg-muted text-muted-foreground" },
};

/* ---------------------------------- Línguas ---------------------------------- */

export function ServerLanguages() {
  const q = useQuery({ queryKey: ["insights", "languages"], queryFn: insightsApi.languages });
  return (
    <>
      <PageHeader
        title="Línguas"
        description="Línguas da plataforma, com o conteúdo e os alunos de cada uma (dados reais)."
      />
      {!q.data ? (
        <Loading error={q.error} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data.map((l) => {
            const s = LANG_STATUS[l.status]!;
            return (
              <div key={l.id} className="rounded-xl border bg-surface p-5">
                <div className="flex items-start justify-between">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                    {l.isoCode ?? l.id}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.tone)}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-3 text-lg font-bold">{l.name}</p>
                <p className="text-sm text-muted-foreground">
                  {l.country}
                  {l.region ? ` · ${l.region}` : ""}
                  {l.orthography ? ` · ${l.orthography}` : ""}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["Palavras", l.words],
                      ["Aprovadas", l.wordsApproved],
                      ["Com som", l.wordsWithAudio],
                      ["Lições", l.lessons],
                      ["Exercícios", l.exercises],
                      ["Alunos", l.learners],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-muted/50 px-1 py-2">
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      <dd className="font-display text-lg font-bold tabular-nums">{n(value)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  {n(l.matches)} partidas na Arena · {n(l.dailyChallenges)} desafios do dia
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------------------------- Arena ---------------------------------- */

const MATCH_STATUS: Record<InsightMatch["status"], string> = {
  IN_PROGRESS: "A decorrer",
  FINISHED: "Terminada",
  CANCELLED: "Cancelada",
};

export function ServerMultiplayer() {
  const q = useQuery({ queryKey: ["insights", "matches"], queryFn: insightsApi.matches });
  const [mode, setMode] = useState("ALL");
  const [open, setOpen] = useState<InsightMatch | null>(null);
  if (!q.data) {
    return (
      <>
        <PageHeader title="Multiplayer" />
        <Loading error={q.error} />
      </>
    );
  }
  const { kpis, byMode, perDay, matches } = q.data;
  const rows = matches.filter((m) => mode === "ALL" || m.mode === mode);
  const columns: Column<InsightMatch>[] = [
    { key: "d", header: "Início", cell: (m) => fmtDateTime(m.startedAt) },
    { key: "mo", header: "Modo", cell: (m) => MODE_LABEL[m.mode] ?? m.mode },
    {
      key: "s",
      header: "Sala",
      cell: (m) => (m.roomCode ? <span className="font-mono text-xs">{m.roomCode}</span> : "—"),
    },
    { key: "st", header: "Estado", cell: (m) => MATCH_STATUS[m.status] },
    { key: "p", header: "Jogadores", cell: (m) => m.players.length },
    { key: "r", header: "Rondas", cell: (m) => m.rounds },
    { key: "w", header: "Vencedor", cell: (m) => (m.winner ? `@${m.winner}` : "—") },
    { key: "$", header: "Prémios", cell: (m) => (m.rewarded ? "Sim" : "Não") },
  ];
  return (
    <>
      <PageHeader
        title="Multiplayer"
        description="Partidas reais da Arena (servidor em tempo real)."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Kpi label="Partidas (total)" value={n(kpis.total)} />
        <Kpi label="Hoje" value={n(kpis.today)} />
        <Kpi label="A decorrer" value={n(kpis.live)} />
        <Kpi
          label="Duração média"
          value={
            kpis.avgSeconds ? `${Math.floor(kpis.avgSeconds / 60)}m ${kpis.avgSeconds % 60}s` : "—"
          }
        />
        <Kpi label="Concluídas" value={pct(kpis.completionRate)} />
        <Kpi label="Abandono" value={pct(kpis.abandonRate)} tone="down" />
      </div>
      <div className="my-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Partidas por dia (30 dias)">
          <LineChart data={perDay.map((d) => d.value)} tone="ocean" />
          <p className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{fmtDay(perDay[0]!.date)}</span>
            <span>{fmtDay(perDay.at(-1)!.date)}</span>
          </p>
        </Panel>
        <Panel title="Partidas por modo">
          <BarChart
            data={byMode.map((b) => ({ label: MODE_LABEL[b.mode] ?? b.mode, value: b.count }))}
            height={120}
          />
        </Panel>
      </div>
      <FilterBar>
        <Select
          value={mode}
          onChange={setMode}
          options={[
            { value: "ALL", label: "Todos os modos" },
            ...Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
      </FilterBar>
      <DataTable
        rows={rows}
        columns={columns}
        onRowClick={setOpen}
        pageSize={12}
        empty="Sem partidas."
      />
      {open && (
        <Drawer
          open
          onClose={() => setOpen(null)}
          title={`Partida · ${MODE_LABEL[open.mode] ?? open.mode}`}
          wide
        >
          <div className="grid grid-cols-4 gap-2 text-sm">
            <Kpi
              label="Estado"
              value={<span className="text-base">{MATCH_STATUS[open.status]}</span>}
            />
            <Kpi label="Rondas" value={open.rounds} />
            <Kpi
              label="Início"
              value={<span className="text-base">{fmtDateTime(open.startedAt)}</span>}
            />
            <Kpi
              label="Vencedor"
              value={<span className="text-base">{open.winner ? `@${open.winner}` : "—"}</span>}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Lugar", "Jogador", "Certas", "Erradas", "Sem resposta", "XP", "Moedas"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {open.players.map((p) => (
                  <tr key={p.username} className="border-t">
                    <td className="px-3 py-2 font-semibold">{p.place ? `${p.place}.º` : "—"}</td>
                    <td className="px-3 py-2">
                      @{p.username}{" "}
                      {p.left && <span className="text-xs text-destructive">(saiu)</span>}
                    </td>
                    <td className="px-3 py-2">{p.correct}</td>
                    <td className="px-3 py-2">{p.wrong}</td>
                    <td className="px-3 py-2">{p.timeouts}</td>
                    <td className="px-3 py-2">+{p.xp}</td>
                    <td className="px-3 py-2">+{p.coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Drawer>
      )}
    </>
  );
}

/* ------------------------------- Desafio do dia ------------------------------- */

export function ServerDailyAdmin() {
  const q = useQuery({ queryKey: ["insights", "daily"], queryFn: insightsApi.daily });
  const columns: Column<InsightDaily>[] = [
    { key: "d", header: "Dia", cell: (c) => <span className="font-medium">{fmtDay(c.date)}</span> },
    { key: "l", header: "Língua", cell: (c) => c.languageName },
    { key: "q", header: "Perguntas", cell: (c) => c.questions },
    { key: "s", header: "Começaram", cell: (c) => c.started },
    { key: "c", header: "Concluíram", cell: (c) => c.completed },
    { key: "a", header: "Acerto médio", cell: (c) => pct(c.avgAccuracy) },
    { key: "p", header: "Perfeitos", cell: (c) => c.perfect },
    {
      key: "t",
      header: "Melhores",
      cell: (c) =>
        c.top.length
          ? c.top
              .map((x, i) => `${["🥇", "🥈", "🥉"][i]} @${x.username} ${x.correct}/${x.total}`)
              .join("  ")
          : "—",
    },
  ];
  const rows = q.data ?? [];
  const totalPlays = rows.reduce((s, c) => s + c.completed, 0);
  return (
    <>
      <PageHeader
        title="Desafio diário"
        description="Gerado sozinho pelo servidor todos os dias, com 5 perguntas iguais para todos (só conteúdo visível)."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Desafios" value={n(rows.length)} />
        <Kpi label="Participações concluídas" value={n(totalPlays)} />
        <Kpi label="Hoje" value={rows[0] ? `${rows[0].completed} jogaram` : "—"} />
        <Kpi label="Acerto médio (hoje)" value={rows[0] ? pct(rows[0].avgAccuracy) : "—"} />
      </div>
      {!q.data ? (
        <Loading error={q.error} />
      ) : (
        <DataTable rows={rows} columns={columns} pageSize={14} empty="Ainda não há desafios." />
      )}
    </>
  );
}

/* ---------------------------------- Rankings ---------------------------------- */

export function ServerRankings() {
  const q = useQuery({ queryKey: ["insights", "rankings"], queryFn: insightsApi.rankings });
  const [scope, setScope] = useState<"week" | "allTime">("week");
  const data = q.data;
  const rows = (data?.[scope] ?? []).map((r, i) => ({ ...r, id: r.userId, rank: i + 1 }));
  const columns: Column<InsightRankRow & { id: string; rank: number }>[] = [
    {
      key: "r",
      header: "#",
      cell: (u) => <b>{u.rank <= 3 ? ["🥇", "🥈", "🥉"][u.rank - 1] : u.rank}</b>,
    },
    {
      key: "u",
      header: "Utilizador",
      cell: (u) => (
        <span>
          {u.name} <span className="text-muted-foreground">@{u.username}</span>
        </span>
      ),
    },
    { key: "w", header: "XP da semana", cell: (u) => <b>{n(u.weekXp)}</b> },
    { key: "x", header: "XP total", cell: (u) => n(u.xpTotal) },
    { key: "l", header: "Nível", cell: (u) => u.level },
    { key: "s", header: "Sequência", cell: (u) => (u.streak ? `🔥 ${u.streak}` : "—") },
    { key: "m", header: "Partidas", cell: (u) => u.matches },
  ];
  return (
    <>
      <PageHeader
        title="Rankings"
        description={
          data
            ? `Calculado pelo servidor a partir do livro-razão de XP. Semana desde ${fmtDay(data.weekStart)}.`
            : "Classificação real por XP."
        }
      />
      <FilterBar>
        <Select
          value={scope}
          onChange={setScope}
          options={[
            { value: "week", label: "Esta semana" },
            { value: "allTime", label: "Desde sempre" },
          ]}
        />
      </FilterBar>
      {!data ? (
        <Loading error={q.error} />
      ) : (
        <DataTable rows={rows} columns={columns} pageSize={15} empty="Ainda sem XP." />
      )}
    </>
  );
}

/* --------------------------------- Conquistas --------------------------------- */

const METRIC_LABEL = {
  lessons: "Lições",
  streak: "Sequência",
  correct: "Respostas certas",
  level: "Nível",
};

export function ServerAchievements() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["insights", "achievements"], queryFn: insightsApi.achievements });
  const titles = t("achievementsList", { returnObjects: true }) as Record<
    string,
    { title: string; text?: string; description?: string }
  >;
  return (
    <>
      <PageHeader
        title="Achievements"
        description="Conquistas reais: o servidor dá-as sozinho quando a meta é atingida."
      />
      {!q.data ? (
        <Loading error={q.error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {q.data.achievements.map((a) => {
            const share = q.data.users ? a.earned / q.data.users : 0;
            return (
              <div key={a.key} className="rounded-xl border bg-surface p-4">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{a.icon}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      a.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {a.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{titles[a.key]?.title ?? a.key}</p>
                <p className="text-xs text-muted-foreground">
                  {METRIC_LABEL[a.metric]} ≥ {n(a.target)} · +{a.rewardCoins} moedas
                  {a.rewardXp ? ` · +${a.rewardXp} XP` : ""}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, share * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs">
                  <b>{n(a.earned)}</b> pessoas ({pct(share)})
                  {a.lastEarnedAt ? ` · última: ${fmtDateTime(a.lastEarnedAt)}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        As moedas de cada conquista vêm das regras de recompensa (em «Regras e recompensas»).
      </p>
    </>
  );
}

/* --------------------------------- Analytics --------------------------------- */

function Series({
  title,
  data,
  tone,
}: {
  title: string;
  data: { date: string; value: number }[];
  tone?: "primary" | "ocean" | "accent";
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Panel title={`${title} · ${n(total)} em 30 dias`}>
      <LineChart data={data.map((d) => d.value)} {...(tone ? { tone } : {})} />
      <p className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{fmtDay(data[0]!.date)}</span>
        <span>{fmtDay(data.at(-1)!.date)}</span>
      </p>
    </Panel>
  );
}

export function ServerAnalytics() {
  const q = useQuery({ queryKey: ["insights", "analytics"], queryFn: insightsApi.analytics });
  const a = q.data;
  if (!a) {
    return (
      <>
        <PageHeader title="Analytics" />
        <Loading error={q.error} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Uso real da plataforma (servidor), últimos 30 dias."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        <Kpi label="Utilizadores" value={n(a.kpis.users)} />
        <Kpi label="Ativos hoje" value={n(a.kpis.dau)} />
        <Kpi label="Ativos 7 dias" value={n(a.kpis.wau)} />
        <Kpi label="Ativos 30 dias" value={n(a.kpis.mau)} />
        <Kpi label="Sequência média" value={a.kpis.avgStreak} />
        <Kpi label="Lições concluídas" value={n(a.kpis.lessonsCompleted)} />
        <Kpi label="Lições / aluno" value={a.kpis.lessonsPerLearner} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Series title="Pessoas ativas por dia" data={a.dau} />
        <Series title="Novos registos" data={a.signups} tone="ocean" />
        <Series title="Lições concluídas" data={a.lessons} />
        <Series title="XP ganho" data={a.xp} tone="accent" />
        <Panel title="Voltaram depois de… (retenção)">
          <BarChart
            data={a.retention.map((r) => ({
              label: `${r.day} dia${r.day > 1 ? "s" : ""}`,
              value: Math.round((r.rate ?? 0) * 100),
            }))}
            suffix="%"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {a.retention.map((r) => `${r.day}d: ${r.cohort} pessoas`).join(" · ")}
          </p>
        </Panel>
        <Panel title="Partidas por modo">
          <BarChart
            data={a.byMode.map((b) => ({ label: MODE_LABEL[b.mode] ?? b.mode, value: b.count }))}
          />
        </Panel>
        <Panel title="Palavras com mais erros (lições)">
          {a.hardest.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda poucas respostas (mínimo 5 por palavra).
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {a.hardest.map((h) => (
                <li key={h.exerciseId} className="flex justify-between gap-3">
                  <span className="truncate">
                    <b>{h.word}</b>
                    {h.gloss ? <span className="text-muted-foreground"> — {h.gloss}</span> : null}
                  </span>
                  <b className="text-destructive">{pct(h.errorRate)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Lições mais feitas">
          <ul className="space-y-2 text-sm">
            {a.popular.map((p) => (
              <li key={p.lessonId} className="flex justify-between gap-3">
                <span className="truncate">{p.title}</span>
                <b>{n(p.completions)}</b>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------- Auditoria --------------------------------- */

const ACTION_LABEL: Record<string, string> = {
  "content.submit": "Enviou para revisão",
  "content.approve": "Aprovou conteúdo",
  "content.reject": "Rejeitou conteúdo",
  "content.request_changes": "Pediu alterações",
  "content.archive": "Arquivou conteúdo",
  "user.role_grant": "Deu um papel",
  "user.role_revoke": "Tirou um papel",
  "user.status": "Mudou o estado de uma conta",
  "voice.task_create": "Criou uma tarefa de gravação",
  "voice.task_update": "Alterou uma tarefa",
  "voice.payout": "Registou um pagamento",
  "voice.pause": "Pausou uma pessoa",
  "voice.resume": "Retomou uma pessoa",
};

export function ServerAudit() {
  const q = useQuery({ queryKey: ["insights", "audit"], queryFn: insightsApi.audit });
  const columns: Column<InsightAudit>[] = [
    { key: "t", header: "Data/Hora", cell: (e) => fmtDateTime(e.at) },
    {
      key: "a",
      header: "Quem",
      cell: (e) =>
        e.actor ? (
          <div>
            <p className="font-medium">{e.actor.name}</p>
            <p className="text-xs text-muted-foreground">
              @{e.actor.username}
              {e.actor.roles[0]
                ? ` · ${ROLE_LABEL[e.actor.roles[0] as AdminRole] ?? e.actor.roles[0]}`
                : ""}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">Sistema / linha de comandos</span>
        ),
    },
    {
      key: "ac",
      header: "Ação",
      cell: (e) => ACTION_LABEL[e.action] ?? ACTION_LABEL[e.action.toLowerCase()] ?? e.action,
    },
    {
      key: "o",
      header: "Objeto",
      cell: (e) => (
        <span className="text-xs">
          {e.entityType}
          {e.entityId ? (
            <span className="ml-1 font-mono text-muted-foreground">{e.entityId.slice(0, 8)}</span>
          ) : null}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Ações reais feitas no painel e na linha de comandos (papéis, revisão, tarefas, pagamentos)."
      />
      {!q.data ? (
        <Loading error={q.error} />
      ) : (
        <DataTable rows={q.data} columns={columns} pageSize={15} empty="Sem ações registadas." />
      )}
    </>
  );
}

/* ----------------------------- Regras e recompensas ----------------------------- */

export function ServerSettings() {
  const q = useQuery({ queryKey: ["insights", "rewards"], queryFn: insightsApi.rewards });
  const rules = q.data ?? [];
  return (
    <>
      <PageHeader
        title="Regras e recompensas"
        description="Valores em uso agora: recompensas na base de dados e regras do produto (@stp/config)."
      />
      <Panel title="Recompensas (XP e moedas)">
        {!q.data ? (
          <Loading error={q.error} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Regra</th>
                  <th className="py-1 text-right">XP</th>
                  <th className="py-1 text-right">Moedas</th>
                  <th className="py-1 text-right">Limite / dia</th>
                  <th className="py-1 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.key} className="border-t">
                    <td className="py-2">
                      <p className="font-medium">{r.description}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.key}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.xp}</td>
                    <td className="py-2 text-right tabular-nums">{r.coins}</td>
                    <td className="py-2 text-right">{r.dailyLimit ?? "—"}</td>
                    <td className="py-2 text-right">{r.active ? "Ativa" : "Inativa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Arena">
          <ConfigList
            items={[
              [
                "Sobrevivência pública",
                `${MULTIPLAYER_CONFIG.publicSurvival.players} jogadores · ${MULTIPLAYER_CONFIG.publicSurvival.lives} vidas · ${MULTIPLAYER_CONFIG.publicSurvival.seconds}s`,
              ],
              [
                "Procurar partida",
                `começa com ${MULTIPLAYER_CONFIG.matchmaking.minPlayers}+ após ${MULTIPLAYER_CONFIG.matchmaking.waitSeconds}s`,
              ],
              [
                "Duelo 1 contra 1",
                `${MULTIPLAYER_CONFIG.duel.questions} perguntas · ${MULTIPLAYER_CONFIG.duel.seconds}s`,
              ],
              [
                "2 contra 2",
                `${MULTIPLAYER_CONFIG.teams.questions} perguntas · ${MULTIPLAYER_CONFIG.teams.seconds}s`,
              ],
              [
                "Pontos",
                `${MULTIPLAYER_CONFIG.scoring.base} por certa + até ${MULTIPLAYER_CONFIG.scoring.maxSpeedBonus} de rapidez`,
              ],
              [
                "Prémios",
                MULTIPLAYER_CONFIG.survivalRewards
                  .map((r) => `${r.place}.º +${r.xp} XP`)
                  .join(" · "),
              ],
            ]}
          />
        </Panel>
        <Panel title="Gravações de pronúncia">
          <ConfigList
            items={[
              ["Idade mínima", `${VOICE_CONFIG.minimumAge} anos`],
              ["Decisão", `${VOICE_CONFIG.votesToDecide} votos iguais`],
              ["Vozes por palavra", String(VOICE_CONFIG.voicesPerWord)],
              ["Perguntas de controlo", `${Math.round(VOICE_CONFIG.controlRate * 100)}%`],
              [
                "Gravação",
                `${VOICE_CONFIG.recording.minMs / 1000}–${VOICE_CONFIG.recording.maxMs / 1000} s`,
              ],
              [
                "Pagamentos",
                `${VOICE_CONFIG.pay.currency} · ${VOICE_CONFIG.pay.methods.join(", ")}`,
              ],
            ]}
          />
        </Panel>
        <Panel title="Funcionalidades ligadas">
          <ConfigList
            items={Object.entries(features).map(([k, v]) => [k, v ? "✅ ligada" : "— desligada"])}
          />
        </Panel>
      </div>
    </>
  );
}

function ConfigList({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* --------------------------------- Pesquisa --------------------------------- */

export function ServerAdminSearch({ q }: { q: string }) {
  const term = q.trim();
  const r = useQuery({
    queryKey: ["insights", "search", term],
    queryFn: () => insightsApi.search(term),
    enabled: term.length >= 2,
  });
  const groups: { title: string; to: string; items: { id: string; label: ReactNode }[] }[] = r.data
    ? [
        {
          title: "Utilizadores",
          to: "/admin/users",
          items: r.data.users.map((u) => ({ id: u.id, label: `${u.name} · @${u.username}` })),
        },
        {
          title: "Palavras",
          to: "/admin/vocabulary",
          items: r.data.words.map((w) => ({
            id: w.id,
            label: (
              <span>
                <b>{w.word}</b>
                {w.gloss ? ` — ${w.gloss}` : ""}{" "}
                <span className="text-xs text-muted-foreground">({w.status})</span>
              </span>
            ),
          })),
        },
        {
          title: "Lições",
          to: "/admin/lessons",
          items: r.data.lessons.map((l) => ({ id: l.id, label: `${l.unitTitle} · ${l.title}` })),
        },
        {
          title: "Partidas",
          to: "/admin/multiplayer",
          items: r.data.matches.map((m) => ({
            id: m.id,
            label: `${MODE_LABEL[m.mode] ?? m.mode} · sala ${m.roomCode ?? "—"} · ${fmtDateTime(m.startedAt)}`,
          })),
        },
      ]
    : [];
  return (
    <>
      <PageHeader
        title="Pesquisa"
        description={term ? `Resultados reais para «${term}»` : "Escreve pelo menos 2 letras."}
      />
      {term.length >= 2 && !r.data && <Loading error={r.error} />}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.title} title={`${g.title} (${g.items.length})`}>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {g.items.map((i) => (
                  <li key={i.id}>
                    <Link to={g.to} className="hover:text-primary">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}

/* --------------------- Ainda sem dados (Premium, anúncios, denúncias) --------------------- */

export function ServerNotYet({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border bg-surface p-8 text-center">
        <p className="text-lg font-semibold">Ainda sem dados reais</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      </div>
    </>
  );
}
