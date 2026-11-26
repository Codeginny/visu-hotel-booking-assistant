// Modo local: intérprete por reglas, sin API ni costo. Se usa cuando no hay ANTHROPIC_API_KEY.
// Lleva el estado de la reserva en conv.datos y responde sólo con hotel.json y src/hotel.js.
import { hotel, disponibilidad, validarFechas } from "./hotel.js";
import { store } from "./store.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pesos = (n) => `$ ${n.toLocaleString("es-AR")}`;
const corta = (f) => `${+f.slice(8)}/${+f.slice(5, 7)}`;
const pad = (n) => String(n).padStart(2, "0");
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Próxima vez que llega dd/mm (si no dicen el año).
function fecha(dia, mes, anio) {
  const hoy = new Date().toISOString().slice(0, 10);
  let a = anio ? (anio < 100 ? 2000 + anio : anio) : Number(hoy.slice(0, 4));
  let f = `${a}-${pad(mes)}-${pad(dia)}`;
  if (!anio && f < hoy) f = `${a + 1}-${pad(mes)}-${pad(dia)}`;
  return f;
}
const sumarDias = (f, n) => new Date(Date.parse(`${f}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

export function leerFechas(t) {
  const mes = `(${MESES.join("|")})`;
  let m = t.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s*${mes}\\s*)?(?:al|hasta el|a)\\s*(\\d{1,2})\\s*de\\s*${mes}`));
  if (m) return { ingreso: fecha(+m[1], MESES.indexOf(m[2] || m[4]) + 1), egreso: fecha(+m[3], MESES.indexOf(m[4]) + 1) };
  m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:al|hasta el|a)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) return { ingreso: fecha(+m[1], +m[2], m[3] && +m[3]), egreso: fecha(+m[4], +m[5], m[6] && +m[6]) };
  const n = t.match(/(\d{1,2})\s*noches?/);
  m = t.match(new RegExp(`(\\d{1,2})\\s*de\\s*${mes}`)) || t.match(/(\d{1,2})\/(\d{1,2})/);
  if (m && n) {
    const ingreso = isNaN(m[2]) ? fecha(+m[1], MESES.indexOf(m[2]) + 1) : fecha(+m[1], +m[2]);
    return { ingreso, egreso: sumarDias(ingreso, +n[1]) };
  }
  return null;
}

