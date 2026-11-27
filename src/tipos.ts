// Tipos del hotel (data/hotel.json) y del estado guardado (data/estado.json)
export interface Habitacion {
  id: string;
  nombre: string;
  capacidad: number;
  camas: string;
  vista: string;
  cantidad: number;
  tarifa_noche: number;
  incluye: string[];
}

export interface Temporada { nombre: string; desde: string; hasta: string; recargo: number }

export interface Hotel {
  hotel: { nombre: string; ciudad: string; direccion: string; telefono: string; email: string; moneda: string; estrellas: number };
  habitaciones: Habitacion[];
  temporadas: Temporada[];
  politicas: Record<"check_in" | "check_out" | "late_check_out" | "cancelacion" | "mascotas" | "ninos" | "pago" | "estacionamiento" | "desayuno", string>;
  servicios: string[];
  no_ofrece: string[];
}

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada";

export interface Reserva {
  id: string;
  estado: EstadoReserva;
  creada: string;
  habitacion: string;
  ingreso: string;
  egreso: string;
  huespedes: number;
  nombre: string;
  contacto: string;
  conversacion?: string;
  pedidos?: string;
  total: number;
  sena: number;
  moneda: string;
  nombreHabitacion: string;
  confirmada?: string;
  cancelada?: string;
}

import type Anthropic from "@anthropic-ai/sdk";

export type Mensaje = Anthropic.MessageParam;
export interface Conversacion { id: string; creada: string; mensajes: Mensaje[]; reservaPendiente?: string; datos?: DatosReserva }

// Lo que el modo local va juntando del huésped durante la charla
export interface DatosReserva {
  ingreso?: string; egreso?: string; huespedes?: number; habitacion?: string;
  nombre?: string; contacto?: string; pedidos?: string; esperando?: "datos" | null;
}
export interface SinRespuesta { id: string; conversacion: string; pregunta: string; motivo: string; fecha: string; resuelta: boolean }
export interface Correccion { id: string; pregunta: string; respuesta: string; fecha: string }

export interface Estado {
  reservas: Reserva[];
  conversaciones: Conversacion[];
  sinRespuesta: SinRespuesta[];
  correcciones: Correccion[];
}

export interface Cotizacion {
  habitacion: string;
  nombre: string;
  noches: number;
  detalle: { noche: string; temporada: string; tarifa: number }[];
  total: number;
  sena: number;
  moneda: string;
}

export interface Opcion extends Cotizacion { capacidad: number; libres: number; disponible: boolean; motivo: string | null }

export type Disponibilidad =
  | { error: string }
  | { error?: undefined; ingreso: string; egreso: string; huespedes: number; opciones: Opcion[] };

export interface ConsultaDisponibilidad { ingreso?: string; egreso?: string; huespedes?: number; habitacion?: string }
