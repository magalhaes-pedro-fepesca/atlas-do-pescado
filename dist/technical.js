(() => {
  const el = id => document.getElementById('cad-' + id);
  const svg = el('canvas'), NS = 'http://www.w3.org/2000/svg', key = 'atlas-cad-projects-v1';
  const fresh = () => ({version:1,id:crypto.randomUUID(),name:'Meu projeto de aquicultura',notes:'',width:100,height:70,items:[]});
  let project = fresh(), selected = null, undo = [], redo = [], drag = null;
  const templates = [
    {name:'Quatro viveiros',description:'Viveiros de 20 × 12 m, com corredores de 4 m.',width:60,height:40,items:[0,1,2,3].map(n=>({type:'pond',label:'Viveiro '+(n+1),x:6+(n%2)*24,y:6+Math.floor(n/2)*16,width:20,height:12,depth:1.5}))},
    {name:'Seis tanques circulares',description:'Tanques de 8 m de diâmetro, separados por 4 m.',width:44,height:32,items:Array.from({length:6},(_,n)=>({type:'tank',label:'Tanque '+(n+1),x:6+(n%3)*12,y:6+Math.floor(n/3)*12,width:8,height:8,depth:1.2}))},
    {name:'Unidade mista',description:'Dois viveiros e dois tanques circulares em uma planta.',width:70,height:45,items:[{type:'pond',label:'Viveiro 1',x:5,y:5,width:25,height:15,depth:1.5},{type:'pond',label:'Viveiro 2',x:5,y:25,width:25,height:15,depth:1.5},{type:'tank',label:'Tanque 1',x:42,y:6,width:10,height:10,depth:1.2},{type:'tank',label:'Tanque 2',x:42,y:25,width:10,height:10,depth:1.2}]}
  ];
  const modelSection = document.createElement('section');
  modelSection.className = 'cad-models';
  const heading = document.createElement('h3'); heading.textContent = 'Comece por um modelo';
  const note = document.createElement('p'); note.textContent = 'Plantas ilustrativas editáveis. As medidas são exemplos e precisam ser adaptadas ao terreno e validadas para cada projeto.';
  const cards = document.createElement('div'); cards.className = 'cad-model-grid';
  modelSection.append(heading,note,cards);
  for (const template of templates) {
    const card=document.createElement('article'), title=document.createElement('h4'), text=document.createElement('p'), button=document.createElement('button');
    title.textContent=template.name; text.textContent=template.description; button.type='button'; button.textContent='Usar modelo';
    button.onclick=()=>{
      if ((project.items.length || project.notes || project.name !== 'Meu projeto de aquicultura') && !confirm('Abrir este modelo? Salve ou baixe o projeto atual para conservar alterações.')) return;
      project={...fresh(),name:template.name,width:template.width,height:template.height,notes:'Modelo ilustrativo. Não inclui dimensionamento hidráulico, taludes, drenagem ou especificações construtivas.',items:template.items.map(i=>({...i,id:crypto.randomUUID()}))};
      selected=null;undo=[];redo=[];sync();status('Modelo aberto. Edite as medidas e salve como seu próprio projeto.');
    };
    card.append(title,text,button); cards.append(card);
  }
  document.querySelector('.cad-project').before(modelSection);
  const snapshot = () => JSON.stringify(project);
  const status = text => { el('status').textContent = text; };
  function remember(before = snapshot()) { undo.push(before); if (undo.length > 60) undo.shift(); redo = []; }
  function node(tag, attrs, text) { const n = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs || {})) n.setAttribute(k,v); if (text !== undefined) n.textContent = text; return n; }
  function size(i) { return {w:i.width,h:i.type === 'tank' ? i.width : i.height}; }
  function area(i) { return i.type === 'tank' ? Math.PI * (i.width / 2) ** 2 : i.width * i.height; }
  const num = n => n.toLocaleString('pt-BR',{maximumFractionDigits:2});
  function render() {
    const W = project.width * 10, H = project.height * 10;
    svg.replaceChildren(); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = node('defs'), pattern = node('pattern',{id:'cad-grid-pattern',width:10,height:10,patternUnits:'userSpaceOnUse'});
    pattern.append(node('path',{d:'M 10 0 L 0 0 0 10',fill:'none',stroke:'#dce9ed','stroke-width':.5})); defs.append(pattern); svg.append(defs);
    svg.append(node('rect',{width:W,height:H,fill:'#fff'}));
    if (el('grid').checked) svg.append(node('rect',{width:W,height:H,fill:'url(#cad-grid-pattern)'}));
    for (const i of project.items) {
      const {w,h} = size(i), x = i.x*10, y = i.y*10, g = node('g',{'data-id':i.id,tabindex:0,role:'button','aria-label':i.label});
      const attrs = {fill:'#d6eeeb',stroke:selected === i.id ? '#db6b27' : '#127781','stroke-width':selected === i.id ? 3 : 1.5};
      g.append(i.type === 'tank' ? node('circle',{cx:x+w*5,cy:y+w*5,r:w*5,...attrs}) : node('rect',{x,y,width:w*10,height:h*10,...attrs}));
      g.append(node('text',{x:x+w*5,y:y+h*5,'text-anchor':'middle','font-size':Math.min(12,Math.max(4,w*1.4)),fill:'#14384a'},i.label));
      if (el('dimensions').checked) {
        g.append(node('text',{x:x+w*5,y:y+Math.min(h*10-2,14),'text-anchor':'middle','font-size':8,fill:'#14384a'},i.type === 'tank' ? `Ø ${num(w)} m` : `${num(w)} × ${num(h)} m`));
        g.append(node('line',{x1:x,y1:y+h*10,x2:x+w*10,y2:y+h*10,stroke:'#426671','stroke-width':1}));
      }
      svg.append(g);
    }
    const i = project.items.find(i => i.id === selected);
    el('empty').hidden = !!i; el('form').hidden = !i;
    if (i) {
      for (const k of ['x','y','width','height','depth']) el(k).value = i[k];
      el('label').value = i.label; el('height-wrap').hidden = i.type === 'tank';
      el('height').required = i.type !== 'tank';
      el('width-label').firstChild.textContent = i.type === 'tank' ? 'Diâmetro (m)' : 'Largura (m)';
      el('measures').textContent = `Área: ${num(area(i))} m² · Volume: ${num(area(i)*i.depth)} m³. ` + (i.type === 'tank' ? 'A = π × (diâmetro ÷ 2)²; V = A × profundidade.' : 'A = largura × comprimento; V = A × profundidade.');
    }
    el('total').textContent = `${project.items.length} elementos · Soma das áreas: ${num(project.items.reduce((s,i)=>s+area(i),0))} m² · Soma dos volumes: ${num(project.items.reduce((s,i)=>s+area(i)*i.depth,0))} m³. Sobreposições não são descontadas.`;
    el('undo').disabled = !undo.length; el('redo').disabled = !redo.length;
    el('delete').disabled = el('duplicate').disabled = !i;
    el('sheet-width').value = project.width; el('sheet-height').value = project.height;
  }
  function fits(i) { const {w,h} = size(i); return i.x>=0 && i.y>=0 && i.x+w<=project.width && i.y+h<=project.height; }
  function add(type) {
    const i = {id:crypto.randomUUID(),type,label:(type === 'tank' ? 'Tanque ' : 'Viveiro ') + (project.items.length+1),x:2,y:2,width:Math.min(type === 'tank' ? 8 : 20,project.width-4),height:Math.min(12,project.height-4),depth:1.5};
    if (type === 'tank') i.width = Math.min(i.width,project.height-4);
    remember(); project.items.push(i); selected=i.id; render();
  }
  el('pond').onclick=()=>add('pond'); el('tank').onclick=()=>add('tank');
  el('form').onsubmit = e => {
    e.preventDefault(); const old = project.items.find(i=>i.id===selected); if (!old) return;
    const i = {...old,label:el('label').value.trim()};
    for (const k of ['x','y','width','height','depth']) i[k] = Number(el(k).value);
    if (!i.label || !fits(i)) return status('O elemento deve caber dentro da prancha.');
    remember(); Object.assign(old,i); render(); status('Dimensões atualizadas.');
  };
  el('delete').onclick=()=>{if(!selected)return;remember();project.items=project.items.filter(i=>i.id!==selected);selected=null;render();};
  el('duplicate').onclick=()=>{const old=project.items.find(i=>i.id===selected);if(!old)return;const i={...old,id:crypto.randomUUID(),label:old.label+' (cópia)',x:old.x+1,y:old.y+1};if(!fits(i))return status('Não há espaço para a cópia nesta posição.');remember();project.items.push(i);selected=i.id;render();};
  for (const action of ['undo','redo']) el(action).onclick=()=>{const from=action==='undo'?undo:redo,to=action==='undo'?redo:undo;if(!from.length)return;to.push(snapshot());project=JSON.parse(from.pop());selected=null;sync();};
  function sync(){el('name').value=project.name;el('notes').value=project.notes;render();}
  el('name').onchange=()=>{remember();project.name=el('name').value.trim()||'Projeto sem título';};
  el('notes').onchange=()=>{remember();project.notes=el('notes').value;};
  el('sheet-form').onsubmit=e=>{e.preventDefault();const w=Number(el('sheet-width').value),h=Number(el('sheet-height').value);if(project.items.some(i=>i.x+size(i).w>w||i.y+size(i).h>h))return status('A prancha menor cortaria elementos existentes.');remember();project.width=w;project.height=h;render();};
  el('grid').onchange=el('dimensions').onchange=render;
  const point=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());return {x:p.x/10,y:p.y/10};};
  svg.onpointerdown=e=>{const g=e.target.closest('[data-id]');selected=g?.dataset.id||null;if(selected){const i=project.items.find(i=>i.id===selected);drag={id:selected,start:point(e),x:i.x,y:i.y,before:snapshot()};svg.setPointerCapture(e.pointerId);}render();};
  svg.onpointermove=e=>{if(!drag)return;const p=point(e),i=project.items.find(i=>i.id===drag.id),s=size(i),snap=el('grid').checked?1:10;i.x=Math.max(0,Math.min(project.width-s.w,Math.round((drag.x+p.x-drag.start.x)*snap)/snap));i.y=Math.max(0,Math.min(project.height-s.h,Math.round((drag.y+p.y-drag.start.y)*snap)/snap));render();};
  function end(){if(drag&&drag.before!==snapshot())remember(drag.before);drag=null;render();}
  svg.onpointerup=svg.onpointercancel=end;
  svg.onkeydown=e=>{const g=e.target.closest('[data-id]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selected=g.dataset.id;render();el('label').focus();}};
  function saved(){const p=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(p))throw Error();return p;}
  function list(){try{const options=saved().map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o;});el('projects').replaceChildren(new Option('Selecione um projeto',''),...options);}catch{status('Não foi possível ler os projetos locais. Use baixar/importar projeto.');}}
  el('save').onclick=()=>{try{project.name=el('name').value.trim()||'Projeto sem título';project.notes=el('notes').value;const all=saved().filter(p=>p.id!==project.id);all.push({...project,updatedAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(all));list();status('Projeto salvo neste navegador. Baixe também uma cópia.');}catch{status('Falha ao salvar no dispositivo. Baixe uma cópia do projeto.');}};
  function validate(p){if(!p||p.version!==1||!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<10||p.height<10||p.width>1000||p.height>1000||!Array.isArray(p.items)||p.items.length>500||typeof p.name!=='string'||p.name.length>100||typeof p.notes!=='string'||p.notes.length>4000||typeof p.id!=='string')throw Error();const ids=new Set();for(const i of p.items){if(!i||!['pond','tank'].includes(i.type)||typeof i.id!=='string'||ids.has(i.id)||typeof i.label!=='string'||i.label.length>80)throw Error();ids.add(i.id);for(const k of ['x','y','width','height','depth'])if(!Number.isFinite(i[k])||i[k]<(k==='x'||k==='y'?0:.1))throw Error();if(i.x+size(i).w>p.width||i.y+size(i).h>p.height)throw Error();}return p;}
  el('open').onclick=()=>{try{const p=saved().find(p=>p.id===el('projects').value);if(!p)return status('Selecione um projeto salvo.');validate(p);if(!confirm('Abrir o projeto selecionado? Alterações não salvas serão descartadas.'))return;project=p;selected=null;undo=[];redo=[];sync();status('Projeto aberto.');}catch{status('Projeto inválido ou armazenamento indisponível.');}};
  el('new').onclick=()=>{if(!confirm('Criar um novo projeto? Salve ou baixe o atual antes de continuar.'))return;project=fresh();selected=null;undo=[];redo=[];sync();};
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  el('json').onclick=()=>{project.name=el('name').value.trim()||'Projeto sem título';project.notes=el('notes').value;download(new Blob([snapshot()],{type:'application/json'}),'atlas-projeto.json');};
  el('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error();const p=validate(JSON.parse(await f.text()));if(!confirm('Importar projeto? Alterações não salvas serão descartadas.'))return;project=p;selected=null;undo=[];redo=[];sync();status('Projeto importado. Salve no dispositivo para adicioná-lo à lista.');}catch{status('Arquivo inválido. Use um projeto JSON exportado pelo Atlas.');}finally{e.target.value='';}};
  function exportSVG(){const old=selected;selected=null;render();const copy=svg.cloneNode(true);selected=old;render();copy.setAttribute('xmlns',NS);copy.setAttribute('width',1000);copy.setAttribute('height',Math.round(1000*project.height/project.width));copy.removeAttribute('tabindex');copy.prepend(node('title',{},project.name));return new XMLSerializer().serializeToString(copy);}
  el('svg').onclick=()=>download(new Blob([exportSVG()],{type:'image/svg+xml'}),'atlas-planta.svg');
  el('png').onclick=()=>{const image=new Image(),url=URL.createObjectURL(new Blob([exportSVG()],{type:'image/svg+xml'}));image.onload=()=>{const c=document.createElement('canvas');c.width=1600;c.height=Math.round(1600*project.height/project.width);if(c.height>10000){URL.revokeObjectURL(url);return status('Prancha muito alongada para PNG. Exporte SVG.');}c.getContext('2d').drawImage(image,0,0,c.width,c.height);URL.revokeObjectURL(url);c.toBlob(b=>{if(b)download(b,'atlas-planta.png');else status('Falha na exportação PNG.');});};image.onerror=()=>{URL.revokeObjectURL(url);status('Falha na exportação PNG.');};image.src=url;};
  list();sync();
})();
