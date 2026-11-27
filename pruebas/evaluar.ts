// Corre las conversaciones de prueba contra el asistente y arma la tabla de resultados.
// Uso: node pruebas/evaluar.js  (usa la API si hay clave; si no, el modo local)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.ESTADO = "data/evaluacion.json"; // estado aparte, no toca las reservas de la demo
await import("../src/env.ts");
const { store } = await import("../src/store.ts");
const { responder, hayClave } = await import("../src/asistente.ts");

const casos = JSON.parse(fs.readFileSync(path.join(here, "conversaciones.json"), "utf8"));
store.reiniciar();
const filas = [];

for (const caso of casos) {
  store.estado.correcciones = [];
  if (caso.correccion) store.corregir(caso.correccion);
  let conv = null;
  const fallas = [];
  for (const t of caso.turnos) {
    const antes = store.estado.sinRespuesta.length;
    const r = await responder(conv, t.huesped);
    conv = r.conversacion;
    const txt = r.respuesta.toLowerCase();
    for (const s of t.incluye || []) if (!txt.includes(s.toLowerCase())) fallas.push(`no dice «${s}»`);
    for (const s of t.noIncluye || []) if (txt.includes(s.toLowerCase())) fallas.push(`dice «${s}»`);
    if (t.herramienta && !r.herramientas.some((h) => h.nombre === t.herramienta)) fallas.push(`no usó ${t.herramienta}`);
    if (t.reserva && !r.reserva) fallas.push("no creó la reserva");
    const derivo = store.estado.sinRespuesta.length > antes;
    if (t.sinRespuesta === true && !derivo) fallas.push("no derivó a recepción");
    if (t.sinRespuesta === false && derivo) fallas.push("derivó en vez de preguntar");
    t.respuesta = r.respuesta;
  }
  filas.push({ id: caso.id, tema: caso.tema, ok: !fallas.length, fallas, ultima: caso.turnos.at(-1).respuesta });
  console.log(`${fallas.length ? "✗" : "✓"} ${String(caso.id).padStart(2)} ${caso.tema}${fallas.length ? ` — ${fallas.join("; ")}` : ""}`);
}

const aciertos = filas.filter((f) => f.ok).length;
const modo = hayClave ? `API (${process.env.VISU_MODEL || "claude-sonnet-5-5"})` : "modo local";
const md = [
  `**${aciertos} de ${filas.length} aciertos** (${Math.round((aciertos / filas.length) * 100)} %) · ${modo} · ${new Date().toISOString().slice(0, 10)}`,
  "",
  "| # | Caso | Resultado | Detalle |",
  "|---|------|-----------|---------|",
  ...filas.map((f) => `| ${f.id} | ${f.tema} | ${f.ok ? "✅ Acierta" : "❌ Falla"} | ${f.ok ? "" : f.fallas.join("; ")} |`),
].join("\n");
fs.writeFileSync(path.join(here, "resultados.md"), md + "\n");
fs.writeFileSync(path.join(here, "resultados.json"), JSON.stringify({ modo, fecha: new Date().toISOString(), filas }, null, 2));
fs.rmSync(path.resolve(here, "..", process.env.ESTADO), { force: true });
console.log(`\n${aciertos}/${filas.length} aciertos`);
