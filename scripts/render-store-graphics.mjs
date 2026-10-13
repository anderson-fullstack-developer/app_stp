// Gera as imagens da ficha da Google Play (docs/PLAY_STORE.md §3) em apps/mobile/store/:
//   icon-512.png              ícone da loja, 512 × 512
//   feature-graphic-pt.png    imagem de destaque, 1024 × 500 (português)
//   feature-graphic-en.png    imagem de destaque, 1024 × 500 (inglês)
// Usa o Microsoft Edge (ou Chrome) em modo headless — sem dependências extra.
// Uso: node scripts/render-store-graphics.mjs
// Outro browser: BROWSER_PATH="C:/caminho/chrome.exe" node scripts/render-store-graphics.mjs
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "apps", "mobile", "assets", "brand");
const out = join(root, "apps", "mobile", "store");
const fonts = join(root, "node_modules", "@expo-google-fonts");
const BROWSER =
  process.env.BROWSER_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const b64 = (file) => readFileSync(file).toString("base64");
const svgUrl = (file) => `data:image/svg+xml;base64,${b64(file)}`;
const fontFace = (family, file) =>
  `@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${b64(join(fonts, file))})}`;

const FONTS = [
  fontFace("Display", "bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf"),
  fontFace("Body", "figtree/600SemiBold/Figtree_600SemiBold.ttf"),
].join("");

// Textos sem palavras em Forro/Angolar/Lung'Ie (regra do projeto) — só português e inglês.
const COPY = {
  pt: {
    tagline: "Aprende Kriolu e as línguas de São Tomé",
    chips: ["Lições curtas", "Desafio do dia", "Arena com amigos"],
  },
  en: {
    tagline: "Learn Kriolu and the languages of São Tomé",
    chips: ["Short lessons", "Daily challenge", "Arena with friends"],
  },
};

function featureHtml(locale) {
  const c = COPY[locale];
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1024px;height:500px;overflow:hidden;font-family:Body,sans-serif}
.bg{position:relative;width:1024px;height:500px;overflow:hidden;
  background:radial-gradient(circle at 78% 40%,#0b8a57 0,transparent 55%),linear-gradient(135deg,#007748 0%,#004b31 100%)}
.wave{position:absolute;left:-40px;right:-40px;height:160px;border-radius:50%;border:2px solid rgba(253,250,243,.08)}
.text{position:absolute;left:80px;top:0;bottom:0;width:560px;display:flex;flex-direction:column;justify-content:center}
h1{font-family:Display,sans-serif;font-size:104px;line-height:1;letter-spacing:-3px;color:#fdfaf3}
h1 span{color:#ffd75e}
p{margin-top:18px;font-size:32px;line-height:1.25;color:#d9efe3;text-wrap:balance}
.chips{display:flex;gap:10px;margin-top:30px;flex-wrap:wrap}
.chip{padding:9px 18px;border-radius:999px;background:rgba(253,250,243,.12);color:#fdfaf3;font-size:20px}
.sun{position:absolute;right:70px;top:50%;width:330px;height:330px;margin-top:-165px;border-radius:50%;
  background:linear-gradient(180deg,#ffd75e,#f2b632);box-shadow:0 30px 80px rgba(0,0,0,.25)}
.neto{position:absolute;right:85px;top:50%;width:300px;height:300px;margin-top:-160px}
</style></head><body><div class="bg">
<div class="wave" style="top:380px"></div><div class="wave" style="top:420px"></div><div class="wave" style="top:-110px"></div>
<div class="text"><h1>Fala <span>Neto</span></h1><p>${c.tagline}</p>
<div class="chips">${c.chips.map((x) => `<span class="chip">${x}</span>`).join("")}</div></div>
<div class="sun"></div><img class="neto" src="${svgUrl(join(brand, "neto.svg"))}">
</div></body></html>`;
}

const iconHtml = `<!doctype html><html><body style="margin:0"><img src="${svgUrl(join(brand, "icon.svg"))}" style="display:block;width:512px;height:512px"></body></html>`;

// [html, largura, altura, destino]
const jobs = [
  [iconHtml, 512, 512, "icon-512.png"],
  [featureHtml("pt"), 1024, 500, "feature-graphic-pt.png"],
  [featureHtml("en"), 1024, 500, "feature-graphic-en.png"],
];

const port = 9400 + Math.floor(Math.random() * 400);
const browser = spawn(
  BROWSER,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), `store-${port}`)}`,
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
await send("Runtime.enable");

mkdirSync(out, { recursive: true });
for (const [html, width, height, file] of jobs) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", {
    url: "data:text/html;base64," + Buffer.from(html).toString("base64"),
  });
  await sleep(500);
  // Espera pelas fontes embutidas antes de fotografar.
  await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  await sleep(300);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  writeFileSync(join(out, file), Buffer.from(shot.result.data, "base64"));
  console.log("escrito", join("apps", "mobile", "store", file));
}
ws.close();
browser.kill();
process.exit(0);
