import { Pressable, StyleSheet, View } from "react-native";
import { haptics } from "./haptics";
import { AppText } from "./Text";
import { colors, shadows } from "./tokens";

/** Separadores em "pílula" (igual aos da web). */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                haptics.tap();
                onChange(it.value);
              }
            }}
            style={[styles.item, active && [styles.active, shadows.card]]}
          >
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{ fontSize: 13, color: active ? colors.primary : colors.mutedForeground }}
            >
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  item: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12 },
  active: { backgroundColor: colors.surface },
});
