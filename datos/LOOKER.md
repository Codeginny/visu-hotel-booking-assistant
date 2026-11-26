# Tablero en Looker Studio — demanda hotelera

Datos: `datos/powerbi/reservas.csv` (se genera con `python3 datos/limpiar.py`). En Looker Studio no hace falta `calendario.csv`: las fechas se agrupan solas.

## 1. Conectar los datos
1. lookerstudio.google.com → **Crear → Informe** → conector **Subir archivo** (File Upload) → subir `reservas.csv`.
2. En la lista de campos revisar tipos:
   - `fecha_llegada` → **Fecha (AAAA-MM-DD)**
   - `cancelada`, `day_use`, `huesped_repetido`, `cocheras`, `pedidos_especiales`, `noches`, `adultos`, `ninos`, `bebes` → **Número**, agregación **Suma**
   - `tarifa_diaria_eur`, `ingreso_eur` → **Moneda (EUR)**
   - `pais` → **País** (código ISO de 3 letras)
3. **Agregar al informe**.

## 2. Campos calculados
Recurso → **Administrar fuentes de datos → Editar → Agregar un campo**. Uno por uno:

| Nombre | Fórmula | Tipo |
|---|---|---|
| Reservas | `COUNT(id)` | Número |
| Tasa de cancelación | `AVG(cancelada)` | Porcentaje |
| Noches vendidas | `SUM(noches * (1 - cancelada))` | Número |
| Ingresos | `SUM(ingreso_eur)` | Moneda EUR |
| ADR | `SUM(ingreso_eur) / SUM(noches * (1 - cancelada))` | Moneda EUR |
| Ingresos perdidos | `SUM(tarifa_diaria_eur * noches * cancelada)` | Moneda EUR |
| % con pedidos especiales | `AVG(CASE WHEN pedidos_especiales > 0 THEN 1 ELSE 0 END)` | Porcentaje |
| % piden cochera | `AVG(CASE WHEN cocheras > 0 THEN 1 ELSE 0 END)` | Porcentaje |
| Orden anticipación | `CASE tramo_anticipacion WHEN "0-7 días" THEN 1 WHEN "8-30 días" THEN 2 WHEN "31-90 días" THEN 3 WHEN "91-180 días" THEN 4 ELSE 5 END` | Número |
| Mes | `MONTH(fecha_llegada)` | Número |

## 3. Tema con la marca
Tema y diseño → **Personalizar**:
- Fondo del informe `#0E1220`, fondo de componentes `#171C2E`, borde `#262C44` con radio 16.
- Texto `#F5F6FA`, tipografía **Inter** (Looker Studio la tiene).
- Paleta de gráficos: 1.º `#2DD4BF` (verde agua), 2.º `#9AA0B8` (gris), 3.º gris oscuro, 4.º `#0E766E` (verde profundo). Un solo acento: el verde agua va en el dato que importa.
- Tamaño de página: Diseño → **1400 × 900** (sirve directo para el portfolio y Behance).

## 4. Páginas

| Página | Pregunta | Gráficos |
|---|---|---|
| **1. Resumen** | ¿Cuánto se reserva, cuánto se cae y cuánto se pierde? | 4 cuadros de resultados: Reservas, Tasa de cancelación, ADR, Ingresos perdidos. Serie temporal de Reservas por `fecha_llegada` (mes). Control desplegable de `hotel`. |
| **2. Cancelaciones** | ¿Qué reservas se caen? | Columnas: Tasa de cancelación por `tramo_anticipacion`, ordenado por Orden anticipación ascendente. Barras: Tasa por `segmento`. Tabla con mapa de calor: `deposito` × `hotel`. |
| **3. Temporadas** | ¿Cuándo sube la tarifa? | Líneas: ADR por Mes con `hotel` como dimensión de desglose. Mapa geográfico: Reservas por `pais`. |
| **4. Huéspedes** | ¿Quién viaja y qué pide? | Anillo: Reservas por `tipo_grupo`. Barras: % con pedidos especiales por `tipo_grupo`. Cuadros: % piden cochera, Tasa de cancelación con filtro `pedidos_especiales > 0`. |
| **5. Del dato al asistente** | ¿Qué decidimos para Hotel Lumbre? | Cuadros de texto con las 4 decisiones de `docs/datos-a-producto.md`, cada una junto al gráfico que la justifica. |

## 5. Publicar
- **Compartir → Administrar acceso → Cualquier usuario con el vínculo puede ver.**
- **Archivo → Insertar informe** → copiar el `<iframe>` para la ficha del portfolio.
- Capturas: Archivo → Descargar → PDF, o captura por página a 1400 px.

## Informe publicado
- **Visu Hotel · Demanda hotelera**: https://datastudio.google.com/reporting/4f4146a0-a6cf-42f5-8284-30ed56d83c87
- Acceso: «Oculto» (cualquiera con el enlace puede ver, no aparece en búsquedas).
- Fuente de datos «Reservas de hoteles»: `reservas_parte1.csv` + `reservas_parte2.csv` (la extensión de Chrome sube hasta 10 MB por archivo).
- Nota: el orden por tramo de anticipación se resolvió ordenando por `anticipacion_dias` con agregación Mín. (el campo «Orden anticipacion» daba error).

## Fondos con conclusiones (rediseño)
Cada página tiene de fondo una imagen de 1200 × 900 (el tamaño del lienzo) con el título, la pregunta, las tarjetas y la conclusión de cada gráfico en una frase. Los gráficos van encima, dentro de su tarjeta.
- Se generan con `python3 datos/fondos/generar_fondos.py` → `datos/fondos/fondo_1.png` … `fondo_5.png`.
- En Data Studio: Insertar → Imagen → subir el PNG → posición 0,0 y tamaño 1200 × 900 → **Ctrl+Mayús+↓** (enviar al fondo).
- Para cambiar un fondo: seleccionar la imagen → Configuración → Archivo de imagen.
- Para mover con precisión: **Mayús + flechas** mueve de a 1 px (las flechas solas saltan a la grilla).
- Las cifras de la página 3 salen del ADR del gráfico (ingresos / noches: 50 € → 175 €), no del promedio simple de `hallazgos.md` (49 € → 181 €), para que el texto coincida con lo que se ve.
