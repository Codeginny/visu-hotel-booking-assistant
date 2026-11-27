// Lo que devuelve la API al navegador (ver server.ts y src/tipos.ts).
export interface Reserva {
  id: string; creada: string; estado: "pendiente" | "confirmada" | "cancelada";
  nombre: string; contacto: string; nombreHabitacion: string; huespedes: number; pedidos?: string;
  ingreso: string; egreso: string; total: number; sena: number; conversacion?: string;
}
export interface Opcion { nombre: string; noches: number; total: number; sena: number }
export interface RespuestaChat {
  error?: string; conversacion: string; respuesta: string; resumen?: string;
  herramientas?: { nombre: string }[]; opciones?: Opcion[]; reserva?: Reserva;
}
export interface SinRespuesta { id: string; pregunta: string; motivo: string; fecha: string; resuelta: boolean; conversacion: string }
export interface ConversacionResumen { id: string; creada: string; primera?: string; turnos: number }
export interface Correccion { pregunta: string; respuesta: string; fecha: string }
export interface Panel { reservas: Reserva[]; sinRespuesta: SinRespuesta[]; conversaciones: ConversacionResumen[]; correcciones: Correccion[] }
export interface Mensaje { role: "user" | "assistant"; content: string | { type: string; text?: string }[] }
