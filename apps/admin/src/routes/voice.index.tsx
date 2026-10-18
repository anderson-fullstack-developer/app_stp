import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import { BarChart3, ChevronRight, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@/components/app/Primitives";
import { TaskCard } from "@/components/voice/TaskCard";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";
import { euros, voiceApi, voiceKeys } from "@/services/voice-api.service";

export const Route = createFileRoute("/voice/")({
  head: () => ({
    meta: [
      { title: `Gravações de pronúncia — ${APP_NAME}` },
      { name: "description", content: "Área dos Faladores e dos Ouvintes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VoiceHome,
});

function VoiceHome() {
  const { t } = useTranslation();
  return (
    <VoicePage title={t("voice.title")}>
      <VoiceGate>
        {(me) => (
          <>
            {me.profile?.paused && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                {t("voice.tasks.paused")}
              </p>
            )}
            {!me.storageEnabled && (
              <p className="rounded-2xl bg-accent/20 px-4 py-3 text-sm font-semibold">
                {t("voice.storageOff")}
              </p>
            )}
            <EarningsCard missingPayout={!me.profile?.payoutDetails} />
            {me.speakerLanguages.length > 0 && (
              <Link to="/voice/mine" className="block">
                <div className="pressable card flex items-center gap-3 rounded-[1.5rem] p-4">
                  <BarChart3 className="size-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-display font-bold">{t("voice.mine.title")}</p>
                    <p className="text-sm text-muted-foreground">
                      ✅ {me.speaker.approved} · ⏳ {me.speaker.pending} · ❌ {me.speaker.rejected}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
              </Link>
            )}
            <Tasks />
          </>
        )}
      </VoiceGate>
    </VoicePage>
  );
}

function EarningsCard({ missingPayout }: { missingPayout: boolean }) {
  const { t, i18n } = useTranslation();
  const e = useQuery({ queryKey: voiceKeys.earnings, queryFn: voiceApi.earnings }).data;
  return (
    <Link to="/voice/earnings" className="block">
      <div className="pressable rounded-[1.75rem] bg-forest p-5 text-primary-foreground pattern-leaf">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-2 text-sm font-semibold opacity-85">
            <Wallet className="size-4" />
            {t("voice.earnings.balance")}
          </p>
          <ChevronRight className="size-5 opacity-80" />
        </div>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums">
          {e ? euros(e.balanceCents, i18n.language) : "—"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white/12 px-3 py-2">
            <p className="opacity-80">{t("voice.earnings.week")}</p>
            <p className="font-bold">{e ? euros(e.thisWeekCents, i18n.language) : "—"}</p>
          </div>
          <div className="rounded-xl bg-white/12 px-3 py-2">
            <p className="opacity-80">{t("voice.earnings.pending")}</p>
            <p className="font-bold">{e ? euros(e.pendingCents, i18n.language) : "—"}</p>
          </div>
        </div>
        {missingPayout && (
          <p className="mt-3 rounded-xl bg-sun px-3 py-2 text-sm font-bold text-accent-foreground">
            {t("voice.earnings.missing")}
          </p>
        )}
      </div>
    </Link>
  );
}

function Tasks() {
  const { t } = useTranslation();
  const tasks = useQuery({ queryKey: voiceKeys.tasks, queryFn: voiceApi.tasks });
  const list = tasks.data ?? [];
  const open = list.filter((x) => x.status === "ACTIVE" || x.status === "PAUSED");
  const closed = list
    .filter((x) => x.status === "COMPLETED" || x.status === "CANCELLED")
    .slice(0, 5);
  return (
    <section className="space-y-3">
      <h2 className="mt-2 font-display text-lg font-bold">{t("voice.tasks.title")}</h2>
      {tasks.isPending ? (
        <LoadingState />
      ) : open.length === 0 && closed.length === 0 ? (
        <p className="card rounded-2xl p-5 text-center font-semibold text-muted-foreground">
          {t("voice.tasks.none")}
        </p>
      ) : (
        <>
          {open.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {closed.map((task) => (
            <div key={task.id} className="opacity-75">
              <TaskCard task={task} />
            </div>
          ))}
        </>
      )}
    </section>
  );
}
