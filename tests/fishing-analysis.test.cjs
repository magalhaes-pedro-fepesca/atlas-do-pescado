const assert=require('node:assert/strict'),fs=require('node:fs'),Q=require('../dist/fishing-analysis-core.js');
const data=JSON.parse(fs.readFileSync('dist/municipal-fishing.json'));
let tests=0;function test(name,f){f();tests++;console.log('PASS '+name)}
test('Santarém preserves 6894.083 t in ten available years',()=>{const s=Q.annual(data.rows,'santarem');assert.equal(s.length,10);assert.equal(Math.round(s.reduce((v,r)=>v+r.t,0)*1000),6894083)});
test('Sources and species stay separate',()=>{const s=Q.annual(data.rows,'arraial','Pomatomus saltatrix');assert.equal(s[0].t,131.463);assert.equal(s.length,17);assert.deepEqual(Q.annual(data.rows,'arraial','Surubim'),[])});
test('Missing observations are not zero; gaps break the chart',()=>{assert.deepEqual(Q.points([{year:2011,t:2},{year:2013,t:0}]),[{year:2011,t:2},{year:2012,t:null},{year:2013,t:0}]);assert.equal(Q.compare([{year:2011,t:2}],2011,2012).status,'missing')});
test('Zero baseline blocks percentage, explicit zero stays valid',()=>{const c=Q.compare([{year:2011,t:0},{year:2012,t:2}],2011,2012);assert.equal(c.delta,2);assert.equal(c.percent,null)});
test('Differences, direction and same-year cases',()=>{const s=[{year:2011,t:2},{year:2012,t:1}];assert.equal(Q.compare(s,2011,2012).percent,-50);assert.equal(Q.compare(s,2012,2011).percent,100);assert.equal(Q.compare(s,2011,2011).status,'same')});
test('Nonnumeric observations are omitted without coercion',()=>{assert.deepEqual(Q.annual([{source_id:'x',ano:2000,especie:'a',desembarque_t:null},{source_id:'x',ano:2000,especie:'a',desembarque_t:0}],'x'),[{year:2000,t:0,observations:1}])});
test('Coverage maps identify exactly two integrated municipalities',()=>{const covered=new Set(data.rows.map(r=>r.codigo_ibge));for(const [uf,n] of [['15',1],['16',0],['33',1]]){const geo=JSON.parse(fs.readFileSync('dist/municipios/'+uf+'.geojson'));assert.equal(geo.features.filter(f=>covered.has(String(f.properties.code))).length,n)}});
console.log(tests+' tests passed');
