// Charla con el asistente por terminal: node cli.js
import "./src/env.js";
import readline from "node:readline/promises";
import { responder } from "./src/asistente.js";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let conversacion = null;
console.log("Hotel Lumbre · escribí tu consulta (salir para terminar)\n");
for (;;) {
  const texto = (await rl.question("Vos: ")).trim();
  if (!texto || texto === "salir") break;
  const r = await responder(conversacion, texto);
  conversacion = r.conversacion;
  for (const h of r.herramientas) console.log(`  · ${h.nombre} ${JSON.stringify(h.entrada)}${h.ok ? "" : " (error)"}`);
  console.log(`Hotel: ${r.respuesta}\n`);
  if (r.reserva) console.log(`  [Reserva ${r.reserva.id} pendiente · $ ${r.reserva.total.toLocaleString("es-AR")}]\n`);
}
rl.close();
