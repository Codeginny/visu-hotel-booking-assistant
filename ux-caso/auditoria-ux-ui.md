# Análisis UX/UI de Visu Hotel

**Qué revisé:** el chat del huésped (inicio, pedido de precio, reserva y tarjeta de confirmación) y el panel de recepción (números, reservas y corrección de respuestas), en la demo con el asistente en modo local.
**Cómo:** recorrí las tres tareas clave con datos de prueba. El huésped pregunta algo, pide precio y reserva. Recepción revisa las reservas y corrige una respuesta. Lo miré con las 10 heurísticas de Nielsen y con WCAG 2.2 AA. Es una revisión mía: todavía no hay test con usuarios.
**Etiquetas de las capturas:** verde agua = algo que funciona, ámbar = algo para mejorar.
**Gravedad:** 1 cosmético · 2 menor · 3 mayor · 4 bloquea la tarea.

## Resumen
- **8 oportunidades de mejora:** 2 de gravedad 3, 4 de gravedad 2 y 2 de gravedad 1. Ninguna bloquea la reserva.
- **Lo que funciona:** el asistente se presenta y propone preguntas para arrancar. Muestra cuándo consultó el sistema, así queda claro que el precio no lo inventa. La reserva queda pendiente y se ve en una tarjeta con seña y total. El panel pone primero lo urgente, y recepción corrige una respuesta con sus palabras, sin tocar ninguna configuración.
- **Lo que más pesaba:** el asistente no entendía el nombre si no venía con «me llamo…», y el sistema dejaba crear la misma reserva varias veces. **Las 8 mejoras ya están hechas** (ver «Cambios hechos»).

## Capturas anotadas
| Captura | Qué muestra |
|---|---|
| `capturas/ux01-inicio-chat.png` | Primer contacto: presentación, sugerencias y el botón ↻ |
| `capturas/ux02-precios.png` | Respuesta con los precios de las cuatro habitaciones |
| `capturas/ux03-nombre.png` | El asistente vuelve a pedir el nombre que ya le dieron |
| `capturas/ux04-tarjeta.png` | Tarjeta de reserva pendiente |
| `capturas/ux05-panel-numeros.png` | Números del panel de recepción |
| `capturas/ux06-panel-reservas.png` | Lista de reservas con duplicados |
| `capturas/ux07-correccion.png` | Diálogo para corregir una respuesta |
| `capturas/ux03b-nombre-despues.png` | Después: el nombre se entiende sin «me llamo» |
| `capturas/ux03c-repetida-despues.png` | Después: si la reserva ya existe, no crea otra |
| `capturas/ux01b-inicio-despues.png` | Después: botón «Nueva charla» con texto |
| `capturas/ux02b-precios-despues.png` | Después: una tarjeta por habitación y aviso del sistema legible |
| `capturas/ux04b-tarjeta-despues.png` | Después: fechas con año y botón «No reservar» |

Se regeneran con `node ux-caso/herramientas/ux-anotar.mjs` (instrucciones en el encabezado del script).

## Oportunidades de mejora priorizadas

| # | Pantalla | Hallazgo | Heurística | Grav. | Propuesta |
|---|---|---|---|---|---|
| 1 | Chat · reserva | Si la huésped escribe «Lucía Gómez, lucia@correo.com», el asistente no reconoce el nombre y se lo vuelve a pedir con un formato fijo («me llamo Ana Pérez»). Es la parte de la charla donde más gente abandona. | Prevención de errores / control del usuario | 3 | Reconocer el nombre en cualquier formato (lo que hay antes del mail o del teléfono) y, si hay dudas, confirmar: «¿La dejo a nombre de Lucía Gómez?» |
| 2 | Panel · reservas | La misma huésped puede dejar varias reservas iguales (misma habitación y mismas fechas), y todas bloquean cupo. | Prevención de errores | 3 | Si ya hay una pendiente igual, reutilizarla y avisarlo en el chat. En el panel, marcar los posibles duplicados |
| 3 | Chat · precios | Las cuatro habitaciones, con total y seña, llegan en un mismo bloque de texto. Para comparar hay que leer todo. | Estética y diseño minimalista | 2 | Una tarjeta chica por habitación, con el total destacado y un botón «Reservar esta» |
| 4 | Chat · tarjeta | «Cancelar» puede leerse como cerrar la tarjeta, pero anula la reserva. | Coincidencia con el mundo real | 2 | «No reservar» o «Descartar», y que el chat ofrezca otras fechas |
| 5 | Chat · tarjeta | Las fechas no muestran el año («sáb, 10 jul»). En reservas para dentro de varios meses genera dudas. | Visibilidad del estado | 2 | Mostrar el año cuando la fecha no es del año en curso |
| 6 | Chat · cabecera | El ↻ borra toda la conversación y es sólo un ícono, sin confirmación. | Control y libertad del usuario | 2 | Texto «Nueva charla» y confirmación si hay una reserva pendiente |
| 7 | Chat · campos | El borde del campo de texto y de las tarjetas mide 1,2:1 contra la superficie. Con brillo bajo, el campo casi no se ve. | Accesibilidad (WCAG 1.4.11) | 1 | Borde de 3:1 como mínimo en el campo de texto |
| 8 | Chat · uso de herramientas | El aviso «consultó disponibilidad» mide 11 px. Es lo que da confianza y pasa desapercibido. | Visibilidad del estado | 1 | 13 px y un ícono más claro |

