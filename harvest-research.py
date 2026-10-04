"""Harvest openly licensed research datasets, retaining provenance and query.

Metadata are CC0 from DataCite. Dataset files remain with their publishers;
the Atlas never claims that metadata are the underlying experimental data.
"""
import concurrent.futures, hashlib, json, re, time, urllib.parse, urllib.request
from pathlib import Path

ROOT=Path(__file__).parent
CACHE=ROOT/'data-input'/'datacite'
CACHE.mkdir(parents=True,exist_ok=True)
TODAY='2026-09-28'
QUERIES={
 'Pesca': {
  'Estoques e avaliação pesqueira':'titles.title:("stock assessment" OR "fish stocks" OR "fish stock")',
  'Captura e desembarque':'titles.title:("fisheries catch" OR "fish catch" OR "fish landings" OR "fisheries landings")',
  'Esforço, frota e monitoramento':'titles.title:("fishing effort" OR "fishing vessels" OR "fishing activity")',
  'Pesca artesanal e comunidades':'titles.title:("small-scale fisheries" OR "artisanal fisheries" OR "fishing communities")',
  'Captura incidental e seletividade':'titles.title:(bycatch OR "fishing gear" OR "trawl selectivity")',
  'Ecologia e habitats pesqueiros':'titles.title:("reef fisheries" OR "inland fisheries" OR "marine fisheries")',
  'Gestão e sustentabilidade':'titles.title:("fisheries management" OR "fishing pressure" OR "fisheries sustainability")',
  'Economia e segurança alimentar':'titles.title:("fisheries economics" OR "fish consumption" OR "fisheries livelihoods")',
 },
 'Aquicultura': {
  'Produção e sistemas de cultivo':'titles.title:(aquaculture OR "fish farming")',
  'Nutrição e alimentação':'titles.title:((fish OR shrimp OR tilapia OR salmon) AND (feed OR diet OR fishmeal))',
  'Água, efluentes e ambiente':'titles.title:((aquaculture OR "fish farm") AND (water OR effluent OR environmental))',
  'Sanidade e biossegurança':'titles.title:((aquaculture OR tilapia OR salmon) AND (disease OR infection OR vaccine))',
  'Genética e reprodução':'titles.title:((aquaculture OR tilapia OR shrimp) AND (breeding OR genetic OR reproduction))',
  'Larvicultura e alevinagem':'titles.title:(hatchery OR "larval rearing" OR "fish larvae")',
  'Bioflocos e recirculação':'titles.title:(biofloc OR "recirculating aquaculture" OR aquaponic*)',
  'Maricultura, moluscos e algas':'titles.title:(mariculture OR "seaweed farming" OR "oyster aquaculture" OR "mussel farming")',
 },
 'Tecnologia do pescado': {
  'Conservação e vida útil':'titles.title:((fish OR seafood OR salmon OR shrimp) AND (preservation OR "shelf life" OR storage OR freshness))',
  'Embalagens e cadeia do frio':'titles.title:((fish OR seafood OR salmon OR shrimp) AND (packaging OR freezing OR frozen OR refrigeration))',
  'Processamento e produtos':'titles.title:((fish OR seafood OR salmon OR shrimp) AND (processing OR drying OR smoked OR smoking OR surimi OR fillet))',
  'Qualidade e análise sensorial':'titles.title:((fish OR seafood OR salmon OR shrimp) AND (texture OR sensory OR freshness OR spoilage))',
  'Segurança e contaminantes':'titles.title:((fish OR seafood OR tuna OR shellfish) AND (histamine OR mercury OR contaminant OR microplastic))',
  'Resíduos e bioprodutos':'titles.title:((fish OR seafood OR shrimp) AND (collagen OR gelatin OR hydrolysate OR byproduct OR chitosan))',
  'Composição e nutrição humana':'titles.title:((fish OR seafood OR salmon OR sardine) AND ("fatty acid" OR "nutritional composition" OR "lipid oxidation"))',
  'Rastreabilidade e autenticidade':'titles.title:((seafood OR fish OR salmon) AND (traceability OR authentication OR adulteration OR "species identification"))',
  'Qualidade de filés e alimentos aquáticos':'titles.title:((fillet OR seafood OR "fish meat" OR "fish muscle" OR "fish food") AND (quality OR preservation OR composition OR packaging OR storage OR processing))',
  'Processos e ingredientes do pescado':'titles.title:((fish OR shrimp OR seafood OR squid OR mussel OR oyster) AND ("protein hydrolysate" OR "cold chain" OR "food safety" OR "modified atmosphere" OR "fish sauce" OR "edible coating" OR "shelf-life" OR "nutritional value"))',
  'Tecnologias de conservação de crustáceos':'titles.title:((shrimp OR prawn OR crab OR mussel OR oyster OR squid OR trout OR tilapia) AND (freezing OR storage OR freshness OR packaging OR spoilage OR "shelf life"))',
  'Valorização de coprodutos':'titles.title:((fish OR shrimp OR seafood OR salmon) AND (gelatin OR collagen OR chitosan OR "by-products" OR "by products"))',
  'Produtos e conservação de espécies comerciais':'titles.title:((salmon OR tuna OR mackerel OR sardine OR cod OR herring OR squid OR mussel OR prawn OR tilapia OR trout) AND (fillet OR "shelf-life" OR "shelf life" OR freshness OR "food quality" OR "food safety" OR spoilage OR "cold chain" OR "edible coating"))',
  'Produtos fermentados e reestruturados':'titles.title:(surimi OR "fish sauce" OR "fish burger" OR "fish protein" OR "seafood preservation" OR "seafood packaging")',
 }
}

