# Interface oficial — 13/10/2026

Base real: Sites versão 58, commit 49f524892adec5f94dc3ae5d7313e2172a9a3c9e.
GitHub main: 12f8d42a2d8d34d4ffa4055e44c745e6954e19b2, anterior à publicação.
Referência visual anexada foi inspecionada. Branch local de segurança: safety/interface-v58-20261013.

## Arquivos alterados
- dist/index.html: logotipo dentro da navegação, busca, categorias e título da apresentação.
- dist/interface-official.css: camada visual navy/turquesa, cartões fotográficos, painéis, tema escuro, pontos de quebra e movimento reduzido.
- dist/interface-official.js: pesquisa de páginas com normalização de acentos, Ctrl/Cmd+K, resultados e controles acessíveis do carrossel.
- dist/navigation.js: ciclo de foco móvel inclui busca e ignora páginas escondidas.
- dist/home.js: seleção manual de imagem reutiliza o carrossel existente.

Nenhuma base, consulta determinística, exportação ou cálculo foi alterado. Nenhuma API nova.

## Testes executados e aprovados
- Sintaxe Node dos três scripts alterados.
- test-data-query.cjs: 10 blocos.
- tests/fishing-analysis.test.cjs: 7 casos.
- tests/regions.test.cjs: 15 casos.
- tests/catalog-render.test.cjs: 298 cartões e estado de erro.
- tests/data-labs-ui.test.cjs: filtros, períodos, erro e CSV em simulação DOM.
- IDs HTML únicos e referências locais a scripts, estilos e imagens existentes.

## Pendências obrigatórias e publicação
NÃO PUBLICADO. A versão 58 permanece no endereço oficial.
O ambiente é managed-linux; control-browser não está disponível. A skill Sites proíbe improvisar outro caminho de navegador nesse ambiente. Portanto testes visuais/interativos de desktop, tablet e smartphone não foram executados, nem os cliques reais de mapas, filtros, temas e downloads. A correspondência visual final também não foi conferida no navegador.

A branch GitHub é uma proposta de interface baseada no Site v58: o main GitHub está atrasado, e a substituição de index.html depende de arquivos que já existem no Site v58 e não necessariamente no main. NÃO mesclar isoladamente antes de reconciliar o snapshot v58 completo. O checkout Sites preserva a fonte completa; nenhum snapshot antigo foi usado para substituir o site.

Próximo passo: abrir o checkout com control-browser disponível, validar 1440, 1024, 390 e 320 px em temas claro/escuro/automático, conferir busca, gaveta e foco, filtros, mapas, gráficos e downloads; corrigir eventuais diferenças; sincronizar fonte completa no GitHub e publicar o mesmo projeto público pelo fluxo Sites. Conferir versão publicada.
