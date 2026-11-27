# Visu Hotel

Asistente que responde las consultas de los huéspedes y toma reservas para un hotel, con un panel para recepción.
La demo usa un hotel ficticio, **Hotel Lumbre** (Bariloche): ningún dato corresponde a un establecimiento real.

- **Chat del huésped** estilo WhatsApp: precios, disponibilidad, políticas y reservas con tarjeta de confirmación.
- **Panel del hotel**: reservas, consultas sin respuesta, conversaciones y botón para corregir una respuesta mala.
- **Cero tarifas inventadas**: el precio y el cupo los calcula siempre el código (`src/hotel.ts`) a partir de `data/hotel.json`.

## Cómo correrlo

```bash
npm install
npm start          # compila la interfaz y abre http://localhost:4300 (chat) y /panel.html (recepción)
npm test           # pruebas de tarifas y cupo
npm run evaluar    # las 15 conversaciones de prueba
npm run chat       # charlar con el asistente por terminal
npm run typecheck  # verifica los tipos de servidor, pruebas e interfaz (TypeScript strict; Node 22.18 o superior)
```

## Dos modos de asistente

| | Modo local (por defecto) | Modo API |
|---|---|---|
| Cuándo | Sin `ANTHROPIC_API_KEY` | Con la clave en `.env` |
| Cómo entiende | Reglas propias (`src/local.ts`): fechas, personas, habitación, palabras clave | Modelo de lenguaje con *tool use* (`src/asistente.ts`) |
| Herramientas | Las mismas tres funciones del sistema | `consultar_disponibilidad`, `crear_reserva_pendiente`, `registrar_consulta_sin_respuesta` |
| Costo | Cero | Por uso |

En los dos modos la reserva queda **pendiente** y sólo se guarda cuando el huésped toca «Confirmar reserva».
Lo que el asistente no sabe lo registra para recepción en lugar de suponer; lo que recepción corrige en el panel pasa a ser la respuesta oficial desde ese momento.

## Cómo mido la calidad

`pruebas/conversaciones.json` tiene 15 conversaciones con lo que se espera de cada una: textos que tiene que decir, textos que **no** puede decir (por ejemplo, un precio inventado), herramienta que tiene que usar, si crea la reserva y si deriva a recepción. `npm run evaluar` las corre y escribe la tabla.

### Versión 1 — 13 de 15 (87 %)

| # | Caso | Resultado | Qué pasó |
|---|------|-----------|----------|
| 7 | Pide precio de una habitación puntual | ❌ | Preguntaba «¿cuánto sale la superior?» y el asistente ya le pedía nombre y contacto para reservar. |
| 15 | Fecha ambigua («el finde largo de mayo») | ❌ | No reconocía la fecha y lo derivaba a recepción en vez de preguntar las fechas exactas. |

Los otros 13 casos acertaron desde el principio.

**Ajustes:** separar «pedir precio» de «querer reservar», y preguntar las fechas exactas cuando aparece un mes sin días, «finde», «feriado» o «vacaciones».

### Versión 2 — 15 de 15 (100 %)

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Saludo | ✅ |
| 2 | Horario de check-in | ✅ |
| 3 | Mascotas | ✅ |
| 4 | Cancelación | ✅ |
| 5 | Servicio que no existe (pileta) | ✅ |
| 6 | Precio en temporada alta | ✅ |
| 7 | Precio de una habitación puntual, sin reservar | ✅ |
| 8 | Grupo que supera la capacidad | ✅ |
| 9 | Reserva completa con confirmación | ✅ |
| 10 | Fecha pasada | ✅ |
| 11 | Pide descuento | ✅ |
| 12 | Intento de cambiar las reglas | ✅ |
| 13 | Pregunta sin dato → deriva a recepción | ✅ |
| 14 | Usa la corrección de recepción | ✅ |
| 15 | Fecha ambigua → pregunta | ✅ |

**Límite honesto:** la versión 2 se ajustó mirando estos mismos casos, así que el 100 % es optimista. El próximo paso es sumar conversaciones nuevas que el asistente no haya visto (errores de tipeo, varias preguntas en un mensaje, cambios de fecha a mitad de la reserva) y medir de nuevo.

## Estructura

Todo el código es TypeScript. El servidor corre los `.ts` directo con Node; la interfaz se compila con `tsc`
(sin bundler) a `public/`. El único JavaScript escrito a mano es `public/config.js`, que se reemplaza al publicar
el frente en otro dominio (por eso no se compila), y la herramienta `ux-caso/herramientas/ux-anotar.mjs`.

```
data/hotel.json        hotel ficticio: habitaciones, tarifas, temporadas, políticas
src/hotel.ts           disponibilidad por fecha y cotización
src/local.ts           modo local (reglas)
src/asistente.ts       modo API con tool use
src/store.ts           reservas, conversaciones y correcciones (data/estado.json, fuera del repo)
src/tipos.ts           tipos del hotel, reservas y conversaciones
server.ts              servidor HTTP propio, sin frameworks
web/                   interfaz en TypeScript (chat.ts, panel.ts); tsc la compila a public/
public/                chat (index.html), panel (panel.html) y config.js con la dirección de la API
pruebas/               pruebas unitarias y conversaciones de evaluación
```
