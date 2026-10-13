import { LEGAL } from "@stp/config";
import { router } from "expo-router";
import { Trans } from "react-i18next";
import { AppText } from "@/design";

/** "Ao continuar, aceitas os Termos e a Política…" — por baixo dos botões que criam conta. */
export function LegalConsent() {
  return (
    <AppText variant="caption" tone="muted" center>
      <Trans
        i18nKey="legal.consent"
        values={{ age: LEGAL.minimumAge }}
        components={{
          terms: (
            <AppText
              variant="caption"
              tone="primary"
              accessibilityRole="link"
              onPress={() => router.push("/terms")}
            />
          ),
          privacy: (
            <AppText
              variant="caption"
              tone="primary"
              accessibilityRole="link"
              onPress={() => router.push("/privacy")}
            />
          ),
        }}
      />
    </AppText>
  );
}
