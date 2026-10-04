/* Territorial queries stay separate from the interface and fail closed on provenance. */
(function(root){
  const messages={absent:'Não há dados disponíveis nesta base.',unreported:'Dado não informado.',suppressed:'Dado suprimido/protegido.',period:'Indicador não disponível para este período.',unavailable:'Dados abertos não disponíveis para este indicador nesta fonte.'};
  function permitted(d){return !!d&&['APROVADO','CONDICIONADO'].includes(d.status)&&d.licenca_verificada===true&&!!d.licenca_url&&!!d.url_oficial&&d.tipo_de_acesso==='Público, sem autenticação'&&(d.status!=='CONDICIONADO'||d.condicoes_atendidas===true)}
  function exportable(d){return permitted(d)&&d.redistribuicao===true}
  function territories(t,f={}){
    return Object.values(t.states).filter(s=>!f.state||s.id===f.state).flatMap(s=>Object.values(s.municipalities).filter(m=>(!f.region||m.region===f.region)&&(!f.municipality||m.id===f.municipality)).map(m=>({...m,state:s.id,stateName:s.name,abbr:s.abbr,regionName:s.regions[m.region].name})));
  }
  function query(t,m,f={}){
    const source=t.datasets.find(d=>d.id==='ibge-municipal-regional');
    if(!permitted(source))return {rows:[],value:null,status:'unavailable',message:messages.unavailable};
    if(f.year&&Number(f.year)!==m.meta.year)return {rows:[],value:null,status:'period',message:messages.period};
    const locations=new Map(territories(t,f).map(x=>[x.id,x]));
    const rows=m.rows.filter(([id,p,v])=>locations.has(id)&&(!f.product||f.product==='all'||p===f.product)&&typeof v==='number'&&Number.isFinite(v)).map(([id,p,v])=>({...locations.get(id),product:p,productName:m.products[p],year:m.meta.year,value:v,unit:'t',dataset:source.id}));
    return {rows,value:rows.length?rows.reduce((s,r)=>s+r.value,0):null,status:rows.length?'available':'absent',message:rows.length?'Soma dos registros disponíveis; cobertura parcial.':messages.absent,coverage:new Set(rows.map(r=>r.id)).size};
  }
  function csv(t,rows){
    const source=t.datasets.find(d=>d.id==='ibge-municipal-regional');
    if(!exportable(source))throw Error('Redistribuição não autorizada.');
    const keys=['estado','uf','regiao','codigo_municipio','municipio','produto','ano','valor','unidade','fonte','base_original','licenca','licenca_url','data_acesso','data_atualizacao','transformacao','limitacoes'];
    const quote=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
    return '\ufeff'+[keys,...rows.map(r=>[r.stateName,r.abbr,r.regionName,r.id,r.name,r.productName,r.year,r.value,r.unit,source.fonte_original,source.url_oficial,source.licenca,source.licenca_url,source.data_acesso,source.data_atualizacao,source.transformacao,source.limitacoes])].map(r=>r.map(quote).join(';')).join('\r\n');
  }
  const api={messages,permitted,exportable,territories,query,csv};root.AtlasRegions=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
