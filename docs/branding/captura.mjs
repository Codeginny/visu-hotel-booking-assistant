// Saca capturas con Chrome sin interfaz (protocolo DevTools, sin dependencias).
// Uso: node docs/branding/captura.mjs <url> <salida.png> <ancho> <alto> [js a ejecutar antes]
// El alto 0 ajusta la captura al alto real de la página.
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, salida, ancho = "1400", alto = "900", antes = ""] = process.argv.slice(2);
const puerto = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("google-chrome", ["--headless=new", `--remote-debugging-port=${puerto}`, "--hide-scrollbars",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "cap-"))}`, "about:blank"], { stdio: "ignore" });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let destino;
  for (let i = 0; i < 50 && !destino; i++) {
    await espera(200);
    destino = await fetch(`http://127.0.0.1:${puerto}/json`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => null);
  }
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
  const cdp = (method, params = {}) => new Promise((r) => { pend.set(++n, r); ws.send(JSON.stringify({ id: n, method, params })); });

  await cdp("Emulation.setDeviceMetricsOverride", { width: +ancho, height: +alto || 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.enable");
  await cdp("Page.navigate", { url });
  await espera(2500);
  await cdp("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
  if (antes) { await cdp("Runtime.evaluate", { expression: antes, awaitPromise: true }); await espera(1500); }
  let h = +alto;
  if (!h) h = (await cdp("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value;
  await cdp("Emulation.setDeviceMetricsOverride", { width: +ancho, height: h, deviceScaleFactor: 1, mobile: false });
  await espera(400);
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(salida, Buffer.from(data, "base64"));
  ws.close();
} finally {
  chrome.kill();
}
