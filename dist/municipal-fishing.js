(() => {
  const area=document.getElementById('municipal-fishing-area'),content=document.getElementById('fishing-content');
  let data,pending,selected='santarem';
  const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3});
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function load(){
    if(data)return render();content.textContent='Carregando dados abertos…';
    try {pending ||= fetch('municipal-fishing.json').then(r=>{if(!r.ok)throw Error();return r.json()});data=await pending;render();}
    catch {pending=null;content.textContent='Não foi possível carregar os dados. Selecione novamente esta aba para tentar.';}
  }
  function sourceRows(){return data.rows.filter(r=>r.source_id===selected)}
  function filtered(){const year=document.getElementById('fishing-year').value,sp=document.getElementById('fishing-species').value;return sourceRows().filter(r=>(year==='all'||String(r.ano)===year)&&(sp==='all'||r.especie===sp));}
  function render(){
    const m=data.sources[selected],rows=sourceRows(),years=[...new Set(rows.map(r=>r.ano))].sort(),species=[...new Set(rows.map(r=>r.especie))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    content.innerHTML=`<div class="fishing-filters"><label>Município / fonte<select id="fishing-municipality">${Object.entries(data.sources).map(([id,s])=>`<option value="${id}" ${id===selected?'selected':''}>${id==='santarem'?'Santarém · PA · Feira do Pescado':'Arraial do Cabo · RJ · Porto do Forno'}</option>`).join('')}</select></label><label>Produto ou espécie<select id="fishing-species"><option value="all">Todos os rótulos disponíveis</option>${species.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join('')}</select></label><label>Ano<select id="fishing-year"><option value="all">Série disponível · ${years[0]}–${years.at(-1)}</option>${years.map(y=>`<option value="${y}">${y}</option>`).join('')}</select></label></div><p><strong>Cobertura integrada: 2 municípios.</strong> ${escape(m.coverage)}. Outros municípios estão sem dados integrados de desembarque, o que não significa captura zero.</p><p>${escape(m.territory)}</p><p class="fishing-notice">${escape(m.origin)}</p><p>${escape(m.notes)}</p>${selected==='santarem'?'<p><strong>105.092 registros e 62 rótulos de nomes populares.</strong> A massa original já está em toneladas. Foram consolidados espaços externos e diferenças entre maiúsculas e minúsculas; grafias distintas e o grupo “Misto” foram preservados. Os rótulos não equivalem a 62 espécies identificadas. Registros coincidentes foram mantidos porque têm IDs distintos.</p>':''}<div id="fishing-results" aria-live="polite"></div><section id="fishing-analysis" aria-label="Análise dos desembarques"></section><p class="fishing-downloads"><button type="button" id="fishing-export">Baixar recorte · CSV</button><button type="button" id="fishing-export-r">Código para RStudio · R</button><a href="${m.csv}" download>Série preparada completa · CSV</a><a href="${m.metadata_file}" download>Metadados e dicionário</a><a href="${m.original_file}" download>Arquivo original</a></p><p>Para usar no RStudio, baixe o CSV do recorte e o arquivo R com os mesmos filtros. Abra o R no RStudio e execute; se o CSV estiver em outra pasta, o script permite selecioná-lo. Ele gera o gráfico em PDF e a série anual em CSV.</p><p>Fonte: <a href="${m.source}" target="_blank" rel="noopener noreferrer">${escape(m.citation)}</a> · <a href="${m.license_url}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Reutilização permitida com atribuição e indicação das alterações. Extração e agregação pelo Atlas em 04/10/2026.</p>`;
    document.getElementById('fishing-municipality').addEventListener('change',e=>{selected=e.target.value;render()});
    ['fishing-year','fishing-species'].forEach(id=>document.getElementById(id).addEventListener('change',results));
    document.getElementById('fishing-export').addEventListener('click',exportCSV);document.getElementById('fishing-export-r').addEventListener('click',exportR);results();
  }
  function results(){
    const rows=filtered(),m=data.sources[selected],annual=new Map();
    rows.forEach(r=>{const a=annual.get(r.ano)||{year:r.ano,t:0,records:0,hours:0};a.t+=r.desembarque_t;a.records+=r.registros||0;a.hours+=r.esforco_horas||0;annual.set(r.ano,a)});
    const years=[...annual.values()].sort((a,b)=>a.year-b.year),max=Math.max(...years.map(r=>r.t),1),sp=document.getElementById('fishing-species').value;
    document.getElementById('fishing-results').innerHTML=`<h3>Desembarques registrados · ${escape(sp==='all'?'todos os rótulos disponíveis':sp)}</h3><p>${rows.length} observações anuais por produto no recorte. Valores agregados somente dentro desta fonte. Anos sem observação não recebem valor zero.</p>${years.length?`<div class="fishing-table"><table><caption>${selected==='santarem'?'Santarém · Feira do Pescado':'Arraial do Cabo · Anchova'}</caption><thead><tr><th>Ano</th><th>Desembarque (t)</th><th>${selected==='santarem'?'Registros no recorte':'Esforço (horas)'}</th><th>${selected==='santarem'?'Dias registrados na fonte':'Comparação'}</th></tr></thead><tbody>${years.map(r=>`<tr><td>${r.year}</td><td>${fmt.format(r.t)}<div class="fishing-bar" style="width:${100*r.t/max}%" aria-hidden="true"></div></td><td>${fmt.format(selected==='santarem'?r.records:r.hours)}</td><td>${selected==='santarem'?`${m.year_coverage[r.year].days_recorded} dias · ${m.year_coverage[r.year].first_date} a ${m.year_coverage[r.year].last_date}`:'Ponto de desembarque do estudo'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Sem observações para esta combinação de ano e produto.</p>'}${selected==='santarem'?'<p>Dias registrados descrevem toda a fonte no ano, e não o produto selecionado. Ausência de dias pode refletir falhas de cobertura; não é medida de esforço nem captura zero. Em 2019 os registros começam em maio; 2020 termina em junho.</p>':''}`;
    window.AtlasFishingAnalysis?.render(data,selected,document.getElementById('fishing-species').value);
  }
  function exportR(){
    const m=data.sources[selected],file=`atlas-desembarques-${selected}-recorte.csv`;
    const code=`# Atlas do Pescado — recorte municipal de desembarques
# Fonte: ${m.source}
# Licença dos dados: ${m.license} — ${m.license_url}
# Atribuição: ${m.citation}
# Origem: ${m.origin}
# Baixe também "Baixar recorte · CSV" com os mesmos filtros e salve junto a este script.
# Este código usa apenas R base; não instala pacotes.
arquivo <- ${JSON.stringify(file)}
if (!file.exists(arquivo)) arquivo <- file.choose()
dados <- read.csv(arquivo, fileEncoding = "UTF-8-BOM", stringsAsFactors = FALSE,
                  na.strings = c("", "NA"), check.names = FALSE)
obrigatorias <- c("source_id", "ano", "desembarque_t", "fonte", "licenca")
if (!all(obrigatorias %in% names(dados))) stop("CSV incompatível com este script.")
if (nrow(dados) == 0L) stop("O recorte não tem observações.")
if (length(unique(dados$source_id)) != 1L) stop("Selecione uma única fonte.")
if (!all(dados$source_id == ${JSON.stringify(selected)})) stop("O CSV pertence a outra fonte.")
if (any(!is.finite(dados$desembarque_t)) || any(!is.finite(dados$ano)))
  stop("Há valores inválidos no CSV; não foram convertidos em zero.")
# Soma em milésimos de tonelada para preservar a precisão dos CSVs do Atlas.
dados$milesimos_t <- round(dados$desembarque_t * 1000)
serie <- aggregate(milesimos_t ~ ano, dados, sum)
serie <- serie[order(serie$ano), ]
serie$desembarque_t <- serie$milesimos_t / 1000
serie$milesimos_t <- NULL
# Inclui anos sem observação como NA; a linha fica interrompida, sem zeros inventados.
eixo <- data.frame(ano = seq.int(min(serie$ano), max(serie$ano)))
serie <- merge(eixo, serie, by = "ano", all.x = TRUE, sort = TRUE)
print(serie)
# Gráfico do CSV exportado: respeita inclusive o filtro de ano.
pdf("atlas-desembarques-recorte.pdf", width = 9, height = 5)
plot(serie$ano, serie$desembarque_t, type = "o", pch = 19, col = "#14847C",
     xlab = "Ano", ylab = "Desembarques registrados (t)",
     main = "Desembarques — recorte do Atlas do Pescado",
     ylim = c(0, max(serie$desembarque_t, na.rm = TRUE) * 1.1 + 0.001))
mtext("Registros disponíveis; não representa produção municipal total.", side = 3, cex = 0.8)
dev.off()
write.csv(serie, "atlas-serie-anual-recorte.csv", row.names = FALSE, na = "")
# Diferença descritiva entre o primeiro e o último ano observado no recorte.
observados <- serie[!is.na(serie$desembarque_t), ]
if (nrow(observados) >= 2L) {
  a <- observados[1L, ]; b <- observados[nrow(observados), ]
  diferenca_t <- round(b$desembarque_t - a$desembarque_t, 3)
  variacao_pct <- if (a$desembarque_t == 0) NA_real_ else 100 * diferenca_t / a$desembarque_t
  print(data.frame(ano_inicial = a$ano, ano_final = b$ano, diferenca_t, variacao_pct))
}
# Compare a cobertura temporal nos metadados antes de interpretar a diferença.
# Em Santarém, 2019 começa em maio e 2020 termina em junho. Dias ausentes não são zeros.
# Não somar fontes nem aquicultura; não inferir local de captura ou abundância.
writeLines(c(${JSON.stringify(m.citation)}, ${JSON.stringify(m.source)},
             ${JSON.stringify(m.license+' · '+m.license_url)}, ${JSON.stringify(m.notes)}),
           "atlas-fonte-e-limites.txt", useBytes = TRUE)
`;
    const url=URL.createObjectURL(new Blob([code],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`atlas-desembarques-${selected}.R`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportCSV(){
    const m=data.sources[selected],rows=filtered(),keys=['source_id','codigo_ibge','municipio','uf','ano','especie','desembarque_t','registros','dias_registrados','esforco_horas','fonte','licenca','territorio','origem','tratamento'];
    const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
    const lines=[keys,...rows.map(r=>keys.map(k=>k==='fonte'?m.source:k==='licenca'?m.license:k==='territorio'?m.territory:k==='origem'?m.origin:k==='tratamento'?'Agregado anual pelo Atlas; consultar metadados.':r[k]))];
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`atlas-desembarques-${selected}-recorte.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.querySelectorAll('[data-municipal-area]').forEach(b=>b.addEventListener('click',()=>{area.hidden=b.dataset.municipalArea!=='fishing';if(!area.hidden)load();}));
})();
