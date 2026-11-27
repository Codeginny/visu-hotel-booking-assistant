// Visu Hotel — servidor HTTP propio: API del hotel, asistente y archivos de public/.
import "./src/env.ts";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hotel, disponibilidad } from "./src/hotel.ts";
import { store } from "./src/store.ts";
import { responder, hayClave } from "./src/asistente.ts";
import type { Correccion } from "./src/tipos.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, "public");
const PORT = Number(process.env.PORT || 4300);
const ORIGEN = process.env.CORS_ORIGIN || "*"; // el frontend en Netlify llama a la API en Render
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

const enviar = (res: http.ServerResponse, codigo: number, datos: unknown) => {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": ORIGEN });
  res.end(JSON.stringify(datos));
};
// El cuerpo llega del navegador: cada ruta valida los campos que usa
const leerCuerpo = <T>(req: http.IncomingMessage) => new Promise<Partial<T>>((ok, mal) => {
  let b = ""; req.on("data", (c: Buffer) => { b += c; if (b.length > 1e5) req.destroy(); });
  req.on("end", () => { try { ok(b ? JSON.parse(b) : {}); } catch { mal(new Error("JSON inválido")); } });
});

async function api(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const p = url.pathname, q = Object.fromEntries(url.searchParams);
  if (req.method === "GET" && p === "/api/estado") return enviar(res, 200, { asistente: hayClave, hotel: hotel.hotel.nombre });
  if (req.method === "GET" && p === "/api/hotel") return enviar(res, 200, hotel);
  if (req.method === "GET" && p === "/api/disponibilidad") {
    const r = disponibilidad(store.estado.reservas, { ...q, huespedes: Number(q.huespedes || 1) });
    return enviar(res, r.error !== undefined ? 400 : 200, r);
  }
  if (req.method === "POST" && p === "/api/chat") {
    const { conversacion, mensaje } = await leerCuerpo<{ conversacion: string; mensaje: string }>(req);
    if (!mensaje?.trim()) return enviar(res, 400, { error: "Mensaje vacío" });
    return enviar(res, 200, await responder(conversacion, mensaje.trim()));
  }
  const m = p.match(/^\/api\/reservas\/([\w]+)\/(confirmar|cancelar)$/);
  if (req.method === "POST" && m) {
    const r = store.cambiarEstado(m[1], m[2] === "confirmar" ? "confirmada" : "cancelada");
    return r ? enviar(res, 200, r) : enviar(res, 404, { error: "No existe esa reserva" });
  }
  // Panel del hotel
  if (req.method === "GET" && p === "/api/panel") {
    const { reservas, sinRespuesta, conversaciones, correcciones } = store.estado;
    return enviar(res, 200, {
      reservas, sinRespuesta, correcciones,
      conversaciones: conversaciones.map((c) => ({ id: c.id, creada: c.creada, turnos: c.mensajes.filter((x) => typeof x.content === "string").length, primera: c.mensajes.find((x) => x.role === "user" && typeof x.content === "string")?.content.toString().slice(0, 60) })),
    });
  }
  if (req.method === "GET" && p.startsWith("/api/conversaciones/")) {
    const c = store.estado.conversaciones.find((x) => x.id === p.split("/").pop());
    return c ? enviar(res, 200, c) : enviar(res, 404, { error: "No existe" });
  }
  if (req.method === "POST" && p === "/api/correcciones") {
    const datos = await leerCuerpo<Correccion & { sinRespuestaId: string }>(req);
    if (!datos.pregunta || !datos.respuesta) return enviar(res, 400, { error: "Faltan pregunta y respuesta" });
    return enviar(res, 200, store.corregir({ pregunta: datos.pregunta, respuesta: datos.respuesta, sinRespuestaId: datos.sinRespuestaId }));
  }
  return enviar(res, 404, { error: "Ruta inexistente" });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": ORIGEN, "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }
  if (url.pathname.startsWith("/api/")) {
    try { return await api(req, res, url); } catch (e) { console.error(e); return enviar(res, 500, { error: (e as Error).message }); }
  }
  const archivo = path.join(PUBLIC, path.normalize(url.pathname === "/" ? "/index.html" : url.pathname));
  if (!archivo.startsWith(PUBLIC) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end("No encontrado"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(archivo)] || "application/octet-stream" });
  fs.createReadStream(archivo).pipe(res);
}).listen(PORT, () => console.log(`Visu Hotel en http://localhost:${PORT} · asistente ${hayClave ? "activo" : "sin clave (.env)"}`));
