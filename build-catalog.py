"""Build catalog from reviewed DataCite metadata and official MDIC links.

DataCite DOI metadata are identifiers, not experimental observations. Full
research files are not mirrored. All public catalog items carry permission
evidence; generic webpage visibility is never used as a reuse license.
"""
import collections,csv,html,json,re,urllib.parse
from pathlib import Path
from lxml import html as lhtml
ROOT=Path(__file__).parent;OUT=ROOT/'dist';RAW=ROOT/'data-input'
LEGAL='https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8777.htm'
FAO_LICENSE='https://www.fao.org/contact-us/terms/db-terms-of-use/'
MDIC='https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta'
FAO='https://www.fao.org/statistics/events/events-detail/global-production.-march-2026-update/en'
ITEMS=[]
def prepared(id,title,area,topic,filename,source,publisher,coverage,notes,fao=False):
 p=OUT/'downloads'/filename
 with p.open(encoding='utf-8-sig') as f: rows=sum(1 for _ in csv.reader(f))-1
 ITEMS.append(dict(id=id,title=title,area=area,topic=topic,access='prepared',scale='Mundo' if fao else 'Brasil',publisher=publisher,coverage=coverage,year=2026 if '2026' in coverage else 2025 if '2025' in coverage else 2024,description=notes,notes='Recorte processado pelo Atlas em 27/09/2026. Não representa uma nova fonte independente. Preserve a atribuição à fonte original e identifique conversões, filtros e agregações.',file='downloads/'+filename,source=source,license='CC BY 4.0 + termos FAO' if fao else 'Livre utilização · Decreto 8.777/2016, art. 4º',license_url=FAO_LICENSE if fao else LEGAL,formats=['CSV'],bytes=p.stat().st_size,rows=rows,featured=100))
prepared('fao-captura','Captura mundial por país e espécie','Pesca','Captura e desembarque','fao-cap-2015-2024.csv',FAO,'FAO · FishStat','2015–2024','Captura em toneladas de peso vivo por país, ano e espécie ou grupo. Inclui valores numéricos reportados e estimados pela FAO.',True)
prepared('mpa-captura','Pargo e sardinha: registros de captura','Pesca','Captura e desembarque','mpa-captura-registros-2021-2025.csv','https://www.gov.br/mpa/pt-br/acesso-a-informacao/dados-abertos-2','MPA','2021–2025','Recorte de registros recebidos do MPA. Não é a captura total nacional. O ano de 2025 está parcial.')
prepared('fao-aquicultura','Aquicultura mundial por país e espécie','Aquicultura','Produção e sistemas de cultivo','fao-aq-2015-2024.csv',FAO,'FAO · FishStat','2015–2024','Produção aquícola em toneladas de peso vivo, por país, ano e espécie ou grupo.',True)
prepared('ibge-uf','Aquicultura brasileira por estado','Aquicultura','Produção e sistemas de cultivo','ibge-aquicultura-uf-2013-2024.csv','https://sidra.ibge.gov.br/tabela/3940','IBGE · PPM / SIDRA 3940','2013–2024','Produção em toneladas e valor nominal em R$ milhões. Estados e produtos da aquicultura brasileira.')
prepared('ibge-municipio','Aquicultura brasileira por município','Aquicultura','Produção e sistemas de cultivo','ibge-aquicultura-municipios-2024.csv','https://sidra.ibge.gov.br/tabela/3940','IBGE · PPM / SIDRA 3940','2024','Produção municipal por produto, em toneladas. Dados ausentes ou protegidos não são convertidos em zero.')
prepared('mdic-ncm03','Comércio do pescado: recorte NCM 03','Comércio exterior','Recortes prontos para análise','mdic-comercio-pescado-ncm03-2022-2026.csv',MDIC,'MDIC · Comex Stat','2022–ago. 2026','Exportações e importações por país, UF e NCM; quilogramas líquidos e dólares FOB. Inclui apenas capítulo 03. Conservas, óleos e farinhas ficam fora deste recorte.')

topic_map={
 'Qualidade de filés e alimentos aquáticos':'Qualidade e análise sensorial',
 'Processos e ingredientes do pescado':'Processamento e produtos',
 'Tecnologias de conservação de crustáceos':'Embalagens e cadeia do frio',
 'Valorização de coprodutos':'Resíduos e bioprodutos',
 'Produtos e conservação de espécies comerciais':'Embalagens e cadeia do frio',
 'Produtos fermentados e reestruturados':'Processamento e produtos'}
