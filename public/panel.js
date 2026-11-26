// Panel de recepción: reservas, consultas sin respuesta, conversaciones y correcciones.
const API = window.VISU_API || "";
const $ = (s) => document.querySelector(s);
const pesos = (n) => `$ ${Number(n).toLocaleString("es-AR")}`;
const dia = (f) => new Date(`${f}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
const cuando = (iso) => new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let datos = null;
let vista = "reservas";
let convAbierta = null;

async function cargar() {
  datos = await fetch(`${API}/api/panel`).then((r) => r.json());
  kpis();
  $("#c-sr").textContent = datos.sinRespuesta.filter((s) => !s.resuelta).length || "";
  mostrar();
}

function kpis() {
  const activas = datos.reservas.filter((r) => r.estado !== "cancelada");
  const confirmadas = datos.reservas.filter((r) => r.estado === "confirmada");
  const pendientes = datos.reservas.filter((r) => r.estado === "pendiente").length;
  const conReserva = new Set(activas.map((r) => r.conversacion)).size;
  const conv = datos.conversaciones.length;
  const abiertas = datos.sinRespuesta.filter((s) => !s.resuelta).length;
  $("#kpis").innerHTML = `
    <div class="kpi acento"><span>Reservas confirmadas</span><strong>${confirmadas.length}</strong><small>${pendientes} pendiente${pendientes === 1 ? "" : "s"} de confirmar</small></div>
    <div class="kpi"><span>Ingresos confirmados</span><strong>${pesos(confirmadas.reduce((s, r) => s + r.total, 0))}</strong><small>seña cobrable ${pesos(confirmadas.reduce((s, r) => s + r.sena, 0))}</small></div>
    <div class="kpi"><span>Conversaciones</span><strong>${conv}</strong><small>${conv ? Math.round((conReserva / conv) * 100) : 0} % terminó en reserva</small></div>
    <div class="kpi"><span>Sin respuesta</span><strong>${abiertas}</strong><small>${datos.correcciones.length} respuesta${datos.correcciones.length === 1 ? "" : "s"} corregida${datos.correcciones.length === 1 ? "" : "s"}</small></div>`;
}

const vacio = (t) => `<p class="vacio">${t}</p>`;

const VISTAS = {
  reservas() {
    const lista = [...datos.reservas].sort((a, b) => b.creada.localeCompare(a.creada));
    if (!lista.length) return vacio("Todavía no hay reservas. Probá hacer una desde el chat del huésped.");
    return `<table class="tabla"><thead><tr><th>Huésped</th><th>Habitación</th><th>Estadía</th><th>Estado</th><th style="text-align:right">Total</th><th></th></tr></thead><tbody>
      ${lista.map((r) => `<tr>
        <td>${esc(r.nombre)}<span class="sub">${esc(r.contacto)}</span></td>
        <td>${esc(r.nombreHabitacion)}<span class="sub">${r.huespedes} huésped${r.huespedes > 1 ? "es" : ""}${r.pedidos ? ` · ${esc(r.pedidos)}` : ""}</span></td>
        <td>${dia(r.ingreso)} → ${dia(r.egreso)}<span class="sub">tomada ${cuando(r.creada)}</span></td>
        <td><span class="estado ${r.estado}">${r.estado}</span></td>
        <td class="num">${pesos(r.total)}<span class="sub">seña ${pesos(r.sena)}</span></td>
        <td>${r.conversacion ? `<button class="mini" data-ver="${r.conversacion}">Ver chat</button>` : ""}</td>
      </tr>`).join("")}</tbody></table>`;
  },
  sinRespuesta() {
    const lista = [...datos.sinRespuesta].sort((a, b) => a.resuelta - b.resuelta || b.fecha.localeCompare(a.fecha));
    if (!lista.length) return vacio("No hay consultas sin responder. El asistente pudo contestar todo con los datos del hotel.");
    return `<table class="tabla"><thead><tr><th>Pregunta del huésped</th><th>Por qué no respondió</th><th>Cuándo</th><th></th></tr></thead><tbody>
      ${lista.map((s) => `<tr>
        <td>${esc(s.pregunta)}</td><td class="sub">${esc(s.motivo)}</td><td class="sub">${cuando(s.fecha)}</td>
        <td>${s.resuelta ? '<span class="estado confirmada">resuelta</span>' : `<button class="mini" data-responder="${s.id}">Responder</button>`}
          <button class="mini" data-ver="${s.conversacion}">Ver chat</button></td>
      </tr>`).join("")}</tbody></table>`;
  },
  conversaciones() {
    const lista = [...datos.conversaciones].sort((a, b) => b.creada.localeCompare(a.creada));
    if (!lista.length) return vacio("Todavía no hay conversaciones.");
    convAbierta ||= lista[0].id;
    const reservaDe = (id) => datos.reservas.find((r) => r.conversacion === id);
    setTimeout(() => abrirHilo(convAbierta));
    return `<div class="conversaciones"><div class="lista-conv">
      ${lista.map((c) => `<button data-conv="${c.id}" class="${c.id === convAbierta ? "activa" : ""}">${esc(c.primera || "Sin mensajes")}
        <small>${cuando(c.creada)} · ${c.turnos} mensajes${reservaDe(c.id) ? ` · reserva ${reservaDe(c.id).estado}` : ""}</small></button>`).join("")}
      </div><div class="hilo" id="hilo"></div></div>`;
  },
  correcciones() {
    if (!datos.correcciones.length) return vacio("Todavía no corregiste ninguna respuesta. Podés hacerlo desde «Sin respuesta» o desde una conversación.");
    return `<table class="tabla"><thead><tr><th>Pregunta</th><th>Respuesta oficial</th><th>Desde</th></tr></thead><tbody>
      ${datos.correcciones.map((c) => `<tr><td>${esc(c.pregunta)}</td><td>${esc(c.respuesta)}</td><td class="sub">${cuando(c.fecha)}</td></tr>`).join("")}</tbody></table>`;
  },
};

function mostrar() {
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-selected", b.dataset.vista === vista));
  $("#vista").innerHTML = VISTAS[vista]();
}

// Sólo los mensajes de texto (los pasos de herramientas del modo con API quedan afuera).
const texto = (m) => (typeof m.content === "string" ? m.content : m.content.filter?.((b) => b.type === "text").map((b) => b.text).join("\n"));

async function abrirHilo(id) {
  convAbierta = id;
  document.querySelectorAll("[data-conv]").forEach((b) => b.classList.toggle("activa", b.dataset.conv === id));
  const c = await fetch(`${API}/api/conversaciones/${id}`).then((r) => r.json());
  const hilo = $("#hilo");
  if (!hilo) return;
  hilo.innerHTML = "";
  let ultimaPregunta = "";
  for (const m of c.mensajes) {
    const t = texto(m);
    if (!t) continue;
    const b = document.createElement("div");
    b.className = `burbuja ${m.role === "user" ? "yo" : "hotel"}`;
    b.textContent = t;
    if (m.role === "user") { ultimaPregunta = t; hilo.append(b); continue; }
    const fila = document.createElement("div"); fila.className = "fila-hotel";
    const boton = document.createElement("button"); boton.className = "mini"; boton.textContent = "Corregir";
    const pregunta = ultimaPregunta;
    boton.onclick = () => corregir({ pregunta, mala: t });
    fila.append(b, boton); hilo.append(fila);
  }
}

function corregir({ pregunta = "", mala = "", sinRespuestaId = "" }) {
  const f = $("#form-correccion");
  f.reset();
  f.pregunta.value = pregunta; f.mala.value = mala; f.sinRespuestaId.value = sinRespuestaId;
  f.querySelector(".mala").hidden = !mala;
  $("#dialogo").showModal();
  f.respuesta.focus();
}

$("#dialogo").addEventListener("close", async () => {
  if ($("#dialogo").returnValue !== "guardar") return;
  const f = $("#form-correccion");
  await fetch(`${API}/api/correcciones`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta: f.pregunta.value.trim(), respuesta: f.respuesta.value.trim(), sinRespuestaId: f.sinRespuestaId.value }),
  });
  cargar();
});

document.addEventListener("click", (e) => {
  const d = e.target.closest("button")?.dataset;
  if (!d) return;
  if (d.vista) { vista = d.vista; mostrar(); }
  if (d.ver) { vista = "conversaciones"; convAbierta = d.ver; mostrar(); }
  if (d.conv) abrirHilo(d.conv);
  if (d.responder) { const s = datos.sinRespuesta.find((x) => x.id === d.responder); corregir({ pregunta: s.pregunta, sinRespuestaId: s.id }); }
});

cargar();
setInterval(() => { if (!$("#dialogo").open && vista !== "conversaciones") cargar(); }, 15000);
