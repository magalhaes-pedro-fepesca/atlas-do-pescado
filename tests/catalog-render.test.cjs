const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=JSON.parse(fs.readFileSync('dist/catalog.json'));
async function run(data,fail=false){
 const elements=new Map();class Element{constructor(tag){this.tag=tag;this.children=[];this.value='all';this.dataset={};this.classList={toggle(){}}}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes;if(this.tag==='select')this.value=nodes[0]?.value||'all'}get childElementCount(){return this.children.length}addEventListener(){}scrollIntoView(){}}
 const el=id=>{if(!elements.has(id))elements.set(id,new Element(id.includes('topic')?'select':'div'));return elements.get(id)};
 const ctx={console,Option:class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value}},fetch:async()=>({ok:!fail,json:async()=>data}),document:{getElementById:el,createElement:t=>new Element(t),querySelectorAll:()=>[]}};ctx.window=ctx;ctx.setScope=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/atlas.js','utf8'),ctx);await ctx.atlasCatalog();return {ctx,el};
}
(async()=>{
 const broken=JSON.parse(JSON.stringify(base));delete broken.items.find(x=>x.id==='pesca-municipal-santarem').quality.columns;
 const r=await run(broken);assert.notEqual(r.el('catalog-count').textContent,'Catálogo indisponível');assert.equal(r.el('catalog-results').children.length,12);
 r.el('catalog-search').value='';for(const id of ['catalog-topic','catalog-subtopic','catalog-access','catalog-scale'])r.el(id).value='all';
 for(const [status,count] of [['integrated',7],['prepared',9],['reference',282]]){r.el('catalog-availability').value=status;await r.ctx.atlasCatalog();assert.match(r.el('catalog-count').textContent,new RegExp('^'+count+' de '));}
 for(const item of base.items){const c=await run({...base,items:[item]});assert.notEqual(c.el('catalog-count').textContent,'Catálogo indisponível',item.id);assert.equal(c.el('catalog-results').children.length,1,item.id)}
 const failure=await run(base,true);assert.equal(failure.el('catalog-count').textContent,'Catálogo indisponível');
 console.log('PASS all 298 catalogue cards, missing optional quality.columns, first page and fetch error state');
})().catch(e=>{console.error(e);process.exit(1)});
