# Del dato al producto

Qué decidí para Visu Hotel a partir de 119.208 reservas reales de dos hoteles (Hotel Booking Demand, 2015–2017).
Los números completos están en `datos/hallazgos.md`.

| Hallazgo | Decisión en el producto |
|---|---|
| **La cancelación crece con la anticipación:** 9,6 % en reservas de última semana, 57 % en las hechas con más de 180 días. | La reserva no se da por hecha con el chat: queda **pendiente** hasta que el huésped confirma, y la política pide **seña del 30 %**. En el panel, las reservas lejanas deberían marcarse como de mayor riesgo (próxima versión). |
| **El canal directo cancela mucho menos:** 15,4 % contra 36,8 % de las agencias online y 61,1 % de grupos. | Es el argumento de negocio del asistente: atender rápido por chat lleva al huésped a **reservar directo**, el canal que más se sostiene y que no paga comisión. |
| **Las familias y los grupos piden más:** 58 % de las reservas con niños tiene pedidos especiales, contra 42 % de las parejas. Además, quien hace un pedido cancela menos (21,8 % contra 47,8 %). | El asistente **toma pedidos especiales** (cuna, mascota) dentro de la reserva, y la política de niños y cunas está en los datos del hotel. Hay que sumar más casos de prueba con familias. |
| **La tarifa del hotel de destino sube fuerte en temporada:** el resort pasa de 49 € en enero a 181 € en agosto (×3,7). | Las tarifas de Hotel Lumbre tienen **recargos por temporada** calculados por el sistema, y el asistente nunca dice un precio sin consultarlo. Es la parte donde un modelo que inventa haría más daño. |

## Aclaraciones honestas
- El dataset es de dos hoteles de Portugal y en euros; Hotel Lumbre es ficticio y está en pesos. Uso los datos para **patrones de comportamiento**, no para fijar precios.
- La cancelación del 99 % con depósito «No reembolsable» es una rareza del dataset: son 14.586 reservas, 88 % del hotel de ciudad y 63 % de grupos, y probablemente reflejan cómo ese hotel registraba los bloqueos de grupos. No saco conclusiones de esa fila.
