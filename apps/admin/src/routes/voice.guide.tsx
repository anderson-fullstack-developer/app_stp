import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@stp/config";
import { Check, Headphones, Mic, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { VoicePage } from "@/components/voice/VoicePage";

export const Route = createFileRoute("/voice/guide")({
  head: () => ({
    meta: [{ title: `Guia de gravação — ${APP_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: GuidePage,
});

const RECORD = ["room", "distance", "natural", "once", "variant", "listen"] as const;
const REVIEW = [
  "approve",
  "accent",
  "pronunciation",
  "noise",
  "wrongWord",
  "cutOff",
  "doubt",
] as const;
const PAY = ["record", "review", "when"] as const;

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card rounded-[1.5rem] p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        {icon}
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </section>
  );
}

const Item = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2">
    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
    <span>{children}</span>
  </li>
);

/** Boas práticas para quem grava e avalia (aberto a qualquer pessoa com sessão). */
function GuidePage() {
  const { t } = useTranslation();
  return (
    <VoicePage title={t("voice.guide.title")}>
      <Section icon={<Mic className="size-5 text-primary" />} title={t("voice.guide.recordTitle")}>
        {RECORD.map((k) => (
          <Item key={k}>{t(`voice.guide.record.${k}`)}</Item>
        ))}
      </Section>
      <Section
        icon={<Headphones className="size-5 text-primary" />}
        title={t("voice.guide.reviewTitle")}
      >
        {REVIEW.map((k) => (
          <Item key={k}>{t(`voice.guide.review.${k}`)}</Item>
        ))}
      </Section>
      <Section icon={<Wallet className="size-5 text-primary" />} title={t("voice.guide.payTitle")}>
        {PAY.map((k) => (
          <Item key={k}>{t(`voice.guide.pay.${k}`)}</Item>
        ))}
      </Section>
    </VoicePage>
  );
}
