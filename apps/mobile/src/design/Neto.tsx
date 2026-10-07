import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from "react-native-svg";
import { AppText } from "./Text";
import { colors, shadows } from "./tokens";

/**
 * Neto — a mascote (tartaruga marinha de São Tomé e Príncipe e Cabo Verde, estrela das duas
 * bandeiras ao peito). Mesmo desenho da app web (apps/admin/src/components/app/Neto.tsx).
 */
export type NetoMood = "happy" | "celebrate" | "sad" | "worried";

const C = {
  skin: "#86cfa6",
  skinShade: "#62b386",
  shell: "#1f7a55",
  plate: "#2e9466",
  rim: "#17603f",
  belly: "#f7e8bd",
  bellyLine: "#e6d197",
  star: "#f5bf2c",
  starEdge: "#d99a12",
  eye: "#1d2b24",
  cheek: "#f29b9b",
  mouth: "#7a2f35",
  tongue: "#e9767c",
  drop: "#7cc4ef",
};

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 ? 6.75 : 15;
  return `${(100 + r * Math.cos(a)).toFixed(1)},${(143 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

const CONFETTI: [number, number, string][] = [
  [22, 30, "#f5bf2c"],
  [176, 26, "#e9767c"],
  [26, 66, "#4fb3d9"],
  [172, 60, "#2e9466"],
  [52, 16, "#2e9466"],
  [150, 12, "#f5bf2c"],
];

/** Rotação de `deg` graus em torno de (cx, cy), como matriz SVG (igual em todas as plataformas). */
function rotate(deg: number, cx: number, cy: number) {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const e = cx - cos * cx + sin * cy;
  const f = cy - sin * cx - cos * cy;
  return `matrix(${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

const line = { stroke: C.eye, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };

function Flipper({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <Ellipse
      cx={x}
      cy={y}
      rx={24}
      ry={11}
      fill={C.skin}
      stroke={C.skinShade}
      strokeWidth={2.5}
      transform={rotate(rot, x, y)}
    />
  );
}

function Eyes({ lookY = 0 }: { lookY?: number }) {
  return (
    <>
      {[82, 118].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={74} r={12} fill="#fff" />
          <Circle cx={x + 1} cy={76 + lookY} r={7} fill={C.eye} />
          <Circle cx={x + 3.5} cy={73 + lookY} r={2.4} fill="#fff" />
        </G>
      ))}
    </>
  );
}

function Face({ mood }: { mood: NetoMood }) {
  switch (mood) {
    case "happy":
      return (
        <>
          <Eyes />
          <Path d="M87 96 Q100 108 113 96" {...line} />
        </>
      );
    case "celebrate":
      return (
        <>
          <Path d="M72 78 Q82 64 92 78" {...line} strokeWidth={4.5} />
          <Path d="M108 78 Q118 64 128 78" {...line} strokeWidth={4.5} />
          <Path d="M84 92 Q100 120 116 92 Z" fill={C.mouth} />
          <Path d="M91 104 Q100 113 109 104 Q100 99 91 104 Z" fill={C.tongue} />
        </>
      );
    case "sad":
      return (
        <>
          <Eyes lookY={3} />
          <Path d="M71 61 L91 55" {...line} />
          <Path d="M109 55 L129 61" {...line} />
          <Path d="M88 103 Q100 93 112 103" {...line} />
          <Path d="M72 88 Q68 96 72 100 Q76 96 72 88 Z" fill={C.drop} />
        </>
      );
    case "worried":
      return (
        <>
          <Eyes lookY={-1} />
          <Path d="M71 59 L91 55" {...line} />
          <Path d="M109 55 L129 59" {...line} />
          <Ellipse cx={100} cy={100} rx={6} ry={7} fill={C.mouth} />
          <Path d="M140 46 Q134 56 140 60 Q146 56 140 46 Z" fill={C.drop} />
        </>
      );
  }
}

function NetoSvg({ mood, size }: { mood: NetoMood; size: number }) {
  const arms =
    mood === "celebrate"
      ? [
          [30, 96, -40],
          [170, 96, 40],
        ]
      : mood === "sad"
        ? [
            [46, 148, 70],
            [154, 148, -70],
          ]
        : [
            [34, 132, 20],
            [166, 132, -20],
          ];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {mood === "celebrate" &&
        CONFETTI.map(([x, y, c], i) => (
          <Rect
            key={i}
            x={x}
            y={y}
            width={9}
            height={5}
            rx={1.5}
            fill={c}
            transform={rotate(i * 37, x, y)}
          />
        ))}
      <Ellipse cx={100} cy={190} rx={56} ry={6} fill="#000" opacity={0.1} />
      <Ellipse
        cx={72}
        cy={178}
        rx={17}
        ry={10}
        fill={C.skin}
        stroke={C.skinShade}
        strokeWidth={2.5}
      />
      <Ellipse
        cx={128}
        cy={178}
        rx={17}
        ry={10}
        fill={C.skin}
        stroke={C.skinShade}
        strokeWidth={2.5}
      />
      <Ellipse cx={100} cy={136} rx={68} ry={48} fill={C.shell} stroke={C.rim} strokeWidth={3} />
      <Circle cx={46} cy={128} r={11} fill={C.plate} />
      <Circle cx={154} cy={128} r={11} fill={C.plate} />
      <Circle cx={54} cy={156} r={9} fill={C.plate} />
      <Circle cx={146} cy={156} r={9} fill={C.plate} />
      {arms.map(([x, y, r]) => (
        <Flipper key={`${x}-${y}`} x={x!} y={y!} rot={r!} />
      ))}
      <Ellipse
        cx={100}
        cy={142}
        rx={40}
        ry={39}
        fill={C.belly}
        stroke={C.bellyLine}
        strokeWidth={2.5}
      />
      <Path d="M66 132 H134 M68 154 H132" stroke={C.bellyLine} strokeWidth={2.5} />
      <Polygon
        points={STAR_POINTS}
        fill={C.star}
        stroke={C.starEdge}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={100} cy={80} r={45} fill={C.skin} stroke={C.skinShade} strokeWidth={3} />
      <Ellipse
        cx={88}
        cy={50}
        rx={14}
        ry={7}
        fill="#fff"
        opacity={0.25}
        transform={rotate(-20, 88, 50)}
      />
      <Ellipse cx={68} cy={93} rx={8} ry={5} fill={C.cheek} opacity={0.55} />
      <Ellipse cx={132} cy={93} rx={8} ry={5} fill={C.cheek} opacity={0.55} />
      <Face mood={mood} />
    </Svg>
  );
}

/** A mascote com a etiqueta do nome por baixo, para que toda a gente a conheça. */
export function Neto({
  mood = "happy",
  size = 120,
  showName = true,
  style,
}: {
  mood?: NetoMood;
  size?: number;
  showName?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const small = size < 80;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Neto"
      style={[styles.wrap, style]}
    >
      <NetoSvg mood={mood} size={size} />
      {showName && (
        <View style={[styles.tag, shadows.card, small ? styles.tagSmall : styles.tagLarge]}>
          <AppText
            variant="caption"
            tone="inverse"
            style={{ fontSize: small ? 10 : 12, letterSpacing: 0.4 }}
          >
            Neto
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  tagSmall: { marginTop: -8, paddingHorizontal: 8, paddingVertical: 1 },
  tagLarge: { marginTop: -12, paddingHorizontal: 12, paddingVertical: 2 },
});