## Cambios hechos
| # | Qué cambió | Dónde | Cómo se comprobó |
|---|---|---|---|
| 1 | El nombre se reconoce aunque venga solo o junto al mail o al teléfono («Lucía Gómez, lucia@correo.com»). Las respuestas cortas («dale», «sí») no se toman como nombre. | `src/local.js` (`nombreSuelto`) | `pruebas/reserva.test.js` (3 pruebas) y la captura `ux03b` |
| 2 | Antes de crear una reserva se busca una igual (misma habitación, mismas fechas y mismo contacto o nombre). Si existe, se vuelve a mostrar con su estado real en vez de crear otra. Funciona en los dos modos del asistente. | `src/store.js` (`buscarDuplicada`), `src/local.js`, `src/asistente.js`, `public/chat.js` | `pruebas/reserva.test.js` (2 pruebas) y la captura `ux03c` |
| 3 | Los precios llegan como una tarjeta por habitación (nombre, total, noches y seña) con un botón «Reservar esta». El texto completo se sigue guardando en la conversación. | `src/local.js`, `src/asistente.js`, `public/chat.js`, `public/estilos.css` | Probado con las 4 habitaciones; captura `ux02b` |
| 4 | «Cancelar» pasó a «No reservar». | `public/chat.js` | Captura `ux04b` |
| 5 | Las fechas muestran el año cuando no es el corriente («sáb, 10 jul 2027»). | `public/chat.js` | Captura `ux04b` |
| 6 | El ↻ es ahora un botón «↻ Nueva charla» y, si hay una reserva sin confirmar, pregunta antes de empezar de cero. | `public/index.html`, `public/chat.js` | Captura `ux01b` |
| 7 | El borde del campo de texto pasó a `#6B7290`: 3,9:1 contra el fondo del campo (antes 1,4:1). | `public/estilos.css` | Medido |
| 8 | El aviso «consultó disponibilidad» pasó a 13 px, en verde agua y con fondo suave. | `public/estilos.css` | Captura `ux02b` |

## Prueba en celular (390 × 844)
Recorrí la reserva completa en 390 px: no hay scroll horizontal y las tarjetas de habitación y de reserva entran enteras (329 px). Aparecieron tres detalles y quedaron corregidos en `public/index.html` y `public/estilos.css`:

| Qué pasaba | Qué cambió |
|---|---|
| El chat empezaba a 653 px: había que bajar para encontrarlo | Botón «Probar el chat ↓», sólo en pantallas chicas, que lleva al chat |
| El campo de texto medía 15 px, y en iPhone eso hace zoom al tocarlo | 16 px en celular |
| «Confirmar reserva» se partía en dos líneas (botón de 65 px de alto) | Una línea, 42 px de alto |

Después de los cambios: 11 de 11 pruebas pasan y las 15 conversaciones de evaluación siguen en 15 de 15.

## Contrastes medidos (`public/estilos.css`)
| Par | Contraste | AA |
|---|---|---|
| Tinta sobre verde agua (botones, burbuja del huésped) | 10,0:1 | Pasa |
| Verde agua sobre superficie (textos de acento) | 9,1:1 | Pasa |
| Texto suave sobre superficie | 6,5:1 | Pasa |
| Ámbar sobre tinta (estado pendiente) | 10,3:1 | Pasa |
| Verde de éxito sobre tinta (confirmada) | 9,7:1 | Pasa |
| Borde del campo de texto, antes | 1,2:1 | **No pasaba** (3:1 para controles) |
| Borde del campo de texto, ahora (`#6B7290` sobre tinta) | 3,9:1 | Pasa |

## Qué falta
- Probarlo en un teléfono real (la prueba fue con el navegador emulando 390 px).
- Hacer un test con 5 personas sobre las tres tareas, para confirmar o descartar estos hallazgos.
- Pasar a Figma las pantallas reales, el antes y el después.
