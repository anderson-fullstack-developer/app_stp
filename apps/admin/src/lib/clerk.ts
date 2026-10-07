/**
 * Aparência e idioma dos ecrãs do Clerk (login, registo, gestão de conta).
 * O tema shadcn lê as nossas variáveis CSS (--primary, --border, --radius…), por isso
 * os componentes do Clerk ficam com a identidade visual da app.
 */
import type { ClerkProvider } from "@clerk/tanstack-react-start";
import { enUS, ptPT } from "@clerk/localizations";
import type { ComponentProps } from "react";
import { shadcn } from "@clerk/ui/themes";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

export const clerkAppearance: Appearance = {
  // O tema de @clerk/ui declara `cssLayerName?: string | undefined`, incompatível com a nossa
  // opção estrita exactOptionalPropertyTypes. Em execução é o mesmo objeto — só ajustamos o tipo.
  theme: shadcn as unknown as NonNullable<Appearance["theme"]>,
  variables: {
    borderRadius: "1rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    // Cartões sem sombra pesada, como o resto da app.
    cardBox: "shadow-card",
    formButtonPrimary: "font-semibold",
  },
};

/** Textos do Clerk no idioma da interface (pt-PT por omissão). */
export const clerkLocalization = (language: string) => (language === "en" ? enUS : ptPT);
