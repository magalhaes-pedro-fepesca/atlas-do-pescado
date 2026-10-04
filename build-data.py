"""Prepare compact, auditable snapshots from the cited public datasets."""
import collections
import csv
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "dist"
RAW = ROOT / "data-input"


def pt_number(value):
    value = (value or "").strip().replace(".", "").replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


sidra = json.loads((RAW / "sidra3940-uf-produtos.json").read_text())
aquaculture = collections.defaultdict(dict)
products = {}
states = {}
excluded = {"0", "79366", "32886", "32888", "32890"}
for row in sidra[1:]:
    code = row["D4C"]
    if code in excluded:
        continue  # Exclude aggregates and juvenile/seed units that are not kilograms.
    if row["D2C"] == "4146" and row["MN"] != "Quilogramas":
        continue
    variable = {"4146": "tonnes", "215": "million_brl"}.get(row["D2C"])
    if not variable:
        continue
    try:
        value = float(row["V"])
    except ValueError:
        continue  # IBGE suppression, unavailable, or not applicable.
    products[code] = row["D4N"]
    states[row["D1C"]] = row["D1N"]
    key = (int(row["D3C"]), row["D1C"], code)
    aquaculture[key][variable] = round(value / (1000 if variable == "tonnes" else 1000), 5)

aq_rows = [[year, uf, code, values.get("tonnes"), values.get("million_brl")]
           for (year, uf, code), values in sorted(aquaculture.items())]

capture = collections.defaultdict(float)
quality = collections.Counter()
pargo_path = RAW / "library" / "Base de dados de captura da especie Pargo(in).csv"
with pargo_path.open(encoding="cp1252", newline="") as f:
    for row in csv.DictReader(f, delimiter=";"):
        amount = pt_number(row["Producao (t)"])
        try:
            year = int(row["Ano"])
        except ValueError:
            quality["pargo_invalid_year"] += 1
            continue
        if amount is None or amount < 0 or not 2000 <= year <= 2030:
            quality["pargo_invalid_value"] += 1
            continue
        raw_species = row["Espécie"].strip()
        common, sep, scientific = raw_species.partition(" (")
        species = common.title() + (" (" + scientific.capitalize() if sep else "")
        if not species:
            quality["pargo_missing_species"] += 1
            continue
        capture[(year, species, "pargo")] += amount

sardinha_path = RAW / "library" / "Base de Dados da Sardinha-verdadeira(in).csv"
with sardinha_path.open(encoding="cp1252", newline="") as f:
    for row in csv.DictReader(f, delimiter=";"):
        amount = pt_number(row["Captura (Kg)"])
        try:
            year = datetime.strptime(row["Data do relatório"], "%d/%m/%Y").year
        except ValueError:
            quality["sardinha_invalid_date"] += 1
            continue
        if amount is None or amount < 0:
            quality["sardinha_invalid_value"] += 1
            continue
        capture[(year, "Sardinha-verdadeira", "sardinha")] += amount / 1000

capture_rows = [[year, species, source, round(value, 4)]
                for (year, species, source), value in sorted(capture.items())]

geo = json.loads((RAW / "ibge-ufs.geojson").read_text())
geo["features"] = [{"type": "Feature", "properties": {"code": str(f["properties"]["codarea"])},
                    "geometry": f["geometry"]} for f in geo["features"]]
(OUT / "ufs.geojson").write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")))

data = {
    "meta": {
        "prepared": "2026-09-27",
        "aquaculture_reference": "2013–2024",
        "capture_reference": "2021–2025 (séries com coberturas diferentes)",
        "notes": "Ausência/sigilo no SIDRA não foi convertido em zero. Valores em reais correntes. Captura é soma de registros das bases específicas, não estimativa da pesca brasileira total."
    },
    "states": states,
    "products": products,
    "aquaculture": aq_rows,
    "capture": capture_rows,
    "quality": dict(quality),
}
(OUT / "dados.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
print(f"aquaculture rows={len(aq_rows)}, products={len(products)}, capture rows={len(capture_rows)}, capture species={len(set(r[1] for r in capture_rows))}, states={len(states)}")
print(f"years aquaculture={sorted(set(r[0] for r in aq_rows))}; capture={sorted(set(r[0] for r in capture_rows))}; quality={dict(quality)}")
