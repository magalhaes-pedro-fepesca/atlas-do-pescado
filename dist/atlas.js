/* Catalogue of separately licensed datasets; files load only on demand. */
(()=>{
'use strict';
const el=id=>document.getElementById(id), areas=['Pesca','Aquicultura','Comércio exterior','Tecnologia do pescado'];
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let catalogData,loading,page=1,newsData;const PAGE_SIZE=12;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
function link(text,url,cls){const a=node('a',text,cls);a.href=url;if(/^https?:/.test(url)){a.target='_blank';a.rel='noopener noreferrer'}return a}
function bytes(n){return n>=1048576?`${(n/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})} MB`:`${Math.ceil(n/1024)} KB`}
function csvCell(v){return '"'+String(v??'').replace(/^([=+@\-])/,'\'$1').replace(/"/g,'""')+'"'}
function saveCSV(name,headers,rows){const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function loadCatalog(){
 if(catalogData)return catalogData;if(loading)return loading;
 loading=fetch('catalog.json').then(r=>{if(!r.ok)throw Error('catalog');return r.json()}).then(d=>{if(!Array.isArray(d.items))throw Error('schema');catalogData=d;populateFilters();return d}).catch(e=>{loading=null;throw e});return loading;
}
function populateFilters(){
 if(catalogData.foundation){const f=catalogData.foundation;el('catalog-foundation').textContent=`${f.prepared_files} arquivos CSV preparados, incluindo ${f.curated_subsets} recortes vinculados às bases de origem. Integridade local revisada em ${f.reviewed_at.split('-').reverse().join('/')}. ${f.scope}`;}
 el('catalog-topic').replaceChildren(new Option('Todas as áreas','all'),...areas.map(a=>new Option(a,a)));populateSubtopics();
 const target=el('area-overview');target.replaceChildren();
 for(const a of areas){const b=node('button',undefined,'area-card');b.type='button';b.dataset.area=a;const list=catalogData.items.filter(x=>x.area===a);b.append(node('span',a),node('strong',String(list.length)),node('small',a==='Comércio exterior'?'Arquivos oficiais e recortes':'Bases estatísticas e dados de pesquisa'));b.addEventListener('click',()=>openArea(a));target.append(b)}
}
function populateSubtopics(){if(!catalogData)return;const area=el('catalog-topic').value,topics=[...new Set(catalogData.items.filter(x=>area==='all'||x.area===area).map(x=>x.topic))].sort((a,b)=>a.localeCompare(b,'pt-BR'));el('catalog-subtopic').replaceChildren(new Option('Todos os subtemas','all'),...topics.map(t=>new Option(t,t)))}
function filtered(){if(!catalogData)return[];const query=normalize(el('catalog-search').value).trim(),area=el('catalog-topic').value,topic=el('catalog-subtopic').value,access=el('catalog-access').value,scale=el('catalog-scale').value;
 const found=catalogData.items.filter(x=>(area==='all'||x.area===area)&&(topic==='all'||x.topic===topic)&&(access==='all'||x.access===access)&&(scale==='all'||x.scale===scale)&&query.split(/\s+/).every(w=>normalize([x.title,x.area,x.topic,x.publisher,x.doi,x.description,...(x.tags||[])].join(' ')).includes(w)));
 const sort=el('catalog-sort').value;if(sort==='title')found.sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));else if(sort==='year')found.sort((a,b)=>(b.year||0)-(a.year||0)||a.title.localeCompare(b.title));else found.sort((a,b)=>(b.featured||0)-(a.featured||0));return found;
}
function card(x){
 const c=node('article',undefined,'catalog-card'),tags=node('div',undefined,'catalog-tags');tags.append(node('span',x.area),node('span',x.access==='prepared'?'CSV no Atlas':x.access==='research'?'Dados de pesquisa':'Arquivo / portal oficial','record-type'));
 if(x.formats?.length)tags.append(node('span',x.formats.slice(0,3).join(' · '),'format-tag'));
 if(x.parent_dataset_id)tags.append(node('span','Recorte de base existente','record-type'));
 if(x.observation_type)tags.append(node('span',x.observation_type,'record-type'));
 const title=node('h3');title.append(link(x.title,x.source));c.append(tags,node('div',x.topic,'entry-topic'),title,node('p',x.description));
 c.append(node('div',`${x.publisher} · ${x.access==='research'?'Publicação':'Cobertura'}: ${x.coverage||x.year||'Ver fonte'}${x.rows?` · ${x.rows.toLocaleString('pt-BR')} registros`:''}${x.bytes?` · ${bytes(x.bytes)}`:''}`,'catalog-meta'));
 const license=node('p',undefined,'catalog-license');license.append(node('strong',x.license+' · '),link('Permissão de reutilização ↗',x.license_evidence||x.license_url));c.append(license);
 const details=node('details');details.append(node('summary','Proveniência e como usar'));
 if(x.doi)details.append(node('p','DOI: '+x.doi));
 if(x.creators?.length)details.append(node('p','Autoria: '+x.creators.join('; ')));
 if(x.citation)details.append(node('p','Como citar: '+x.citation));
 details.append(node('p',x.notes||'Preserve a autoria, o DOI, a versão e a licença ao reutilizar. Consulte o dicionário e os métodos no repositório antes de combinar os dados.'));
 if(x.parent_dataset_id){const parent=catalogData.items.find(y=>y.id===x.parent_dataset_id);details.append(node('p','Base de origem: '+(parent?.title||x.parent_dataset_id)+'. Camada: dado tratado, sem indicador calculado.'));}
 details.append(node('p','Metadados conferidos em '+(x.metadata_reviewed_at?x.metadata_reviewed_at.split('-').reverse().join('/'):catalogData.checked)+'. As condições são as declaradas pelo detentor na fonte.'));
 if(x.quality){if(x.quality.scope)details.append(node('p',x.quality.scope));if(Array.isArray(x.quality.columns)&&x.quality.columns.length)details.append(node('p','Colunas: '+x.quality.columns.join(', ')));details.append(node('p','Ausência, sigilo e não aplicabilidade não devem ser interpretados como zero. Códigos territoriais, NCM e produtos devem ser importados como texto.'));}
 c.append(details);
 const actions=node('div',undefined,'catalog-actions');
 if(x.file){const a=link(x.access==='prepared'?'Baixar CSV ↓':'Baixar arquivo na fonte ↗',x.file,'download');if(x.access==='prepared')a.download=x.file.split('/').pop();actions.append(a)}
 if(x.metadata_file){const a=link('Dicionário e rastreabilidade',x.metadata_file);a.download=x.metadata_file.split('/').pop();actions.append(a)}
 if(x.raw_file){const a=link('Arquivo original da fonte',x.raw_file);a.download=x.raw_file.split('/').pop();actions.append(a)}
 actions.append(link(x.access==='research'?'Abrir conjunto de dados ↗':'Ver fonte oficial ↗',x.source));
 c.append(actions);return c;
}
function render(){if(!catalogData)return;const list=filtered(),pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(page,pages);const start=(page-1)*PAGE_SIZE,target=el('catalog-results');target.replaceChildren();
 el('catalog-count').textContent=`${list.length} de ${catalogData.items.length} conjuntos · ${list.length?`${start+1}–${Math.min(start+PAGE_SIZE,list.length)}`:'nenhum resultado'}`;
 document.querySelectorAll('.area-card').forEach(b=>b.classList.toggle('selected',b.dataset.area===el('catalog-topic').value));
 for(const x of list.slice(start,start+PAGE_SIZE))target.append(card(x));if(!list.length)target.append(node('p','Nenhum conjunto encontrado. Tente um termo mais amplo ou limpe os filtros.','empty'));
 const nav=el('catalog-pagination');nav.replaceChildren();if(pages>1){for(const [label,delta] of [['← Anterior',-1],['Próxima →',1]]){const b=node('button',label);b.type='button';b.disabled=delta<0?page===1:page===pages;b.addEventListener('click',()=>{page+=delta;render();el('catalog-count').scrollIntoView({block:'start',behavior:'smooth'})});nav.append(b);if(delta<0)nav.append(node('span',`Página ${page} de ${pages}`))}}
}
async function showCatalog(){try{await loadCatalog();render()}catch(e){el('catalog-count').textContent='Catálogo indisponível';const box=node('div',undefined,'catalog-error');box.append(node('p','Não foi possível carregar o catálogo. Tente novamente.' ));const retry=node('button','Tentar novamente','action-button');retry.type='button';retry.onclick=showCatalog;box.append(retry);el('catalog-results').replaceChildren(box)}}
async function openArea(area,topic='all'){await showCatalog();if(!catalogData)return;el('catalog-topic').value=area;populateSubtopics();el('catalog-subtopic').value=topic;el('catalog-search').value='';el('catalog-access').value='all';el('catalog-scale').value='all';page=1;setScope('catalog');render()}
window.atlasCatalog=showCatalog;
for(const id of ['catalog-search','catalog-topic','catalog-subtopic','catalog-access','catalog-scale','catalog-sort'])el(id).addEventListener(id==='catalog-search'?'input':'change',()=>{page=1;if(id==='catalog-topic')populateSubtopics();render()});
el('catalog-reset').onclick=()=>{for(const id of ['catalog-topic','catalog-subtopic','catalog-access','catalog-scale'])el(id).value='all';el('catalog-search').value='';el('catalog-sort').value='featured';populateSubtopics();page=1;render()};
el('catalog-export').onclick=async()=>{await showCatalog();if(!catalogData)return;saveCSV('atlas-catalogo-metadados.csv',['id','titulo','area','subtema','instituicao','ano_publicacao_ou_final','cobertura','tipo','licenca','evidencia_licenca','fonte','arquivo','doi','camada','base_origem_id','dicionario','sha256','revisao_local'],filtered().map(x=>[x.id,x.title,x.area,x.topic,x.publisher,x.year,x.coverage,x.access,x.license,x.license_evidence||x.license_url,x.source,x.file,x.doi,x.layer,x.parent_dataset_id,x.metadata_file,x.quality?.sha256,x.quality?.checked_at]))};
document.querySelectorAll('[data-open-area]').forEach(b=>b.onclick=()=>openArea(b.dataset.openArea));
document.querySelectorAll('[data-fishing-topic]').forEach(b=>b.onclick=()=>openArea('Pesca',b.dataset.fishingTopic));
const techTopics=[
 ['Conservação e vida útil','Temperatura, deterioração, estabilidade e avaliação do tempo de conservação.'],
 ['Embalagens e cadeia do frio','Embalagem, refrigeração, congelamento e efeitos das interrupções logísticas.'],
 ['Processamento e produtos','Filés, secagem, defumação, fermentação e transformação da matéria-prima.'],
 ['Qualidade e análise sensorial','Frescor, textura, imagens, sensores e aceitação de produtos.'],
 ['Segurança e contaminantes','Dados analíticos de contaminantes e qualidade sanitária do pescado.'],
 ['Resíduos e bioprodutos','Hidrolisados, colágeno, gelatina e aproveitamento de coprodutos.'],
 ['Composição e nutrição humana','Composição química, lipídios e caracterização nutricional.'],
 ['Rastreabilidade e autenticidade','Identificação de espécies, origem e métodos de autenticação.']
];
const references=[
 {title:'Manipulação e conservação de pescado',publisher:'Embrapa',description:'Manual técnico com orientações para a cadeia de processamento. Consulte a edição e as referências da publicação.',source:'https://www.infoteca.cnptia.embrapa.br/handle/doc/1110125'},
 {title:'Processamento e mercado de peixes',publisher:'Embrapa · Ater+ Digital',description:'Conteúdo técnico sobre abate, processamento e produtos da piscicultura.',source:'https://www.atermaisdigital.cnptia.embrapa.br/web/peixes/processamento-e-mercado'},
 {title:'Métodos de conservação do pescado',publisher:'Embrapa',description:'Material técnico de referência para estudar conservação e transformação do pescado.',source:'https://www.embrapa.br/documents/1354377/1743443/Pescado%2BM%C3%A9todos%2BConserva%C3%A7%C3%A3o.pdf/a4295af1-3287-4899-bba2-013d1b55c4ae?version=1.0'},
 {title:'Estatísticas de produtos processados',publisher:'FAO',description:'Metodologia de coleta de produção processada e de comércio de produtos aquáticos.',source:'https://www.fao.org/statistics/data-collection/fishery-and-aquaculture/en'}
];
function renderTechnology(){const target=el('technology-topics');if(target.childElementCount)return;techTopics.forEach(([title,description],i)=>{const a=node('article',undefined,'technology-card'),b=node('button','Ver conjuntos de pesquisa →','text-button');b.type='button';b.onclick=()=>openArea('Tecnologia do pescado',title);a.append(node('span',String(i+1).padStart(2,'0'),'tech-number'),node('h3',title),node('p',description),b);target.append(a)});for(const x of references){const a=node('article',undefined,'catalog-card');a.append(node('p',x.publisher,'entry-topic'),node('h3',x.title),node('p',x.description),link('Consultar referência ↗',x.source));el('technology-references').append(a)}}
async function renderNews(){try{if(!newsData){const r=await fetch('news.json');if(!r.ok)throw Error();newsData=await r.json()};const topic=el('news-topic').value,target=el('news-results');target.replaceChildren();for(const x of newsData.items.filter(x=>topic==='all'||x.area===topic)){const c=node('article',undefined,'news-card'),tags=node('div',undefined,'catalog-tags');tags.append(node('span',x.area));const date=node('time',new Date(x.date+'T12:00:00').toLocaleDateString('pt-BR'));date.dateTime=x.date;c.append(tags,date,node('h3',x.title),node('p',x.summary),link(`Ler na fonte · ${x.publisher} ↗`,x.url));target.append(c)}if(!target.childElementCount)target.append(node('p','Nenhuma notícia nesta seleção para o tema.','empty'));el('news-channels').replaceChildren(...newsData.channels.map(x=>link(x.title+' ↗',x.url)))}catch(e){el('news-results').replaceChildren(node('p','Não foi possível carregar a seleção de notícias. Reabra esta área para tentar novamente.','catalog-error'))}}
el('news-topic').onchange=renderNews;
window.atlasScopeChange=scope=>{if(scope==='technology')renderTechnology();if(scope==='news')renderNews()};
})();
