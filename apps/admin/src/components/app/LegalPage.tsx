import { APP_NAME, LEGAL } from "@stp/config";
import { fillLegal, isAvailableLocale, type LegalKind } from "@stp/i18n";
import { useTranslation } from "react-i18next";
import { BackButton } from "@/components/app/BackButton";
import { AppHeader, PhoneFrame } from "@/layouts/AppShell";

/**
 * Política de Privacidade / Termos — páginas públicas (sem sessão), com URL estável para a
 * ficha da Google Play. `lang` força o idioma (ex.: /privacy?lang=en para a ficha em inglês).
 */
export function LegalPage({ kind, lang }: { kind: LegalKind; lang?: string | undefined }) {
  const { i18n } = useTranslation();
  const current = lang ?? i18n.language;
  const locale = isAvailableLocale(current) ? current : "pt";
  const doc = fillLegal(locale, kind, {
    app: APP_NAME,
    controller: LEGAL.controller,
    age: LEGAL.minimumAge,
    email: LEGAL.supportEmail,
    date: LEGAL.updatedAt,
  });
  return (
    <PhoneFrame>
      <AppHeader left={<BackButton />} title={doc.title} />
      <main lang={locale} className="flex-1 px-5 pb-12">
        <h1 className="font-display text-2xl font-bold">{doc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{doc.updated}</p>
        <p className="mt-4 leading-relaxed">{doc.intro}</p>
        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-6">
            <h2 className="font-display text-lg font-bold">{s.heading}</h2>
            {s.body.map((p) =>
              p.startsWith("• ") ? (
                <p key={p} className="mt-2 flex gap-2 leading-relaxed">
                  <span aria-hidden className="text-primary">
                    •
                  </span>
                  <span>{p.slice(2)}</span>
                </p>
              ) : (
                <p key={p} className="mt-2 leading-relaxed">
                  {p}
                </p>
              ),
            )}
          </section>
        ))}
      </main>
    </PhoneFrame>
  );
}
