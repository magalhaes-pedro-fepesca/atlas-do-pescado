"""Reproduce open fisheries CSVs from preserved source snapshots, without imputation."""
import csv
import gzip
import hashlib
import io
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
DATE = '2026-10-04'
SOURCES = OUT / 'downloads' / 'sources'
catalog = json.loads((OUT / 'catalog.json').read_text())
items = catalog['items']
by_id = {x['id']: x for x in items}

def upsert(x):
    if x['id'] in by_id:
        items[items.index(by_id[x['id']])] = x
    else:
        items.append(x)
    by_id[x['id']] = x

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def save(entry, headers, rows, dictionary, raw_file, source_file_url, source_sha):
    assert rows
    path = OUT / entry['file']
    with path.open('w', encoding='utf-8-sig', newline='') as h:
        writer = csv.writer(h)
        writer.writerow(headers)
        writer.writerows(rows)
    entry.update(access='prepared', area='Pesca', scale='Brasil', layer='treated',
                 managed_by='prepare-fisheries.py', prepared_at=DATE, metadata_reviewed_at=DATE,
                 license='CC BY 4.0', license_url='https://creativecommons.org/licenses/by/4.0/',
                 formats=['CSV'], rows=len(rows), bytes=path.stat().st_size, featured=125,
                 metadata_file=entry['file'].removesuffix('.csv')+'.metadata.json',
                 raw_file=raw_file, source_file_url=source_file_url, source_sha256=source_sha,
                 reuse_status='approved', reuse_conditions='Atribuir autoria, citar DOI e identificar a transformação feita pelo Atlas.')
    entry['quality'] = {'checked_at': DATE, 'scope': 'Arquivo obtido da fonte e transformação local conferidos. Não certifica a coleta original.',
                        'sha256': sha(path), 'columns': headers, 'dictionary': dictionary,
                        'duplicate_rows': len(rows)-len({tuple(r) for r in rows})}
    assert entry['quality']['duplicate_rows'] == 0
    (OUT / entry['metadata_file']).write_text(json.dumps(entry, ensure_ascii=False, indent=2))
    upsert(entry)

raw_path = SOURCES / 'pangaea-946292-original.tsv'
text = raw_path.read_text()
assert 'CC-BY-4.0' in text
source_rows = list(csv.DictReader(io.StringIO(text.split('*/\n', 1)[1]), delimiter='\t'))
assert len(source_rows) == 1560
assert len({(r['Date/Time'], r['Species']) for r in source_rows}) == len(source_rows)
assert all(2000 <= int(r['Date/Time']) <= 2019 and float(r['Catch tot [kg]']) >= 0 for r in source_rows)
save({'id':'pangaea-demersal-sc', 'title':'Pesca demersal · desembarques em Santa Catarina',
      'topic':'Captura e desembarque', 'observation_type':'Desembarques monitorados', 'publisher':'Perez e Sant’Ana · UNIVALI / PANGAEA',
      'creators':['José Angel Alvarez Perez', 'Rodrigo Sant’Ana'], 'year':2019, 'coverage':'2000–2019',
      'description':'Captura anual de 78 espécies desembarcadas por frotas industriais de arrasto e emalhe em portos de Santa Catarina.',
      'notes':'Recorte de monitoramento portuário. Não representa a pesca total de Santa Catarina ou do Brasil. Categorias sem identificação por espécie foram excluídas pelos autores. CSV do Atlas renomeia colunas, preserva quilogramas e zeros explícitos. Não preenche ausências nem soma com MPA ou FAO.',
      'citation':'Perez, J. A. A.; Sant’Ana, R. (2022). Catch composition time series (2000–2019) for demersal species in the Brazilian Meridional Margin. PANGAEA. DOI: 10.1594/PANGAEA.946292.',
      'source':'https://doi.pangaea.de/10.1594/PANGAEA.946292',
      'license_evidence':'https://doi.pangaea.de/10.1594/PANGAEA.946292',
      'doi':'10.1594/PANGAEA.946292', 'file':'downloads/pesca-demersal-sc-2000-2019.csv'},
     ['ano','especie_cientifica','captura_kg'],
     [[r['Date/Time'],r['Species'],r['Catch tot [kg]']] for r in source_rows],
     {'ano':'Ano de desembarque, 2000–2019.', 'especie_cientifica':'Nome científico identificado na fonte.',
      'captura_kg':'Captura desembarcada em quilogramas, peso úmido. Zeros da fonte preservados.'},
     'downloads/sources/pangaea-946292-original.tsv',
     'https://doi.pangaea.de/10.1594/PANGAEA.946292?format=textfile', sha(raw_path))

