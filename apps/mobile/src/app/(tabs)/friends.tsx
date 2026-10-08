import { useTranslation } from "react-i18next";
import { SoonScreen } from "@/components/SoonScreen";

export default function FriendsTab() {
  const { t } = useTranslation();
  return <SoonScreen title={t("nav.friends")} />;
}
