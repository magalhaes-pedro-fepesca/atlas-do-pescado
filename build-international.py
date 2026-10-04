"""Build compact international FishStat snapshots and ready-to-use CSV files.

Source: FAO FishStat global Capture/Aquaculture 2026.1.0 (March 2026).
Only Q_tlw (tonnes live-weight) for 2015–2024 is retained. All reported,
estimated, and provisional numeric observations are included. Empty values
stay absent; the country/year totals sum the source species-item records.
"""
import collections
import csv
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "data-input"
OUT = ROOT / "dist"
DOWNLOAD = OUT / "downloads"
RAW.mkdir(exist_ok=True)
DOWNLOAD.mkdir(exist_ok=True)
RELEASE = "2026.1.0"
YEAR_START, YEAR_END = 2015, 2024


def fetch_if_missing(path, url):
    if path.exists():
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://www.fao.org/fishery/static/Data/"})
    with urllib.request.urlopen(req, timeout=120) as response:
        path.write_bytes(response.read())


all_rows = []
all_totals = []
countries = {}
species = {}
for mode, file, inside in [
    ("aq", "Aquaculture_2026.1.0.zip", "Aquaculture_Quantity.csv"),
    ("cap", "Capture_2026.1.0.zip", "Capture_Quantity.csv"),
]:
    path = RAW / file
    fetch_if_missing(path, "https://www.fao.org/fishery/static/Data/" + file)
    with zipfile.ZipFile(path) as z:
        lookup = {}
        for row in csv.DictReader(io.TextIOWrapper(z.open("CL_FI_COUNTRY_GROUPS.csv"), encoding="utf-8-sig")):
            code = row["ISO3_Code"].strip()
            if len(code) != 3 or not code.isalpha() or code == "XXX":
                continue
            lookup[row["UN_Code"]] = code
            countries[code] = [row["Name_En"], row["Continent_Group_En"]]
        for row in csv.DictReader(io.TextIOWrapper(z.open("CL_FI_SPECIES_GROUPS.csv"), encoding="utf-8-sig")):
            species[row["3A_Code"]] = row["Name_En"].strip() or f"Código FAO {row['3A_Code']}"
        totals = collections.defaultdict(float)
        records = collections.defaultdict(float)
        for row in csv.DictReader(io.TextIOWrapper(z.open(inside), encoding="utf-8-sig")):
            if row["MEASURE"] != "Q_tlw":
                continue  # Some capture rows count individuals, not tonnes.
            try:
                year = int(row["PERIOD"])
                value = float(row["VALUE"])
            except ValueError:
                continue
            iso = lookup.get(row["COUNTRY.UN_CODE"])
            if not iso or not YEAR_START <= year <= YEAR_END or value < 0:
                continue
            code = row["SPECIES.ALPHA_3_CODE"]
            records[(year, iso, code)] += value
            totals[(year, iso)] += value

    rows = [[mode, year, iso, code, round(value, 3)] for (year, iso, code), value in sorted(records.items())]
    all_rows.extend(rows)
    all_totals.extend([[mode, year, iso, round(value, 3)] for (year, iso), value in sorted(totals.items())])
    with (DOWNLOAD / f"fao-{mode}-2015-2024.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["modalidade", "ano", "pais_iso3", "pais", "continente", "codigo_fao_especie", "especie_ou_grupo", "toneladas_peso_vivo"])
        for _, year, iso, code, value in rows:
            writer.writerow(["Aquicultura" if mode == "aq" else "Captura", year, iso, *countries[iso], code, species.get(code, code), value])
    print(mode, "species rows", len(rows), "country-years", len(totals), "2024 t", round(sum(v for (y, _), v in totals.items() if y == 2024)))

intl = {"meta": {"source": "FAO FishStatJ, Capture/Aquaculture 2026.1.0", "released": "2026-03", "processed": "2026-09-27", "years": [YEAR_START, YEAR_END], "unit": "tonnes live weight", "notes": "All numeric Q_tlw observations including reported and estimated values; missing observations are not zero."}, "countries": countries, "species": species, "rows": all_rows, "totals": all_totals}
(OUT / "international.json").write_text(json.dumps(intl, ensure_ascii=False, separators=(",", ":")))

geo_path = RAW / "world-countries.geojson"
fetch_if_missing(geo_path, "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson")
geodata = json.loads(geo_path.read_text())
features = []
def round_coords(node):
    if isinstance(node[0], (int, float)):
        return [round(node[0], 2), round(node[1], 2)]
    return [round_coords(child) for child in node]
for feature in geodata["features"]:
    props = feature["properties"]
    code = props.get("ISO_A3")
    if code in (None, "-99"):
        code = props.get("ADM0_A3")
    features.append({"type": "Feature", "properties": {"iso3": code, "name": props.get("ADMIN")}, "geometry": {"type": feature["geometry"]["type"], "coordinates": round_coords(feature["geometry"]["coordinates"])}})
(OUT / "world.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")))

national = json.loads((OUT / "dados.json").read_text())
with (DOWNLOAD / "ibge-aquicultura-uf-2013-2024.csv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ano", "codigo_uf", "uf", "codigo_produto", "produto", "producao_t", "valor_milhoes_reais_nominais"])
    for year, uf, product, tonnes, money in national["aquaculture"]:
        writer.writerow([year, uf, national["states"][uf], product, national["products"][product], tonnes if tonnes is not None else "", money if money is not None else ""])
with (DOWNLOAD / "mpa-captura-registros-2021-2025.csv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ano", "especie", "arquivo_origem", "captura_registrada_t"])
    for row in national["capture"]:
        writer.writerow(row)
print("world features", len(features), "international JSON MiB", round((OUT / "international.json").stat().st_size / 1048576, 2))
