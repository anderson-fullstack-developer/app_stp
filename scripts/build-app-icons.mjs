// Gera o ícone da app (Neto inteiro sobre fundo amarelo-sol — versão escolhida a 2026-10-07)
// em SVG: apps/admin/public/icon.svg (cantos redondos) e icon-maskable.svg (fundo inteiro,
// Neto dentro da zona segura de 80 % exigida pelo Android).
// Uso: node scripts/build-app-icons.mjs   (os PNG/ICO são gerados a partir destes SVG)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "admin", "public");

const C = {
  skin: "#86cfa6",
  skinShade: "#5fb083",
  shell: "#17603f",
  belly: "#f7e8bd",
  bellyLine: "#e6d197",
  star: "#f5bf2c",
  starEdge: "#d99a12",
  eye: "#1d2b24",
  cheek: "#f29b9b",
};

function starPoints(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(" ");
}

/** O Neto inteiro, desenhado numa área de 200×200. */
function neto() {
  const cx = 100;
  const cy = 76;
  const k = 42 / 62;
  const eyes = [-1, 1]
    .map((s) => {
      const ex = cx + s * 22 * k;
      const ey = cy - 7 * k;
      return `<circle cx="${ex}" cy="${ey}" r="${16 * k}" fill="#fff"/>
    <circle cx="${ex + 1.5 * k}" cy="${ey + 2 * k}" r="${9.5 * k}" fill="${C.eye}"/>
    <circle cx="${ex + 5 * k}" cy="${ey - 2 * k}" r="${3.2 * k}" fill="#fff"/>
    <ellipse cx="${cx + s * 36 * k}" cy="${cy + 18 * k}" rx="${10 * k}" ry="${6 * k}" fill="${C.cheek}" opacity=".6"/>`;
    })
    .join("\n    ");
  return `<ellipse cx="100" cy="182" rx="56" ry="7" fill="#00000022"/>
    <ellipse cx="72" cy="172" rx="16" ry="9" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="2.5"/>
    <ellipse cx="128" cy="172" rx="16" ry="9" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="2.5"/>
    <ellipse cx="100" cy="134" rx="64" ry="44" fill="${C.shell}"/>
    <ellipse cx="40" cy="128" rx="22" ry="10" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="2.5" transform="rotate(20 40 128)"/>
    <ellipse cx="160" cy="128" rx="22" ry="10" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="2.5" transform="rotate(-20 160 128)"/>
    <ellipse cx="100" cy="140" rx="37" ry="35" fill="${C.belly}" stroke="${C.bellyLine}" stroke-width="2.5"/>
    <polygon points="${starPoints(100, 142, 14)}" fill="${C.star}" stroke="${C.starEdge}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${cx}" cy="${cy}" r="42" fill="${C.skin}" stroke="${C.skinShade}" stroke-width="${4 * k}"/>
    <ellipse cx="${cx - 16 * k}" cy="${cy - 38 * k}" rx="${18 * k}" ry="${8 * k}" fill="#ffffff45" transform="rotate(-20 ${cx - 16 * k} ${cy - 38 * k})"/>
    ${eyes}
    <path d="M${cx - 16 * k} ${cy + 22 * k} Q${cx} ${cy + 37 * k} ${cx + 16 * k} ${cy + 22 * k}" fill="none" stroke="${C.eye}" stroke-width="${5 * k}" stroke-linecap="round"/>`;
}

const gradient = `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd75e"/><stop offset="1" stop-color="#f2b632"/></linearGradient></defs>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <title>Fala Neto</title>
  ${gradient}
  <rect width="200" height="200" rx="44" fill="url(#sun)"/>
  ${neto()}
</svg>
`;

// Maskable: fundo a toda a área; o Neto reduzido a 76 % e centrado (zona segura).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <title>Fala Neto</title>
  ${gradient}
  <rect width="200" height="200" fill="url(#sun)"/>
  <g transform="translate(24 22) scale(0.76)">
    ${neto()}
  </g>
</svg>
`;

writeFileSync(join(out, "icon.svg"), rounded);
writeFileSync(join(out, "icon-maskable.svg"), maskable);
console.log("icon.svg e icon-maskable.svg escritos em", out);
