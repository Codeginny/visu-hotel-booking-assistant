// Reglas del hotel: disponibilidad por fecha y cotización.
// Todo cálculo de precio sale de acá; el asistente nunca calcula tarifas por su cuenta.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ConsultaDisponibilidad, Cotizacion, Disponibilidad, Hotel, Reserva } from "./tipos.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const hotel: Hotel = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "hotel.json"), "utf8"));

const DIA = 24 * 60 * 60 * 1000;
const aFecha = (s: string) => new Date(`${s}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Noches entre ingreso (incluido) y egreso (excluido).
export function noches(ingreso: string, egreso: string): string[] {
  const lista: string[] = [];
  for (let d = aFecha(ingreso); d < aFecha(egreso); d = new Date(d.getTime() + DIA)) lista.push(iso(d));
  return lista;
}

// Una temporada puede cruzar el año (20/12 → 28/02).
function temporadaDe(fecha: string) {
  const md = fecha.slice(5);
  return hotel.temporadas.find((t) => (t.desde <= t.hasta ? md >= t.desde && md <= t.hasta : md >= t.desde || md <= t.hasta)) || null;
}

export function validarFechas(ingreso: string | undefined, egreso: string | undefined, hoy = iso(new Date())): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ingreso || "") || !/^\d{4}-\d{2}-\d{2}$/.test(egreso || "")) return "Las fechas tienen que tener el formato AAAA-MM-DD.";
  if (!ingreso || !egreso) return "Faltan las fechas.";
  if (ingreso < hoy) return "La fecha de ingreso ya pasó.";
  if (egreso <= ingreso) return "La fecha de salida tiene que ser posterior a la de ingreso.";
  if (noches(ingreso, egreso).length > 30) return "Las estadías de más de 30 noches se coordinan con recepción.";
  return null;
}

// Habitaciones ocupadas de un tipo en una noche (reservas pendientes y confirmadas bloquean cupo).
const ocupadas = (reservas: Reserva[], tipo: string, noche: string) =>
  reservas.filter((r) => r.habitacion === tipo && r.estado !== "cancelada" && r.ingreso <= noche && r.egreso > noche).length;

export function cotizar(tipo: string, ingreso: string, egreso: string): Cotizacion | { error: string } {
  const hab = hotel.habitaciones.find((h) => h.id === tipo);
  if (!hab) return { error: `No existe la habitación «${tipo}».` };
  const detalle = noches(ingreso, egreso).map((n) => {
    const t = temporadaDe(n);
    return { noche: n, temporada: t?.nombre || "baja", tarifa: Math.round(hab.tarifa_noche * (1 + (t?.recargo || 0))) };
  });
  const total = detalle.reduce((s, d) => s + d.tarifa, 0);
  return { habitacion: hab.id, nombre: hab.nombre, noches: detalle.length, detalle, total, sena: Math.round(total * 0.3), moneda: hotel.hotel.moneda };
}

export function disponibilidad(reservas: Reserva[], { ingreso, egreso, huespedes = 1, habitacion }: ConsultaDisponibilidad): Disponibilidad {
  const error = validarFechas(ingreso, egreso);
  if (error || !ingreso || !egreso) return { error: error ?? "Faltan las fechas." };
  const tipos = hotel.habitaciones.filter((h) => (!habitacion || h.id === habitacion));
  return {
    ingreso, egreso, huespedes,
    opciones: tipos.map((h) => {
      const libres = Math.min(...noches(ingreso, egreso).map((n) => h.cantidad - ocupadas(reservas, h.id, n)));
      const entra = huespedes <= h.capacidad;
      return { ...(cotizar(h.id, ingreso, egreso) as Cotizacion), capacidad: h.capacidad, libres, disponible: libres > 0 && entra, motivo: !entra ? `Capacidad máxima ${h.capacidad} huéspedes` : libres <= 0 ? "Sin cupo en esas fechas" : null };
    }),
  };
}
