// Capturas anotadas del análisis UX/UI de Visu Hotel: un recorte con zoom de una sola zona de la
// pantalla real, con etiquetas grandes numeradas en una columna a la derecha (verde agua = algo que
// funciona, ámbar = algo para mejorar) y una flecha curva hacia cada punto.
// Uso: con el servidor corriendo (`PORT=4301 ESTADO=/tmp/estado-ux.json node server.js`),
// `node ux-caso/herramientas/ux-anotar.mjs [nombre]`. Playwright se toma de otro proyecto con
// `PLAYWRIGHT` (ruta a @playwright/test), para no sumar una dependencia a la demo.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "@playwright/test");
const BASE = process.env.BASE_URL ?? "http://localhost:4301";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "capturas");
const SOLO = process.argv[2];
mkdirSync(OUT, { recursive: true });

const VERDE = "#2DD4BF", AMBAR = "#F5B544", TINTA = "#0E1220";
const ESCRITORIO = { width: 1100, height: 900 };

async function decir(page, texto) {
  const antes = await page.locator(".burbuja.hotel").count();
  await page.fill("#entrada", texto);
  await page.press("#entrada", "Enter");
  await page.waitForFunction((n) => document.querySelectorAll(".burbuja.hotel:not(:has(.escribiendo))").length > n, antes);
  await page.waitForTimeout(400);
}
const pedirPrecio = (page) => decir(page, "Precio del 10 al 13 de julio para 2");
const pedirReserva = async (page) => { await pedirPrecio(page); await decir(page, "Quiero reservar la superior"); };

