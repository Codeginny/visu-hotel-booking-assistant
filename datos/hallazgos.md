# Hallazgos del dataset Hotel Booking Demand

119.390 reservas originales → 119.208 limpias (2015-07-01 a 2017-08-31).

## Limpieza

| Regla | Filas |
|---|---|
| Reservas sin huéspedes (0 adultos, niños y bebés) | 180 |
| Tarifa diaria negativa o mayor a 1.000 € | 2 |
| Reservas de 0 noches (day use), se marcan pero no se borran | 645 |

## 1. Cancelación según anticipación

| Anticipación | Reservas | Cancelación |
|---|---|---|
| 0-7 días | 19.635 | 9,6 % |
| 8-30 días | 18.945 | 27,9 % |
| 31-90 días | 29.528 | 37,7 % |
| 91-180 días | 26.420 | 44,7 % |
| Más de 180 días | 24.680 | 57,0 % |

## 2. Cancelación según depósito y canal

| Depósito | Cancelación |
|---|---|
| Reembolsable | 22,2 % |
| Sin depósito | 28,4 % |
| No reembolsable | 99,4 % |

| Segmento | Reservas | Cancelación |
|---|---|---|
| Agencia online | 56.408 | 36,8 % |
| Agencia / operador | 24.181 | 34,3 % |
| Grupos | 19.790 | 61,1 % |
| Directo | 12.582 | 15,4 % |
| Corporativo | 5.282 | 18,8 % |

## 3. Tarifa diaria promedio por mes (reservas que se alojaron)

| Mes | Resort | Ciudad |
|---|---|---|
| ene | 49 € | 82 € |
| feb | 54 € | 87 € |
| mar | 57 € | 91 € |
| abr | 76 € | 112 € |
| may | 77 € | 121 € |
| jun | 108 € | 118 € |
| jul | 150 € | 116 € |
| ago | 181 € | 119 € |
| sep | 96 € | 113 € |
| oct | 62 € | 102 € |
| nov | 49 € | 87 € |
| dic | 68 € | 88 € |

## 4. Quiénes viajan y qué piden

| Tipo de grupo | Reservas | Con pedidos especiales |
|---|---|---|
| Pareja / dos adultos | 81.558 | 42,4 % |
| Solo | 22.577 | 25,2 % |
| Familia con niños | 9.332 | 58,4 % |
| Grupo de adultos | 5.741 | 57,6 % |

- Piden cochera: 6,2 % de las reservas.
- Al menos un pedido especial: 41,1 %.
- Cancelación con pedidos especiales: 21,8 % vs. sin pedidos: 47,8 %.
- Estadía promedio: 3,4 noches; anticipación mediana: 69 días.
