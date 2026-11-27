// Almacenamiento en un JSON: reservas, conversaciones, consultas sin respuesta y correcciones.
// Se crea solo en data/estado.json (no se sube al repo).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Conversacion, Correccion, Estado, EstadoReserva, Reserva, SinRespuesta } from "./tipos.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO = path.resolve(here, "..", process.env.ESTADO || "data/estado.json");
const vacio = (): Estado => ({ reservas: [], conversaciones: [], sinRespuesta: [], correcciones: [] });

let estado: Estado = fs.existsSync(ARCHIVO) ? { ...vacio(), ...JSON.parse(fs.readFileSync(ARCHIVO, "utf8")) } : vacio();
const guardar = () => fs.writeFileSync(ARCHIVO, JSON.stringify(estado, null, 2));
const id = (pre: string) => `${pre}_${crypto.randomBytes(4).toString("hex")}`;
const ahora = () => new Date().toISOString();

export const store = {
  get estado() { return estado; },
  reiniciar() { estado = vacio(); guardar(); },

  crearReserva(datos: Omit<Reserva, "id" | "estado" | "creada">): Reserva {
    const r: Reserva = { id: id("res"), estado: "pendiente", creada: ahora(), ...datos };
    estado.reservas.push(r); guardar(); return r;
  },
  // Misma habitación y fechas, y mismo contacto o nombre: es la misma reserva, no una nueva.
  buscarDuplicada({ habitacion, ingreso, egreso, contacto, nombre }: Pick<Reserva, "habitacion" | "ingreso" | "egreso" | "contacto" | "nombre">) {
    const igual = (x: unknown, y: unknown) => Boolean(x && y) && String(x).trim().toLowerCase() === String(y).trim().toLowerCase();
    return estado.reservas.find((r) => r.estado !== "cancelada" && r.habitacion === habitacion && r.ingreso === ingreso && r.egreso === egreso
      && (igual(r.contacto, contacto) || igual(r.nombre, nombre)));
  },
  cambiarEstado(idReserva: string, nuevo: Exclude<EstadoReserva, "pendiente">): Reserva | null {
    const r = estado.reservas.find((x) => x.id === idReserva);
    if (!r) return null;
    r.estado = nuevo; r[nuevo] = ahora(); guardar(); return r;
  },

  conversacion(idConv?: string): Conversacion {
    let c = estado.conversaciones.find((x) => x.id === idConv);
    if (!c) { c = { id: idConv || id("conv"), creada: ahora(), mensajes: [] }; estado.conversaciones.push(c); }
    return c;
  },
  guardarConversacion() { guardar(); },

  registrarSinRespuesta(conv: string, pregunta: string, motivo: string): SinRespuesta {
    const s: SinRespuesta = { id: id("sr"), conversacion: conv, pregunta, motivo, fecha: ahora(), resuelta: false };
    estado.sinRespuesta.push(s); guardar(); return s;
  },
  // Corrección del hotel a una respuesta mala: se suma al contexto del asistente desde ese momento.
  corregir({ pregunta, respuesta, sinRespuestaId }: { pregunta: string; respuesta: string; sinRespuestaId?: string }): Correccion {
    const c: Correccion = { id: id("cor"), pregunta, respuesta, fecha: ahora() };
    estado.correcciones.push(c);
    const s = estado.sinRespuesta.find((x) => x.id === sinRespuestaId);
    if (s) s.resuelta = true;
    guardar(); return c;
  },
};
