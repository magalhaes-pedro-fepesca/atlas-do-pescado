"""Audit existing local data without fetching, changing observations or filling gaps."""
import csv
import hashlib
import json
import re
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
INTEGRATED = {
    'ibge-uf': ['Brasil', 'Dados por região'], 'mpa-captura': ['Brasil'],
    'fao-captura': ['Internacional'], 'fao-aquicultura': ['Internacional'],
    'ibge-municipio': ['Municípios', 'Dados por região'], 'mdic-ncm03': ['Comércio exterior'],
    'pesca-municipal-santarem': ['Municípios · pesca e desembarques'],
    'pesca-municipal-arraial': ['Municípios · pesca e desembarques'],
}
EXTRA_DICTIONARY = {
    'modalidade': 'Captura e aquicultura são universos distintos e não devem ser confundidos.',
    'pais_iso3': 'Código ISO3 de país ou território da FAO, preservado como texto.',
    'pais': 'Nome do país ou território na fonte.', 'continente': 'Agrupamento continental da fonte.',
    'codigo_fao_especie': 'Código ASFIS de espécie ou grupo; preservar como texto.',
    'especie_ou_grupo': 'Espécie ou grupo estatístico na classificação FAO.',
    'toneladas_peso_vivo': 'Toneladas de peso vivo; não é peso líquido do comércio.',
    'especie': 'Rótulo de espécie da fonte; não inferir identificação científica.',
    'arquivo_origem': 'Arquivo de origem MPA; não representa a cobertura de toda a pesca brasileira.',
    'captura_registrada_t': 'Captura registrada nos arquivos MPA, em toneladas.',
    'municipio': 'Município de referência; a pesca municipal usa o local de desembarque.',
    'uf': 'UF de referência.', 'ano': 'Ano da observação, distinto da data de revisão.',
    'nome_comum': 'Nome popular preservado da fonte.',
}
UNITS = {
    'producao_t': 't', 'valor_milhoes_reais_nominais': 'milhões de R$ nominais',
    'toneladas_peso_vivo': 't de peso vivo', 'captura_registrada_t': 't',
    'captura_kg': 'kg', 'peso_liquido_kg': 'kg de peso líquido', 'valor_fob_usd': 'US$ FOB',
    'desembarque_t': 't', 'desembarque_kg': 'kg', 'esforco_horas': 'h',
    'registros': 'transações', 'dias_registrados': 'dias com registros',
    'NV': 'embarcações estimadas', 'NVActive': 'embarcações ativas estimadas',
    'P': 'kW', 'PActive': 'kW', 'GT': 'arqueação bruta', 'GTActive': 'arqueação bruta',
    'NomActive': 'kW × dias', 'EffActive': 'kW × dias',
    'NomActiveHours': 'kW × horas', 'EffActiveHours': 'kW × horas',
    'NVerr': 'erro relativo', 'Perr': 'erro relativo', 'GTerr': 'erro relativo', 'RActivity': 'proporção',
}
MISSING = {'', 'NA', 'N/A', 'NULL', 'NAN', '-', '..', '...'}

