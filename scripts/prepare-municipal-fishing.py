"""Extract only observed annual landing rows; retain original kg, avoid ambiguous source CPUE."""
from pathlib import Path
import zipfile,xml.etree.ElementTree as E,json,csv,hashlib
root=Path(__file__).resolve().parents[1]; d=root/'dist'; src=d/'downloads/sources/arraial-bender-2014-original.xlsx'
n={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
z=zipfile.ZipFile(src); rows=[]
for r in E.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//m:row',n):
 cells={''.join(filter(str.isalpha,c.attrib['r'])):c.find('m:v',n).text for c in r if c.find('m:v',n) is not None and c.attrib.get('t')!='s'}
 if cells.get('A','').isdigit() and 1992<=int(cells['A'])<=2008:
  rows.append(dict(codigo_ibge='3300258',municipio='Arraial do Cabo',uf='RJ',ano=int(cells['A']),especie='Pomatomus saltatrix',nome_comum='Anchova',desembarque_kg=int(cells['B']),desembarque_t=int(cells['B'])/1000,esforco_horas=int(cells['C'])))
assert len(rows)==17 and rows[0]['desembarque_kg']==131463
source='https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0110332'
meta=dict(id='pesca-municipal-arraial',title='Desembarque de anchova em Arraial do Cabo',source=source,license='CC BY 4.0',license_url='https://creativecommons.org/licenses/by/4.0/',citation='Bender et al. (2014), PLOS ONE 9(10): e110332. Data S1, aba landing.',coverage='Arraial do Cabo (RJ), 1992–2008, Pomatomus saltatrix',territory='Município de desembarque: Marina dos Pescadores, Porto do Forno. Não identifica a posição de captura.',notes='Somente uma espécie e um ponto de desembarque. Não representa o total municipal. Captura em kg e esforço em horas conforme métodos da fonte. CPUE original omitida por divergência de unidade entre planilha e texto; não foram usados dados de entrevistas nem censos subaquáticos.',managed_by='prepare-municipal-fishing.py',reproduction='python scripts/prepare-municipal-fishing.py',input_file=str(src.relative_to(root)),original_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),dictionary={'codigo_ibge':'Código do município de desembarque, associado pelo Atlas.','desembarque_kg':'Massa anual desembarcada em kg, coluna Captura original.','desembarque_t':'desembarque_kg dividido por 1000.','esforco_horas':'Esforço anual em horas de pesca conforme seção de métodos.','ano':'Ano original.','especie':'Espécie indicada na descrição do Data S1.'})
p=d/'downloads/pesca-municipal-arraial-1992-2008.csv'
with p.open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
meta['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
(d/'downloads/pesca-municipal-arraial-1992-2008.metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
(d/'municipal-fishing.json').write_text(json.dumps(dict(metadata=meta,rows=rows),ensure_ascii=False))
print('17 observações verificadas')
