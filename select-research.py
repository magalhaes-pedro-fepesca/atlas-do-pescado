"""Stratified selection with version, study and subject deduplication."""
import collections,html,json,re
from pathlib import Path
ROOT=Path(__file__).parent
groups=json.loads((ROOT/'data-input/research-candidates.json').read_text())
EXCLUDE=['zebrafish','drosophila','mouse','mice','alzheimer','retina','embryonic','embryo','covid','equine','mares fed','phonating','ancient caribbean','hermit crab','eusocial snapping','dentists','stickleback','grass shrimp collection','sorghum','piptadenia','fish drying rack','calcofi','radiales nw','euthanasia','formalin fixed','eyeing dna','sprat and sardine fish larvae','literature review','metadata:','additional file 2 of salmon gut','cpdna coi']
EXCLUDE += ['weakly electric','sensory organ','sensory landscapes','texture encoding','sediment core','54-million','fish eggs','fish energetics','cortisol','us fish processing market','antarctic fish genera','seston','plastic carbon treatments','museum specimens','strains growth','strain dan39','neural','phylogenetic','fossil','sperm storage','trout creek','geological storage','storage leak','archaeological','review and hypothesis','fish lifetime exposure','moose project','tadpole shrimp','fish debris','fish sensory','sensory drive','macrophage','caffeine','wastewater effluent sampling','metadata record','triglyceride','replication code for','feline lung','obese, insulin','drying out fish ponds','amphiprion ocellaris','dragonflies','sediment records','systemic failure of european']
def key(r):
 t=html.unescape(r['title']).lower()
 t=re.sub(r'\s+v\d+(?:\.\d+)*.*$','',t)
 if t.startswith('ihh -'):return 'illuminatinghiddenharvests'
 t=re.sub(r'^(data\s*(from|for)|supplementary\s*(data|material)|additional file \d+ of|supporting\s*(data|information|documents))\s*:?\s*','',t)
 return re.sub('[^a-z0-9]','',t)
def family(r):
 d=r['doi']
 if d.startswith('10.18710/') and d.count('/')>1:return '/'.join(d.split('/')[:2])
 if 'figshare' in d:return re.sub(r'\.v\d+$','',d)
 if d.startswith('10.17632/'):return re.sub(r'\.\d+$','',d)
 if 'zenodo' in d:
  for x in r.get('related',[]):
   if x.get('relationType')=='IsVersionOf' and x.get('relatedIdentifierType')=='DOI':return x['relatedIdentifier'].lower()
 return d
def suitable(r):
 t=html.unescape(r['title']).lower()
 if any(x in t for x in EXCLUDE):return False
 if any(x in r['license'].lower() for x in ['restricted','embargo','noncommercial','non-commercial','by-nc','by-nd']):return False
 if r['area']=='Tecnologia do pescado':
  if any(x in t for x in ['sensory specializations','sensory bias','surviving winter','survival skills','medaka','mormyrid']):return False
  if not re.search(r'seafood|shelf.?life|freshness|fillet|gelatin|gelatine|collagen|hydrolysate|fish.{0,12}dry|dry.{0,12}fish|fish.{0,12}preserv|fish.{0,12}processing|nutritional|sensory test|fatty acid.{0,20}(profiles|composition)|mercury|fish.{0,10}(sauce|burger)|organoleptic|cold.smoked|food safety|species identification|biopreserved|surimi|food sensor|fish scale|fish muscle|fish samples|salmon authentication',t):return False
 if 'figshare' in r['doi'] and not any(x in t for x in ['data','dataset','supporting','additional file','supplementary','.csv','.xls','shapefile','raw ']):return False
 if r['area']=='Aquicultura' and r['topic']=='Larvicultura e alevinagem' and not any(x in t for x in ['rearing','hatchery','feeding','aquaculture','cultured','diet','juvenile']):return False
 return True
selected=[];seen=set();titles=set();per_study=set()
for area in ['Pesca','Aquicultura','Tecnologia do pescado']:
 gs=[g for g in groups if g['area']==area];count=0
 for i in range(100):
  for g in gs:
   if i>=len(g['candidates']):continue
   r=g['candidates'][i];fam=family(r);k=key(r)
   if fam in seen or k in titles or not suitable(r):continue
   study=next((x.get('relatedIdentifier','').lower() for x in r.get('related',[]) if x.get('relationType')=='IsSupplementTo' and x.get('relatedIdentifierType')=='DOI'),None)
   if study and study in per_study:continue
   if study:per_study.add(study)
   seen.add(fam);titles.add(k);r['title']=html.unescape(r['title']);selected.append(r);count+=1
   if count==70:break
  if count==70:break
 print(area,count)
(ROOT/'data-input/research-selected.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
for area in ['Pesca','Aquicultura','Tecnologia do pescado']:
 (ROOT/'data-input'/('review-'+area.split()[0]+'.txt')).write_text('\n'.join(r['doi']+' | '+r['title'] for r in selected if r['area']==area))
