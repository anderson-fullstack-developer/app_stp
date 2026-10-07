import { cn } from "@/lib/utils";

/**
 * Neto — a mascote da app: uma tartaruga marinha (desova em São Tomé e Príncipe e em
 * Cabo Verde) com a estrela das duas bandeiras ao peito. O nome lembra o público da app:
 * os netos que aprendem a língua dos avós. SVG puro: nítido em qualquer tamanho, sem pedidos.
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

function Flipper({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx="24"
      ry="11"
      fill={C.skin}
      stroke={C.skinShade}
      strokeWidth="2.5"
      transform={`rotate(${rot} ${x} ${y})`}
    />
  );
}

function Eyes({ lookY = 0 }: { lookY?: number }) {
  return (
    <>
      {[82, 118].map((x) => (
        <g key={x}>
          <circle cx={x} cy="74" r="12" fill="#fff" />
          <circle cx={x + 1} cy={76 + lookY} r="7" fill={C.eye} />
          <circle cx={x + 3.5} cy={73 + lookY} r="2.4" fill="#fff" />
        </g>
      ))}
    </>
  );
}

const line = { stroke: C.eye, strokeWidth: 4, strokeLinecap: "round" as const, fill: "none" };

function Face({ mood }: { mood: NetoMood }) {
  switch (mood) {
    case "happy":
      return (
        <>
          <Eyes />
          <path d="M87 96 Q100 108 113 96" {...line} />
        </>
      );
    case "celebrate":
      return (
        <>
          <path d="M72 78 Q82 64 92 78" {...line} strokeWidth={4.5} />
          <path d="M108 78 Q118 64 128 78" {...line} strokeWidth={4.5} />
          <path d="M84 92 Q100 120 116 92 Z" fill={C.mouth} />
          <path d="M91 104 Q100 113 109 104 Q100 99 91 104 Z" fill={C.tongue} />
        </>
      );
    case "sad":
      return (
        <>
          <Eyes lookY={3} />
          <path d="M71 61 L91 55" {...line} />
          <path d="M109 55 L129 61" {...line} />
          <path d="M88 103 Q100 93 112 103" {...line} />
          <path d="M72 88 Q68 96 72 100 Q76 96 72 88 Z" fill={C.drop} />
        </>
      );
    case "worried":
      return (
        <>
          <Eyes lookY={-1} />
          <path d="M71 59 L91 55" {...line} />
          <path d="M109 55 L129 59" {...line} />
          <ellipse cx="100" cy="100" rx="6" ry="7" fill={C.mouth} />
          <path d="M140 46 Q134 56 140 60 Q146 56 140 46 Z" fill={C.drop} />
        </>
      );
  }
}

/**
 * A mascote com a etiqueta do nome por baixo ("Neto"), para que toda a gente fique a
 * conhecê-la. `showName={false}` só onde não há espaço. O nome aparece também como dica
 * (tooltip) e é lido pelos leitores de ecrã.
 */
export function Neto({
  mood = "happy",
  size = 120,
  className,
  showName = true,
}: {
  mood?: NetoMood;
  size?: number;
  className?: string;
  showName?: boolean;
}) {
  if (!showName) return <NetoSvg mood={mood} size={size} className={className} />;
  const small = size < 80;
  return (
    <span className={cn("inline-flex shrink-0 flex-col items-center", className)}>
      <NetoSvg mood={mood} size={size} />
      <span
        className={cn(
          "relative z-10 rounded-full bg-primary font-display font-bold tracking-wide text-primary-foreground shadow-card ring-2 ring-surface",
          small ? "-mt-2 px-2 py-px text-[10px]" : "-mt-3 px-3 py-0.5 text-xs",
        )}
        aria-hidden
      >
        Neto
      </span>
    </span>
  );
}

function NetoSvg({
  mood,
  size,
  className,
}: {
  mood: NetoMood;
  size: number;
  className?: string | undefined;
}) {
  const arms =
    mood === "celebrate" ? (
      // Braços no ar, ao lado da cabeça (não por trás, para não parecerem orelhas).
      <>
        <Flipper x={30} y={96} rot={-40} />
        <Flipper x={170} y={96} rot={40} />
      </>
    ) : mood === "sad" ? (
      <>
        <Flipper x={46} y={148} rot={70} />
        <Flipper x={154} y={148} rot={-70} />
      </>
    ) : (
      <>
        <Flipper x={34} y={132} rot={20} />
        <Flipper x={166} y={132} rot={-20} />
      </>
    );

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      role="img"
      aria-label="Neto"
    >
      <title>Neto</title>
      {mood === "celebrate" &&
        CONFETTI.map(([x, y, c], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="9"
            height="5"
            rx="1.5"
            fill={c}
            transform={`rotate(${i * 37} ${x} ${y})`}
          />
        ))}
      <ellipse cx="100" cy="190" rx="56" ry="6" fill="#0000001a" />
      <ellipse
        cx="72"
        cy="178"
        rx="17"
        ry="10"
        fill={C.skin}
        stroke={C.skinShade}
        strokeWidth="2.5"
      />
      <ellipse
        cx="128"
        cy="178"
        rx="17"
        ry="10"
        fill={C.skin}
        stroke={C.skinShade}
        strokeWidth="2.5"
      />
      <ellipse cx="100" cy="136" rx="68" ry="48" fill={C.shell} stroke={C.rim} strokeWidth="3" />
      <circle cx="46" cy="128" r="11" fill={C.plate} />
      <circle cx="154" cy="128" r="11" fill={C.plate} />
      <circle cx="54" cy="156" r="9" fill={C.plate} />
      <circle cx="146" cy="156" r="9" fill={C.plate} />
      {arms}
      <ellipse
        cx="100"
        cy="142"
        rx="40"
        ry="39"
        fill={C.belly}
        stroke={C.bellyLine}
        strokeWidth="2.5"
      />
      <path d="M66 132 H134 M68 154 H132" stroke={C.bellyLine} strokeWidth="2.5" />
      <polygon
        points={STAR_POINTS}
        fill={C.star}
        stroke={C.starEdge}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="80" r="45" fill={C.skin} stroke={C.skinShade} strokeWidth="3" />
      <ellipse cx="88" cy="50" rx="14" ry="7" fill="#ffffff40" transform="rotate(-20 88 50)" />
      <ellipse cx="68" cy="93" rx="8" ry="5" fill={C.cheek} opacity=".55" />
      <ellipse cx="132" cy="93" rx="8" ry="5" fill={C.cheek} opacity=".55" />
      <Face mood={mood} />
    </svg>
  );
}
