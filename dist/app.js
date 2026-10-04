const $ = (id) => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const COLORS = ['#0c7581', '#d4844d', '#7657a6', '#409a75'];
const REGIONS = {'1':'Norte','2':'Nordeste','3':'Sudeste','4':'Sul','5':'Centro-Oeste'};
const state = {mode:'aq',selected:['32877','32876','32887'],region:'all',uf:'all',from:2018,to:2024,indicator:'tonnes',mapYear:2024,search:''};
let data, geo, captureNames, bounds;

const br = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const brLong = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
function fmt(n){return br.format(n)}
function fmtMetric(n){if(n == null)return '—';if(Math.abs(n)>=1000000)return `${brLong.format(n/1000000)} mi`;if(Math.abs(n)>=1000)return `${brLong.format(n/1000)} mil`;return brLong.format(n)}
function unit(){return state.indicator==='million_brl'?'R$ milhões':'toneladas'}
function labelFor(key){return state.mode==='aq'?data.products[key]:key}
function years(){return state.mode==='aq'?[2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024]:[2021,2022,2023,2024,2025]}
function regionOf(code){return REGIONS[String(code)[0]]}
function eligible(code){return (state.region==='all'||regionOf(code)===state.region)&&(state.uf==='all'||code===state.uf)}
function selectedRows(){
  if(state.mode==='aq')return data.aquaculture.filter(r=>r[0]>=state.from&&r[0]<=state.to&&state.selected.includes(r[2])&&eligible(r[1]));
  return data.capture.filter(r=>r[0]>=state.from&&r[0]<=state.to&&state.selected.includes(r[1]));
}
function series(){
  return state.selected.map((key,i)=>{
    const base={dataset:state.mode==='aq'?'ibge-aquaculture':'mpa-capture',indicator:state.mode==='aq'?(state.indicator==='tonnes'?'production_t':'value_million_brl'):'capture_t',from:state.from,to:state.to};
    const selectedUfs=state.mode==='aq'&&state.region!=='all'&&state.uf==='all'?Object.keys(data.states).filter(eligible):null;
    const results=selectedUfs?.map(uf=>AtlasQueries.querySeries({'dados.json':data},{...base,uf,product:key}))||[AtlasQueries.querySeries({'dados.json':data},{...base,...(state.mode==='aq'?{uf:state.uf==='all'?undefined:state.uf,product:key}:{species:key})})];
    const points=results[0].values.map((p,j)=>({year:p.year,value:results.some(r=>r.values[j].value!==null)?results.reduce((sum,r)=>sum+(r.values[j].value??0),0):null}));
    return {key,label:labelFor(key),color:COLORS[i],points};
  });
}
function svgEl(tag,attrs={},parent){const el=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(parent)parent.append(el);return el}
function fillOptions(select,options,value){select.replaceChildren();for(const [v,title] of options){const o=document.createElement('option');o.value=v;o.textContent=title;select.append(o)}select.value=String(value)}
function renderFilters(){
  for(const b of document.querySelectorAll('[data-mode]')){const active=b.dataset.mode===state.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))}
  fillOptions($('region'),[['all','Todas as regiões'],...Object.values(REGIONS).map(r=>[r,r])],state.region);
  const ufs=Object.entries(data.states).filter(([code])=>state.region==='all'||regionOf(code)===state.region).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  fillOptions($('uf'),[['all','Todos os estados'],...ufs],state.uf);
  $('region').disabled=$('uf').disabled=state.mode==='cap';
  const ys=years();fillOptions($('from'),ys.map(y=>[y,String(y)]),state.from);fillOptions($('to'),ys.map(y=>[y,String(y)]),state.to);
  fillOptions($('indicator'),state.mode==='aq'?[['tonnes','Produção (t)'],['million_brl','Valor (R$ milhões)']]:[['tonnes','Captura registrada (t)']],state.indicator);
  fillOptions($('map-year'),ys.filter(y=>y>=state.from&&y<=state.to).map(y=>[y,String(y)]),state.mapYear);
  const names=state.mode==='aq'?Object.keys(data.products):captureNames;
  const query=state.search.toLocaleLowerCase('pt-BR');
  const shown=names.filter(k=>labelFor(k).toLocaleLowerCase('pt-BR').includes(query));
  $('species-list').replaceChildren();
  for(const key of shown){const label=document.createElement('label');label.className='species-option';const cb=document.createElement('input');cb.type='checkbox';cb.checked=state.selected.includes(key);cb.disabled=!cb.checked&&state.selected.length>=4;cb.value=key;const name=document.createElement('span');name.textContent=labelFor(key);label.append(cb,name);$('species-list').append(label)}
  if(!shown.length){const p=document.createElement('p');p.className='empty';p.textContent='Nenhuma espécie encontrada.';$('species-list').append(p)}
  $('selection-count').textContent=`${state.selected.length}/4`;
  $('selection-help').textContent=state.selected.length>=4?'Limite de 4 séries. Desmarque uma para escolher outra.':'Selecione até 4 para comparar séries.';
}
function renderHeader(){
  $('context-label').textContent=state.mode==='aq'?'IBGE · PPM / SIDRA 3940':'MPA · MAPAS DE BORDO E RELATÓRIOS';
  $('results-title').textContent=state.mode==='aq'?'Produção da aquicultura':'Captura registrada nos arquivos';
  $('period-tag').textContent=`${state.from}–${state.to}`;
  $('chart-unit').textContent=unit();
  $('coverage-note').textContent=state.mode==='aq'?
    `${state.region==='all'?'Brasil':state.region}${state.uf==='all'?'':` · ${data.states[state.uf]}`} · ${state.selected.length} produto${state.selected.length===1?'':'s'} · valores monetários nominais. Os produtos com unidades diferentes de kg não entram nesta seleção.`:
    'Soma dos registros disponíveis nos arquivos de pargo e sardinha. As coberturas variam entre as séries; 2025 contém apenas sardinha e é parcial.';
  $('map-unavailable').hidden=state.mode==='aq';$('map-content').hidden=state.mode==='cap';$('map-year-wrap').hidden=state.mode==='cap';
  $('map-title').textContent=state.mode==='aq'?'Produção por UF':'Mapa indisponível';
  $('rank-title').textContent=state.mode==='aq'?'Estados com maior produção':'Espécies com maior captura registrada';
  $('map-subtitle').textContent=state.mode==='aq'?`Soma dos ${state.selected.length} produtos selecionados em ${state.mapYear}.`:'';
  $('rank-year').textContent=String(state.mode==='aq'?state.mapYear:state.to);
}
function renderMetrics(lines){
  const latest=lines.map(s=>({label:s.label,value:s.points.find(p=>p.year===state.to)?.value}));
  const current=latest.reduce((n,x)=>n+(x.value??0),0),hasCurrent=latest.some(x=>x.value!=null);
  const paired=lines.map(s=>({now:s.points.find(p=>p.year===state.to)?.value,before:s.points.find(p=>p.year===state.to-1)?.value})).filter(p=>Number.isFinite(p.now)&&Number.isFinite(p.before));
  const comparableNow=paired.reduce((a,p)=>a+p.now,0),previous=paired.reduce((a,p)=>a+p.before,0);
  const leader=latest.filter(x=>x.value!=null).sort((a,b)=>b.value-a.value)[0];
  $('metric-total').textContent=hasCurrent?fmtMetric(current):'—';$('metric-unit').textContent=`${unit()} · ${state.to}`;
  $('metric-change').textContent=paired.length&&previous?`${comparableNow>=previous?'+':''}${brLong.format((comparableNow/previous-1)*100)}%`:'—';
  $('metric-change-detail').textContent=paired.length?`Em relação a ${state.to-1}; ${paired.length} série${paired.length>1?'s':''} com dados nos dois anos.`:'Sem dados comparáveis no ano anterior.';
  $('metric-leader').textContent=leader?.label??'—';$('metric-leader-value').textContent=leader?`${fmtMetric(leader.value)} ${unit()}`:'Sem registros no último ano.';
}
function renderChart(lines){
  const chart=$('chart');chart.replaceChildren();
  const ys=years().filter(y=>y>=state.from&&y<=state.to),values=lines.flatMap(s=>s.points.map(p=>p.value).filter(Number.isFinite));
  $('legend').replaceChildren();for(const s of lines){const item=document.createElement('div');item.className='legend-item';const sw=document.createElement('span');sw.className='swatch';sw.style.background=s.color;const name=document.createElement('span');name.textContent=s.label;item.append(sw,name);$('legend').append(item)}
  if(!values.length||!ys.length){$('chart-detail').textContent='Não há dados para esta combinação de filtros.';return}
  const L=75,R=32,T=25,B=52,W=820,H=340,max=Math.max(...values)*1.12||1;
  const x=(year)=>L+(year-ys[0])/(Math.max(1,ys.at(-1)-ys[0]))*(W-L-R);
  const y=(v)=>H-B-(v/max)*(H-T-B);
  for(let i=0;i<=4;i++){const value=max*i/4;svgEl('line',{x1:L,y1:y(value),x2:W-R,y2:y(value),class:'grid-line'},chart);const txt=svgEl('text',{x:L-10,y:y(value)+4,'text-anchor':'end',class:'axis-label'},chart);txt.textContent=fmtMetric(value)}
  const ticks=ys.length>9?ys.filter((_,i)=>i%2===0||i===ys.length-1):ys;
  for(const year of ticks){const txt=svgEl('text',{x:x(year),y:H-18,'text-anchor':'middle',class:'axis-label'},chart);txt.textContent=year}
  for(const s of lines){
    let segment=[];const flush=()=>{if(segment.length){svgEl('path',{d:segment.map((p,i)=>`${i?'L':'M'}${x(p.year).toFixed(2)},${y(p.value).toFixed(2)}`).join(' '),stroke:s.color,class:'series-line'},chart);segment=[]}};
    for(const p of s.points){if(p.value==null){flush();continue}segment.push(p)}flush();
    for(const p of s.points.filter(p=>p.value!=null)){const c=svgEl('circle',{cx:x(p.year),cy:y(p.value),r:5,fill:s.color,class:'series-point',tabindex:'0','aria-label':`${s.label}, ${p.year}: ${brLong.format(p.value)} ${unit()}`},chart);const desc=`${s.label} · ${p.year}: ${brLong.format(p.value)} ${unit()}`;svgEl('title',{},c).textContent=desc;c.addEventListener('mouseenter',()=>{$('chart-detail').textContent=desc});c.addEventListener('focus',()=>{$('chart-detail').textContent=desc})}
  }
  $('chart-detail').textContent='Passe o cursor ou use Tab nos pontos para ver os valores.';
}
function coords(geometry){return geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates}
function calcBounds(){let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const f of geo.features)for(const polygon of coords(f.geometry))for(const ring of polygon)for(const [lon,lat] of ring){minX=Math.min(minX,lon);maxX=Math.max(maxX,lon);minY=Math.min(minY,lat);maxY=Math.max(maxY,lat)}return {minX,maxX,minY,maxY}}
function geoPath(g){const scale=Math.min(510/(bounds.maxX-bounds.minX),490/(bounds.maxY-bounds.minY));const offsetX=(560-(bounds.maxX-bounds.minX)*scale)/2,offsetY=(540-(bounds.maxY-bounds.minY)*scale)/2;
  const point=([lon,lat])=>`${(offsetX+(lon-bounds.minX)*scale).toFixed(1)},${(offsetY+(bounds.maxY-lat)*scale).toFixed(1)}`;
  return coords(g).map(polygon=>polygon.map((ring,i)=>(i?'M':'M')+ring.map((p,j)=>(j?'L':'')+point(p)).join('')+'Z').join('')).join('');
}
function mapValues(){
  const totals=new Map();for(const row of data.aquaculture){if(row[0]!==state.mapYear||!state.selected.includes(row[2])||!eligible(row[1]))continue;const val=row[state.indicator==='tonnes'?3:4];if(Number.isFinite(val))totals.set(row[1],(totals.get(row[1])||0)+val)}return totals;
}
function mapColor(val,max){if(val==null)return '#e5edee';const ratio=Math.sqrt(val/max);if(ratio<.18)return '#c4e4e0';if(ratio<.38)return '#82cfc7';if(ratio<.63)return '#319aa0';if(ratio<.82)return '#126e7e';return '#08435a'}
function renderMap(){if(state.mode!=='aq')return;const map=$('map');map.replaceChildren();const totals=mapValues(),max=Math.max(...totals.values(),1);
  for(const f of geo.features){const code=f.properties.code,val=totals.get(code),p=svgEl('path',{d:geoPath(f.geometry),fill:mapColor(val,max),class:`state-shape${state.uf===code?' selected':''}`,tabindex:'0',role:'button','aria-label':`${data.states[code]}: ${val==null?'sem dado':`${brLong.format(val)} ${unit()}`}`},map);const msg=`${data.states[code]} · ${val==null?'Sem dado nesta seleção':`${brLong.format(val)} ${unit()} em ${state.mapYear}`}`;svgEl('title',{},p).textContent=msg;p.addEventListener('mouseenter',()=>{$('map-detail').textContent=msg});p.addEventListener('focus',()=>{$('map-detail').textContent=msg});p.addEventListener('click',()=>{state.uf=state.uf===code?'all':code;state.region=state.uf==='all'?state.region:regionOf(code);render()});p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.click()}})}
  $('map-detail').textContent='Passe o cursor em uma UF ou clique para filtrar a série.';
}
function renderRanking(){const target=$('ranking');target.replaceChildren();let rows=[];
  if(state.mode==='aq')rows=[...mapValues()].map(([code,value])=>({name:data.states[code],value}));
  else rows=data.capture.filter(r=>r[0]===state.to&&state.selected.includes(r[1])).map(r=>({name:r[1],value:r[3]}));
  rows.sort((a,b)=>b.value-a.value);rows=rows.slice(0,8);if(!rows.length){target.innerHTML='<p class="empty">Sem registros no ano e recorte escolhidos.</p>';return}
  const max=rows[0].value||1;for(const row of rows){const item=document.createElement('div');item.className='rank-row';const name=document.createElement('span');name.className='rank-name';name.textContent=row.name;name.title=row.name;const bar=document.createElement('span');bar.className='rank-bar';const inner=document.createElement('i');inner.style.width=`${Math.max(2,row.value/max*100)}%`;bar.append(inner);const num=document.createElement('strong');num.textContent=fmtMetric(row.value);item.append(name,bar,num);target.append(item)}
}
function render(){renderFilters();renderHeader();const lines=series();renderMetrics(lines);renderChart(lines);renderMap();renderRanking();if(typeof window.renderNationalAnalysis==='function')window.renderNationalAnalysis(lines)}
function setMode(mode){if(mode===state.mode)return;Object.assign(state,{mode,selected:mode==='aq'?['32877','32876','32887']:['Pargo (Lutjanus purpureus)','Sardinha-verdadeira'],region:'all',uf:'all',from:mode==='aq'?2018:2021,to:mode==='aq'?2024:2025,indicator:'tonnes',mapYear:2024,search:''});$('species-search').value='';render()}
function bind(){
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('reset').addEventListener('click',()=>{const mode=state.mode;state.mode=mode==='aq'?'cap':'aq';setMode(mode)});
  $('region').addEventListener('change',e=>{state.region=e.target.value;state.uf='all';render()});
  $('uf').addEventListener('change',e=>{state.uf=e.target.value;render()});
  $('from').addEventListener('change',e=>{state.from=Number(e.target.value);if(state.from>state.to)state.to=state.from;if(state.mapYear<state.from)state.mapYear=state.from;render()});
  $('to').addEventListener('change',e=>{state.to=Number(e.target.value);if(state.to<state.from)state.from=state.to;if(state.mapYear>state.to)state.mapYear=state.to;render()});
  $('indicator').addEventListener('change',e=>{state.indicator=e.target.value;render()});
  $('map-year').addEventListener('change',e=>{state.mapYear=Number(e.target.value);render()});
  $('species-search').addEventListener('input',e=>{state.search=e.target.value;renderFilters()});
  $('species-list').addEventListener('change',e=>{const key=e.target.value;if(e.target.checked){if(state.selected.length>=4){e.target.checked=false;return}state.selected.push(key)}else state.selected=state.selected.filter(v=>v!==key);render()});
}
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;try{Promise.resolve(context.registerTool({name:'configure_fisheries_explorer',title:'Configurar explorador',description:'Aplique filtros de modalidade, espécies, região, anos e indicador no explorador visível.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['aquicultura','captura']},species:{type:'array',items:{type:'string'},minItems:1,maxItems:4},region:{type:'string'},stateCode:{type:'string'},from:{type:'integer'},to:{type:'integer'},indicator:{type:'string',enum:['tonnes','million_brl']}},required:['mode','species','from','to','indicator'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){const mode=input.mode==='aquicultura'?'aq':'cap';const allowed=mode==='aq'?Object.keys(data.products):captureNames;const ranges=mode==='aq'?[2013,2024]:[2021,2025];if(!Array.isArray(input.species)||!input.species.length||input.species.length>4||input.species.some(s=>!allowed.includes(s))||input.from>input.to||input.from<ranges[0]||input.to>ranges[1]||!['tonnes','million_brl'].includes(input.indicator)||mode==='cap'&&input.indicator!=='tonnes'||input.region&&!Object.values(REGIONS).includes(input.region)||input.stateCode&&!data.states[input.stateCode])throw Error('Filtros inválidos para a base selecionada.');if(input.stateCode&&input.region&&regionOf(input.stateCode)!==input.region)throw Error('Estado não pertence à região selecionada.');Object.assign(state,{mode,selected:[...input.species],region:input.region||'all',uf:input.stateCode||'all',from:input.from,to:input.to,indicator:input.indicator,mapYear:input.to,search:''});$('species-search').value='';render();return {mode:input.mode,from:state.from,to:state.to,series:state.selected.length,visible:true}}})).catch(()=>{})}catch(_){/* Browser does not support WebMCP. */}}
Promise.all([fetch('dados.json').then(r=>{if(!r.ok)throw Error('dados');return r.json()}),fetch('ufs.geojson').then(r=>{if(!r.ok)throw Error('mapa');return r.json()})]).then(([d,g])=>{data=d;geo=g;bounds=calcBounds();captureNames=[...new Set(data.capture.map(r=>r[1]))].sort((a,b)=>a.localeCompare(b,'pt-BR'));bind();render();registerWebMCP()}).catch(()=>{$('coverage-note').textContent='Não foi possível carregar os dados. Recarregue a página para tentar novamente.'});