function leerHuespedes(t) {
  const palabras = { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
  const m = t.match(/(\d+|uno|una|dos|tres|cuatro|cinco|seis)\s*(personas|huespedes|adultos|pasajeros)/) || t.match(/somos\s*(\d+|dos|tres|cuatro|cinco|seis)/);
  if (m) return palabras[m[1]] || +m[1];
  const para = t.match(/para\s*(\d|dos|tres|cuatro)\b(?!\s*(de|noches?|\/))/);
  if (para) return palabras[para[1]] || +para[1];
  if (/\b(pareja|mi novi[oa]|mi espos[oa]|mi marido|mi mujer)\b/.test(t)) return 2;
  if (/\b(sol[oa]|una persona)\b/.test(t)) return 1;
  return null;
}

const HABITACION = [["suite", /suite/], ["sup", /superior|vista al lago|lago/], ["fam", /familiar/], ["std", /estandar|standard|comun|la mas barata|economica/]];
const leerHabitacion = (t) => HABITACION.find(([, re]) => re.test(t))?.[0] || null;

// Preguntas frecuentes: palabras clave → respuesta armada con hotel.json.
const p = hotel.politicas;
const FAQ = [
  [/check.?in|hora de (entrada|ingreso)|a que hora (entro|llego|puedo entrar)/, `El check-in es ${p.check_in} y el check-out ${p.check_out}.`],
  [/check.?out|hora de salida|a que hora (salgo|me voy|hay que dejar)/, `El check-out es ${p.check_out}. Late check-out: ${p.late_check_out}.`],
  [/cancel|devolu|reembols/, `Política de cancelación: ${p.cancelacion}`],
  [/mascota|perr|gat/, p.mascotas],
  [/nin|bebe|cuna|chic|hij/, p.ninos],
  [/pag|sena|tarjeta|transferencia|efectivo/, `Forma de pago: ${p.pago}`],
  [/estacionamiento|cochera|auto|garage/, `Estacionamiento: ${p.estacionamiento}`],
  [/desayuno/, `Desayuno: ${p.desayuno}`],
  [/wifi|internet/, "Hay wifi sin cargo en todo el hotel."],
  [/spa|sauna/, "Tenemos spa con sauna, con cargo extra. Las tarifas del spa las confirma recepción."],
  [/traslado|aeropuerto|transfer/, "Hacemos traslado al aeropuerto a pedido, con cargo extra. Recepción te pasa el valor."],
  [/esqui|ski/, "Tenemos guarda de esquíes para los huéspedes."],
  [/donde|direccion|ubicacion|como llego/, `Estamos en ${hotel.hotel.direccion}, ${hotel.hotel.ciudad}.`],
  [/habitaciones|que tipo|que opciones/, `Tenemos: ${hotel.habitaciones.map((h) => `${h.nombre} (hasta ${h.capacidad})`).join(", ")}. Si me pasás fechas y cantidad de personas te digo precio y disponibilidad.`],
];
const NO_OFRECE = { piscina: /pileta|piscina/, gimnasio: /gimnasio|gym/, "restaurante para cenas": /cena|restaurante|cenar/ };

function noOfrece(t) {
  const item = hotel.no_ofrece.find((x) => NO_OFRECE[x]?.test(t));
  return item ? `No, el hotel no tiene ${item}. Si querés, te paso con recepción para recomendaciones de la zona.` : null;
}

function textoOpciones(d) {
  const libres = d.opciones.filter((o) => o.disponible);
  if (!libres.length) return "Para esas fechas y esa cantidad de personas no me queda lugar. ¿Querés probar con otras fechas?";
  const n = libres[0].noches;
  return `Para ${n} noche${n > 1 ? "s" : ""} (${corta(d.ingreso)} al ${corta(d.egreso)}, ${d.huespedes} huésped${d.huespedes > 1 ? "es" : ""}) tengo:\n` +
    libres.map((o) => `• ${o.nombre}: ${pesos(o.total)} en total (seña ${pesos(o.sena)})`).join("\n") +
    "\n¿Cuál te gustaría reservar?";
}

// Corrección de recepción que corresponde a esta pregunta: comparte al menos la mitad de sus palabras con contenido.
const VACIAS = new Set(["puede", "pueden", "puedo", "hacer", "tienen", "tiene", "quiero", "quisiera", "saber", "donde", "cuando", "cuanto", "hotel", "habitacion"]);
const palabras = (s) => sinTildes(s).split(/[^a-zñ0-9]+/).filter((w) => w.length > 3 && !VACIAS.has(w));
// Nombre escrito sin «me llamo»: «Lucía Gómez, lucia@correo.com» o sólo «Lucía Gómez».
const NO_NOMBRE = new Set(["si", "sí", "no", "ok", "dale", "listo", "gracias", "hola", "bueno", "perfecto", "quiero", "reservar", "reserva", "genial"]);
function nombreSuelto(texto, contacto) {
  if (/\?/.test(texto)) return undefined;
  const resto = (contacto ? texto.replace(contacto, " ") : texto)
    .replace(/\b(mi|el|es|mail|email|correo|tel[eé]fono|tel|celular|whatsapp|contacto)\b/giu, " ")
    .replace(/[,;:.\-]+/g, " ").replace(/\s+/g, " ").trim();
  const palabras = resto.split(" ").filter((w) => w.toLowerCase() !== "y");
  if (!palabras.length || palabras.length > 4) return undefined;
  if (!palabras.every((w) => /^\p{L}{2,}$/u.test(w) && !NO_NOMBRE.has(w.toLowerCase()))) return undefined;
  return palabras.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function buscarCorreccion(t) {
  const enTexto = new Set(palabras(t));
  let mejor = null, puntaje = 0;
  for (const c of store.estado.correcciones) {
    const clave = palabras(c.pregunta);
    const p = clave.filter((w) => enTexto.has(w)).length / (clave.length || 1);
    if (p >= 0.5 && p > puntaje) { mejor = c; puntaje = p; }
  }
  return mejor;
}

export function responderLocal(conv, texto) {
  const t = sinTildes(texto);
  const d = (conv.datos ||= {});
  const usadas = [];
  let reserva = null;
  let opciones = null, resumen = null;
  const corregida = buscarCorreccion(t);

  // 1) Lo que el huésped aporta en este mensaje.
  const fechas = leerFechas(t); if (fechas) Object.assign(d, fechas);
  const hues = leerHuespedes(t); if (hues) d.huespedes = hues;
  const hab = leerHabitacion(t); if (hab && (d.ingreso || /reserv/.test(t))) d.habitacion = hab;
  const contacto = texto.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || texto.match(/\+?\d[\d\s-]{7,}\d/);
  if (contacto && d.esperando === "datos") d.contacto = contacto[0].trim();
  const nombre = texto.match(/(?:me llamo|soy|a nombre de|mi nombre es)\s+(\p{L}+(?:\s+(?!y\b|mi\b)\p{L}+)?)/iu);
  if (nombre && d.esperando === "datos") d.nombre = nombre[1];
  else if (d.esperando === "datos" && !d.nombre) d.nombre = nombreSuelto(texto, contacto?.[0]);
  if (/mascota|perr|gat/.test(t) && d.esperando) d.pedidos = [d.pedidos, "viaja con mascota"].filter(Boolean).join("; ");
  if (/cuna/.test(t) && d.esperando) d.pedidos = [d.pedidos, "cuna"].filter(Boolean).join("; ");

  const fin = (respuesta) => ({ respuesta, herramientas: usadas, reserva, opciones, resumen });

  // 2) Pedidos de cambio de reglas o descuentos que no existen.
  if (/ignora|olvida (tus|las) (reglas|instrucciones)|descuento|gratis|precio especial/.test(t))
    return fin("No tengo descuentos ni tarifas especiales para ofrecer: los precios son los que calcula el sistema según las fechas. Si querés, te paso con recepción.");

  // 3) Flujo de reserva.
  if (d.esperando === "datos" && d.nombre && d.contacto) {
    const error = validarFechas(d.ingreso, d.egreso);
    const op = !error && disponibilidad(store.estado.reservas, d).opciones.find((o) => o.habitacion === d.habitacion);
    usadas.push({ nombre: "crear_reserva_pendiente", entrada: { ...d }, ok: Boolean(op?.disponible) });
    const repetida = !error && store.buscarDuplicada(d);
    if (repetida) {
      reserva = repetida; conv.datos = {};
      return fin(`Esa reserva ya la tenías ${repetida.estado === "confirmada" ? "confirmada" : "pendiente"}, ${repetida.nombre}: no hace falta hacerla de nuevo. Te la muestro abajo.`);
    }
    if (!op?.disponible) { d.esperando = null; return fin(`No pude guardar la reserva: ${error || op?.motivo}. ¿Probamos otras fechas?`); }
    reserva = store.crearReserva({ habitacion: d.habitacion, ingreso: d.ingreso, egreso: d.egreso, huespedes: d.huespedes, nombre: d.nombre, contacto: d.contacto, pedidos: d.pedidos, conversacion: conv.id, total: op.total, sena: op.sena, moneda: op.moneda, nombreHabitacion: op.nombre });
    conv.datos = {};
    return fin(`Listo, ${reserva.nombre}: dejé la reserva pendiente. ${op.nombre}, del ${corta(reserva.ingreso)} al ${corta(reserva.egreso)}, ${pesos(op.total)} (seña ${pesos(op.sena)}). Tocá «Confirmar reserva» en la tarjeta para guardarla.`);
  }
  const falta = d.esperando === "datos" ? `Para dejarla a tu nombre me falta ${!d.nombre ? "tu nombre y apellido" : "un teléfono o email de contacto"}.` : null;
  if (falta && (nombre || contacto)) return fin(falta);

  const quiereReservar = /reserv|la quiero|me quedo con|dale|esa|tomo/.test(t);
  const soloPrecio = /cuanto|precio|tarifa|sale|cuesta/.test(t) && !quiereReservar;
  if (d.ingreso && d.huespedes && d.habitacion && soloPrecio) {
    const op = disponibilidad(store.estado.reservas, d).opciones?.find((o) => o.habitacion === d.habitacion);
    usadas.push({ nombre: "consultar_disponibilidad", entrada: { ingreso: d.ingreso, egreso: d.egreso, huespedes: d.huespedes, habitacion: d.habitacion }, ok: Boolean(op) });
    if (!op) return fin("Revisá las fechas, por favor: no pude calcular ese precio.");
    if (!op.disponible) return fin(`La ${op.nombre} no está disponible: ${op.motivo}. ¿Querés que te pase otras opciones?`);
    return fin(`La ${op.nombre} del ${corta(d.ingreso)} al ${corta(d.egreso)} sale ${pesos(op.total)} en total (${op.noches} noche${op.noches > 1 ? "s" : ""}, seña ${pesos(op.sena)}). ¿Querés que te la reserve?`);
  }
  if (d.ingreso && d.huespedes && d.habitacion && (quiereReservar || hab)) {
    const op = disponibilidad(store.estado.reservas, d).opciones?.find((o) => o.habitacion === d.habitacion);
    usadas.push({ nombre: "consultar_disponibilidad", entrada: { ingreso: d.ingreso, egreso: d.egreso, huespedes: d.huespedes, habitacion: d.habitacion }, ok: Boolean(op) });
    if (!op?.disponible) return fin(`La ${op?.nombre || "habitación"} no está disponible: ${op?.motivo || "revisá las fechas"}. ¿Querés otra opción?`);
    d.esperando = "datos";
    return fin(`Perfecto, ${op.nombre} por ${pesos(op.total)}. ¿A nombre de quién la dejo y a qué teléfono o email te contactamos?`);
  }

  // 4) Preguntas de información.
  const conRecordatorio = (r) => fin(falta ? `${r}\n\n${falta}` : r);
  if (corregida) return conRecordatorio(corregida.respuesta);
  const no = noOfrece(t); if (no) return conRecordatorio(no);
  const faq = FAQ.filter(([re]) => re.test(t)).map(([, r]) => r);
  if (faq.length && !fechas) return conRecordatorio(faq.join("\n"));
  if (falta && !/\?/.test(texto)) return fin(falta);

  // Fechas aproximadas ("el finde largo de mayo", "en julio"): se pregunta, no se supone.
  const mesSuelto = MESES.some((m) => t.includes(m)) && !fechas;
  if (!d.ingreso && (mesSuelto || /fin de semana|finde|feriado|vacaciones|semana santa/.test(t)))
    return fin("¡Buenísimo! Para darte precio y disponibilidad necesito las fechas exactas de ingreso y salida (por ejemplo: «del 22 al 25 de mayo») y cuántas personas serían.");

  // 5) Disponibilidad y precios.
  if (fechas || hues || /precio|tarifa|cuanto|disponib|lugar|reserv/.test(t)) {
    if (!d.ingreso) return fin("¡Con gusto! ¿Para qué fechas sería? Por ejemplo: «del 10 al 12 de julio».");
    if (!d.huespedes) return fin("¿Cuántas personas serían?");
    const r = disponibilidad(store.estado.reservas, d);
    usadas.push({ nombre: "consultar_disponibilidad", entrada: { ingreso: d.ingreso, egreso: d.egreso, huespedes: d.huespedes }, ok: !r.error });
    if (r.error) { delete d.ingreso; delete d.egreso; return fin(r.error); }
    // En el chat las habitaciones van en tarjetas; el texto completo queda para el historial y el modo sin interfaz.
    const libres = r.opciones.filter((o) => o.disponible);
    if (libres.length) {
      opciones = libres.map(({ habitacion, nombre, total, sena, noches }) => ({ habitacion, nombre, total, sena, noches }));
      resumen = `Para ${libres[0].noches} noche${libres[0].noches > 1 ? "s" : ""} (${corta(r.ingreso)} al ${corta(r.egreso)}, ${r.huespedes} huésped${r.huespedes > 1 ? "es" : ""}) tengo ${libres.length === 1 ? "esta opción" : `estas ${libres.length} opciones`}. ¿Cuál te gustaría reservar?` + (faq.length ? `\n\n${faq.join("\n")}` : "");
    }
    return fin(textoOpciones(r) + (faq.length ? `\n\n${faq.join("\n")}` : ""));
  }

  if (/^(hola|buenas|buen dia|buenas tardes|buenas noches)\b/.test(t))
    return fin(`¡Hola! Soy el asistente de ${hotel.hotel.nombre}. Puedo contarte precios y disponibilidad, nuestras políticas o dejarte una reserva. ¿Para qué fechas estás pensando venir?`);
  if (/gracias/.test(t)) return fin("¡Gracias a vos! Cualquier otra duda, escribime.");

  // 6) No sabe: lo registra para recepción en vez de inventar.
  store.registrarSinRespuesta(conv.id, texto, "El modo local no encontró la respuesta en los datos del hotel");
  usadas.push({ nombre: "registrar_consulta_sin_respuesta", entrada: { pregunta: texto }, ok: true });
  return conRecordatorio("Esa no la tengo en mis datos y no quiero decirte algo incorrecto. Ya se la pasé a recepción para que te respondan por acá.");
}
