"""Prepare 2024 municipal aquaculture and NCM 03 trade snapshots.

Official inputs: IBGE SIDRA table 3940 and municipal meshes; MDIC Comex Stat
general API. Raw responses are cached in ignored data-input/ for reproducibility.
Only numeric kilogram aquaculture leaf products are summed; missing stays absent.
Trade covers chapter 03 only; 2026 is January–August and is not annualized.
"""
import collections
import concurrent.futures
import csv
import gzip
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "data-input"
OUT = ROOT / "dist"
DOWNLOADS = OUT / "downloads"
DATA_DATE = "2026-09-27"
RAW.mkdir(exist_ok=True)
(RAW / "trade_api").mkdir(exist_ok=True)
(RAW / "municipios").mkdir(exist_ok=True)
(OUT / "municipios").mkdir(exist_ok=True)
DOWNLOADS.mkdir(exist_ok=True)


def fetch_json(url, cache, body=None):
    if cache.exists():
        return json.loads(cache.read_text())
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json", "Accept-Encoding": "identity"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                             headers=headers, method="POST" if body is not None else "GET")
            with urllib.request.urlopen(request, timeout=100) as response:
                blob = response.read()
            if blob[:2] == b"\x1f\x8b":
                blob = gzip.decompress(blob)
            obj = json.loads(blob)
            cache.write_text(json.dumps(obj, ensure_ascii=False))
            return obj
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt == 3:
                raise RuntimeError(f"Unable to retrieve {url}: {exc}") from exc
            time.sleep((attempt + 1) * 2)


national = json.loads((OUT / "dados.json").read_text())
uf_names = national["states"]
uf_by_name = {name.casefold(): code for code, name in uf_names.items()}
metadata = fetch_json("https://servicodados.ibge.gov.br/api/v3/agregados/3940/metadados", RAW / "sidra3940-metadata.json")
valid_products = [str(c["id"]) for c in metadata["classificacoes"][0]["categorias"]
                  if c.get("unidade") == "Quilogramas" and c["id"] != 79366]


def sidra_group(codes):
    suffix = ",".join(codes)
    url = f"https://apisidra.ibge.gov.br/values/t/3940/n6/all/v/4146/p/2024/c654/{suffix}?formato=json"
    return fetch_json(url, RAW / f"sidra3940-municipios-2024-{codes[0]}-{codes[-1]}.json")


municipal = collections.defaultdict(float)
municipality_names = {}
products = {}
for group in (valid_products[:10], valid_products[10:]):
    raw = sidra_group(group)
    print("SIDRA rows", len(raw) - 1, "products", group[0], "to", group[-1], flush=True)
    for row in raw[1:]:
        if row["MN"] != "Quilogramas":
            continue
        try:
            kg = float(row["V"])
        except ValueError:
            continue
        if kg < 0:
            continue
        code, product = row["D1C"], row["D4C"]
        municipality_names[code] = [row["D1N"].rsplit(" (", 1)[0], code[:2]]
        products[product] = row["D4N"]
        municipal[(code, product)] += kg / 1000

municipal_rows = [[code, product, round(value, 5)] for (code, product), value in sorted(municipal.items())]
municipal_json = {"meta": {"source": "IBGE PPM / SIDRA 3940", "year": 2024, "processed": DATA_DATE,
                           "unit": "tonnes", "notes": "Numeric kilogram leaf products only; suppressed or absent records are not zero."},
                  "states": uf_names, "municipalities": municipality_names, "products": products, "rows": municipal_rows}
