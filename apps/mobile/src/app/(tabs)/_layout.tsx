import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { BookOpen, type LucideIcon, Swords, Trophy, User, Users } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, fonts, haptics } from "@/design";

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Icon size={22} color={focused ? colors.primary : colors.mutedForeground} strokeWidth={2} />
    </View>
  );
}

/** Abas principais (iguais à barra de baixo da web). Só com sessão iniciada. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && !isSignedIn) return <Redirect href="/welcome" />;

  const tab = (Icon: LucideIcon, title: string) => ({
    title,
    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon Icon={Icon} focused={focused} />,
  });

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: fonts.bodySemibold, fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingTop: 8,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="learn" options={tab(BookOpen, t("nav.learn"))} />
      <Tabs.Screen name="play" options={tab(Swords, t("nav.play"))} />
      <Tabs.Screen name="friends" options={tab(Users, t("nav.friends"))} />
      <Tabs.Screen name="ranking" options={tab(Trophy, t("nav.ranking"))} />
      <Tabs.Screen name="profile" options={tab(User, t("nav.profile"))} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: colors.primarySoft },
});