// zona: elementos que abarca el recorte (+ margen). notas: s = selector | t = texto; n = índice (-1 = último);
// en = punto de la flecha ('arriba', 'abajo', 'centro' o derecha por defecto); alerta = para mejorar (ámbar).
const CAPTURAS = [
  {
    nombre: "ux01-inicio-chat", ruta: "/", viewport: { width: 1100, height: 600 },
    zona: [{ s: ".telefono" }], margen: 10,
    notas: [
      { s: "#reiniciar", en: "abajo", alerta: true, label: "El ↻ borra toda la conversación, pero es sólo un ícono: no avisa qué hace" },
      { t: "Soy el asistente", label: "Se presenta y dice qué sabe hacer, en dos líneas" },
      { s: "#sugerencias button", n: 0, label: "Propone preguntas reales para arrancar: nadie queda frente a un chat vacío" },
      { s: "#entrada", label: "El campo de texto de siempre, como en WhatsApp: no hay nada que aprender" },
    ],
  },
  {
    nombre: "ux02-precios", ruta: "/", accion: pedirPrecio,
    zona: [{ s: ".herramienta", n: -1 }, { s: ".burbuja.hotel", n: -1 }], margen: 18,
    notas: [
      { s: ".herramienta", n: -1, label: "Muestra que consultó el sistema: el precio no lo inventa el asistente" },
      { s: ".burbuja.hotel", n: -1, en: "centro", alerta: true, label: "Cuatro habitaciones con total y seña en un mismo bloque de texto: cuesta comparar" },
    ],
  },
  {
    nombre: "ux03-nombre", ruta: "/", accion: async (p) => { await pedirReserva(p); await decir(p, "Lucía Gómez, lucia@correo.com"); },
    zona: [{ s: ".burbuja.yo", n: -1 }, { s: ".burbuja.hotel", n: -1 }], margen: 18,
    notas: [
      { s: ".burbuja.yo", n: -1, alerta: true, label: "La huésped ya dio su nombre y su mail…" },
      { s: ".burbuja.hotel", n: -1, alerta: true, label: "…y el asistente se lo vuelve a pedir con un formato fijo. Es el error que más frustra" },
    ],
  },
  {
    nombre: "ux03b-nombre-despues", ruta: "/", accion: async (p) => { await pedirReserva(p); await decir(p, "Lucía Gómez, lucia@correo.com"); },
    zona: [{ s: ".burbuja.yo", n: -1 }, { s: ".burbuja.hotel", n: -1 }], margen: 18,
    notas: [
      { s: ".burbuja.yo", n: -1, label: "Ahora el nombre se entiende como lo escriba la persona…" },
      { s: ".burbuja.hotel", n: -1, label: "…y la reserva queda lista en el mismo mensaje" },
    ],
  },
  {
    nombre: "ux03c-repetida-despues", ruta: "/", accion: async (p) => { await pedirReserva(p); await decir(p, "Lucía Gómez, lucia@correo.com"); },
    zona: [{ s: ".burbuja.hotel", n: -1 }, { s: ".tarjeta", n: -1 }], margen: 14,
    notas: [
      { s: ".burbuja.hotel", n: -1, label: "Si ya existe la misma reserva, no crea otra: avisa y la vuelve a mostrar" },
      { s: ".tarjeta .etiqueta", n: -1, label: "Es la misma tarjeta de antes, con su estado real" },
    ],
  },
  {
    nombre: "ux01b-inicio-despues", ruta: "/", viewport: { width: 1100, height: 600 },
    zona: [{ s: ".chat-cabecera" }, { s: ".burbuja.hotel", n: 0 }], margen: 10,
    notas: [
      { s: "#reiniciar", en: "abajo", label: "«Nueva charla» dice lo que hace, y si hay una reserva sin confirmar, pregunta antes de borrar" },
    ],
  },
  {
    nombre: "ux02b-precios-despues", ruta: "/", sinBajar: true,
    accion: async (p) => { await pedirPrecio(p); await p.evaluate(() => { const m = document.querySelector("#mensajes"); const h = [...m.querySelectorAll(".herramienta")].at(-1); m.scrollTop = h.offsetTop - m.offsetTop - 8; }); },
    zona: [{ s: ".herramienta", n: -1 }, { s: ".opciones", n: -1 }], margen: 14,
    notas: [
      { s: ".herramienta", n: -1, label: "El aviso de que consultó el sistema ahora se lee y tiene el color de la marca" },
      { s: ".opcion .precio", n: 1, label: "Una tarjeta por habitación: el total se compara de un vistazo" },
      { s: ".opcion .boton", n: 1, en: "abajo", label: "Se reserva con un toque, sin tener que escribir el nombre de la habitación" },
    ],
  },
  {
    nombre: "ux04b-tarjeta-despues", ruta: "/", accion: async (p) => { await pedirReserva(p); await decir(p, "Lucía Gómez, lucia@correo.com"); },
    zona: [{ s: ".tarjeta", n: -1 }], margen: 14,
    notas: [
      { t: "14:00", label: "Si la fecha no es de este año, muestra el año" },
      { s: "[data-accion=cancelar]", label: "«No reservar» deja claro que anula la reserva, no que cierra la tarjeta" },
    ],
  },
  {
    nombre: "ux04-tarjeta", ruta: "/", accion: async (p) => { await pedirReserva(p); await decir(p, "Me llamo Lucía Gómez, lucia@correo.com"); },
    zona: [{ s: ".tarjeta" }], margen: 14,
    notas: [
      { s: ".tarjeta .etiqueta", label: "Avisa que todavía no está reservada: nada se da por hecho" },
      { t: "14:00", alerta: true, label: "Fechas sin año: en una reserva para dentro de meses, genera dudas" },
      { t: "Seña (30 %)", label: "Seña y total por separado, con la cantidad de noches" },
      { s: "[data-accion=confirmar]", en: "abajo", label: "Una sola acción principal, en el color de la marca" },
      { s: "[data-accion=cancelar]", alerta: true, label: "«Cancelar» no aclara si cierra la tarjeta o anula la reserva" },
    ],
  },
  {
    nombre: "ux05-panel-numeros", ruta: "/panel.html",
    zona: [{ s: "#kpis" }], margen: 14,
    notas: [
      { t: "pendiente", label: "Lo urgente primero: cuántas reservas faltan confirmar" },
      { t: "terminó en reserva", en: "abajo", label: "Mide si el asistente sirve: qué parte de las charlas termina en reserva" },
      { t: "respuestas corregidas", label: "Lo que el asistente no supo responder, a la vista de recepción" },
    ],
  },
  {
    nombre: "ux06-panel-reservas", ruta: "/panel.html",
    zona: [{ s: "#vista table" }], margen: 10,
    notas: [
      { s: ".estado", n: 0, en: "arriba", label: "El estado tiene texto además de color: se entiende igual sin distinguir colores" },
      { t: "Lucía Gómez", n: 2, alerta: true, label: "La misma huésped, con la misma habitación y las mismas fechas, tres veces: el sistema no avisa los duplicados" },
      { t: "Ver chat", exacto: true, n: 0, en: "arriba", label: "Desde cada reserva se abre la charla que la originó" },
    ],
  },
  {
    nombre: "ux07-correccion", ruta: "/panel.html",
    accion: async (p) => { await p.click('[data-vista="sinRespuesta"]'); await p.waitForTimeout(500); await p.click("[data-responder]"); await p.waitForTimeout(500); await p.fill('#dialogo textarea[name="respuesta"]', "No hacemos eventos: el salón es sólo para el desayuno. Para un brindis chico, consultá con recepción."); },
    zona: [{ s: "#dialogo" }], margen: 14,
    notas: [
      { s: "#dialogo .ayuda", label: "Explica qué pasa al guardar: la respuesta pasa a ser la oficial desde ese momento" },
      { s: '#dialogo textarea[name="respuesta"]', en: "centro", label: "Recepción escribe con sus palabras; no hay que tocar ninguna configuración" },
      { t: "Guardar corrección", label: "El botón dice exactamente lo que hace" },
    ],
  },
];