global_id = 'doi:10.25959/mngy-0q43'
license_metadata = (SOURCES / 'imas-metadata.xml').read_text()
assert 'creativecommons.org/licenses/by/4.0' in license_metadata, 'Licença aberta não confirmada nos metadados IMAS.'
global_source = dict(by_id[global_id])
global_source.update(title='Frota e esforço pesqueiro mundial · Global Fishing Effort',
    topic='Esforço, frota e monitoramento', coverage='1950–2017', year=2017,
    description='Reconstrução histórica da capacidade e do esforço de frotas, incluindo setores artesanal e industrial. Dados estimados e modelados.',
    notes='Os autores reconstruíram séries a partir de diversas fontes. Não é um cadastro oficial de embarcações. Consulte o README para unidades, setores, erros e hipóteses. Registros de capacidade e esforço não devem ser somados entre arquivos com dimensões diferentes.',
    file='https://data.imas.utas.edu.au/attachments/1241a51d-c8c2-4432-aa68-3d2bae142794/',
    license_evidence='https://metadata.imas.utas.edu.au/geonetwork/srv/api/records/1241a51d-c8c2-4432-aa68-3d2bae142794/formatters/xml',
    metadata_reviewed_at=DATE, formats=['CSV'], featured=120, reuse_status='approved')
upsert(global_source)

dictionary = {
 '':'Identificador de linha do arquivo original; não é medida estatística.',
 'Year':'Ano de referência.', 'SAUP':'Código do país pesqueiro da fonte.', 'Country':'País pesqueiro, código ISO3.',
 'Sector':'APW: artesanal motorizada; UP: artesanal não motorizada; I: industrial. Categorias originais preservadas.',
 'FGroup':'Grupo funcional de espécies-alvo da fonte.', 'NV':'Número de embarcações estimado pela fonte.',
 'P':'Potência total dos motores, kW.', 'GT':'Arqueação bruta da frota, gross tonnes; não é massa de pescado.',
 'NVActive':'Número estimado de embarcações ativas.', 'NV Active':'Número estimado de embarcações ativas.',
 'PActive':'Potência das embarcações ativas, kW.', 'GTActive':'Arqueação bruta das embarcações ativas.',
 'NomActive':'Esforço nominal das embarcações ativas, kW × dias no mar.',
 'EffActive':'Esforço efetivo, kW × dias no mar, com evolução tecnológica de 3,5% e base em 1949 conforme os autores.',
 'NomActiveHours':'Esforço nominal, kW × horas de pesca. Não são horas isoladas.',
 'EffActiveHours':'Esforço efetivo, kW × horas de pesca. Não são horas isoladas.',
 'NVerr':'Erro relativo do número de embarcações estimadas.', 'Perr':'Erro relativo da potência por embarcação.',
 'GTerr':'Erro relativo da arqueação por embarcação.', 'Length_Category':'Categoria de comprimento da embarcação.',
 'Gear':'Apetrecho de pesca na classificação original.', 'Region':'Região sociocultural usada no modelo.',
 'RActivity':'Proporção de atividade reconstruída pela fonte.',
 'MethodNV':'Método usado pelos autores para reconstruir o número de embarcações.',
 'MethodLOA':'Método usado pelos autores para a categoria de comprimento.',
 'MethodGT':'Método usado pelos autores para a arqueação bruta.',
 'MethodP':'Método usado pelos autores para a potência.'}

for stem, source_name, topic, title in [
 ('capacity','CapacityCountryLevel_Detailed.csv','Esforço, frota e monitoramento','Brasil · capacidade e frota pesqueira reconstruídas'),
 ('effort','TotalEffortby_FGroup_FishingCountry_Sector.csv','Pesca artesanal e comunidades','Brasil · esforço artesanal e industrial estimado')]:
    raw_path = ROOT / 'data-snapshots' / f'imas-{stem}-original.csv.gz'
    with gzip.open(raw_path, 'rt', encoding='utf-8-sig', newline='') as h:
        reader = csv.DictReader(h)
        headers = reader.fieldnames
        rows = [[r[k] for k in headers] for r in reader if r['Country'] == 'BRA']
    year_idx = headers.index('Year')
    years = {int(r[year_idx]) for r in rows}
    assert min(years) == 1950 and max(years) == 2017
    assert all(r[headers.index('Country')] == 'BRA' for r in rows)
    if stem == 'effort':
        assert {'APW','UP','I'} <= {r[headers.index('Sector')] for r in rows}
    cols = {k: dictionary.get(k, 'Coluna preservada da fonte. Consulte o README original.') for k in headers}
    base = 'https://data.imas.utas.edu.au/attachments/1241a51d-c8c2-4432-aa68-3d2bae142794/'
    save({'id':f'imas-brasil-{stem}', 'title':title, 'topic':topic,
          'publisher':'Rousseau et al. · IMAS / Universidade da Tasmânia',
          'creators':['Yannick Rousseau','Julia Blanchard','Camilla Novaglio','Pinnel Kirsty','Derek Tittensor','Reg Watson','Yimin Ye'],
          'year':2017, 'coverage':'1950–2017', 'parent_dataset_id':global_id, 'observation_type':'Estimativas reconstruídas',
          'description':'Recorte brasileiro de uma reconstrução histórica aberta. Valores estimados pelos autores, com as dimensões e unidades originais.',
          'notes':'Filtro Country=BRA, sem agregação, conversão de unidades ou imputação. Mantém a classificação da fonte. Não é contagem atual ou registro oficial de embarcações. Não extrapolar para a pesca continental nem somar os dois recortes entre si. Campos vazios e NA significam ausência e não viram zero. Embarcações fracionárias são estimativas do modelo.',
          'citation':'Rousseau et al. (2022). Global Fishing Effort. IMAS, University of Tasmania. DOI: 10.25959/MNGY-0Q43. Recorte Country=BRA preparado pelo Atlas em 04/10/2026.',
          'source':global_source['source'], 'license_evidence':global_source['license_evidence'],
          'doi':'10.25959/MNGY-0Q43', 'preserved_source_path':f'data-snapshots/imas-{stem}-original.csv.gz', 'file':f'downloads/pesca-brasil-{stem}-1950-2017.csv'},
          headers, rows, cols, base+source_name, base+source_name,
          hashlib.sha256(gzip.decompress(raw_path.read_bytes())).hexdigest())

