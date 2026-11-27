// Pruebas del flujo de reserva en modo local: nombre sin «me llamo» y reservas repetidas.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ESTADO = join(mkdtempSync(join(tmpdir(), "visu-")), "estado.json");
const { store } = await import("../src/store.ts");
const { responderLocal } = await import("../src/local.ts");

const charla = (...mensajes) => {
  const conv = store.conversacion();
  return mensajes.map((m) => responderLocal(conv, m)).at(-1);
};
const hastaDatos = ["Precio del 10 al 13 de julio de 2027 para 2", "Quiero reservar la superior"];

beforeEach(() => store.reiniciar());

test("toma el nombre aunque venga sin «me llamo», junto al mail", () => {
  const r = charla(...hastaDatos, "Lucía Gómez, lucia@correo.com");
  assert.equal(r.reserva?.nombre, "Lucía Gómez");
  assert.equal(r.reserva?.contacto, "lucia@correo.com");
});

test("toma el nombre en un mensaje y el contacto en otro", () => {
  const conv = store.conversacion();
  [...hastaDatos, "martín díaz"].forEach((m) => responderLocal(conv, m));
  const r = responderLocal(conv, "mi mail es martin@correo.com");
  assert.equal(r.reserva?.nombre, "Martín Díaz");
});

test("no confunde una respuesta corta con un nombre", () => {
  const conv = store.conversacion();
  hastaDatos.forEach((m) => responderLocal(conv, m));
  responderLocal(conv, "dale");
  assert.equal(conv.datos.nombre, undefined);
});

test("no crea dos veces la misma reserva", () => {
  const primera = charla(...hastaDatos, "Me llamo Lucía Gómez, lucia@correo.com").reserva;
  const segunda = charla(...hastaDatos, "Lucía Gómez, lucia@correo.com");
  assert.equal(segunda.reserva.id, primera.id);
  assert.match(segunda.respuesta, /ya la tenías/);
  assert.equal(store.estado.reservas.length, 1);
});

test("otra persona en las mismas fechas sí puede reservar", () => {
  charla(...hastaDatos, "Me llamo Lucía Gómez, lucia@correo.com");
  charla(...hastaDatos, "Me llamo Sofía Ruiz, sofia@correo.com");
  assert.equal(store.estado.reservas.length, 2);
});