def fetch(job):
 area,topic,query=job
 query+=' AND publicationYear:[1990 TO 2026]'
 url='https://api.datacite.org/dois?'+urllib.parse.urlencode({'query':query,'resource-type-id':'dataset','page[size]':100,'sort':'relevance'})
 path=CACHE/(hashlib.sha256(url.encode()).hexdigest()[:18]+'.json')
 if not path.exists():
  for attempt in range(3):
   try:
    req=urllib.request.Request(url,headers={'User-Agent':'AtlasDoPescado/1.0','Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=50) as r: raw=r.read()
    obj=json.loads(raw);path.write_bytes(raw);break
   except Exception as e:
    if attempt==2:return area,topic,url,[],str(e)
    time.sleep(1+attempt)
 obj=json.loads(path.read_text())
 return area,topic,url,obj.get('data',[]),None

def clean(text):return re.sub('<[^>]+>',' ',text or '').strip()
def is_open(rights):
 s=' '.join(str(v) for r in rights for v in r.values()).lower()
 return any(x in s for x in ['creativecommons.org/publicdomain','creativecommons.org/licenses/by/','creativecommons.org/licenses/by-sa/','cc-by-4.0','cc-by-3.0','cc0-1.0','cc0 1.0','cc by 4.0','cc-by-sa-4.0']) and not any(x in s for x in ['by-nc','by-nd'])

jobs=[(a,t,q) for a,topics in QUERIES.items() for t,q in topics.items()]
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for a,t,u,records,error in pool.map(fetch,jobs):
  entries=[]
  for record in records:
   r=record['attributes'];title=clean((r.get('titles') or [{}])[0].get('title',''))
   if not title or not is_open(r.get('rightsList',[])) or not r.get('url'):continue
   if r.get('publicationYear',9999)>2026:continue
   if any(d.get('dateType') in ['Available','Issued'] and d.get('date','')[:10]>TODAY for d in r.get('dates',[]) if len(d.get('date',''))>=10):continue
   entries.append({'doi':r['doi'],'title':title,'area':a,'topic':t,'publisher':r.get('publisher','Repositório de pesquisa'),'year':r.get('publicationYear'),'source':'https://doi.org/'+r['doi'],'landing':r['url'],'license':'; '.join(x.get('rightsIdentifier') or x.get('rights') or x.get('rightsUri','') for x in r.get('rightsList',[])),'formats':r.get('formats',[]),'sizes':r.get('sizes',[]),'creators':[x.get('name','') for x in r.get('creators',[])][:8],'query_url':u,'retrieved':TODAY,'related':r.get('relatedIdentifiers',[]),'subjects':[s.get('subject','') for s in r.get('subjects',[])][:10]})
  results.append({'area':a,'topic':t,'candidates':entries,'error':error})
  print(a,t,len(entries),error or '',flush=True)
(ROOT/'data-input'/'research-candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
