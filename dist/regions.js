(() => {
  const Q=window.AtlasRegions, el=id=>document.getElementById('regional-'+id);
  const state={state:'',region:'',municipality:'',category:'',product:'all',year:2024,search:''};
  let territory,municipal,ufGeo,loading=false,epoch=0,lastRows=[],mapFeatures=[];
  const geos=new Map();
  const nameCompare=(a,b)=>a.name.localeCompare(b.name,'pt-BR');
  const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3});
  const original=document.querySelector('#municipal-view > .workspace');
  document.querySelectorAll('[data-municipal-area]').forEach(b=>b.addEventListener('click',()=>{
    const regional=b.dataset.municipalArea==='regions'; original.hidden=b.dataset.municipalArea!=='explore';el('area').hidden=!regional;
    document.querySelectorAll('[data-municipal-area]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});
    if(regional)load();
  }));
  function element(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
  function button(text,fn){const b=element('button',text);b.type='button';b.addEventListener('click',fn);return b}
  function link(text,url){const a=element('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
  function options(id,items,value){const select=el(id);select.replaceChildren(...items.map(([v,l])=>{const o=element('option',l);o.value=v;return o}));select.value=String(value);select.disabled=!items.length}
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function load(){
    if(loading)return;if(territory){render();return}loading=true;el('retry').hidden=true;el('status').textContent='Carregando territórios e dados abertos…';
    try{
      const rs=await Promise.all(['regions.json','municipal.json','ufs.geojson'].map(u=>fetch(u)));if(rs.some(r=>!r.ok))throw Error('Dados indisponíveis');
      [territory,municipal,ufGeo]=await Promise.all(rs.map(r=>r.json()));bind();el('content').hidden=false;el('status').textContent='';render();
    }catch(e){territory=null;el('status').textContent='Não foi possível carregar esta área. Tente novamente.';el('retry').hidden=false}finally{loading=false}
  }
  el('retry').addEventListener('click',load);
  function navigate(values){Object.assign(state,values,{product:'all',category:'',search:''});el('search').value='';render()}
  function bind(){
    el('state').addEventListener('change',e=>navigate({state:e.target.value,region:'',municipality:''}));
    el('region').addEventListener('change',e=>navigate({region:e.target.value,municipality:''}));
    el('municipality').addEventListener('change',e=>navigate({municipality:e.target.value}));
    el('category').addEventListener('change',e=>{state.category=e.target.value;state.product='all';render()});
    el('product').addEventListener('change',e=>{state.product=e.target.value;render()});
    el('reset').addEventListener('click',()=>navigate({state:'',region:'',municipality:''}));
    el('search').addEventListener('input',e=>{state.search=e.target.value;renderList()});
    el('csv').addEventListener('click',()=>{if(lastRows.length)download('atlas-regiao-aquicultura-2024.csv',Q.csv(territory,lastRows),'text/csv;charset=utf-8')});
    el('metadata').addEventListener('click',()=>download('atlas-regiao-metadados.json',JSON.stringify({schema_version:territory.schema_version,recorte:{...state},classification:territory.classification,classification_url:territory.classification_url,datasets:territory.datasets.filter(Q.permitted),coverage:Q.query(territory,municipal,state).coverage,missing_data:'Ausência não é zero; a cópia não distingue ausência de supressão.'},null,2),'application/json'));
    el('geodata').addEventListener('click',()=>{const d=territory.datasets.find(d=>d.id==='ibge-territory');if(Q.exportable(d)&&mapFeatures.length)download('atlas-recorte-territorial.geojson',JSON.stringify({type:'FeatureCollection',metadata:d,features:mapFeatures}),'application/geo+json')});
  }
  function context(){const s=territory.states[state.state],r=s?.regions[state.region],m=s?.municipalities[state.municipality];return {s,r,m}}
  function render(){
    const {s,r,m}=context(),locations=Q.territories(territory,state),result=Q.query(territory,municipal,state),unfiltered=Q.query(territory,municipal,{...state,product:'all'});
    const aquaculture=unfiltered.rows.length>0;const geography=Q.permitted(territory.datasets.find(d=>d.id==='ibge-territory'));
    const categories=[...(aquaculture?[['Aquicultura','Aquicultura']]:[]),...(geography?[['Dados geográficos','Dados geográficos']]:[])];
    if(!categories.some(([v])=>v===state.category))state.category=categories[0]?.[0]||'';
    options('state',[['','Brasil — seis estados'],...Object.values(territory.states).map(s=>[s.id,`${s.name} — ${s.abbr}`])],state.state);
    options('region',[['','Todas as regiões'],...Object.values(s?.regions||{}).sort(nameCompare).map(r=>[r.id,r.name])],state.region);el('region').disabled=!s;
    options('municipality',[['','Todos os municípios'],...(s?Q.territories(territory,{state:s.id,region:state.region}):[]).sort(nameCompare).map(m=>[m.id,m.name])],state.municipality);el('municipality').disabled=!r;
    options('category',categories,state.category);
    const aq=state.category==='Aquicultura';
    options('indicator',aq?[['production','Produção (toneladas)']]:[['code','Código territorial IBGE']],aq?'production':'code');
    const products=[...new Set(unfiltered.rows.map(r=>r.product))].map(p=>[p,municipal.products[p]]).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
    options('product',aq?[['all','Todos os produtos disponíveis'],...products]:[['all','Não se aplica']],'all');if(aq)el('product').value=state.product;el('product').disabled=!aq;
    options('year',aq?[[2024,'2024 — anual']]:[['territory','Divisão 2017 · consulta 01/10/2026']],aq?2024:'territory');
    options('source',aq?[['ibge','IBGE · PPM / SIDRA 3940']]:[['ibge','IBGE · Localidades e Malhas']],'ibge');
    el('breadcrumb').replaceChildren(button('Brasil',()=>navigate({state:'',region:'',municipality:''})));
    if(s)el('breadcrumb').append(button(`${s.name} — ${s.abbr}`,()=>navigate({region:'',municipality:''})));
    if(r)el('breadcrumb').append(button(r.name,()=>navigate({municipality:''})));
    if(m)el('breadcrumb').append(element('span',m.name));
    el('title').textContent=m?m.name:r?`${r.name} · ${s.abbr}`:s?`${s.name} — ${s.abbr}`:'Brasil · lançamento em seis estados';
    el('updated').textContent='Área atualizada em 01/10/2026';
    el('summary').textContent=`${locations.length} município${locations.length===1?'':'s'} cadastrado${locations.length===1?'':'s'} · ${unfiltered.coverage||0} com observações numéricas de aquicultura em 2024. ${s&&!r?Object.keys(s.regions).length+' regiões.':''}`;
    el('classification').textContent=m?`${s.name} · Região Geográfica Imediata de ${s.regions[m.region].name} · Código IBGE ${m.id}`:territory.classification;
    el('categories').replaceChildren(...categories.map(([v])=>element('span',v)));
    renderList();renderData(result,locations,aq);renderProvenance();renderMap();
  }
  function renderList(){
    const {s,r,m}=context();let list;
    if(!s){el('list-title').textContent='Estados disponíveis';list=Object.values(territory.states).map(x=>({name:x.name,detail:`${Object.keys(x.regions).length} regiões · ${Object.keys(x.municipalities).length} municípios`,action:()=>navigate({state:x.id,region:'',municipality:''})}))}
    else if(!r){el('list-title').textContent='Regiões geográficas imediatas';list=Object.values(s.regions).sort(nameCompare).map(x=>({name:x.name,detail:`${x.municipalities.length} municípios`,action:()=>navigate({region:x.id,municipality:''})}))}
    else{el('list-title').textContent=m?'Municípios da mesma região':'Municípios da região';list=r.municipalities.map(id=>s.municipalities[id]).sort(nameCompare).map(x=>({name:x.name,detail:Q.query(territory,municipal,{state:s.id,municipality:x.id}).rows.length?'Aquicultura · Dados geográficos':'Dados geográficos · sem observação de aquicultura na cópia',action:()=>navigate({municipality:x.id})}))}
    const q=state.search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();list=list.filter(x=>x.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
    el('list').replaceChildren(...list.map(x=>{const b=button(x.name,x.action);b.append(element('small',x.detail));return b}));if(!list.length)el('list').append(element('p','Nenhum território encontrado.'));
  }
  function table(headers,rows){const wrap=element('div',null,'regional-table'),t=element('table'),head=element('thead'),tr=element('tr');tr.append(...headers.map(x=>element('th',x)));head.append(tr);const body=element('tbody');for(const row of rows){const tr=element('tr');tr.append(...row.map(x=>element('td',x)));body.append(tr)}t.append(head,body);wrap.append(t);return wrap}
  function renderData(result,locations,aq){
    lastRows=aq?result.rows:[];el('csv').disabled=!lastRows.length||!Q.exportable(territory.datasets[0]);el('csv').hidden=!aq;el('geodata').hidden=aq;
    const out=el('data');out.replaceChildren();
    if(aq){el('coverage').textContent=result.rows.length?`${number.format(result.value)} t · soma parcial de ${result.coverage} de ${locations.length} municípios · 2024. Ausências não são zero.`:result.message;
      if(result.rows.length){out.append(table(['Município','Produto / espécie','Produção (t)','Ano'],result.rows.map(r=>[r.name,r.productName,number.format(r.value),r.year])));}
    }else{el('coverage').textContent='Dados territoriais do IBGE. Código identificador; não é uma medida estatística.';out.append(table(['Município','Código IBGE','Região imediata'],locations.map(m=>[m.name,m.id,m.regionName])))}
    const unfiltered=Q.query(territory,municipal,{...state,product:'all'});
    if(!unfiltered.rows.length)out.append(element('p','Dados abertos não disponíveis para este indicador nesta fonte. Não há observações numéricas de aquicultura nesta cópia para o território selecionado.', 'regional-empty'));
    out.append(element('p','A cópia de 2024 não preserva os marcadores originais de ausência ou proteção. Quando não há registro numérico, não é possível distinguir “Dado não informado” de “Dado suprimido/protegido”. Consulte o SIDRA. Indicadores de pesca, comércio exterior e pesquisa ainda não incorporados nesta subárea.', 'regional-empty'));
  }
  function renderProvenance(){
    const container=el('provenance');container.replaceChildren();
    const fields={dataset:'Conjunto',instituicao:'Instituição',fonte_original:'Fonte original',tipo_de_acesso:'Acesso',licenca:'Condição de uso',data_acesso:'Data de acesso',data_verificacao:'Verificação de reutilização',data_atualizacao:'Atualização da cópia',periodo:'Período',versao:'Versão',transformacao:'Transformações',limitacoes:'Limitações',atribuicao:'Atribuição',restricoes:'Restrições'};
    for(const d of territory.datasets.filter(Q.permitted)){
      const details=element('details'),sum=element('summary',`${d.dataset} · ${d.status}`),dl=element('dl',null,'regional-provenance-grid');
      for(const [k,label]of Object.entries(fields))dl.append(element('dt',label),element('dd',d[k]));
      dl.append(element('dt','Redistribuição'),element('dd',d.redistribuicao?'Permitida com atribuição e identificação das transformações':'Não permitida'),element('dt','Cobertura'),element('dd','PA, AP, MA, SE, AM, RO'));
      const links=element('p');links.append(link('Fonte original',d.url_oficial),document.createTextNode(' · '),link('Autorização de reutilização',d.licenca_url));
      if(d.url_malhas)links.append(document.createTextNode(' · '),link('Malhas oficiais',d.url_malhas));
      if(d.id==='ibge-territory'&&state.state)links.append(document.createTextNode(' · '),link('Consulta territorial original',territory.states[state.state].source_url));
      details.append(sum,dl,links);container.append(details);
    }
  }
  async function renderMap(){
    const current=++epoch,{s,r,m}=context(),map=el('map');map.replaceChildren();mapFeatures=[];el('geodata').disabled=true;
    try{
      let features;
      if(!s)features=ufGeo.features;
      else{
        if(!geos.has(s.id)){el('map-help').textContent='Carregando malha municipal…';const response=await fetch(`municipios/${s.id}.geojson`);if(!response.ok)throw Error('Malha indisponível');geos.set(s.id,await response.json())}
        if(current!==epoch)return;
        features=geos.get(s.id).features.filter(f=>s.municipalities[String(f.properties.code)]&&(!r||s.municipalities[String(f.properties.code)].region===r.id)&&(!m||String(f.properties.code)===m.id));
      }
      if(!features.length)throw Error('Sem geometria');mapFeatures=s?features:features.filter(f=>territory.states[String(f.properties.code)]);el('geodata').disabled=!Q.exportable(territory.datasets.find(d=>d.id==='ibge-territory'));
      const path=shapeProjector(features,600,480),colors=['#0c7581','#387e9d','#60a093','#827aa1','#b27c51','#637f9a'];
      const regionIds=Object.keys(s?.regions||{});
      for(const f of features){
        const code=String(f.properties.code),mun=s?.municipalities[code],reg=mun?s.regions[mun.region]:null,enabled=s?!!mun:!!territory.states[code];
        const label=s?(r?mun.name:reg.name):(territory.states[code]?.name||'Estado fora desta versão');
        const p=svgEl('path',{d:path(f.geometry),fill:enabled?(s?colors[regionIds.indexOf(mun.region)%colors.length]:'#0c7581'):'#e4ecef',class:enabled?'regional-shape':'regional-disabled'},map);svgEl('title',{},p).textContent=label;
        if(enabled){p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',label);p.addEventListener('click',()=>{if(!s)navigate({state:code,region:'',municipality:''});else if(!r)navigate({region:mun.region,municipality:''});else navigate({municipality:code})});p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.click()}});p.addEventListener('focus',()=>el('map-help').textContent=label);p.addEventListener('mouseenter',()=>el('map-help').textContent=label)}
      }
      el('map-help').textContent=m?'Malha municipal simplificada · IBGE.':r?'Clique em um município, ou escolha na lista.':s?'Cores identificam regiões, sem representar produção. Clique em uma região.':'Clique em um dos seis estados destacados. Demais estados: expansão futura.';
    }catch(e){if(current===epoch)el('map-help').textContent='Geometria indisponível. Use os filtros ou a lista para continuar.'}
  }
})();
