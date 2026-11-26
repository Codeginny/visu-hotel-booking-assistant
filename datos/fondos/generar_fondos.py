"""Fondos de las 5 páginas del tablero de Data Studio (lienzo de 1200 × 900).

Cada fondo trae el título, la pregunta, las tarjetas donde van los gráficos
y la conclusión de cada gráfico en una frase. Se exportan al doble de tamaño
para que se vean nítidos.

Uso: python3 datos/fondos/generar_fondos.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = Path(__file__).parent
E = 2  # escala de exportación
W, H = 1200, 900

TINTA, SUPERFICIE, BORDE = "#0E1220", "#171C2E", "#262C44"
ACENTO, ACENTO_OSC, TEXTO, GRIS, EXITO = "#2DD4BF", "#0E766E", "#F5F6FA", "#9AA0B8", "#F5B544"
FUENTES = "/usr/share/fonts/truetype/noto/"


def f(tam, negrita=False):
    return ImageFont.truetype(FUENTES + ("NotoSans-Bold.ttf" if negrita else "NotoSans-Regular.ttf"), tam * E)


def s(*v):
    return [x * E for x in v]


def lienzo():
    img = Image.new("RGB", (W * E, H * E), TINTA)
    # resplandor verde agua arriba a la derecha y uno gris abajo a la izquierda
    luz = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(luz)
    d.ellipse(s(820, -260, 1460, 300), fill=(45, 212, 191, 70))
    d.ellipse(s(-300, 640, 260, 1160), fill=(154, 160, 184, 28))
    luz = luz.filter(ImageFilter.GaussianBlur(120 * E))
    img.paste(luz, (0, 0), luz)
    # grilla de puntos sutil
    d = ImageDraw.Draw(img)
    for x in range(20, W, 28):
        for y in range(20, H, 28):
            d.ellipse(s(x - .8, y - .8, x + .8, y + .8), fill="#1A2034")
    return img


def llave(d, x, y, t=34):
    """Logo: llave verde agua sobre cuadrado tinta, como public/logo.svg."""
    k = t / 64
    d.rounded_rectangle(s(x, y, x + t, y + t), radius=18 * k * E, fill="#171C2E", outline=BORDE, width=E)
    a = 7.5 * k * E
    cx, cy, r = x + 21.5 * k, y + 21.5 * k, 9.5 * k
    d.ellipse(s(cx - r, cy - r, cx + r, cy + r), outline=ACENTO, width=round(a))
    for (x1, y1, x2, y2) in [(28.5, 28.5, 51, 51), (42, 42, 48, 36), (50.5, 50.5, 55, 46)]:
        d.line(s(x + x1 * k, y + y1 * k, x + x2 * k, y + y2 * k), fill=ACENTO, width=round(a))


def ajustar(d, texto, fuente, ancho):
    lineas, actual = [], ""
    for p in texto.split():
        prueba = (actual + " " + p).strip()
        if d.textlength(prueba, font=fuente) <= ancho * E:
            actual = prueba
        else:
            lineas.append(actual)
            actual = p
    return lineas + [actual]


def parrafo(d, x, y, texto, fuente, color, ancho, interlinea):
    for i, l in enumerate(ajustar(d, texto, fuente, ancho)):
        d.text(s(x, y + i * interlinea), l, font=fuente, fill=color)
    return y + len(ajustar(d, texto, fuente, ancho)) * interlinea


def encabezado(d, num, seccion, pregunta, bajada):
    llave(d, 40, 34)
    d.text(s(88, 34), f"VISU HOTEL  ·  DEMANDA HOTELERA", font=f(11, True), fill=GRIS)
    d.text(s(88, 52), f"{num:02d}  ·  {seccion.upper()}", font=f(11, True), fill=ACENTO)
    d.text(s(40, 80), pregunta, font=f(28, True), fill=TEXTO)
    d.text(s(40, 122), bajada, font=f(14), fill=GRIS)
    # paginador
    for i in range(5):
        x = 1040 + i * 26
        d.rounded_rectangle(s(x, 42, x + 18, 48), radius=3 * E, fill=ACENTO if i + 1 == num else BORDE)


def pie(d):
    d.text(s(40, 872), "Fuente: Hotel Booking Demand (Antonio, Almeida y Nunes, 2019) · 119.208 reservas de dos hoteles de Portugal, jul 2015 – ago 2017",
           font=f(10), fill="#5C6380")


def tarjeta(d, x1, y1, x2, y2, acento=False):
    d.rounded_rectangle(s(x1, y1, x2, y2), radius=18 * E, fill=SUPERFICIE, outline=ACENTO_OSC if acento else BORDE, width=E)


def hallazgo(d, x, y, titulo, detalle, ancho):
    """Etiqueta verde agua + conclusión en una frase + cómo leer el gráfico."""
    d.rounded_rectangle(s(x, y, x + 78, y + 20), radius=10 * E, fill="#0F3B3A")
    d.text(s(x + 10, y + 3), "HALLAZGO", font=f(10, True), fill=ACENTO)
    y = parrafo(d, x, y + 30, titulo, f(18, True), TEXTO, ancho, 25)
    return parrafo(d, x, y + 4, detalle, f(12), GRIS, ancho, 17)


def pagina1():
    img = lienzo(); d = ImageDraw.Draw(img)
    encabezado(d, 1, "Resumen", "¿Cuánto se reserva, cuánto se cae y cuánto se pierde?",
               "Dos hoteles reales —un resort de playa y un hotel de ciudad— como base para diseñar el asistente de Hotel Lumbre.")
    notas = ["reservas en dos años", "más de 1 de cada 3 se cancela", "tarifa promedio por noche ocupada", "tarifa que no se cobró por cancelaciones"]
    for i, n in enumerate(notas):
        x = 40 + i * 285
        tarjeta(d, x, 160, x + 265, 290, acento=i in (1, 3))
        d.text(s(x + 20, 258), n, font=f(12), fill=ACENTO if i in (1, 3) else GRIS)
    tarjeta(d, 40, 310, 1160, 860)
    hallazgo(d, 64, 330, "La demanda es estacional: cada verano europeo las reservas suben y en invierno caen a la mitad.",
             "Reservas por mes de llegada. Para un hotel en Bariloche pasa lo mismo con el invierno: por eso los precios por temporada los calcula el sistema.", 1060)
    pie(d); return img


def pagina2():
    img = lienzo(); d = ImageDraw.Draw(img)
    encabezado(d, 2, "Cancelaciones", "¿Qué reservas se caen?",
               "Tasa de cancelación según cuánto antes se reservó y por qué canal llegó la reserva.")
    tarjeta(d, 40, 160, 590, 860, acento=True)
    hallazgo(d, 64, 180, "Cuanto antes se reserva, más se cancela.",
             "9,6 % en la última semana contra 57 % con más de 6 meses. Por eso la reserva del asistente queda pendiente hasta que el huésped confirma y pide seña del 30 %.", 500)
    tarjeta(d, 610, 160, 1160, 860)
    hallazgo(d, 634, 180, "El canal directo es el que menos cancela.",
             "15 % contra 37 % de las agencias online y 61 % de los grupos. Responder rápido por chat lleva al huésped a reservar directo, sin comisión.", 500)
    pie(d); return img


def pagina3():
    img = lienzo(); d = ImageDraw.Draw(img)
    encabezado(d, 3, "Temporadas", "¿Cuándo sube la tarifa?",
               "Tarifa diaria promedio (ADR) de las reservas que se alojaron, por mes de llegada.")
    tarjeta(d, 40, 160, 1160, 860)
    hallazgo(d, 64, 180, "El resort multiplica su tarifa por 3,5 en verano: de 50 € en enero a 175 € en agosto.",
             "El hotel de ciudad se mantiene entre 85 € y 122 € todo el año. Un asistente que inventara precios fallaría justo en temporada alta: por eso nunca dice un precio sin consultarlo.", 1060)
    pie(d); return img


def pagina4():
    img = lienzo(); d = ImageDraw.Draw(img)
    encabezado(d, 4, "Huéspedes", "¿Quién viaja y qué pide?",
               "Tipo de grupo según adultos, niños y bebés de cada reserva, y cuántos hacen pedidos especiales (cuna, piso alto, etc.).")
    tarjeta(d, 40, 160, 590, 760)
    hallazgo(d, 64, 180, "Casi 7 de cada 10 reservas son de parejas o dos adultos.",
             "Sólo el 8 % viaja con niños, pero son las reservas que más piden.", 500)
    tarjeta(d, 610, 160, 1160, 760, acento=True)
    hallazgo(d, 634, 180, "Las familias piden más: 58 % hace un pedido especial, contra 42 % de las parejas.",
             "Por eso el asistente toma pedidos (cuna, mascota) dentro de la reserva.", 500)
    tarjeta(d, 40, 780, 1160, 856)
    d.text(s(64, 796), "Y QUIEN PIDE, SE QUEDA", font=f(10, True), fill=EXITO)
    d.text(s(64, 814), "Las reservas con algún pedido especial cancelan 21,8 % contra 47,8 % de las que no piden nada.", font=f(16, True), fill=TEXTO)
    pie(d); return img


def pagina5():
    img = lienzo(); d = ImageDraw.Draw(img)
    encabezado(d, 5, "Del dato al asistente", "¿Qué decidimos para Hotel Lumbre?",
               "Cada hallazgo del tablero se convirtió en una regla del producto.")
    filas = [
        ("57 %", "de cancelación en reservas hechas con más de 6 meses", "La reserva queda pendiente hasta que el huésped confirma, con seña del 30 %."),
        ("15 %", "cancela el canal directo, contra 37 % de las agencias online", "El chat responde al instante para que el huésped reserve directo, sin comisión."),
        ("58 %", "de las familias hace pedidos especiales", "El asistente toma pedidos (cuna, mascota) dentro de la reserva."),
        ("× 3,5", "sube la tarifa del resort de enero a agosto", "Los precios por temporada los calcula el sistema; el asistente nunca inventa uno."),
    ]
    for i, (num, dato, decision) in enumerate(filas):
        y = 170 + i * 168
        tarjeta(d, 40, y, 1160, y + 150)
        d.text(s(64, y + 22), "DATO", font=f(10, True), fill=GRIS)
        d.text(s(64, y + 40), num, font=f(46, True), fill=ACENTO)
        parrafo(d, 240, y + 52, dato, f(16), TEXTO, 300, 22)
        # flecha
        d.line(s(570, y + 75, 640, y + 75), fill=ACENTO, width=3 * E)
        d.polygon(s(640, y + 67, 654, y + 75, 640, y + 83), fill=ACENTO)
        d.rounded_rectangle(s(680, y + 18, 1140, y + 132), radius=14 * E, fill="#1F2540")
        d.text(s(700, y + 32), "DECISIÓN EN EL PRODUCTO", font=f(10, True), fill=EXITO)
        parrafo(d, 700, y + 54, decision, f(16, True), TEXTO, 420, 23)
    pie(d); return img


if __name__ == "__main__":
    for i, fn in enumerate([pagina1, pagina2, pagina3, pagina4, pagina5], 1):
        fn().save(AQUI / f"fondo_{i}.png", optimize=True)
    print("Fondos listos en", AQUI)
