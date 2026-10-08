import { useTranslation } from "react-i18next";
import { SoonScreen } from "@/components/SoonScreen";

export default function RankingTab() {
  const { t } = useTranslation();
  return <SoonScreen title={t("nav.ranking")} />;
}
