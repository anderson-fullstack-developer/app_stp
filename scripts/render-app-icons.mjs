// Gera os PNG/ICO dos ícones a partir dos SVG de scripts/build-app-icons.mjs, usando o
// Microsoft Edge (ou Chrome) em modo headless — sem dependências extra.
// Uso: node scripts/build-app-icons.mjs && node scripts/render-app-icons.mjs
// Outro browser: BROWSER_PATH="C:/caminho/chrome.exe" node scripts/render-app-icons.mjs
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps", "admin", "public");
const mobile = join(root, "apps", "mobile", "assets");
const BROWSER =
  process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

// [svg de origem, tamanho, destino, filtro CSS opcional]
const jobs = [
  [join(web, "icon.svg"), 192, join(web, "icon-192.png")],
  [join(web, "icon.svg"), 512, join(web, "icon-512.png")],
  [join(web, "icon-maskable.svg"), 512, join(web, "icon-maskable-512.png")],
  [join(web, "icon-maskable.svg"), 180, join(web, "apple-touch-icon.png")],
  [join(mobile, "brand", "icon.svg"), 1024, join(mobile, "images", "icon.png")],
  [
    join(mobile, "brand", "adaptive-foreground.svg"),
    1024,
    join(mobile, "images", "android-icon-foreground.png"),
  ],
  // Ícone monocromático (Android 13+): só a silhueta conta (o sistema pinta-a).
  [
    join(mobile, "brand", "adaptive-foreground.svg"),
    1024,
    join(mobile, "images", "android-icon-monochrome.png"),
    "brightness(0)",
  ],
  [join(mobile, "brand", "neto.svg"), 1024, join(mobile, "images", "splash-icon.png")],
  [join(web, "icon.svg"), 48, join(mobile, "images", "favicon.png")],
];

const port = 9400 + Math.floor(Math.random() * 400);
const browser = spawn(
  BROWSER,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), `icons-${port}`)}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(
      (t) => t.type === "page",
    );
  } catch {
    /* a arrancar */
  }
}
if (!target) throw new Error(`Não foi possível abrir o browser em ${BROWSER}`);
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send("Page.enable");
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });

async function render(svgFile, size, filter = "none") {
  const svg = readFileSync(svgFile, "utf8");
  const html = `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" style="display:block;width:${size}px;height:${size}px;filter:${filter}"></body></html>`;
  await send("Emulation.setDeviceMetricsOverride", {
    width: Math.max(size, 64),
    height: Math.max(size, 64),
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", {
    url: "data:text/html;base64," + Buffer.from(html).toString("base64"),
  });
  await sleep(600);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
  });
  return Buffer.from(shot.result.data, "base64");
}

for (const [svg, size, dest, filter] of jobs) {
  writeFileSync(dest, await render(svg, size, filter));
  console.log("escrito", dest.replace(root, "."));
}

// favicon.ico da web com PNGs embutidos (16, 32, 48, 64).
const sizes = [16, 32, 48, 64];
const pngs = [];
for (const s of sizes) pngs.push(await render(join(web, "icon.svg"), s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(join(web, "favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));
console.log("escrito ./apps/admin/public/favicon.ico");
ws.close();
browser.kill();
process.exit(0);
