"""Limpia el dataset Hotel Booking Demand y deja tablas listas para Power BI.

Fuente: Antonio, Almeida y Nunes (2019), «Hotel booking demand datasets», Data in Brief 22.
Copia pública: TidyTuesday 2020-02-11 (mismo contenido que Kaggle).

Uso: python3 datos/limpiar.py
Salida: datos/powerbi/*.csv y datos/hallazgos.md
"""
from pathlib import Path
import urllib.request

import pandas as pd

AQUI = Path(__file__).parent
CRUDO = AQUI / "crudo" / "hotel_bookings.csv"
SALIDA = AQUI / "powerbi"
URL = "https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2020/2020-02-11/hotels.csv"

MESES = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July",
                                     "August", "September", "October", "November", "December"], 1)}
REGIMEN = {"BB": "Con desayuno", "HB": "Media pensión", "FB": "Pensión completa", "SC": "Sin comidas", "Undefined": "Sin comidas"}
SEGMENTO = {"Online TA": "Agencia online", "Offline TA/TO": "Agencia / operador", "Direct": "Directo", "Groups": "Grupos",
            "Corporate": "Corporativo", "Complementary": "Cortesía", "Aviation": "Aerolínea", "Undefined": "Sin dato"}
DEPOSITO = {"No Deposit": "Sin depósito", "Non Refund": "No reembolsable", "Refundable": "Reembolsable"}
CLIENTE = {"Transient": "Individual", "Transient-Party": "Individual vinculado", "Contract": "Contrato", "Group": "Grupo"}
ESTADO = {"Check-Out": "Se alojó", "Canceled": "Cancelada", "No-Show": "No se presentó"}


def tramo_anticipacion(dias: int) -> str:
    for tope, nombre in [(7, "0-7 días"), (30, "8-30 días"), (90, "31-90 días"), (180, "91-180 días")]:
        if dias <= tope:
            return nombre
    return "Más de 180 días"


def tipo_grupo(f) -> str:
    if f.ninos + f.bebes > 0:
        return "Familia con niños"
    return {1: "Solo", 2: "Pareja / dos adultos"}.get(f.adultos, "Grupo de adultos")


def main():
    if not CRUDO.exists():
        CRUDO.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, CRUDO)
    df = pd.read_csv(CRUDO)
    filas_inicio = len(df)
    registro = []  # qué se limpió y cuántas filas afectó

    df["children"] = df["children"].fillna(0).astype(int)
    df["country"] = df["country"].fillna("Sin dato")

    sin_huespedes = (df.adults + df.children + df.babies) == 0
    registro.append(("Reservas sin huéspedes (0 adultos, niños y bebés)", int(sin_huespedes.sum())))
    df = df[~sin_huespedes]

    tarifa_rara = (df.adr < 0) | (df.adr > 1000)
    registro.append(("Tarifa diaria negativa o mayor a 1.000 €", int(tarifa_rara.sum())))
    df = df[~tarifa_rara]

    sin_noches = (df.stays_in_weekend_nights + df.stays_in_week_nights) == 0
    registro.append(("Reservas de 0 noches (day use), se marcan pero no se borran", int(sin_noches.sum())))

    t = pd.DataFrame({
        "id": range(1, len(df) + 1),
        "hotel": df.hotel.map({"Resort Hotel": "Resort", "City Hotel": "Ciudad"}).values,
        "cancelada": df.is_canceled.values,
        "estado": df.reservation_status.map(ESTADO).values,
        "anticipacion_dias": df.lead_time.values,
        "fecha_llegada": pd.to_datetime(dict(year=df.arrival_date_year, month=df.arrival_date_month.map(MESES), day=df.arrival_date_day_of_month)).dt.date.values,
        "noches_finde": df.stays_in_weekend_nights.values,
        "noches_semana": df.stays_in_week_nights.values,
        "adultos": df.adults.values,
        "ninos": df.children.values,
        "bebes": df.babies.values,
        "regimen": df.meal.map(REGIMEN).values,
        "pais": df.country.values,
        "segmento": df.market_segment.map(SEGMENTO).values,
        "huesped_repetido": df.is_repeated_guest.values,
        "cancelaciones_previas": df.previous_cancellations.values,
        "cambios_reserva": df.booking_changes.values,
        "deposito": df.deposit_type.map(DEPOSITO).values,
        "tipo_cliente": df.customer_type.map(CLIENTE).values,
        "tarifa_diaria_eur": df.adr.round(2).values,
        "cocheras": df.required_car_parking_spaces.values,
        "pedidos_especiales": df.total_of_special_requests.values,
    })
    t["noches"] = t.noches_finde + t.noches_semana
    t["day_use"] = (t.noches == 0).astype(int)
    t["tramo_anticipacion"] = t.anticipacion_dias.map(tramo_anticipacion)
    t["tipo_grupo"] = t.apply(tipo_grupo, axis=1)
    t["ingreso_eur"] = (t.tarifa_diaria_eur * t.noches * (1 - t.cancelada)).round(2)

    SALIDA.mkdir(exist_ok=True)
    t.to_csv(SALIDA / "reservas.csv", index=False)

    # Calendario para Power BI (relación por fecha_llegada).
    dias = pd.date_range(t.fecha_llegada.min(), t.fecha_llegada.max())
    nombres_mes = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    pd.DataFrame({
        "fecha": dias.date, "anio": dias.year, "mes_num": dias.month,
        "mes": [nombres_mes[m - 1] for m in dias.month],
        "trimestre": "T" + dias.quarter.astype(str),
        "dia_semana": dias.dayofweek + 1,
        "es_finde": (dias.dayofweek >= 4).astype(int),
    }).to_csv(SALIDA / "calendario.csv", index=False)

    escribir_hallazgos(t, filas_inicio, registro)
    print(f"{filas_inicio} filas → {len(t)} reservas limpias. Tablas en {SALIDA}")


