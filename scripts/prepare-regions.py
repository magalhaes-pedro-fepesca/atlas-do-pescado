import json,pathlib,urllib.request,gzip
root=pathlib.Path(__file__).resolve().parents[1]
raw=root.parent
states={}
for code,abbr in [('15','PA'),('16','AP'),('21','MA'),('28','SE'),('13','AM'),('11','RO')]:
 file=raw/('pa-territory.json' if code=='15' else code+'-territory.json')
 if file.exists():data=json.load(open(file))
 else:
  with urllib.request.urlopen(f'https://servicodados.ibge.gov.br/api/v1/localidades/estados/{code}/municipios',timeout=45) as response:content=response.read()
  if content[:2]==b'\x1f\x8b':content=gzip.decompress(content)
  data=json.loads(content)
 regions={};municipalities={} 
 for m in data:
  r=m['regiao-imediata']; k=str(r['id']);regions.setdefault(k,{'id':k,'name':r['nome'],'municipalities':[]})['municipalities'].append(str(m['id']))
  municipalities[str(m['id'])]={'id':str(m['id']),'name':m['nome'],'region':k}
 states[code]={'id':code,'abbr':abbr,'name':data[0]['regiao-imediata']['regiao-intermediaria']['UF']['nome'],'regions':regions,'municipalities':municipalities,'source_url':f'https://servicodados.ibge.gov.br/api/v1/localidades/estados/{code}/municipios'}
law='https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8777.htm'
common={'instituicao':'IBGE','tipo_de_acesso':'Público, sem autenticação','licenca':'Livre utilização — Decreto 8.777/2016, art. 4º, redação do Decreto 9.903/2019','licenca_url':law,'licenca_verificada':True,'redistribuicao':True,'atribuicao':'IBGE; indicar recorte e transformações do Atlas do Pescado','restricoes':'Não reconstruir dados protegidos. Não sugerir endosso do IBGE.','status':'APROVADO','condicoes_atendidas':True,'cobertura':['15','16','21','28','13','11'],'data_verificacao':'2026-10-01'}
ppm={**common,'id':'ibge-municipal-regional','dataset':'Produção aquícola municipal','categoria':'Aquicultura','fonte_original':'IBGE — PPM / SIDRA, tabela 3940','url_oficial':'https://sidra.ibge.gov.br/tabela/3940','url_consulta':'https://apisidra.ibge.gov.br/values/t/3940/n6/all/v/214/p/2024/c654/all','data_acesso':'2026-09-27','data_atualizacao':'2026-09-27','periodo':'2024','versao':'Cópia municipal do Atlas de 27/09/2026','transformacao':'Produtos finais em kg; kg ÷ 1.000 = toneladas. Agregado Peixes excluído para evitar duplicação. Filtro territorial por códigos IBGE.','limitacoes':'A cópia preserva somente observações numéricas em kg. Ausências e supressões não podem ser distinguidas nesta cópia; não significam zero. Somatórios são parciais dos registros disponíveis, não estimativas de produção total.'}
territory={**common,'id':'ibge-territory','dataset':'Divisão territorial e malhas municipais','categoria':'Dados geográficos','fonte_original':'IBGE — API de Localidades e API de Malhas','url_oficial':'https://servicodados.ibge.gov.br/api/docs/localidades','url_malhas':'https://servicodados.ibge.gov.br/api/docs/malhas?versao=3','data_acesso':'2026-10-01 (localidades); 2026-09-27 (malhas existentes)','data_atualizacao':'2026-10-01','periodo':'Classificação regional 2017; composição consultada em 01/10/2026','versao':'API Localidades v1; malhas simplificadas existentes no Atlas','transformacao':'Seleção dos seis estados. Associação por código IBGE. Mapas regionais compostos pelas geometrias municipais, sem inferência de valores estatísticos.','limitacoes':'Geometrias simplificadas para navegação, não apropriadas para desenho técnico, demarcação ou medição. Municípios sem observações estatísticas continuam cadastrados.'}
result={'schema_version':1,'updated':'2026-10-01','classification':'Regiões Geográficas Imediatas — IBGE (2017)','classification_url':'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/divisao-regional/15778-divisoes-regionais-do-brasil.html','states':states,'datasets':[ppm,territory]}
(root/'dist/regions.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
print({s['abbr']:(len(s['regions']),len(s['municipalities'])) for s in states.values()})
