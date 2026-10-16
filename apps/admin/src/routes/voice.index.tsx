import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import { Headphones, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VoiceGate } from "@/components/voice/VoiceGate";
import { VoicePage } from "@/components/voice/VoicePage";

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
            {!me.storageEnabled && (
              <p className="rounded-2xl bg-accent/20 px-4 py-3 text-sm font-semibold">
                {t("voice.storageOff")}
              </p>
            )}
            <p className="text-center text-sm font-semibold text-muted-foreground">
              {t("voice.last7", me.last7Days)}
            </p>
            {me.speakerLanguages.length > 0 && (
              <Link to="/voice/record" className="block">
                <div className="pressable rounded-[1.75rem] bg-forest p-5 text-primary-foreground pattern-leaf">
                  <Mic className="size-8" />
                  <p className="mt-2 font-display text-2xl font-bold">{t("voice.recordCard")}</p>
                  <p className="text-sm opacity-85">{t("voice.recordCardText")}</p>
                </div>
              </Link>
            )}
            {me.listenerLanguages.length > 0 && (
              <Link to="/voice/listen" className="block">
                <div className="pressable rounded-[1.75rem] bg-ocean-grad p-5 text-ocean-foreground pattern-leaf">
                  <Headphones className="size-8" />
                  <p className="mt-2 font-display text-2xl font-bold">{t("voice.listenCard")}</p>
                  <p className="text-sm opacity-85">{t("voice.listenCardText")}</p>
                </div>
              </Link>
            )}
          </>
        )}
      </VoiceGate>
    </VoicePage>
  );
}
