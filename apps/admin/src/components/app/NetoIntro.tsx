import { BellRing, BookOpen, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppButton } from "./Buttons";
import { Neto } from "./Neto";

const SEEN_KEY = "lstp-neto-intro-v1";

/** "Conhece o Neto": apresenta a mascote — quem é, porque se chama Neto e o que faz. */
export function NetoIntro({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  if (!open) return null;
  const items = [
    { icon: BookOpen, text: t("neto.introLessons") },
    { icon: PartyPopper, text: t("neto.introCelebrate") },
    { icon: BellRing, text: t("neto.introRemind") },
  ];
  return (
    <div
      className="fixed inset-0 z-[70] mx-auto grid max-w-[440px] place-items-center bg-foreground/40 p-5 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neto-intro-title"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full rounded-[2rem] bg-surface p-6 text-center shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <Neto mood="celebrate" size={150} className="mx-auto animate-float" />
        <h2 id="neto-intro-title" className="mt-3 font-display text-3xl font-bold">
          {t("neto.introTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("neto.introText1")}</p>
        <p className="mt-2 text-sm font-semibold text-primary">{t("neto.introText2")}</p>
        <ul className="mt-4 space-y-2 text-left">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-muted/70 px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold">{text}</span>
            </li>
          ))}
        </ul>
        <AppButton className="mt-5" onClick={onClose}>
          {t("neto.introCta")}
        </AppButton>
      </div>
    </div>
  );
}

/** Mostra a apresentação uma única vez (na primeira entrada na app). */
export function NetoIntroOnce() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // Sem armazenamento (modo privado): não insistir.
    }
  }, []);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignorar
    }
  };
  return <NetoIntro open={open} onClose={close} />;
}
