// .env mínimo sin dependencias (mismo enfoque que Visuali). Se importa antes que todo lo demás.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const archivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (fs.existsSync(archivo)) {
  for (const linea of fs.readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