(OUT / "municipal.json").write_text(json.dumps(municipal_json, ensure_ascii=False, separators=(",", ":")))
with (DOWNLOADS / "ibge-aquicultura-municipios-2024.csv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["ano", "codigo_municipio", "municipio", "uf", "codigo_produto", "produto", "producao_t"])
    for code, product, tonnes in municipal_rows:
        writer.writerow([2024, code, municipality_names[code][0], uf_names[code[:2]], product, products[product], tonnes])
print("Municipal numeric rows", len(municipal_rows), "municipalities", len(municipality_names), flush=True)


def compact_coords(coords):
    if isinstance(coords[0], (float, int)):
        return [round(coords[0], 3), round(coords[1], 3)]
    return [compact_coords(part) for part in coords]


def mesh_for_state(uf):
    url = (f"https://servicodados.ibge.gov.br/api/v4/malhas/estados/{uf}"
           "?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio")
    raw = fetch_json(url, RAW / "municipios" / f"{uf}.geojson")
    features = [{"type": "Feature", "properties": {"code": str(f["properties"]["codarea"])},
                 "geometry": {"type": f["geometry"]["type"], "coordinates": compact_coords(f["geometry"]["coordinates"])}}
                for f in raw["features"]]
    target = OUT / "municipios" / f"{uf}.geojson"
    target.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")))
    return uf, len(features)


with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    mesh_counts = dict(pool.map(mesh_for_state, sorted(uf_names)))
print("Municipal mesh features", sum(mesh_counts.values()), flush=True)


def trade_for_year(flow, year):
    end = "08" if year == 2026 else "12"
    body = {"flow": flow, "monthDetail": False, "period": {"from": f"{year}-01", "to": f"{year}-{end}"},
            "filters": [{"filter": "chapter", "values": ["03"]}],
            "details": ["country", "state", "ncm"], "metrics": ["metricFOB", "metricKG"]}
    url = "https://api-comexstat.mdic.gov.br/general?language=pt"
    result = fetch_json(url, RAW / "trade_api" / f"{flow}_{year}.json", body)
    if not result.get("success") or not isinstance(result.get("data", {}).get("list"), list):
        raise RuntimeError(f"Comex Stat returned no data for {flow} {year}: {result.get('message')}")
    print("Comex", flow, year, len(result["data"]["list"]), flush=True)
    return flow, year, result["data"]["list"]


with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    trade_results = list(pool.map(lambda args: trade_for_year(*args),
                                  [(flow, year) for flow in ("export", "import") for year in range(2022, 2027)]))

trade_rows = []
ncm_names = {}
countries = set()
for flow, year, rows in trade_results:
    for r in rows:
        code = r["coNcm"]
        if not code.startswith("03"):
            continue
        kg, fob = float(r["metricKG"]), float(r["metricFOB"])
        if kg < 0 or fob < 0:
            continue
        country, state = r["country"], r["state"]
        uf = uf_by_name.get(state.casefold(), "")
        ncm_names[code] = r["ncm"]
        countries.add(country)
        trade_rows.append(["exp" if flow == "export" else "imp", year, country, uf, code, round(kg, 3), round(fob, 2)])

trade_rows.sort()
trade_json = {"meta": {"source": "MDIC Comex Stat, NCM chapter 03", "source_updated": "2026-09-04",
                       "processed": DATA_DATE, "years": [2022, 2026], "partial_year": "2026-01 to 2026-08",
                       "unit_weight": "net kg", "unit_value": "US$ FOB",
                       "notes": "Chapter 03 only. Processed fish products in other chapters are excluded. UF is the product UF in the general dataset, not necessarily the company's municipality."},
              "states": uf_names, "ncm": ncm_names, "countries": sorted(countries), "rows": trade_rows}
(OUT / "trade.json").write_text(json.dumps(trade_json, ensure_ascii=False, separators=(",", ":")))
with (DOWNLOADS / "mdic-comercio-pescado-ncm03-2022-2026.csv").open("w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["fluxo", "ano", "pais_parceiro", "uf_produto", "ncm", "produto", "peso_liquido_kg", "valor_fob_usd"])
    for flow, year, country, uf, code, kg, fob in trade_rows:
        writer.writerow(["Exportação" if flow == "exp" else "Importação", year, country,
                         uf_names.get(uf, "Não informada"), code, ncm_names[code], kg, fob])
print("Trade rows", len(trade_rows), "NCM", len(ncm_names), "countries", len(countries), flush=True)