def dump(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def audit_csv(base, entry, municipalities, states):
    path = base / entry['file']
    errors, warnings = [], []
    if not path.is_file():
        return {'id': entry['id'], 'errors': ['Arquivo local ausente.'], 'warnings': [], 'passed': False}
    content = path.read_bytes()
    digest = hashlib.sha256(content).hexdigest()
    metadata = json.loads((base / entry['metadata_file']).read_text(encoding='utf-8'))
    expected = metadata.get('quality', {}).get('sha256') or metadata.get('sha256')
    if not expected or digest != expected:
        errors.append('SHA-256 diverge dos metadados ou não está registrado.')
    with path.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        columns = reader.fieldnames or []
        rows = list(reader)
    if len(set(columns)) != len(columns):
        errors.append('Cabeçalho possui nomes repetidos.')
    if not rows:
        errors.append('Arquivo sem observações.')
    expected_columns = metadata.get('quality', {}).get('columns') or entry.get('quality', {}).get('columns')
    if expected_columns and columns != expected_columns:
        errors.append('Colunas divergem do esquema documentado.')
    if not any(c in columns for c in ('ano', 'Year')) or not any(c in columns for c in UNITS):
        errors.append('Coluna temporal ou medida obrigatória ausente.')
    dictionary = dict(entry.get('quality', {}).get('dictionary') or metadata.get('dictionary') or metadata.get('quality', {}).get('dictionary') or {})
    for column in columns:
        if column not in dictionary or dictionary[column].startswith('Campo preservado da cópia preparada'):
            if column in EXTRA_DICTIONARY:
                dictionary[column] = EXTRA_DICTIONARY[column]
    if '' in columns and not dictionary.get(''):
        errors.append('Coluna sem nome e sem definição de identificador original.')
    if any(None in row or any(value is None for value in row.values()) for row in rows):
        errors.append('Quantidade de campos incompatível com o cabeçalho.')
    empty = Counter()
    numeric_invalid = Counter()
    year_values, codes = set(), set()
    invalid_codes, invalid_years, invalid_ncm = 0, 0, 0
    for row in rows:
        for column in columns:
            value = row.get(column)
            if value is None or str(value).strip().upper() in MISSING:
                empty[column] += 1
                continue
            if column in UNITS:
                try:
                    number = Decimal(value)
                    if not number.is_finite() or number < 0:
                        numeric_invalid[column] += 1
                except InvalidOperation:
                    numeric_invalid[column] += 1
        year = row.get('ano', row.get('Year'))
        if not year or not re.fullmatch(r'\d{4}', year) or not 1900 <= int(year) <= date.today().year:
            invalid_years += 1
        else:
            year_values.add(int(year))
        for column in ('codigo_municipio', 'codigo_ibge'):
            if column in row:
                code = row[column]
                codes.add(code)
                if not re.fullmatch(r'\d{7}', code or '') or code not in municipalities:
                    invalid_codes += 1
        if 'codigo_uf' in row and row['codigo_uf'] not in states:
            invalid_codes += 1
        if 'ncm' in row and not re.fullmatch(r'03\d{6}', row['ncm'] or ''):
            invalid_ncm += 1
    for count, message in [(invalid_codes, 'Códigos territoriais inválidos ou fora da referência local.'),
                           (invalid_years, 'Anos inválidos.'), (invalid_ncm, 'NCM inválida ou fora do capítulo 03.')]:
        if count:
            errors.append(f'{count}: {message}')
    if numeric_invalid:
        errors.append('Medidas inválidas: ' + str(dict(numeric_invalid)))
    duplicates = len(rows) - len({tuple(row.get(c) for c in columns) for row in rows})
    if duplicates:
        warnings.append(f'{duplicates} linhas idênticas; nenhuma removida automaticamente.')
    required = ['id', 'title', 'source', 'license', 'license_url', 'coverage', 'notes']
    missing_metadata = [key for key in required if not metadata.get(key)]
    if missing_metadata:
        errors.append('Metadados obrigatórios ausentes: ' + ', '.join(missing_metadata))
    declared_rows = entry.get('rows')
    if declared_rows is not None and declared_rows != len(rows):
        errors.append('Quantidade de linhas diverge do catálogo.')
    unknown = [c for c in columns if not dictionary.get(c)]
    if unknown:
        warnings.append('Definições a completar: ' + ', '.join(unknown))
    if any(empty[c] for c in UNITS if c in columns):
        warnings.append('Medidas ausentes preservadas; não houve preenchimento por zero.')
    if year_values and max(year_values) - min(year_values) + 1 != len(year_values):
        warnings.append('Há anos sem registros entre o início e o fim da cobertura.')
    primary = metadata.get('original_file') or metadata.get('input_file')
    original_hash = metadata.get('original_sha256')
    if primary and original_hash and (ROOT / primary).is_file():
        if hashlib.sha256((ROOT / primary).read_bytes()).hexdigest() != original_hash:
            errors.append('Hash do insumo original diverge dos metadados.')
    transformations = metadata.get('transformations') or [metadata.get('notes', entry.get('notes', 'Consultar os métodos da fonte.'))]
    return {
        'id': entry['id'], 'file': entry['file'], 'metadata_file': entry['metadata_file'],
        'sha256': digest, 'bytes': len(content), 'rows': len(rows), 'columns': columns,
        'units': {c: UNITS[c] for c in columns if c in UNITS}, 'dictionary': dictionary,
        'missing_by_column': {c: empty[c] for c in columns}, 'duplicate_rows': duplicates,
        'years': sorted(year_values), 'municipalities': sorted(codes),
        'errors': errors, 'warnings': warnings, 'passed': not errors,
        'source': entry['source'], 'license': entry['license'],
        'license_evidence': entry.get('license_evidence') or entry['license_url'],
        'coverage': entry['coverage'], 'limitations': entry.get('notes', ''),
        'transformations': transformations, 'prepared_at': metadata.get('prepared_at') or entry.get('prepared_at'),
        'processing_date_note': 'Não registrada' if not (metadata.get('prepared_at') or entry.get('prepared_at')) else None,
        'reproduction': metadata.get('reproduction') or metadata.get('managed_by') or entry.get('managed_by'),
        'checks': ['SHA-256 e tamanho', 'Cabeçalho e estrutura CSV', 'Metadados obrigatórios',
                   'Ano de referência', 'Medidas numéricas e unidades', 'Ausências e duplicatas',
                   'Códigos IBGE e NCM quando presentes'],
    }

def main():
    catalog = json.loads((OUT / 'catalog.json').read_text())
    states = json.loads((OUT / 'municipal.json').read_text())['states']
    municipalities = set()
    for path in (OUT / 'municipios').glob('*.geojson'):
        for feature in json.loads(path.read_text())['features']:
            props = feature['properties']
            code = props.get('codarea') or props.get('CD_MUN') or props.get('id')
            if code:
                municipalities.add(str(code))
    # The municipal JSON contains the same IBGE reference used by the dashboard.
    municipalities.update(json.loads((OUT / 'municipal.json').read_text())['municipalities'])
    fishing = json.loads((OUT / 'municipal-fishing.json').read_text())
    prepared = [item for item in catalog['items'] if item['access'] == 'prepared']
    arraial = dict(fishing['sources']['arraial'], file='downloads/pesca-municipal-arraial-1992-2008.csv',
                   metadata_file='downloads/pesca-municipal-arraial-1992-2008.metadata.json')
    files = [audit_csv(OUT, item, municipalities, states) for item in [*prepared, arraial]]
    by_id = {item['id']: item for item in files}
    for item in catalog['items']:
        status = 'integrated' if item['id'] in INTEGRATED else 'prepared' if item['access'] == 'prepared' else 'reference'
        review = by_id.get(item['id'])
        item['availability'] = {'status': status, 'views': INTEGRATED.get(item['id'], []),
            'validation_scope': 'Arquivo local' if review else 'Metadados da referência; valores não validados nesta etapa'}
        if review:
            item['validation'] = {k: review[k] for k in ['passed', 'errors', 'warnings', 'units', 'years', 'missing_by_column', 'checks']}
            item['quality'].setdefault('dictionary', {}).update(review['dictionary'])
        if 'versão na fonte' in item['license']:
            item['license_review'] = {'status': 'pending', 'note': 'Versão CC BY não reconfirmada nesta etapa; verificar o repositório antes de integrar ou redistribuir.'}
    # Only this source had its precise version confirmed during this review.
    hydro = next(item for item in catalog['items'] if item['id'] == 'doi:10.4211/hs.de4190f0eff74b09a5e0844a0de482a5')
    hydro.update(license='CC BY 4.0', license_url='https://creativecommons.org/licenses/by/4.0/',
                 license_evidence='https://www.hydroshare.org/resource/de4190f0eff74b09a5e0844a0de482a5/', metadata_reviewed_at='2026-10-04')
    hydro['license_review'] = {'status': 'partial', 'note': 'CC BY 4.0 confirmada na página. O README condiciona captura global e comentários estendidos a autorizações; esses componentes não foram integrados.'}
    counts = dict(Counter(item['availability']['status'] for item in catalog['items']))
    fingerprint = hashlib.sha256(json.dumps([{k: f[k] for k in ['id', 'sha256']} for f in files], sort_keys=True).encode()).hexdigest()
    version = 'quality-1.0-' + fingerprint[:12]
    summary = {'catalog_items': len(catalog['items']), 'statuses': counts, 'local_csv_files': len(files),
        'passed_files': sum(f['passed'] for f in files), 'failed_files': sum(not f['passed'] for f in files),
        'license_pending': sum(item.get('license_review', {}).get('status') == 'pending' for item in catalog['items']),
        'license_partial': sum(item.get('license_review', {}).get('status') == 'partial' for item in catalog['items'])}
    report = {'schema_version': 1, 'version': version, 'reviewed_at': date.today().isoformat(), 'summary': summary,
        'scope': 'Validação estrutural de cópias locais. Não certifica a coleta nem a disponibilidade atual dos servidores externos. Ausências permanecem ausentes.',
        'files': files}
    catalog['quality_audit'] = {k: report[k] for k in ['version', 'reviewed_at', 'summary', 'scope']}
    (OUT / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    dump(OUT / 'quality-audit.json', report)
    history_path = OUT / 'updates.json'
    history = json.loads(history_path.read_text()) if history_path.exists() else {'entries': []}
    entry = {'id': version, 'date': report['reviewed_at'], 'title': 'Etapa 5 · qualidade e rastreabilidade',
        'description': 'Verificação dos CSVs locais, fichas de validação, distinção entre referência, arquivo preparado e dado integrado. Uma versão CC BY reconfirmada e duas pendentes sinalizadas. Sem alteração das observações.',
        'source_baseline': 'a51301eb7b29a98fa3cb4d1b742f4d6686c4adaa', 'report': 'quality-audit.json'}
    if not any(e['id'] == version for e in history['entries']):
        history['entries'].insert(0, entry)
    dump(history_path, history)
    with (OUT / 'downloads/quality-manifest.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(['id', 'arquivo', 'linhas', 'bytes', 'sha256', 'verificacao_local', 'anos_disponiveis', 'licenca', 'fonte', 'revisao', 'versao'])
        for f in files:
            writer.writerow([f['id'], f['file'], f['rows'], f['bytes'], f['sha256'], 'passou' if f['passed'] else 'pendente', '|'.join(map(str, f['years'])), f['license'], f['source'], report['reviewed_at'], version])
    print(json.dumps(summary, ensure_ascii=False))
    if summary['failed_files']:
        for f in files:
            if not f['passed']:
                print(f['id'], f['errors'])
        raise SystemExit(1)

if __name__ == '__main__':
    main()
