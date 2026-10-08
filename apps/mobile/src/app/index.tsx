import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { colors, Neto } from "@/design";

/** Entrada: com sessão vai para Aprender; sem sessão, para as boas-vindas. */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <Neto mood="happy" size={120} />
      </View>
    );
  }
  return <Redirect href={isSignedIn ? "/learn" : "/welcome"} />;
}