def miles(n) -> str:
    return f"{int(n):,}".replace(",", ".")


def pct(x) -> str:
    return f"{x * 100:.1f} %".replace(".", ",")


def escribir_hallazgos(t, filas_inicio, registro):
    l = ["# Hallazgos del dataset Hotel Booking Demand", "",
         f"{miles(filas_inicio)} reservas originales → {miles(len(t))} limpias ({t.fecha_llegada.min()} a {t.fecha_llegada.max()}).", "",
         "## Limpieza", "", "| Regla | Filas |", "|---|---|"]
    l += [f"| {r} | {n} |" for r, n in registro]

    l += ["", "## 1. Cancelación según anticipación", "", "| Anticipación | Reservas | Cancelación |", "|---|---|---|"]
    orden = ["0-7 días", "8-30 días", "31-90 días", "91-180 días", "Más de 180 días"]
    g = t.groupby("tramo_anticipacion").cancelada.agg(["count", "mean"]).reindex(orden)
    l += [f"| {i} | {miles(r['count'])} | {pct(r['mean'])} |" for i, r in g.iterrows()]

    l += ["", "## 2. Cancelación según depósito y canal", "", "| Depósito | Cancelación |", "|---|---|"]
    l += [f"| {i} | {pct(v)} |" for i, v in t.groupby("deposito").cancelada.mean().sort_values().items()]
    l += ["", "| Segmento | Reservas | Cancelación |", "|---|---|---|"]
    s = t.groupby("segmento").cancelada.agg(["count", "mean"]).sort_values("count", ascending=False).head(5)
    l += [f"| {i} | {miles(r['count'])} | {pct(r['mean'])} |" for i, r in s.iterrows()]

    l += ["", "## 3. Tarifa diaria promedio por mes (reservas que se alojaron)", "", "| Mes | Resort | Ciudad |", "|---|---|---|"]
    a = t[t.cancelada == 0].assign(mes=pd.to_datetime(t.fecha_llegada).dt.month)
    m = a.pivot_table(index="mes", columns="hotel", values="tarifa_diaria_eur", aggfunc="mean").round(0)
    nombres = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    l += [f"| {nombres[i - 1]} | {r['Resort']:.0f} € | {r['Ciudad']:.0f} € |" for i, r in m.iterrows()]

    l += ["", "## 4. Quiénes viajan y qué piden", "", "| Tipo de grupo | Reservas | Con pedidos especiales |", "|---|---|---|"]
    q = t.groupby("tipo_grupo").agg(n=("id", "count"), pedidos=("pedidos_especiales", lambda x: (x > 0).mean())).sort_values("n", ascending=False)
    l += [f"| {i} | {miles(r.n)} | {pct(r.pedidos)} |" for i, r in q.iterrows()]
    l += ["", f"- Piden cochera: {pct((t.cocheras > 0).mean())} de las reservas.",
          f"- Al menos un pedido especial: {pct((t.pedidos_especiales > 0).mean())}.",
          f"- Cancelación con pedidos especiales: {pct(t[t.pedidos_especiales > 0].cancelada.mean())} vs. sin pedidos: {pct(t[t.pedidos_especiales == 0].cancelada.mean())}.",
          f"- Estadía promedio: {t[t.noches > 0].noches.mean():.1f}".replace(".", ",") + f" noches; anticipación mediana: {t.anticipacion_dias.median():.0f} días."]
    (AQUI / "hallazgos.md").write_text("\n".join(l) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
