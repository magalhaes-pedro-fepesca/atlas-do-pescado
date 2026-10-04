"""Reproduce curated subsets and audit local prepared files; no remote refresh."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist'
DATE = '2026-10-04'
catalog = json.loads((OUT / 'catalog.json').read_text())
items = catalog['items']
by_id = {x['id']: x for x in items}
definitions = {
    'ano': 'Ano de referência da observação.',
    'codigo_uf': 'Código IBGE da unidade da federação, tratado como texto.',
    'uf': 'Nome da unidade da federação.',
    'codigo_municipio': 'Código IBGE de sete dígitos, tratado como texto.',
    'municipio': 'Nome do município na cópia preparada.',
    'codigo_produto': 'Código do produto no SIDRA, tratado como texto.',
    'produto': 'Nome do produto na fonte.',
    'producao_t': 'Produção em toneladas; ausência/sigilo não equivale a zero.',
    'valor_milhoes_reais_nominais': 'Valor em milhões de reais correntes, sem deflação.',
    'fluxo': 'Exportação ou importação, mantidas separadas.',
    'pais_parceiro': 'País parceiro comercial.',
    'uf_produto': 'UF do produto; não identifica município ou endereço da empresa.',
    'ncm': 'Código NCM de oito dígitos, tratado como texto; capítulo 03 apenas.',
    'peso_liquido_kg': 'Peso líquido em quilogramas; não é peso vivo.',
    'valor_fob_usd': 'Valor FOB em dólares correntes.',
}

for code, state in [('15', 'Pará'), ('16', 'Amapá')]:
    for parent, suffix, label, predicate in [
        ('ibge-uf', 'serie-2013-2024', 'Aquicultura por produto e ano', lambda r: r['codigo_uf'] == code),
        ('ibge-municipio', 'municipios-2024', 'Aquicultura por município e produto', lambda r: r['codigo_municipio'].startswith(code)),
        ('mdic-ncm03', 'comercio-2022-2025', 'Comércio exterior de pescado · NCM 03', lambda r: r['uf_produto'] == state and int(r['ano']) <= 2025),
    ]:
        original = by_id[parent]
        with (OUT / original['file']).open(encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            rows = [r for r in reader if predicate(r)]
        assert rows, (code, parent)
        file = f'downloads/atlas-{code}-{suffix}.csv'
        with (OUT / file).open('w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, headers)
            writer.writeheader()
            writer.writerows(rows)
        identifier = f'curated-{code}-{suffix}'
        years = sorted({int(r['ano']) for r in rows})
        notes = ('Filtragem da cópia preparada existente; valores e colunas preservados. '
                 'Nenhuma atualização remota da série ou imputação. Ausência não é zero. '
                 'Não constitui nova fonte independente. ')
        if parent == 'mdic-ncm03':
            notes += 'Somente capítulo NCM 03; produtos processados de outros capítulos excluídos. Ano parcial de 2026 excluído. Peso líquido e US$ FOB; UF do produto.'
        else:
            notes += 'PPM/SIDRA 3940; produção em toneladas. Valores monetários, quando presentes, são nominais. Produtos juvenis e unidades incompatíveis já excluídos na cópia de origem.'
        entry = dict(original, id=identifier, title=f'{state} · {label}', file=file,
                     coverage=str(years[0]) if len(years) == 1 else f'{years[0]}–{years[-1]}',
                     year=years[-1], description=f'Recorte de {state} pronto para análise, com as observações disponíveis da cópia do Atlas.',
                     notes=notes, parent_dataset_id=parent, layer='treated', prepared_at=DATE,
                     metadata_reviewed_at=DATE, featured=110,
                     source_checked_at=DATE, source_check_scope='Página institucional e condições gerais; não houve nova coleta de dados.')
        entry.pop('quality', None)
        if identifier in by_id:
            items[items.index(by_id[identifier])] = entry
        else:
            items.append(entry)
        by_id[identifier] = entry

audit = []
for x in items:
    x.setdefault('layer', 'treated' if x['access'] == 'prepared' else 'source_reference')
    if x['access'] != 'prepared':
        continue
    if x.get('managed_by') in ('prepare-fisheries.py', 'prepare-santarem-fishing.py', 'prepare-municipal-fishing.py'):
        path = OUT / x['file']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == x['quality']['sha256']
        assert (OUT / x['metadata_file']).exists()
        audit.append({'id': x['id'], 'file': x['file'], 'rows': x['rows'], 'sha256': x['quality']['sha256']})
        continue
    path = OUT / x['file']
    with path.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        rows = list(reader)
    assert len({tuple(r.values()) for r in rows}) == len(rows), f'Duplicate rows: {x["id"]}'
    assert all(None not in r for r in rows), f'Malformed CSV: {x["id"]}'
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    x.update(rows=len(rows), bytes=path.stat().st_size)
    x['quality'] = {'checked_at': DATE, 'scope': 'Estrutura e integridade da cópia local; não certifica a coleta original.',
                    'sha256': digest, 'duplicate_rows': 0, 'columns': headers,
                    'dictionary': {h: definitions.get(h, 'Campo preservado da cópia preparada; consultar a metodologia da fonte.') for h in headers}}
    x['metadata_file'] = x['file'].removesuffix('.csv') + '.metadata.json'
    metadata = {k: x[k] for k in ['id', 'title', 'source', 'license', 'license_url', 'coverage', 'notes', 'layer', 'quality']}
    metadata.update(parent_dataset_id=x.get('parent_dataset_id'), prepared_at=x.get('prepared_at', '2026-09-27'),
                    input_file=by_id[x['parent_dataset_id']]['file'] if x.get('parent_dataset_id') else None,
                    reproduction='scripts/prepare-foundation.py' if x.get('parent_dataset_id') else 'Consultar os scripts originais build-*.py; arquivos brutos não estão neste checkout.')
    (OUT / x['metadata_file']).write_text(json.dumps(metadata, ensure_ascii=False, indent=2))
    audit.append({'id': x['id'], 'file': x['file'], 'rows': len(rows), 'sha256': digest})
catalog['counts'] = dict(Counter(x['area'] for x in items))
catalog['foundation'] = {'reviewed_at': DATE, 'prepared_files': len(audit),
    'curated_subsets': sum(bool(x.get('parent_dataset_id')) for x in items),
    'scope': 'Revisão estrutural dos arquivos preparados locais. A data de revisão de cada referência aparece em seus detalhes. As séries preexistentes não foram atualizadas na fonte.'}
(OUT / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')))
(OUT / 'foundation-audit.json').write_text(json.dumps({'date': DATE, 'files': audit, 'scope': catalog['foundation']['scope']}, ensure_ascii=False, indent=2))
print(json.dumps(catalog['foundation'], ensure_ascii=False))
