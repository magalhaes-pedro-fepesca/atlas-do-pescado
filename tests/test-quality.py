"""Exercise corruption, territorial validation, missing data and schema failures."""
import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('quality', ROOT / 'scripts/audit-quality.py')
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)

with tempfile.TemporaryDirectory() as temp:
    base = Path(temp)
    entry = {'id': 'test', 'file': 'data.csv', 'metadata_file': 'meta.json',
        'title': 'Fixture', 'source': 'https://example.org', 'license': 'CC BY 4.0',
        'license_url': 'https://creativecommons.org/licenses/by/4.0/', 'coverage': '2020–2022',
        'notes': 'Fixture, no inference.'}
    def run(content, corrupt=False, columns=None):
        (base / 'data.csv').write_bytes(content.encode())
        meta = dict(entry, quality={'sha256': 'wrong' if corrupt else hashlib.sha256(content.encode()).hexdigest(),
                                   'columns': columns or ['ano', 'codigo_municipio', 'producao_t']})
        (base / 'meta.json').write_text(json.dumps(meta))
        return quality.audit_csv(base, entry, {'1506807'}, {'15': 'Pará'})
    valid = 'ano,codigo_municipio,producao_t\n2020,1506807,0\n2022,1506807,\n'
    result = run(valid)
    assert result['passed']
    assert result['missing_by_column']['producao_t'] == 1
    assert result['years'] == [2020, 2022]
    assert (base / 'data.csv').read_text() == valid
    assert not run(valid, corrupt=True)['passed']
    assert not run(valid.replace('1506807', '9999999'))['passed']
    assert not run(valid.replace(',0\n', ',-1\n'))['passed']
    assert not run(valid.replace('2020', '20XX'))['passed']
    assert not run(valid, columns=['wrong'])['passed']
    assert not run('ano,codigo_municipio,producao_t\n2020,1506807,0,extra\n')['passed']

report = json.loads((ROOT / 'dist/quality-audit.json').read_text())
assert report['summary']['failed_files'] == 0
catalog = json.loads((ROOT / 'dist/catalog.json').read_text())
assert all(item['availability']['status'] == 'reference' for item in catalog['items'] if item.get('license_review', {}).get('status') in {'pending', 'partial'})
assert report['summary']['license_pending'] == 2
print('PASS corruption, codes, negatives, years, schema, malformed CSV, zero/missing distinction and license gating')
