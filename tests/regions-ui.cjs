/* Browser QA uses a local static server and a separately installed Chromium binary. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const loaded=require(process.env.ATLAS_QA_CHROMIUM_MODULE||'@sparticuz/chromium');const binary=loaded.default||loaded;
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:await binary.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote'],headless:true});
 const errors=[],checks=[];
 try{
  for(const [name,width,height] of [['desktop',1440,1000],['tablet',834,1112],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height},acceptDownloads:true});page.on('pageerror',e=>errors.push(name+': '+e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(()=>setScope('municipal'));
   await page.locator('[data-municipal-area="regions"]').click();await page.locator('#regional-content').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelectorAll('#regional-list button').length===6);
   assert.equal(await page.locator('#municipal-view > .workspace').isVisible(),false);
   assert.equal(await page.locator('#regional-map .regional-shape').count(),6);
   await page.selectOption('#regional-state','15');await page.waitForFunction(()=>document.querySelectorAll('#regional-list button').length===21);
   await page.waitForFunction(()=>document.querySelectorAll('#regional-map .regional-shape').length===144);
   // Resolve Bragança's region from the downloaded official hierarchy rather than hard-code it.
   const region=JSON.parse(fs.readFileSync(path.join(root,'regions.json'))).states['15'].municipalities['1501709'].region;
   await page.selectOption('#regional-region',region);await page.selectOption('#regional-municipality','1501709');
   assert.match(await page.locator('#regional-title').textContent(),/Bragança/);
   await page.waitForFunction(()=>document.querySelectorAll('#regional-map .regional-shape').length===1);
   const md=page.waitForEvent('download');await page.locator('#regional-metadata').click();const d=await md;const metadata=JSON.parse(fs.readFileSync(await d.path()));assert.equal(metadata.recorte.municipality,'1501709');
   if(await page.locator('#regional-csv').isVisible()&&!await page.locator('#regional-csv').isDisabled()){const dl=page.waitForEvent('download');await page.locator('#regional-csv').click();const result=await dl;assert.match(fs.readFileSync(await result.path(),'utf8'),/licenca_url/)}
   await page.locator('#regional-category').selectOption('Dados geográficos');const geo=page.waitForEvent('download');await page.locator('#regional-geodata').click();assert.equal(JSON.parse(fs.readFileSync(await (await geo).path())).features.length,1);
   await page.locator('#regional-provenance details').first().locator('summary').click();assert.match(await page.locator('#regional-provenance').textContent(),/Livre utilização/);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,name+' has no viewport overflow');
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(process.env.ATLAS_QA_OUTPUT||require('node:os').tmpdir(),'atlas-regions-'+name+'.png'),fullPage:false});
   await page.locator('[data-municipal-area="explore"]').click();assert.equal(await page.locator('#municipal-view > .workspace').isVisible(),true);
   await page.evaluate(()=>setScope('national'));assert.equal(await page.locator('#national-view').isVisible(),true);
   checks.push(name+': hierarchy, maps, metadata, CSV, GeoJSON, provenance, overflow and existing view passed');await page.close();
  }
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(()=>setScope('municipal'));await page.locator('[data-municipal-area="regions"]').click();await page.locator('#regional-content').waitFor({state:'visible'});
  for(const code of ['15','16','21','28','13','11']){await page.selectOption('#regional-state',code);await page.waitForFunction(c=>document.querySelector('#regional-state').value===c&&document.querySelectorAll('#regional-region option').length>1,code)}
  assert.equal(await page.locator('#regional-provenance a').first().getAttribute('href'),'https://sidra.ibge.gov.br/tabela/3940');checks.push('All six states expose their regions; original-source URL is official');
  const empty=await page.evaluate(async()=>{const t=await(await fetch('regions.json')).json(),m=await(await fetch('municipal.json')).json();return AtlasRegions.territories(t).find(p=>!AtlasRegions.query(t,m,{municipality:p.id}).rows.length)});
  await page.selectOption('#regional-state',empty.state);await page.selectOption('#regional-region',empty.region);await page.selectOption('#regional-municipality',empty.id);assert.match(await page.locator('#regional-data').textContent(),/não há observações|Não há observações/);assert.equal(await page.locator('#regional-category option').count(),1);assert.equal(await page.locator('#regional-csv').isVisible(),false);checks.push('Municipality without observations: geography only, explicit missing-data message, no CSV');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
