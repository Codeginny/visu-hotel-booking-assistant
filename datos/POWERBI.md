# Tablero de Power BI — demanda hotelera

Datos: `datos/powerbi/reservas.csv` (119.208 reservas, una fila por reserva) y `datos/powerbi/calendario.csv`.
Se regeneran con `python3 datos/limpiar.py` (si falta el CSV original, lo descarga).

## 1. Importar

1. **Obtener datos → Texto/CSV** → `reservas.csv`. En **Transformar datos**, configuración regional del archivo: **Inglés (Estados Unidos)**, porque las tarifas usan punto decimal.
2. Revisar tipos: `fecha_llegada` → Fecha; `tarifa_diaria_eur` e `ingreso_eur` → Número decimal; `cancelada`, `day_use`, `huesped_repetido` → Número entero.
3. Lo mismo con `calendario.csv`. Marcarla como **tabla de fechas** (columna `fecha`).
4. Relación: `calendario[fecha]` 1 → * `reservas[fecha_llegada]`.
5. Ordenar `calendario[mes]` por `mes_num`; `reservas[tramo_anticipacion]` con una columna de orden (0-7 = 1 … Más de 180 = 5).

## 2. Medidas (tabla `Medidas`)

```DAX
Reservas = COUNTROWS(reservas)
Canceladas = CALCULATE([Reservas], reservas[cancelada] = 1)
Tasa de cancelación = DIVIDE([Canceladas], [Reservas])
Alojadas = CALCULATE([Reservas], reservas[cancelada] = 0)
Noches vendidas = CALCULATE(SUM(reservas[noches]), reservas[cancelada] = 0)
Ingresos (€) = SUM(reservas[ingreso_eur])
ADR (€) = DIVIDE([Ingresos (€)], [Noches vendidas])
Ingresos perdidos por cancelación (€) =
    SUMX(FILTER(reservas, reservas[cancelada] = 1), reservas[tarifa_diaria_eur] * reservas[noches])
% con pedidos especiales = DIVIDE(CALCULATE([Reservas], reservas[pedidos_especiales] > 0), [Reservas])
% piden cochera = DIVIDE(CALCULATE([Reservas], reservas[cocheras] > 0), [Reservas])
Anticipación mediana = MEDIAN(reservas[anticipacion_dias])
Estadía promedio = AVERAGEX(FILTER(reservas, reservas[noches] > 0), reservas[noches])
```

## 3. Páginas

Colores de la marca Visu Hotel: fondo `#0E1220`, tarjetas `#171C2E`, acento coral `#FF6B4A`, éxito `#2BD49A`, texto `#F5F6FA`. Tipografía Segoe UI (Power BI no carga Sora). Un solo acento: el coral marca el dato que importa, el resto en gris `#9AA0B8`.

| Página | Pregunta | Visuales |
|---|---|---|
| **1. Resumen** | ¿Cuánto se reserva, cuánto se cae y cuánto se pierde? | Tarjetas: Reservas, Tasa de cancelación, ADR, Ingresos perdidos. Línea de reservas por mes. Segmentador por hotel. |
| **2. Cancelaciones** | ¿Qué reservas se caen? | Columnas: tasa por tramo de anticipación (coral en «Más de 180 días»). Barras: tasa por segmento. Matriz depósito × hotel. |
| **3. Temporadas** | ¿Cuándo sube la tarifa? | Línea ADR por mes, una serie por hotel. Mapa de calor (matriz con formato condicional) mes × día de la semana con reservas. |
| **4. Huéspedes** | ¿Quién viaja y qué pide? | Anillo por tipo de grupo. Barras de % con pedidos especiales por tipo de grupo. Tarjetas: % cochera, estadía promedio. |
| **5. Del dato al asistente** | ¿Qué decidimos para Hotel Lumbre? | Cuadro de texto con las 4 decisiones de `docs/datos-a-producto.md`, cada una al lado del visual que la justifica. |

## 4. Exportar para el portfolio

Archivo → Exportar → PDF, y capturas de cada página a 1400 px de ancho. Guardar el `.pbix` en `datos/visu-hotel-demanda.pbix`.
Si no hay Power BI Desktop (sólo existe para Windows): app.powerbi.com con cuenta de trabajo o educativa permite subir los CSV y armar el mismo informe en el navegador.