async function rect(page, nota) {
  const loc = nota.s ? page.locator(nota.s) : page.getByText(nota.t, { exact: Boolean(nota.exacto) });
  const el = nota.n === -1 ? loc.last() : loc.nth(nota.n ?? 0);
  const h = await el.elementHandle({ timeout: 4000 }).catch(() => null);
  if (!h) return null;
  return h.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; });
}

const ANCHO_IMAGEN = 620, ANCHO_ETIQUETA = 360;

async function componer(browser, png, clip, notas, file) {
  const k = Math.min(1.6, ANCHO_IMAGEN / clip.width);
  const pad = 40, imgW = clip.width * k, imgH = clip.height * k, lx = pad + imgW + 70;
  const W = Math.ceil(lx + ANCHO_ETIQUETA + pad);
  const pts = notas.map((n) => {
    const cx = n.x - clip.x, cy = n.y - clip.y;
    let tx = cx + n.w + 8, ty = cy + n.h / 2;
    if (n.en === "arriba") [tx, ty] = [cx + n.w / 2, cy - 8];
    if (n.en === "abajo") [tx, ty] = [cx + n.w / 2, cy + n.h + 8];
    if (n.en === "centro") [tx, ty] = [cx + n.w / 2, cy + n.h / 2];
    tx = pad + Math.max(4, Math.min(clip.width - 4, tx)) * k;
    ty = pad + Math.max(4, Math.min(clip.height - 4, ty)) * k;
    return { label: n.label, color: n.alerta ? AMBAR : VERDE, tx, ty };
  });
  pts.sort((a, b) => a.ty - b.ty).forEach((p, i) => (p.i = i + 1));
  console.log(pts.map((p) => `    ${p.i}. ${p.label}`).join("\n"));
  const page = await browser.newPage({ viewport: { width: W, height: 400 }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet"><style>
    body{margin:0;width:${W}px;background:linear-gradient(135deg,#E8FBF7,#EAF0F8);font-family:Inter,system-ui,sans-serif;position:relative}
    img{position:absolute;left:${pad}px;top:${pad}px;width:${imgW}px;border-radius:18px;box-shadow:0 20px 50px rgba(14,118,110,.28),0 0 0 1px rgba(45,212,191,.35)}
    .tag{position:absolute;left:${lx}px;width:${ANCHO_ETIQUETA}px;box-sizing:border-box;display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:20px;color:${TINTA};font-weight:600;font-size:22px;line-height:1.3;box-shadow:0 8px 20px rgba(14,18,32,.16)}
    .n{flex:none;width:32px;height:32px;border-radius:50%;background:${TINTA};display:grid;place-items:center;font-size:18px;font-weight:800}
    svg{position:absolute;left:0;top:0;overflow:visible}
  </style></head><body>
    <img src="data:image/png;base64,${png.toString("base64")}" />
    ${pts.map((p) => `<div class="tag" style="background:${p.color}"><span class="n" style="color:${p.color}">${p.i}</span><span>${p.label}</span></div>`).join("")}
    <svg id="flechas"></svg>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ pts, pad, imgH, lx }) => {
    const tags = [...document.querySelectorAll(".tag")];
    const orden = pts.map((p, i) => ({ ...p, el: tags[i] })).sort((a, b) => a.ty - b.ty);
    let piso = pad;
    for (const p of orden) {
      const h = p.el.offsetHeight;
      p.top = Math.max(piso, p.ty - h / 2);
      p.el.style.top = `${p.top}px`;
      p.sy = p.top + Math.min(h / 2, 30);
      piso = p.top + h + 16;
    }
    const H = Math.ceil(Math.max(pad * 2 + imgH, piso + pad - 16));
    document.body.style.height = `${H}px`;
    const svg = document.getElementById("flechas");
    svg.setAttribute("width", document.body.offsetWidth);
    svg.setAttribute("height", H);
    svg.innerHTML = orden.map((p) => {
      const sx = lx - 4, mx = (sx + p.tx) / 2;
      return `<path d="M${sx},${p.sy} C${mx},${p.sy} ${mx},${p.ty} ${p.tx},${p.ty}" stroke="${p.color}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="${p.tx}" cy="${p.ty}" r="9" fill="${p.color}" stroke="#0E1220" stroke-width="3"/>`;
    }).join("");
  }, { pts, pad, imgH, lx });
  const alto = await page.evaluate(() => document.body.offsetHeight);
  await page.setViewportSize({ width: W, height: alto });
  await page.screenshot({ path: file });
  await page.close();
}

const browser = await chromium.launch();
for (const cap of CAPTURAS) {
  if (SOLO && cap.nombre !== SOLO) continue;
  const page = await browser.newPage({ viewport: cap.viewport ?? ESCRITORIO, deviceScaleFactor: 2 });
  await page.goto(BASE + cap.ruta);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  if (cap.accion) { await cap.accion(page); await page.waitForTimeout(700); }
  if (!cap.sinBajar) await page.evaluate(() => { const m = document.querySelector("#mensajes"); if (m) m.scrollTop = m.scrollHeight; });
  const rs = [];
  for (const z of cap.zona) {
    const r = await rect(page, z);
    if (!r) throw new Error(`${cap.nombre}: no encontré la zona ${z.s ?? z.t}`);
    rs.push(r);
  }
  const m = cap.margen ?? 16;
  const x = Math.min(...rs.map((r) => r.x)) - m, y = Math.min(...rs.map((r) => r.y)) - m;
  const x2 = Math.max(...rs.map((r) => r.x + r.w)) + m, y2 = Math.max(...rs.map((r) => r.y + r.h)) + m;
  const clip = { x: Math.round(Math.max(0, x)), y: Math.round(Math.max(0, y)), width: Math.round(Math.min(cap.ancho ?? Infinity, x2 - x)), height: Math.round(y2 - y) };
  const notas = [];
  for (const n of cap.notas) {
    const r = await rect(page, n);
    if (r) notas.push({ ...n, ...r }); else console.warn("  sin elemento:", cap.nombre, n.label);
  }
  const png = await page.screenshot({ clip, fullPage: true });
  await componer(browser, png, clip, notas, join(OUT, `${cap.nombre}.png`));
  console.log("ok", cap.nombre, `${notas.length}/${cap.notas.length}`, `${clip.width}×${clip.height}`);
  await page.close();
}
await browser.close();
