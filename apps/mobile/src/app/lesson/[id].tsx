import { useTranslation } from "react-i18next";
import { SoonScreen } from "@/components/SoonScreen";

/** Lição jogada no servidor — passo 1b (provisório até lá). */
export default function LessonScreen() {
  const { t } = useTranslation();
  return <SoonScreen title={t("kriolu.lessonDone")} />;
}