amazon = dict(by_id['doi:10.17632/ntprfhdypn'])
amazon.update(title='Pesca continental · desembarques em Santarém (PA)', scale='Brasil',
    coverage='Descrição: 2011–2020; título original: até 2021',
    description='Registros de desembarque de pescado na Feira do Peixe de Santarém, com espécies e biomassa. Arquivos mantidos no repositório dos autores.',
    notes='A descrição do repositório informa 2011–2020, enquanto o título cita 2021. O período e a unidade de cada planilha devem ser conferidos antes da análise. Não equivale à pesca total do Pará ou da Amazônia. O Atlas não baixou nem validou os valores desta planilha nesta entrega.',
    topic='Pesca artesanal e comunidades', source='https://data.mendeley.com/datasets/ntprfhdypn/1',
    doi='10.17632/ntprfhdypn.1', license_evidence='https://data.mendeley.com/datasets/ntprfhdypn/1',
    creators=['Keid Souza','Enoque Alves','Annita Feitosa','Vânia Alves','Layla Menezes','Celson Pantoja','Edivaldo Santos'],
    metadata_reviewed_at=DATE, featured=120, reuse_status='approved', formats=[])
# Preserve the subsequently verified municipal source metadata when rebuilding fisheries.
santarem_metadata = ROOT / 'dist' / 'downloads' / 'pesca-municipal-santarem-2011-2020.metadata.json'
if santarem_metadata.exists():
    verified = json.loads(santarem_metadata.read_text())
    amazon.update(coverage=verified['coverage'], notes=verified['notes'] + ' Arquivo original e agregado verificados; disponível em Municípios → Pesca e desembarques.', formats=['CSV'], license_url=verified['license_url'])
upsert(amazon)

anglers = dict(by_id['doi:10.5061/dryad.7pvmcvf6k'])
anglers.update(title='Pesca amadora · práticas e perdas de apetrechos na Hungria',
    topic='Pesca amadora e esportiva', scale='Mundo', coverage='Hungria · 2007–2024 (conforme README)',
    description='Questionário de pescadores recreativos de água doce e série de pescadores licenciados na Hungria. Planilha XLSX e documentação disponíveis no Dryad.',
    notes='Referência internacional, sem extrapolação para o Brasil. Respostas autodeclaradas e perdas estimadas; não são desembarques ou capturas medidas. O README define n/a como resposta ausente. Os arquivos permanecem na fonte; o Atlas não os incorporou à camada de cálculo.',
    source='https://datadryad.org/dataset/doi:10.5061/dryad.7pvmcvf6k',
    formats=['XLSX'],
    license='CC0', license_url='https://creativecommons.org/publicdomain/zero/1.0/',
    license_evidence='https://datadryad.org/api/v2/datasets/doi%3A10.5061%2Fdryad.7pvmcvf6k',
    metadata_reviewed_at=DATE, featured=120, reuse_status='approved')
anglers.pop('file', None)
upsert(anglers)

catalog['counts'] = dict(Counter(x['area'] for x in items))
catalog['fisheries_expansion'] = {'date':DATE, 'prepared_csv_ids':['pangaea-demersal-sc','imas-brasil-capacity','imas-brasil-effort'],
    'reviewed_source_ids':[global_id,amazon['id'],anglers['id']],
    'scope':'Três novos CSVs de pesca. Referências de pesca continental e amadora revisadas, com arquivos na fonte. Sem estimativa nacional do Atlas ou atualização automática.'}
(OUT/'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',',':')))
print(json.dumps({'csvs':[{k:x[k] for k in ['id','rows','coverage']} for x in items if x.get('managed_by')=='prepare-fisheries.py']}, ensure_ascii=False))
