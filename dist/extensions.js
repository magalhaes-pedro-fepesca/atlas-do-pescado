/* International FAO explorer and open-data catalog. */
const globalState = {mode:'aq',continent:'all',selected:['BRA','PER','CHL'],from:2015,to:2024,mapYear:2024,species:'all',countrySearch:'',speciesSearch:''};
const CONTINENTS = {Africa:'África',Americas:'Américas',Asia:'Ásia',Europe:'Europa',Oceania:'Oceania'};
let globalData, worldGeo, totalIndex, speciesIndex, activeCountries, activeSpecies, speciesOrder;

function setScope(scope){
  const valid=['home','national','international','trade','municipal','catalog','technology','news','method','policy','technical'];
  if(!valid.includes(scope))return;
  document.body.classList.toggle('home-active',scope==='home');
  for(const name of valid)$(name+'-view').hidden=name!==scope;
  document.querySelectorAll('[data-scope]').forEach(b=>{const on=b.dataset.scope===scope;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(scope==='catalog')window.atlasCatalog?.();
  if(scope==='international'&&!globalData)loadInternational();
  window.onScopeChange?.(scope);
  window.atlasScopeChange?.(scope);
}
function internationalValue(year,iso){return globalState.species==='all'?totalIndex.get(`${globalState.mode}|${year}|${iso}`):speciesIndex.get(`${globalState.mode}|${year}|${iso}|${globalState.species}`)}
function eligibleCountries(){return activeCountries[globalState.mode].filter(iso=>globalState.continent==='all'||globalData.countries[iso]?.[1]===globalState.continent)}
function countryName(iso){return globalData.countries[iso]?.[0]||iso}
function currentRanking(){return eligibleCountries().map(iso=>({iso,name:countryName(iso),value:internationalValue(globalState.mapYear,iso)})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>b.value-a.value)}
function resetGlobalSelection(){globalState.selected=currentRanking().slice(0,3).map(x=>x.iso);if(!globalState.selected.length)globalState.selected=eligibleCountries().slice(0,3)}
async function loadInternational(){
  $('intl-coverage').textContent='Carregando as séries e a malha mundial…';
  try{
    const responses=await Promise.all([fetch('international.json'),fetch('world.geojson')]);
    if(responses.some(r=>!r.ok))throw Error('Arquivos indisponíveis');
    [globalData,worldGeo]=await Promise.all(responses.map(r=>r.json()));
    totalIndex=new Map();speciesIndex=new Map();activeCountries={aq:new Set(),cap:new Set()};activeSpecies={aq:new Set(),cap:new Set()};
    for(const [mode,year,iso,value] of globalData.totals){totalIndex.set(`${mode}|${year}|${iso}`,value);activeCountries[mode].add(iso)}
    const popularity={aq:new Map(),cap:new Map()};
    for(const [mode,year,iso,code,value] of globalData.rows){speciesIndex.set(`${mode}|${year}|${iso}|${code}`,value);activeSpecies[mode].add(code);if(year===2024)popularity[mode].set(code,(popularity[mode].get(code)||0)+value)}
    for(const mode of ['aq','cap'])activeCountries[mode]=[...activeCountries[mode]].sort((a,b)=>countryName(a).localeCompare(countryName(b),'pt-BR'));
    speciesOrder=Object.fromEntries(['aq','cap'].map(mode=>[mode,[...activeSpecies[mode]].sort((a,b)=>(popularity[mode].get(b)||0)-(popularity[mode].get(a)||0))]));
    bindInternational();renderInternational();
  }catch(err){$('intl-coverage').textContent='Não foi possível carregar os dados internacionais. Recarregue a página para tentar novamente.'}
}
function renderInternationalFilters(){
  document.querySelectorAll('[data-intl-mode]').forEach(b=>{const on=b.dataset.intlMode===globalState.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  fillOptions($('intl-continent'),[['all','Todos os continentes'],...Object.entries(CONTINENTS).map(([key,value])=>[key,value])],globalState.continent);
  const years=Array.from({length:10},(_,i)=>2015+i);for(const [id,value] of [['intl-from',globalState.from],['intl-to',globalState.to]])fillOptions($(id),years.map(y=>[y,String(y)]),value);
  fillOptions($('intl-map-year'),years.filter(y=>y>=globalState.from&&y<=globalState.to).map(y=>[y,String(y)]),globalState.mapYear);
  const q=globalState.countrySearch.toLocaleLowerCase('pt-BR');const selected=new Set(globalState.selected);
  const shown=eligibleCountries().filter(iso=>selected.has(iso)||countryName(iso).toLocaleLowerCase('pt-BR').includes(q)||iso.toLowerCase().includes(q)).sort((a,b)=>Number(selected.has(b))-Number(selected.has(a))||countryName(a).localeCompare(countryName(b),'pt-BR')).slice(0,40);
  const countryList=$('intl-country-list');countryList.replaceChildren();
  for(const iso of shown){const label=document.createElement('label');label.className='species-option';const cb=document.createElement('input');cb.type='checkbox';cb.value=iso;cb.checked=selected.has(iso);cb.disabled=!cb.checked&&selected.size>=4;const name=document.createElement('span');name.textContent=`${countryName(iso)} · ${iso}`;label.append(cb,name);countryList.append(label)}
  if(!shown.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhum país encontrado.';countryList.append(p)}
  $('intl-count').textContent=`${selected.size}/4`;$('intl-country-help').textContent=selected.size>=4?'Limite de 4 países. Desmarque um para escolher outro.':'Selecione até 4 países para as séries.';
  const search=globalState.speciesSearch.trim().toLocaleLowerCase('pt-BR');
  const matches=speciesOrder[globalState.mode].filter(code=>globalData.species[code]?.toLocaleLowerCase('pt-BR').includes(search)||code.toLowerCase().includes(search));
  const list=$('intl-species-list');list.replaceChildren();
  const all=document.createElement('button');all.type='button';all.dataset.species='all';all.className=globalState.species==='all'?'active':'';all.textContent='Todas as espécies e grupos';list.append(all);
  if(globalState.species!=='all'){
    const i=matches.indexOf(globalState.species);
    if(i>=0)matches.splice(i,1);
    matches.unshift(globalState.species);
  }
  for(const code of matches.slice(0,30)){const b=document.createElement('button');b.type='button';b.dataset.species=code;b.className=globalState.species===code?'active':'';b.textContent=globalData.species[code]||code;const small=document.createElement('small');small.textContent=code;b.append(small);list.append(b)}
  if(search&&matches.length>30){const p=document.createElement('p');p.className='result-limit';p.textContent=`Mostrando 30 de ${matches.length}. Refine a busca para encontrar outros itens.`;list.append(p)}
  $('intl-species-badge').textContent=globalState.species==='all'?'Todas':globalState.species;
}
function internationalSeries(){return globalState.selected.map((iso,i)=>({iso,label:countryName(iso),color:COLORS[i],points:AtlasQueries.querySeries({'international.json':globalData},{dataset:globalState.mode==='aq'?'fao-aquaculture':'fao-capture',country:iso,species:globalState.species==='all'?undefined:globalState.species,from:globalState.from,to:globalState.to}).values.map(({year,value})=>({year,value}))}))}
function renderInternationalMetrics(lines){
  const latest=lines.map(s=>({name:s.label,value:s.points.find(p=>p.year===globalState.to)?.value}));const available=latest.filter(x=>Number.isFinite(x.value));
  const total=available.reduce((n,x)=>n+x.value,0);const paired=lines.map(s=>({now:s.points.find(p=>p.year===globalState.to)?.value,before:s.points.find(p=>p.year===globalState.to-1)?.value})).filter(x=>Number.isFinite(x.now)&&Number.isFinite(x.before));
  const now=paired.reduce((n,x)=>n+x.now,0),before=paired.reduce((n,x)=>n+x.before,0);const leader=available.sort((a,b)=>b.value-a.value)[0];
  $('intl-total').textContent=available.length?fmtMetric(total):'—';$('intl-total-detail').textContent=`toneladas · ${globalState.to} · ${available.length} país${available.length===1?'':'es'} com dados`;
  $('intl-change').textContent=paired.length&&before?`${now>=before?'+':''}${brLong.format((now/before-1)*100)}%`:'—';
  $('intl-change-detail').textContent=paired.length?`Sobre ${globalState.to-1}; ${paired.length} país${paired.length===1?'':'es'} em ambos os anos.`:'Sem dados comparáveis no ano anterior.';
  $('intl-leader').textContent=leader?.name||'—';$('intl-leader-detail').textContent=leader?`${fmtMetric(leader.value)} toneladas`:'Sem dados no último ano.';
}
function renderInternationalChart(lines){
  const chart=$('intl-chart');chart.replaceChildren();const legend=$('intl-legend');legend.replaceChildren();
  for(const s of lines){const item=document.createElement('div');item.className='legend-item';const sw=document.createElement('span');sw.className='swatch';sw.style.background=s.color;const name=document.createElement('span');name.textContent=s.label;item.append(sw,name);legend.append(item)}
  const values=lines.flatMap(s=>s.points.map(p=>p.value).filter(Number.isFinite));
  if(!values.length){$('intl-chart-detail').textContent='Não há dados para esta combinação de filtros.';return}
  const L=75,R=32,T=25,B=52,W=820,H=340,max=Math.max(...values)*1.12||1;
  const x=year=>L+(year-globalState.from)/Math.max(1,globalState.to-globalState.from)*(W-L-R),y=value=>H-B-value/max*(H-T-B);
  for(let i=0;i<=4;i++){const v=max*i/4;svgEl('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),class:'grid-line'},chart);svgEl('text',{x:L-10,y:y(v)+4,'text-anchor':'end',class:'axis-label'},chart).textContent=fmtMetric(v)}
  const years=Array.from({length:globalState.to-globalState.from+1},(_,i)=>globalState.from+i);for(const year of years.filter((_,i)=>years.length<=9||i%2===0||i===years.length-1))svgEl('text',{x:x(year),y:H-18,'text-anchor':'middle',class:'axis-label'},chart).textContent=year;
  for(const s of lines){let segment=[];const flush=()=>{if(segment.length){svgEl('path',{d:segment.map((p,i)=>`${i?'L':'M'}${x(p.year).toFixed(2)},${y(p.value).toFixed(2)}`).join(' '),stroke:s.color,class:'series-line'},chart);segment=[]}};
    for(const p of s.points){if(!Number.isFinite(p.value)){flush();continue}segment.push(p)}flush();
    for(const p of s.points.filter(p=>Number.isFinite(p.value))){const desc=`${s.label} · ${p.year}: ${brLong.format(p.value)} toneladas`;const c=svgEl('circle',{cx:x(p.year),cy:y(p.value),r:5,fill:s.color,class:'series-point',tabindex:'0','aria-label':desc},chart);svgEl('title',{},c).textContent=desc;c.addEventListener('mouseenter',()=>{$('intl-chart-detail').textContent=desc});c.addEventListener('focus',()=>{$('intl-chart-detail').textContent=desc})}
  }
  $('intl-chart-detail').textContent='Passe o cursor ou use Tab nos pontos para ver os valores.';
}
function worldPath(geometry){
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  const point=([lon,lat])=>`${(420+lon*2.25).toFixed(1)},${(210-lat*2.25).toFixed(1)}`;
  return polygons.map(poly=>poly.map(ring=>'M'+ring.map((p,i)=>(i?'L':'')+point(p)).join('')+'Z').join('')).join('');
}
function toggleGlobalCountry(iso){
  if(!activeCountries[globalState.mode].includes(iso))return;
  if(globalState.continent!=='all'&&globalData.countries[iso]?.[1]!==globalState.continent)globalState.continent='all';
  if(globalState.selected.includes(iso))globalState.selected=globalState.selected.filter(x=>x!==iso);
  else if(globalState.selected.length<4)globalState.selected.push(iso);
  else {$('world-detail').textContent='Limite de 4 países. Desmarque um antes de selecionar outro.';return}
  renderInternational();
}
function renderWorldMap(){
  const map=$('world-map');map.replaceChildren();const values=currentRanking(),lookup=new Map(values.map(x=>[x.iso,x.value]));const max=values[0]?.value||1;
  for(const f of worldGeo.features){const iso=f.properties.iso3;if(!iso)continue;const value=lookup.get(iso),name=countryName(iso);const msg=`${name} · ${Number.isFinite(value)?`${brLong.format(value)} toneladas em ${globalState.mapYear}`:'Sem dado neste recorte'}`;
    const p=svgEl('path',{d:worldPath(f.geometry),fill:mapColor(value,max),class:`world-shape${globalState.selected.includes(iso)?' selected':''}`,tabindex:'0',role:'button','aria-label':msg},map);
    svgEl('title',{},p).textContent=msg;p.addEventListener('mouseenter',()=>{$('world-detail').textContent=msg});p.addEventListener('focus',()=>{$('world-detail').textContent=msg});p.addEventListener('click',()=>toggleGlobalCountry(iso));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.click()}});
  }
  $('world-detail').textContent='Passe o cursor ou clique em um país para compará-lo na série.';
}
function renderInternationalRanking(){
  const target=$('intl-ranking');target.replaceChildren();const rows=currentRanking().slice(0,8);
  if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='Sem registros no ano e recorte escolhidos.';target.append(p);return}
  const max=rows[0].value||1;for(const row of rows){const item=document.createElement('div');item.className='rank-row';const name=document.createElement('span');name.className='rank-name';name.textContent=row.name;name.title=row.name;const bar=document.createElement('span');bar.className='rank-bar';const inner=document.createElement('i');inner.style.width=`${Math.max(2,row.value/max*100)}%`;bar.append(inner);const num=document.createElement('strong');num.textContent=fmtMetric(row.value);item.append(name,bar,num);target.append(item)}
}
function renderInternational(){
  renderInternationalFilters();const title=globalState.mode==='aq'?'Aquicultura mundial':'Captura mundial';$('intl-title').textContent=title;$('intl-period').textContent=`${globalState.from}–${globalState.to}`;
  const speciesLabel=globalState.species==='all'?'Todas as espécies e grupos':globalData.species[globalState.species];const region=globalState.continent==='all'?'mundo':CONTINENTS[globalState.continent];
  $('intl-coverage').textContent=`${region} · ${speciesLabel} · toneladas de peso vivo por país. Ausências não são contadas como zero.`;
  $('world-title').textContent=`${title} por país`;$('world-subtitle').textContent=`${speciesLabel} em ${globalState.mapYear}. Países sem dados aparecem em cinza.`;$('intl-rank-year').textContent=String(globalState.mapYear);
  const lines=internationalSeries();renderInternationalMetrics(lines);renderInternationalChart(lines);renderWorldMap();renderInternationalRanking();window.renderInternationalAnalysis?.(lines);
}
function bindInternational(){
  document.querySelectorAll('[data-intl-mode]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.intlMode===globalState.mode)return;globalState.mode=b.dataset.intlMode;globalState.species='all';globalState.speciesSearch='';$('intl-species-search').value='';resetGlobalSelection();renderInternational()}));
  $('intl-reset').addEventListener('click',()=>{Object.assign(globalState,{mode:'aq',continent:'all',selected:['BRA','PER','CHL'],from:2015,to:2024,mapYear:2024,species:'all',countrySearch:'',speciesSearch:''});$('intl-country-search').value='';$('intl-species-search').value='';renderInternational()});
  $('intl-continent').addEventListener('change',e=>{globalState.continent=e.target.value;resetGlobalSelection();renderInternational()});
  $('intl-from').addEventListener('change',e=>{globalState.from=+e.target.value;if(globalState.from>globalState.to)globalState.to=globalState.from;if(globalState.mapYear<globalState.from)globalState.mapYear=globalState.from;renderInternational()});
  $('intl-to').addEventListener('change',e=>{globalState.to=+e.target.value;if(globalState.to<globalState.from)globalState.from=globalState.to;if(globalState.mapYear>globalState.to)globalState.mapYear=globalState.to;renderInternational()});
  $('intl-map-year').addEventListener('change',e=>{globalState.mapYear=+e.target.value;renderInternational()});
  $('intl-country-search').addEventListener('input',e=>{globalState.countrySearch=e.target.value;renderInternationalFilters()});
  $('intl-country-list').addEventListener('change',e=>{const iso=e.target.value;if(e.target.checked){if(globalState.selected.length>=4)return;globalState.selected.push(iso)}else globalState.selected=globalState.selected.filter(x=>x!==iso);renderInternational()});
  $('intl-species-search').addEventListener('input',e=>{globalState.speciesSearch=e.target.value;renderInternationalFilters()});
  $('intl-species-list').addEventListener('click',e=>{const b=e.target.closest('[data-species]');if(!b)return;globalState.species=b.dataset.species;renderInternational()});
}
document.querySelectorAll('[data-scope]').forEach(b=>b.addEventListener('click',()=>setScope(b.dataset.scope)));
