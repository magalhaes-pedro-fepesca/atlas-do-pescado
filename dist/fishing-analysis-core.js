/* Pure queries: one source and product at a time; no zero imputation. */
(function(root){
  function annual(rows,source,product='all'){
    const groups=new Map();
    rows.filter(r=>r.source_id===source&&(product==='all'||r.especie===product)).forEach(r=>{
      if(typeof r.desembarque_t!=='number'||!Number.isFinite(r.desembarque_t))return;
      const value=groups.get(r.ano)||{year:r.ano,milli:0,observations:0};
      value.milli+=Math.round(r.desembarque_t*1000);value.observations++;groups.set(r.ano,value);
    });
    return [...groups.values()].sort((a,b)=>a.year-b.year).map(r=>({year:r.year,t:r.milli/1000,observations:r.observations}));
  }
  function compare(series,from,to){
    const a=series.find(r=>r.year===Number(from)),b=series.find(r=>r.year===Number(to));
    if(!a||!b)return {status:'missing',delta:null,percent:null};
    const delta=Math.round((b.t-a.t)*1000)/1000;
    return {status:Number(from)===Number(to)?'same':'ok',from:a,to:b,delta,percent:a.t===0?null:delta/a.t*100};
  }
  function points(series){if(!series.length)return [];const by=new Map(series.map(r=>[r.year,r.t]));return Array.from({length:series.at(-1).year-series[0].year+1},(_,i)=>({year:series[0].year+i,t:by.has(series[0].year+i)?by.get(series[0].year+i):null}));}
  const api={annual,compare,points};if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFishingQueries=api;
})(typeof window==='object'?window:globalThis);
