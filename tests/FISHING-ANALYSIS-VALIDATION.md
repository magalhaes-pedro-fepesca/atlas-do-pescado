# Etapa 4 — análise municipal, 04/10/2026

- Gráfico: série completa da fonte e produto selecionados; filtro de ano da tabela não altera o histórico. Ausências interrompem a linha, sem preencher zeros. Descrição acessível contém anos e valores.
- Comparação: dois anos da mesma fonte e produto; diferença absoluta e percentual aritmético. Ano ausente bloqueia cálculo; base zero bloqueia percentual; mesmo ano identificado. Avisos de cobertura por ano e ausência de ajuste por esforço/dias. Não interpreta diferenças como produção total ou abundância.
- Mapa: limites municipais simplificados já presentes no Atlas, PA/AP/RJ. Dois códigos com dados: Santarém 1506807, Arraial do Cabo 3300258. AP sem série integrada. Demais estados não estão neste mapa. A cor indica presença no acervo, não captura zero, intensidade ou local de captura. Independe dos filtros.
- R: exportação do script para o CSV do recorte atual, R base, sem instalação de pacotes. Verifica uma única fonte, colunas e números válidos; agrega em milésimos de tonelada e mantém lacunas como NA. Gera PDF, CSV anual e atribuição/limites em TXT. Diferença entre primeiro e último ano do recorte é descritiva. Script não executado em R porque o ambiente não tem Rscript; validada geração e conteúdo, sem reivindicar teste de execução em RStudio.

Validação: 7 testes determinísticos (soma, separação de fontes/produtos, ausências, zeros, direção, mesmo ano, geometrias), 10 blocos data-query e 15 testes territoriais passaram. Simulação da interface validou gráfico, três mapas, mudança e retenção de comparação, exportação R/CSV, seleção de fonte e alternância de abas. Sintaxe JS válida. Sem navegador instalado para inspeção visual neste ambiente.

As séries, licenças e originais não foram alterados; esta etapa adiciona consultas e exportações, sem novos dados ou extrapolações.