research=json.loads((RAW/'research-selected.json').read_text())
for r in research:
 lic=r['license'].lower()
 if 'cc0' in lic or 'public domain' in lic: label='CC0';licurl='https://creativecommons.org/publicdomain/zero/1.0/'
 elif 'by-sa' in lic or 'share alike' in lic or 'sharealike' in lic:label='CC BY-SA (versão na fonte)';licurl='https://api.datacite.org/dois/'+r['doi']
 else:label='CC BY (versão na fonte)';licurl='https://api.datacite.org/dois/'+r['doi']
 topic=topic_map.get(r['topic'],r['topic'])
 if 'cc-by-4.0' in lic or 'attribution 4.0' in lic:label='CC BY 4.0'
 if 'cc-by-3.0' in lic or 'attribution 3.0' in lic:label='CC BY 3.0'
 title=r['title']
 # Original catalog metadata are CC0. Full titles and attribution retained.
 ITEMS.append(dict(id='doi:'+r['doi'],title=title,area=r['area'],topic=topic,access='research',scale='Mundo',publisher=r['publisher'],year=r['year'],description='Conjunto de pesquisa sobre '+topic.lower()+'. Título original preservado para localizar e citar o estudo.',notes='Dataset registrado no DataCite com licença aberta declarada pelo repositório. O Atlas cataloga metadados; os arquivos, métodos, local e período de coleta devem ser consultados na fonte. Ano exibido é o de publicação. Licença declarada: '+r['license'],source=r['source'],license=label,license_url=licurl,license_evidence='https://api.datacite.org/dois/'+r['doi'],doi=r['doi'],creators=r['creators'],formats=r['formats'],tags=r['subjects'],featured=0))

# Annual files are explicitly parts of the same Comex Stat database, not
# 70 independent institutions or fish-only tables.
doc=lhtml.fromstring((RAW/'mdic.html').read_bytes())
links=set(a.get('href') for a in doc.xpath('//a[@href]'))
raw_count=0
for year in range(2026,1996,-1):
 for flow,label in [('EXP','Exportações'),('IMP','Importações')]:
  for kind in ['ncm']+(['mun'] if year>=2022 else []):
   suffix=f'{flow}_{year}'+('_MUN' if kind=='mun' else '')+'.csv'
   url=next((u for u in links if u.endswith('/'+suffix) and '/'+kind+'/' in u),None)
   if not url:raise ValueError('Official URL not found: '+suffix)
   muni=kind=='mun'; topic='Municípios exportadores e importadores' if muni else ('Histórico de exportações' if flow=='EXP' else 'Histórico de importações')
   note=('Arquivo anual de todos os produtos. Filtre CO_SH4 por grupos do pescado. Contém município fiscal do exportador/importador; não equivale ao município produtor.' if muni else 'Arquivo anual de todos os produtos. Filtre CO_NCM para pescado. Contém mês, produto, país, UF, via de transporte, alfândega, quantidade, peso líquido e valor FOB.')
   ITEMS.append(dict(id='mdic-'+suffix,title=f'{label} {year} · '+('município / SH4' if muni else 'NCM, país, UF e logística'),area='Comércio exterior',topic=topic,access='portal',scale='Brasil',publisher='MDIC · Comex Stat',year=year,coverage=f'jan–ago. {year} (parcial)' if year==2026 else str(year),description=note,notes='Partição anual da mesma base Comex Stat. Arquivo bruto volumoso, não limitado ao pescado. Use o roteiro R disponível na área de comércio para isolar capítulo 03, preparações 1604/1605, óleos de peixe 150410/150420 e farinhas 230120; revise códigos históricos e exclusões. Consulte as tabelas auxiliares oficiais. A disponibilidade do servidor de origem pode variar.',source=MDIC,file=url,license='Livre utilização · Decreto 8.777/2016, art. 4º',license_url=LEGAL,formats=['CSV ;'],featured=20 if year>=2024 else 1))
   raw_count+=1
