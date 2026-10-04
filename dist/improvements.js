/* Filtered downloads, analysis charts, trade, and municipality exploration. */
function downloadCSV(filename, header, rows){
  const escape=value=>`"${String(value??'').replaceAll('"','""')}"`;
  const lines=[header,...rows].map(row=>row.map(escape).join(','));
  const blob=new Blob(['\ufeff',lines.join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function saveChartPNG(svgId){
  const source=$(svgId);if(!source||!source.children.length)return;
  const clone=source.cloneNode(true);clone.setAttribute('xmlns',svgNS);
  const style=svgEl('style',{},null);style.textContent='.grid-line{stroke:#e4ecee;stroke-width:1}.axis-label{fill:#617c88;font:13px sans-serif}.series-line{fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}.series-point{stroke:white;stroke-width:2}.state-shape,.municipality-shape,.world-shape{stroke:#fff;stroke-width:1}.selected{stroke:#082f3e;stroke-width:2}';clone.prepend(style);
  const vb=source.viewBox.baseVal,width=vb.width,height=vb.height,canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
  const image=new Image(),blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
  image.onload=()=>{const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);URL.revokeObjectURL(url);canvas.toBlob(png=>{if(!png)return;const out=URL.createObjectURL(png),a=document.createElement('a');a.href=out;a.download=`atlas-${svgId}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(out),30000)})};
  image.onerror=()=>URL.revokeObjectURL(url);image.src=url;
}
document.querySelectorAll('[data-chart-png]').forEach(b=>b.addEventListener('click',()=>saveChartPNG(b.dataset.chartPng)));

function quartile(sorted,q){if(!sorted.length)return null;const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo)}
function renderBoxplot(svgId,noteId,lines,unitLabel){
  const chart=$(svgId);chart.replaceChildren();const valid=lines.map(s=>({...s,values:s.points.map(p=>p.value).filter(Number.isFinite).sort((a,b)=>a-b)})).filter(s=>s.values.length);
  if(!valid.length){$(noteId).textContent='Sem dados anuais para este recorte.';return}
  const max=Math.max(...valid.flatMap(s=>s.values))*1.1||1,L=145,R=55,T=24,H=280,rowH=Math.min(51,(H-T-15)/valid.length);const x=v=>L+(v/max)*(820-L-R);
  for(let i=0;i<=4;i++){const val=max*i/4,pos=x(val);svgEl('line',{x1:pos,y1:T,x2:pos,y2:H-18,class:'grid-line'},chart);svgEl('text',{x:pos,y:H-4,'text-anchor':'middle',class:'axis-label'},chart).textContent=fmtMetric(val)}
  valid.forEach((s,i)=>{const v=s.values,y=T+rowH*(i+.5),q1=quartile(v,.25),median=quartile(v,.5),q3=quartile(v,.75);const desc=`${s.label}: mínimo ${brLong.format(v[0])}, mediana ${brLong.format(median)}, máximo ${brLong.format(v.at(-1))} ${unitLabel} (${v.length} anos)`;
    svgEl('text',{x:L-12,y:y+4,'text-anchor':'end',class:'axis-label'},chart).textContent=s.label.length>21?s.label.slice(0,19)+'…':s.label;
    svgEl('line',{x1:x(v[0]),x2:x(v.at(-1)),y1:y,y2:y,stroke:s.color,'stroke-width':2},chart);
    for(const edge of [v[0],v.at(-1)])svgEl('line',{x1:x(edge),x2:x(edge),y1:y-9,y2:y+9,stroke:s.color,'stroke-width':2},chart);
    const box=svgEl('rect',{x:x(q1),y:y-11,width:Math.max(1,x(q3)-x(q1)),height:22,fill:s.color,'fill-opacity':'.28',stroke:s.color,'stroke-width':2,tabindex:'0','aria-label':desc},chart);
    svgEl('title',{},box).textContent=desc;svgEl('line',{x1:x(median),x2:x(median),y1:y-11,y2:y+11,stroke:s.color,'stroke-width':3},chart);
  });
  $(noteId).textContent=`Caixa: 25% a 75% dos valores anuais; linha interna: mediana; hastes: mínimo e máximo (${unitLabel}).`;
}
const compareStates={selected:['15','16','13','23']};
function renderStateComparison(){
  const panel=$('state-compare-panel');panel.hidden=state.mode!=='aq';if(panel.hidden||!data)return;
  const list=$('compare-state-list');list.replaceChildren();const all=Object.entries(data.states).sort((a,b)=>Number(compareStates.selected.includes(b[0]))-Number(compareStates.selected.includes(a[0]))||a[1].localeCompare(b[1],'pt-BR'));
  for(const [uf,name] of all){const label=document.createElement('label');label.className='species-option';const cb=document.createElement('input');cb.type='checkbox';cb.value=uf;cb.checked=compareStates.selected.includes(uf);cb.disabled=!cb.checked&&compareStates.selected.length>=4;const span=document.createElement('span');span.textContent=name;label.append(cb,span);list.append(label)}
  $('compare-count').textContent=`${compareStates.selected.length}/4`;
  const totals=new Map();for(const [year,uf,product,tonnes,money] of data.aquaculture){if(year<state.from||year>state.to||!compareStates.selected.includes(uf)||!state.selected.includes(product))continue;const value=state.indicator==='tonnes'?tonnes:money;if(!Number.isFinite(value))continue;const key=`${uf}|${year}`;totals.set(key,(totals.get(key)||0)+value)}
  const lines=compareStates.selected.map((uf,i)=>({label:data.states[uf],color:COLORS[i],points:Array.from({length:state.to-state.from+1},(_,j)=>{const year=state.from+j;return {year,value:totals.get(`${uf}|${year}`)}})}));
  const chart=$('state-compare-chart'),legend=$('compare-legend');chart.replaceChildren();legend.replaceChildren();const vals=lines.flatMap(s=>s.points.map(p=>p.value).filter(Number.isFinite));
  for(const s of lines){const item=document.createElement('div');item.className='legend-item';const sw=document.createElement('span');sw.className='swatch';sw.style.background=s.color;const name=document.createElement('span');name.textContent=s.label;item.append(sw,name);legend.append(item)}
  if(!vals.length){$('compare-detail').textContent='Selecione estados e produtos com dados neste período.';return}
  const L=75,R=32,T=25,B=52,W=820,H=340,max=Math.max(...vals)*1.12||1,x=yr=>L+(yr-state.from)/Math.max(1,state.to-state.from)*(W-L-R),y=v=>H-B-v/max*(H-T-B),unitLabel=state.indicator==='tonnes'?'toneladas':'R$ milhões';
  for(let i=0;i<=4;i++){const v=max*i/4;svgEl('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),class:'grid-line'},chart);svgEl('text',{x:L-10,y:y(v)+4,'text-anchor':'end',class:'axis-label'},chart).textContent=fmtMetric(v)}
  const years=Array.from({length:state.to-state.from+1},(_,i)=>state.from+i);for(const yr of years.filter((_,i)=>years.length<=9||i%2===0||i===years.length-1))svgEl('text',{x:x(yr),y:H-18,'text-anchor':'middle',class:'axis-label'},chart).textContent=yr;
  for(const s of lines){let segment=[];const flush=()=>{if(segment.length){svgEl('path',{d:segment.map((p,j)=>`${j?'L':'M'}${x(p.year)},${y(p.value)}`).join(' '),class:'series-line',stroke:s.color},chart);segment=[]}};
    for(const p of s.points){if(!Number.isFinite(p.value)){flush();continue}segment.push(p)}flush();
    for(const p of s.points.filter(p=>Number.isFinite(p.value))){const desc=`${s.label} · ${p.year}: ${brLong.format(p.value)} ${unitLabel}`;const c=svgEl('circle',{cx:x(p.year),cy:y(p.value),r:5,fill:s.color,class:'series-point',tabindex:'0','aria-label':desc},chart);svgEl('title',{},c).textContent=desc;c.addEventListener('mouseenter',()=>{$('compare-detail').textContent=desc});c.addEventListener('focus',()=>{$('compare-detail').textContent=desc})}
  }
  $('compare-detail').textContent='Passe o cursor ou use Tab nos pontos para ver os valores.';
}
$('compare-state-list').addEventListener('change',e=>{const uf=e.target.value;if(e.target.checked){if(compareStates.selected.length>=4){e.target.checked=false;return}compareStates.selected.push(uf)}else compareStates.selected=compareStates.selected.filter(x=>x!==uf);renderStateComparison()});
window.renderNationalAnalysis=function(lines){
  const u=state.indicator==='million_brl'?'R$ milhões':'toneladas';renderBoxplot('national-boxplot','national-box-note',lines,u);
  const latest=lines.map(s=>({...s,value:s.points.find(p=>p.year===state.to)?.value})).filter(s=>Number.isFinite(s.value));const sum=latest.reduce((n,s)=>n+s.value,0),target=$('national-composition');target.replaceChildren();
  renderStateComparison();if(!sum)return;
  const heading=document.createElement('p');heading.className='composition-head';heading.textContent=`Participação entre as séries selecionadas em ${state.to}`;target.append(heading);
  for(const s of latest){const item=document.createElement('div');item.className='composition-row';const name=document.createElement('span');name.className='name';name.textContent=s.label;name.title=s.label;const bar=document.createElement('span');bar.className='bar';const inner=document.createElement('i');inner.style.width=`${s.value/sum*100}%`;inner.style.background=s.color;bar.append(inner);const number=document.createElement('strong');number.textContent=`${brLong.format(s.value/sum*100)}%`;item.append(name,bar,number);target.append(item)}
};
window.renderInternationalAnalysis=lines=>renderBoxplot('intl-boxplot','intl-box-note',lines,'toneladas');

$('export-national').addEventListener('click',()=>{
  if(!data)return;const rows=selectedRows();
  if(state.mode==='aq')downloadCSV('atlas-brasil-aquicultura-filtrada.csv',['ano','uf','produto','producao_t','valor_milhoes_reais_nominais'],rows.map(r=>[r[0],data.states[r[1]],data.products[r[2]],r[3],r[4]]));
  else downloadCSV('atlas-brasil-captura-filtrada.csv',['ano','especie','arquivo_origem','captura_registrada_t'],rows);
});
$('export-international').addEventListener('click',()=>{
  if(!globalData)return;
  const rows=globalState.species==='all'?globalData.totals.filter(r=>r[0]===globalState.mode&&r[1]>=globalState.from&&r[1]<=globalState.to&&globalState.selected.includes(r[2]))
    .map(r=>[r[1],r[2],countryName(r[2]),globalData.countries[r[2]]?.[1],'Todas',r[3]]):
    globalData.rows.filter(r=>r[0]===globalState.mode&&r[1]>=globalState.from&&r[1]<=globalState.to&&globalState.selected.includes(r[2])&&r[3]===globalState.species)
      .map(r=>[r[1],r[2],countryName(r[2]),globalData.countries[r[2]]?.[1],globalData.species[r[3]],r[4]]);
  downloadCSV('atlas-internacional-filtrado.csv',['ano','pais_iso3','pais','continente','especie_ou_grupo','toneladas_peso_vivo'],rows);
});
if(typeof data!=='undefined'&&data)window.renderNationalAnalysis(series());

const tradeState={flow:'both',from:2022,to:2025,mapYear:2025,metric:'fob',country:'all',uf:'all',product:'all',search:''};
let tradeData,tradeGeo,tradeLoading=false,tradeProductsOrder=[];
function tradeNumber(r){return tradeState.metric==='fob'?r[6]:r[5]/1000}
function tradeUnit(){return tradeState.metric==='fob'?'US$ FOB':'toneladas'}
function tradeMatching(){const q=window.AtlasQueries;if(!q)return tradeData.rows.filter(r=>r[1]>=tradeState.from&&r[1]<=tradeState.to&&(tradeState.flow==='both'||r[0]===tradeState.flow)&&(tradeState.country==='all'||r[2]===tradeState.country)&&(tradeState.uf==='all'||r[3]===tradeState.uf)&&(tradeState.product==='all'||r[4]===tradeState.product));const result=q.queryTrade({'trade.json':tradeData},{indicator:tradeState.metric==='fob'?'fob_usd':'net_weight_t',from:tradeState.from,to:tradeState.to,flow:tradeState.flow==='both'?undefined:tradeState.flow,partner:tradeState.country==='all'?undefined:tradeState.country,uf:tradeState.uf==='all'?undefined:tradeState.uf,ncm:tradeState.product==='all'?undefined:tradeState.product});return result.rows.map(r=>[r.flow,r.year,r.partner,r.uf,r.ncm,r.net_weight_kg,r.fob_usd])}
function sumBy(rows,keyFn){const totals=new Map();for(const r of rows){const key=keyFn(r);totals.set(key,(totals.get(key)||0)+tradeNumber(r))}return totals}
async function loadTrade(){
  if(tradeLoading||tradeData)return;tradeLoading=true;
  try{const responses=await Promise.all([fetch('trade.json'),fetch('ufs.geojson')]);if(responses.some(r=>!r.ok))throw Error('Arquivos indisponíveis');[tradeData,tradeGeo]=await Promise.all(responses.map(r=>r.json()));
    const top=new Map();for(const r of tradeData.rows)if(r[1]===2025)top.set(r[4],(top.get(r[4])||0)+r[6]);tradeProductsOrder=Object.keys(tradeData.ncm).sort((a,b)=>(top.get(b)||0)-(top.get(a)||0));
    bindTrade();renderTrade();
  }catch(_){$('trade-coverage').textContent='Não foi possível carregar os dados. Recarregue a página para tentar novamente.'}finally{tradeLoading=false}
}
function renderTradeFilters(){
  $('trade-flow').value=tradeState.flow;$('trade-metric').value=tradeState.metric;
  const years=[2022,2023,2024,2025,2026];fillOptions($('trade-from'),years.map(y=>[y,String(y)]),tradeState.from);fillOptions($('trade-to'),years.map(y=>[y,String(y)]),tradeState.to);
  fillOptions($('trade-map-year'),years.filter(y=>y>=tradeState.from&&y<=tradeState.to).map(y=>[y,String(y)]),tradeState.mapYear);
  fillOptions($('trade-country'),[['all','Todos os países'],...tradeData.countries.map(c=>[c,c])],tradeState.country);
  fillOptions($('trade-uf'),[['all','Todas as UFs'],...Object.entries(tradeData.states).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))],tradeState.uf);
  const list=$('trade-product-list');list.replaceChildren();const all=document.createElement('button');all.type='button';all.dataset.tradeProduct='all';all.textContent='Todos os produtos NCM 03';all.className=tradeState.product==='all'?'active':'';list.append(all);
  const q=tradeState.search.trim().toLocaleLowerCase('pt-BR');const matches=tradeProductsOrder.filter(code=>code.includes(q)||tradeData.ncm[code].toLocaleLowerCase('pt-BR').includes(q));
  if(tradeState.product!=='all'){const i=matches.indexOf(tradeState.product);if(i>=0)matches.splice(i,1);matches.unshift(tradeState.product)}
  for(const code of matches.slice(0,30)){const b=document.createElement('button');b.type='button';b.dataset.tradeProduct=code;b.className=tradeState.product===code?'active':'';b.textContent=tradeData.ncm[code];const small=document.createElement('small');small.textContent=code;b.append(small);list.append(b)}
  if(q&&matches.length>30){const p=document.createElement('p');p.className='result-limit';p.textContent=`Mostrando 30 de ${matches.length}. Refine a busca.`;list.append(p)}
  $('trade-product-badge').textContent=tradeState.product==='all'?'Todos':tradeState.product;
}
function drawTradeChart(rows){
  const chart=$('trade-chart');chart.replaceChildren();const legend=$('trade-legend');legend.replaceChildren();const flows=tradeState.flow==='both'?['exp','imp']:[tradeState.flow];
  const totals=sumBy(rows,r=>`${r[0]}|${r[1]}`),values=[...totals.values()],years=Array.from({length:tradeState.to-tradeState.from+1},(_,i)=>tradeState.from+i);
  if(!values.length){$('trade-chart-detail').textContent='Sem registros para este recorte.';return}
  const L=75,R=32,T=25,B=52,W=820,H=340,max=Math.max(...values)*1.12||1,x=yr=>L+(yr-tradeState.from)/Math.max(1,tradeState.to-tradeState.from)*(W-L-R),y=v=>H-B-v/max*(H-T-B);
  for(let i=0;i<=4;i++){const v=max*i/4;svgEl('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),class:'grid-line'},chart);svgEl('text',{x:L-10,y:y(v)+4,'text-anchor':'end',class:'axis-label'},chart).textContent=fmtMetric(v)}
  for(const yr of years)svgEl('text',{x:x(yr),y:H-18,'text-anchor':'middle',class:'axis-label'},chart).textContent=yr;
  for(const [i,flow] of flows.entries()){const name=flow==='exp'?'Exportação':'Importação',color=i===0?'#0c7581':'#d4844d';const item=document.createElement('div');item.className='legend-item';const sw=document.createElement('span');sw.className='swatch';sw.style.background=color;const label=document.createElement('span');label.textContent=name;item.append(sw,label);legend.append(item);
    let segment=[];const flush=()=>{if(segment.length){svgEl('path',{d:segment.map((p,j)=>`${j?'L':'M'}${x(p.yr)},${y(p.v)}`).join(' '),class:'series-line',stroke:color},chart);segment=[]}};
    for(const yr of years){const v=totals.get(`${flow}|${yr}`);if(v==null){flush();continue}segment.push({yr,v});const desc=`${name} · ${yr}: ${brLong.format(v)} ${tradeUnit()}`;const c=svgEl('circle',{cx:x(yr),cy:y(v),r:5,fill:color,class:'series-point',tabindex:'0','aria-label':desc},chart);svgEl('title',{},c).textContent=desc;c.addEventListener('mouseenter',()=>{$('trade-chart-detail').textContent=desc});c.addEventListener('focus',()=>{$('trade-chart-detail').textContent=desc})}flush();
  }
  $('trade-chart-detail').textContent='Passe o cursor ou use Tab nos pontos para ver os valores.';
}
function shapePolygons(g){return g.type==='Polygon'?[g.coordinates]:g.coordinates}
function shapeProjector(features,width,height){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const f of features)for(const polygon of shapePolygons(f.geometry))for(const ring of polygon)for(const [lon,lat] of ring){minX=Math.min(minX,lon);maxX=Math.max(maxX,lon);minY=Math.min(minY,lat);maxY=Math.max(maxY,lat)}
  const scale=Math.min((width-32)/Math.max(.01,maxX-minX),(height-32)/Math.max(.01,maxY-minY));
  const offsetX=(width-(maxX-minX)*scale)/2,offsetY=(height-(maxY-minY)*scale)/2;
  const point=([lon,lat])=>`${(offsetX+(lon-minX)*scale).toFixed(1)},${(offsetY+(maxY-lat)*scale).toFixed(1)}`;
  return g=>shapePolygons(g).map(poly=>poly.map(ring=>'M'+ring.map((p,i)=>(i?'L':'')+point(p)).join('')+'Z').join('')).join('');
}
function renderRankItems(targetId,items,limit=8){
  const target=$(targetId);target.replaceChildren();const ordered=items.filter(x=>Number.isFinite(x.value)).sort((a,b)=>b.value-a.value).slice(0,limit);
  if(!ordered.length){const p=document.createElement('p');p.className='empty';p.textContent='Sem dados neste recorte.';target.append(p);return}
  const max=ordered[0].value||1;
  for(const row of ordered){const item=document.createElement('div');item.className='rank-row';const name=document.createElement('span');name.className='rank-name';name.textContent=row.name;name.title=row.title||row.name;const bar=document.createElement('span');bar.className='rank-bar';const inner=document.createElement('i');inner.style.width=`${Math.max(2,row.value/max*100)}%`;bar.append(inner);const number=document.createElement('strong');number.textContent=fmtMetric(row.value);item.append(name,bar,number);target.append(item)}
}
function renderTradeMap(rows){
  const map=$('trade-map');map.replaceChildren();const values=sumBy(rows.filter(r=>r[1]===tradeState.mapYear&&r[3]),r=>r[3]),max=Math.max(...values.values(),1),path=shapeProjector(tradeGeo.features,560,540);
  for(const f of tradeGeo.features){const uf=f.properties.code,val=values.get(uf),name=tradeData.states[uf];const msg=`${name} · ${val==null?'sem registro':`${brLong.format(val)} ${tradeUnit()}`} em ${tradeState.mapYear}`;
    const p=svgEl('path',{d:path(f.geometry),fill:mapColor(val,max),class:`state-shape${tradeState.uf===uf?' selected':''}`,tabindex:'0',role:'button','aria-label':msg},map);svgEl('title',{},p).textContent=msg;p.addEventListener('mouseenter',()=>{$('trade-map-detail').textContent=msg});p.addEventListener('focus',()=>{$('trade-map-detail').textContent=msg});p.addEventListener('click',()=>{tradeState.uf=tradeState.uf===uf?'all':uf;renderTrade()});p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.click()}})
  }
  $('trade-map-detail').textContent='Passe o cursor ou clique em uma UF para filtrar.';
}
function renderTrade(){
  renderTradeFilters();const rows=tradeMatching(),latest=rows.filter(r=>r[1]===tradeState.to),previous=rows.filter(r=>r[1]===tradeState.to-1);const total=latest.reduce((n,r)=>n+tradeNumber(r),0),before=previous.reduce((n,r)=>n+tradeNumber(r),0);
  const partners=sumBy(latest,r=>r[2]),leader=[...partners].sort((a,b)=>b[1]-a[1])[0];
  $('trade-period').textContent=`${tradeState.from}–${tradeState.to}${tradeState.to===2026?'*':''}`;
  $('trade-coverage').textContent=`${tradeState.flow==='both'?'Exportações + importações':tradeState.flow==='exp'?'Exportações':'Importações'} · ${tradeState.product==='all'?'NCM 03':`NCM ${tradeState.product}`} · ${tradeState.country==='all'?'todos os países':tradeState.country} · ${tradeState.uf==='all'?'todas as UFs':tradeData.states[tradeState.uf]}. ${tradeState.to===2026?'2026: janeiro a agosto.':''}`;
  $('trade-total').textContent=latest.length?fmtMetric(total):'—';$('trade-total-detail').textContent=`${tradeUnit()} · ${tradeState.to}${tradeState.to===2026?' (parcial)':''}`;
  $('trade-change').textContent=tradeState.to!==2026&&latest.length&&previous.length&&before?`${total>=before?'+':''}${brLong.format((total/before-1)*100)}%`:'—';
  $('trade-change-detail').textContent=tradeState.to===2026?'Ano parcial; comparação anual não exibida.':previous.length?`Em relação a ${tradeState.to-1}.`:'Sem dados no ano anterior.';
  $('trade-leader').textContent=leader?.[0]||'—';$('trade-leader-detail').textContent=leader?`${fmtMetric(leader[1])} ${tradeUnit()}`:'Sem registro no último ano.';
  $('trade-map-subtitle').textContent=`${tradeState.flow==='both'?'Exportações + importações':tradeState.flow==='exp'?'Exportações':'Importações'} em ${tradeState.mapYear}${tradeState.mapYear===2026?' (jan–ago)':''} · ${tradeUnit()}.`;$('trade-rank-year').textContent=`${tradeState.mapYear}${tradeState.mapYear===2026?'*':''}`;
  drawTradeChart(rows);renderTradeMap(rows);
  const mapRows=rows.filter(r=>r[1]===tradeState.mapYear);renderRankItems('trade-ranking',[...sumBy(mapRows,r=>r[2])].map(([name,value])=>({name,value})));
  renderRankItems('trade-products',[...sumBy(mapRows,r=>r[4])].map(([code,value])=>({name:`${code} · ${tradeData.ncm[code]}`,title:tradeData.ncm[code],value})));
}
function bindTrade(){
  $('trade-reset').addEventListener('click',()=>{Object.assign(tradeState,{flow:'both',from:2022,to:2025,mapYear:2025,metric:'fob',country:'all',uf:'all',product:'all',search:''});$('trade-product-search').value='';renderTrade()});
  for(const [id,key] of [['trade-flow','flow'],['trade-metric','metric'],['trade-country','country'],['trade-uf','uf']])$(id).addEventListener('change',e=>{tradeState[key]=e.target.value;renderTrade()});
  $('trade-from').addEventListener('change',e=>{tradeState.from=+e.target.value;if(tradeState.from>tradeState.to)tradeState.to=tradeState.from;if(tradeState.mapYear<tradeState.from)tradeState.mapYear=tradeState.from;renderTrade()});
  $('trade-to').addEventListener('change',e=>{tradeState.to=+e.target.value;if(tradeState.to<tradeState.from)tradeState.from=tradeState.to;if(tradeState.mapYear>tradeState.to)tradeState.mapYear=tradeState.to;renderTrade()});
  $('trade-map-year').addEventListener('change',e=>{tradeState.mapYear=+e.target.value;renderTrade()});
  $('trade-product-search').addEventListener('input',e=>{tradeState.search=e.target.value;renderTradeFilters()});
  $('trade-product-list').addEventListener('click',e=>{const b=e.target.closest('[data-trade-product]');if(!b)return;tradeState.product=b.dataset.tradeProduct;renderTrade()});
  $('export-trade').addEventListener('click',()=>{const rows=tradeMatching().map(r=>[r[0]==='exp'?'Exportação':'Importação',r[1],r[2],tradeData.states[r[3]]||'Não informada',r[4],tradeData.ncm[r[4]],r[5],r[6]]);downloadCSV('atlas-comercio-filtrado.csv',['fluxo','ano','pais_parceiro','uf_produto','ncm','produto','peso_liquido_kg','valor_fob_usd'],rows)});
}

const municipalState={uf:'15',product:'all',municipality:null,search:''};
let municipalData,municipalLoading=false,municipalGeo=null,municipalGeoCode=null;
async function loadMunicipal(){
  if(municipalLoading)return;municipalLoading=true;
  try{if(!municipalData){const response=await fetch('municipal.json');if(!response.ok)throw Error('Dados indisponíveis');municipalData=await response.json();bindMunicipal()}
    await loadMunicipalMap();renderMunicipal();
  }catch(_){$('municipal-coverage').textContent='Não foi possível carregar os dados municipais. Recarregue a página para tentar novamente.'}finally{municipalLoading=false}
}
async function loadMunicipalMap(){
  const code=municipalState.uf;if(municipalGeoCode===code)return;
  $('municipal-coverage').textContent='Carregando a malha municipal…';
  const r=await fetch(`municipios/${code}.geojson`);if(!r.ok)throw Error('Malha indisponível');const json=await r.json();if(municipalState.uf!==code)return loadMunicipalMap();municipalGeo=json;municipalGeoCode=code;
}
function renderMunicipalFilters(){
  fillOptions($('municipal-uf'),Object.entries(municipalData.states).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')),municipalState.uf);
  fillOptions($('municipal-product'),[['all','Todos os produtos'],...Object.entries(municipalData.products).sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'))],municipalState.product);
  $('municipal-clear').hidden=!municipalState.municipality;
}
function municipalRows(){const query=municipalState.search.trim().toLocaleLowerCase('pt-BR'),q=window.AtlasQueries;if(!q)return municipalData.rows.filter(r=>r[0].startsWith(municipalState.uf)&&(municipalState.product==='all'||r[1]===municipalState.product)&&(!municipalState.municipality||r[0]===municipalState.municipality)&&(!query||municipalData.municipalities[r[0]]?.[0].toLocaleLowerCase('pt-BR').includes(query)));const result=q.queryMunicipal({'municipal.json':municipalData},{uf:municipalState.uf,municipality:municipalState.municipality||undefined,product:municipalState.product==='all'?undefined:municipalState.product});return result.rows.filter(r=>!query||municipalData.municipalities[r.municipality]?.[0].toLocaleLowerCase('pt-BR').includes(query)).map(r=>[r.municipality,r.product,r.production_t])}
function renderMunicipalMap(values){
  const map=$('municipal-map');map.replaceChildren();if(!municipalGeo)return;const path=shapeProjector(municipalGeo.features,600,540),max=Math.max(...values.values(),1);
  for(const f of municipalGeo.features){const code=f.properties.code,val=values.get(code),name=municipalData.municipalities[code]?.[0]||code;const msg=`${name} · ${val==null?'sem dado neste recorte':`${brLong.format(val)} toneladas`} em 2024`;
    const p=svgEl('path',{d:path(f.geometry),fill:mapColor(val,max),class:`municipality-shape${municipalState.municipality===code?' selected':''}`,tabindex:'0',role:'button','aria-label':msg},map);svgEl('title',{},p).textContent=msg;p.addEventListener('mouseenter',()=>{$('municipal-map-detail').textContent=msg});p.addEventListener('focus',()=>{$('municipal-map-detail').textContent=msg});p.addEventListener('click',()=>{municipalState.municipality=municipalState.municipality===code?null:code;municipalState.search='';$('municipal-search').value='';renderMunicipal()});p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();p.click()}})
  }
  $('municipal-map-detail').textContent='Passe o cursor ou clique em um município para filtrar.';
}
function renderMunicipal(){
  renderMunicipalFilters();const rows=municipalRows(),values=new Map();for(const [code,,tonnes] of rows)values.set(code,(values.get(code)||0)+tonnes);const sorted=[...values].sort((a,b)=>b[1]-a[1]),leader=sorted[0],total=sorted.reduce((n,x)=>n+x[1],0);
  const name=municipalData.states[municipalState.uf];$('municipal-title').textContent=`Aquicultura municipal · ${name}`;$('municipal-map-title').textContent=name;
  $('municipal-coverage').textContent=`${municipalState.product==='all'?'Produtos aquícolas em kg':municipalData.products[municipalState.product]} · ${name} · 2024. Ausências não são zero.`;
  $('municipal-total').textContent=sorted.length?fmtMetric(total):'—';$('municipal-count').textContent=br.format(sorted.length);$('municipal-leader').textContent=leader?municipalData.municipalities[leader[0]]?.[0]:'—';$('municipal-leader-detail').textContent=leader?`${fmtMetric(leader[1])} toneladas`:'Sem registro.';
  renderMunicipalMap(values);renderRankItems('municipal-ranking',sorted.map(([code,value])=>({name:municipalData.municipalities[code]?.[0]||code,value})),10);
}
function bindMunicipal(){
  $('municipal-reset').addEventListener('click',async()=>{Object.assign(municipalState,{uf:'15',product:'all',municipality:null,search:''});$('municipal-search').value='';await loadMunicipalMap();renderMunicipal()});
  $('municipal-uf').addEventListener('change',async e=>{municipalState.uf=e.target.value;municipalState.municipality=null;try{await loadMunicipalMap();renderMunicipal()}catch(_){$('municipal-coverage').textContent='Malha municipal indisponível.'}});
  $('municipal-product').addEventListener('change',e=>{municipalState.product=e.target.value;municipalState.municipality=null;renderMunicipal()});
  $('municipal-search').addEventListener('input',e=>{municipalState.search=e.target.value;municipalState.municipality=null;renderMunicipal()});
  $('municipal-clear').addEventListener('click',()=>{municipalState.municipality=null;renderMunicipal()});
  $('export-municipal').addEventListener('click',()=>{const rows=municipalRows().map(([code,product,tonnes])=>[2024,code,municipalData.municipalities[code][0],municipalData.states[code.slice(0,2)],product,municipalData.products[product],tonnes]);downloadCSV('atlas-aquicultura-municipios-filtrada.csv',['ano','codigo_municipio','municipio','uf','codigo_produto','produto','producao_t'],rows)});
}
window.onScopeChange=scope=>{if(scope==='trade')loadTrade();if(scope==='municipal')loadMunicipal()};
