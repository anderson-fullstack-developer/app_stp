import { useTranslation } from "react-i18next";
import { SoonScreen } from "@/components/SoonScreen";

export default function ProfileTab() {
  const { t } = useTranslation();
  return <SoonScreen title={t("nav.profile")} />;
}