assert raw_count==70,raw_count
for i,title,area,topic,desc in [
 ('trade','Comércio mundial de produtos aquáticos','Comércio exterior','Comércio internacional', 'Coleção FAO de importações, exportações e reexportações, em volume e valor. Consulte país, produto, parceiros e período no portal.'),
 ('processed','Produção mundial de pescado processado','Tecnologia do pescado','Processamento e produtos','Coleção FAO de produção de produtos aquáticos processados e conservados. Consulte a edição, os países e a cobertura disponíveis.')]:
 ITEMS.append(dict(id='fao-'+i,title=title,area=area,topic=topic,access='portal',scale='Mundo',publisher='FAO · FishStat',coverage='Consultar edição na fonte',description=desc,source='https://www.fao.org/statistics/data-collection/fishery-and-aquaculture/en',license='CC BY 4.0 + termos FAO',license_url=FAO_LICENSE,formats=[],featured=30))

meta=dict(checked='28/09/2026',generated='2026-09-28',items=ITEMS,counts=dict(collections.Counter(x['area'] for x in ITEMS)),policy='Apenas licenças abertas explícitas ou autorização pública verificável. CC BY-NC/ND e licenças não identificadas ficam fora da seleção de pesquisa. Anos de publicação não são períodos de coleta. Arquivos anuais são identificados como partições da mesma fonte.')
(OUT/'catalog.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')))
print('CATALOG',len(ITEMS),meta['counts'])

# Preserve independently reviewable rights/provenance evidence in source.
evidence={'retrieved':'2026-09-28','government_authorization':LEGAL,'fao_terms':FAO_LICENSE,'datacite_metadata_terms':'https://datacite.org/terms.html','research':[dict(doi=r['doi'],title=r['title'],license=r['license'],metadata='https://api.datacite.org/dois/'+r['doi'],source=r['source'],retrieved=r['retrieved'],query=r['query_url']) for r in research]}
(ROOT/'catalog-provenance.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))

NEWS=[
 ('entrega-do-primeiro','Aquicultura','Uso de águas da União para cultivo no Amazonas','O MPA informa a entrega de uma cessão para produção de tambaqui em Iranduba.'),
 ('pesquisa-sustentabilidade','Pesca','Pesquisa e sustentabilidade da pesca amazônica','Agenda em Manaus reuniu universidade e debate sobre inovação e sustentabilidade do setor.'),
 ('nova-tecnologia','Tecnologia do pescado','Guinchos elétricos em teste na frota pesqueira','Projeto do MPA e da UFJF avalia equipamentos para reduzir ruído e emissões nas operações de pesca.'),
 ('pesca-industrial-em-debate','Pesca','Agenda da pesca industrial no Pará','Notícia institucional sobre o debate com o setor pesqueiro paraense.'),
 ('el-nino-dados-do-observatorio','Aquicultura','Dados amazônicos para planejamento diante do El Niño','O MPA apresenta o Observatório da Torre Alta da Amazônia como referência para acompanhar processos ambientais.'),
 ('encerramento-temporada','Pesca','Comunicado sobre a temporada do pargo em 2026','A publicação do MPA trata do encerramento da temporada após o limite de captura indicado pelo órgão.'),
 ('brasil-debate-futuro','Comércio exterior','Debate nacional sobre subsídios à pesca','Encontro em Brasília discutiu a implementação do acordo da OMC com participantes da ciência e do setor pesqueiro.'),
 ('no-marrocos','Comércio exterior','Cooperação e comércio de pescado com o Marrocos','Seminário bilateral abordou investimentos, comércio e parcerias na pesca e na aquicultura.')
]
doc=lhtml.fromstring((RAW/'mpa-news.html').read_bytes());news=[]
for term,area,title,summary in NEWS:
 a=next(a for a in doc.xpath('//h2/a[@href]') if term in a.get('href',''))
 date=' '.join(a.getparent().getparent().xpath('.//span[@class="data"]/text()')).strip()
 day,month,year=date.split('/');date=f'{year}-{month}-{day}'
 if date>'2026-09-28':raise ValueError('Future news')
 news.append(dict(title=title,area=area,summary=summary,date=date,publisher='MPA',url=a.get('href')))
news.sort(key=lambda x:x['date'],reverse=True)
(OUT/'news.json').write_text(json.dumps(dict(checked='2026-09-28',automatic=False,items=news,channels=[{'title':'MPA · notícias','url':'https://www.gov.br/mpa/pt-br/assuntos/noticias'},{'title':'Embrapa · pesquisa e inovação','url':'https://www.embrapa.br/en/web/pesca-e-aquicultura/busca-de-noticias'},{'title':'FAO · estatísticas e publicações','url':'https://www.fao.org/statistics/en'},{'title':'MDIC · comércio exterior','url':'https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior'}]),ensure_ascii=False,indent=2))
print('NEWS',len(news))
