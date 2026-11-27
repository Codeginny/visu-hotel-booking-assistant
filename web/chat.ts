// Chat del huésped: manda mensajes a /api/chat y muestra la tarjeta de confirmación.
import type { Opcion, Reserva, RespuestaChat } from "./tipos";

const API = window.VISU_API || "";
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const mensajes = $("#mensajes");
let conversacion = sessionStorage.getItem("visu-conv");

const hora = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const pesos = (n: number) => `$ ${Number(n).toLocaleString("es-AR")}`;
// El año sólo aparece cuando no es el corriente, para no recargar la tarjeta.
const dia = (f: string) => {
  const d = new Date(`${f}T12:00:00`);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
};
const NOMBRES: Record<string, string> = { consultar_disponibilidad: "consultó disponibilidad", crear_reserva_pendiente: "preparó la reserva", registrar_consulta_sin_respuesta: "derivó a recepción" };
const SUGERENCIAS = ["¿A qué hora es el check-in?", "¿Aceptan mascotas?", "Precio del 10 al 13 de julio para 2", "¿Cómo es la cancelación?", "¿Tienen pileta?"];

function burbuja(texto: string, quien: "yo" | "hotel") {
  const b = document.createElement("div");
  b.className = `burbuja ${quien}`;
  b.textContent = texto;
  const t = document.createElement("time"); t.textContent = hora(); b.append(t);
  mensajes.append(b); mensajes.scrollTop = mensajes.scrollHeight;
  return b;
}

function tarjeta(r: Reserva) {
  const el = document.createElement("article");
  el.className = "tarjeta";
  const noches = Math.round((+new Date(r.egreso) - +new Date(r.ingreso)) / 864e5);
  el.innerHTML = `
    <span class="etiqueta">Pendiente de confirmación</span>
    <h3></h3>
    <dl>
      <dt>Ingreso</dt><dd>${dia(r.ingreso)} · 14:00</dd>
      <dt>Salida</dt><dd>${dia(r.egreso)} · 10:00</dd>
      <dt>Huéspedes</dt><dd>${r.huespedes}</dd>
      <dt>A nombre de</dt><dd class="nombre"></dd>
      <dt>Seña (30 %)</dt><dd>${pesos(r.sena)}</dd>
      <dt>Total · ${noches} noche${noches > 1 ? "s" : ""}</dt><dd class="total">${pesos(r.total)}</dd>
    </dl>
    <div class="botones">
      <button class="boton principal" data-accion="confirmar">Confirmar reserva</button>
      <button class="boton secundario" data-accion="cancelar">No reservar</button>
    </div>`;
  el.querySelector("h3")!.textContent = r.nombreHabitacion;
  el.querySelector(".nombre")!.textContent = r.nombre;
  if (r.estado && r.estado !== "pendiente") {
    el.classList.add(r.estado);
    el.querySelector(".etiqueta")!.textContent = r.estado === "confirmada" ? "Reserva confirmada" : "Reserva cancelada";
    el.querySelector(".botones")!.remove();
  }
  el.addEventListener("click", async (e) => {
    const accion = (e.target as HTMLElement).dataset.accion;
    if (!accion) return;
    const res = await fetch(`${API}/api/reservas/${r.id}/${accion}`, { method: "POST" }).then((x) => x.json());
    el.classList.add(res.estado);
    el.querySelector(".etiqueta")!.textContent = res.estado === "confirmada" ? "Reserva confirmada" : "Reserva cancelada";
    el.querySelector(".botones")!.remove();
    burbuja(res.estado === "confirmada"
      ? `¡Gracias, ${r.nombre}! Tu reserva quedó confirmada (código ${r.id.slice(4).toUpperCase()}). Te vamos a escribir para coordinar la seña.`
      : "Listo, la cancelé. Si querés buscamos otras fechas.", "hotel");
  });
  mensajes.append(el); mensajes.scrollTop = mensajes.scrollHeight;
}

// Una tarjeta chica por habitación, para comparar de un vistazo y reservar con un toque.
function opcionesHabitacion(lista: Opcion[]) {
  const cont = document.createElement("div");
  cont.className = "opciones";
  for (const o of lista) {
    const el = document.createElement("article");
    el.className = "opcion";
    el.innerHTML = `<div><h4></h4><small>${o.noches} noche${o.noches > 1 ? "s" : ""} · seña ${pesos(o.sena)}</small></div>
      <div class="precio">${pesos(o.total)}</div>
      <button class="boton principal" type="button">Reservar esta</button>`;
    el.querySelector("h4")!.textContent = o.nombre;
    el.querySelector("button")!.onclick = () => { cont.querySelectorAll("button").forEach((b) => (b.disabled = true)); enviar(`Quiero reservar la ${o.nombre}`); };
    cont.append(el);
  }
  mensajes.append(cont); mensajes.scrollTop = mensajes.scrollHeight;
}

async function enviar(texto: string) {
  burbuja(texto, "yo");
  $("#sugerencias").hidden = true;
  const esperando = document.createElement("div");
  esperando.className = "burbuja hotel";
  esperando.innerHTML = '<span class="escribiendo"><i></i><i></i><i></i></span>';
  mensajes.append(esperando); mensajes.scrollTop = mensajes.scrollHeight;
  $("#estado").textContent = "escribiendo…";
  try {
    const r = await fetch(`${API}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversacion, mensaje: texto }),
    }).then((x) => x.json() as Promise<RespuestaChat>);
    esperando.remove();
    if (r.error) throw new Error(r.error);
    conversacion = r.conversacion; sessionStorage.setItem("visu-conv", conversacion);
    for (const h of r.herramientas || []) {
      const chip = document.createElement("div"); chip.className = "herramienta"; chip.textContent = `⚙ ${NOMBRES[h.nombre] || h.nombre}`;
      mensajes.append(chip);
    }
    burbuja(r.opciones?.length && r.resumen ? r.resumen : r.respuesta, "hotel");
    if (r.opciones?.length) opcionesHabitacion(r.opciones);
    if (r.reserva) tarjeta(r.reserva);
  } catch (e) {
    esperando.remove();
    burbuja("No me pude conectar. Probá de nuevo en un momento.", "hotel");
  } finally {
    $("#estado").textContent = "en línea";
  }
}

function inicio() {
  mensajes.innerHTML = "";
  burbuja("¡Hola! Soy el asistente de Hotel Lumbre 👋\nTe cuento precios, disponibilidad y políticas, o te dejo una reserva lista. ¿En qué te ayudo?", "hotel");
  const s = $("#sugerencias"); s.hidden = false; s.innerHTML = "";
  for (const t of SUGERENCIAS) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = t;
    b.onclick = () => enviar(t); s.append(b);
  }
}

$("#formulario").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $<HTMLInputElement>("#entrada").value.trim();
  if (t) { $<HTMLInputElement>("#entrada").value = ""; enviar(t); }
});
$("#reiniciar").onclick = () => {
  if (document.querySelector(".tarjeta .botones") && !confirm("Tenés una reserva sin confirmar. ¿Empezar una charla nueva igual? La reserva queda pendiente en el hotel.")) return;
  conversacion = null; sessionStorage.removeItem("visu-conv"); inicio();
};
inicio();
