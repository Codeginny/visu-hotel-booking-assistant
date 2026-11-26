// Pruebas de la lógica de tarifas y cupo (no usan la API del asistente).
import { test } from "node:test";
import assert from "node:assert/strict";
import { cotizar, disponibilidad, noches } from "../src/hotel.js";

test("cuenta noches sin incluir el día de salida", () => {
  assert.deepEqual(noches("2027-04-10", "2027-04-12"), ["2027-04-10", "2027-04-11"]);
});

test("temporada baja usa la tarifa base", () => {
  assert.equal(cotizar("std", "2027-04-10", "2027-04-12").total, 196000);
});

test("aplica recargo de invierno y temporada que cruza el año", () => {
  assert.equal(cotizar("std", "2027-07-10", "2027-07-11").total, 132300);
  assert.equal(cotizar("std", "2027-01-05", "2027-01-06").total, 117600);
});

test("descuenta cupo con reservas que se superponen", () => {
  const reservas = Array.from({ length: 2 }, () => ({ habitacion: "suite", estado: "pendiente", ingreso: "2027-04-10", egreso: "2027-04-12" }));
  const suite = disponibilidad(reservas, { ingreso: "2027-04-11", egreso: "2027-04-13", huespedes: 2 }).opciones.find((o) => o.habitacion === "suite");
  assert.equal(suite.disponible, false);
});

test("respeta la capacidad", () => {
  const std = disponibilidad([], { ingreso: "2027-04-10", egreso: "2027-04-12", huespedes: 3 }).opciones.find((o) => o.habitacion === "std");
  assert.equal(std.disponible, false);
});

test("rechaza fechas pasadas o invertidas", () => {
  assert.ok(disponibilidad([], { ingreso: "2020-01-01", egreso: "2020-01-02" }).error);
  assert.ok(disponibilidad([], { ingreso: "2027-04-12", egreso: "2027-04-10" }).error);
});
