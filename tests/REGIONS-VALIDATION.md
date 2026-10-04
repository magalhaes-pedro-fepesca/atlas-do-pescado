# Dados abertos por região — validação de 01/10/2026

## Entrega

Subárea de Municípios, mantendo o explorador municipal existente. Lançamento restrito a PA, AP, MA, SE, AM e RO. Configuração territorial expansível em `dist/regions.json`.

| Estado | Regiões geográficas imediatas | Municípios |
| --- | ---: | ---: |
| PA | 21 | 144 |
| AP | 4 | 16 |
| MA | 22 | 217 |
| SE | 6 | 75 |
| AM | 11 | 62 |
| RO | 6 | 52 |
| Total | 70 | 566 |

Classificação: Regiões Geográficas Imediatas do IBGE (2017), obtidas pela API oficial de Localidades em 01/10/2026. Todos os municípios retornados têm geometria na malha já existente. Mapas regionais compõem as geometrias dos municípios, sem valores estatísticos inferidos.

## Dados e autorização

1.612 observações numéricas de produção aquícola municipal de 2024 já existentes no Atlas; nenhuma alteração nos valores. Fonte: IBGE PPM/SIDRA 3940. Arquivos nacionais, consultas determinísticas, filtros, gráficos, catálogo e downloads existentes preservados.

Novos dados incorporados: somente nomes, códigos e vínculos regionais da API oficial do IBGE, sem dados pessoais. Autorização registrada: art. 4º do Decreto 8.777/2016, redação do Decreto 9.903/2019. Crédito ao IBGE e transformações explicitadas. Não foram incorporadas bases privadas, fechadas, restritas ou com licença não verificável. Estados fora do lançamento permanecem apenas como contexto no mapa nacional.

Portão de proveniência na camada operacional: APROVADO ou CONDICIONADO, permissão verificada, URL de autorização e fonte, acesso público, condições satisfeitas. Exportação exige redistribuição permitida. Fixtures condicionadas e não autorizadas existem apenas nos testes, nunca na base operacional.

## Testes executados

`node tests/regions.test.cjs`: 15 testes aprovados, cobrindo cadastro completo e associação única, todas as regiões e municípios, Bragança, conservação dos valores, ausência municipal, região sem dados (fixture), zero explícito, supressão/nulos, período indisponível, fontes abertas/condicionadas/referências/restritas, CSV, bloqueio de redistribuição e cobertura geográfica.

`tests/regions-ui.cjs` com Playwright e Chromium: desktop 1440×1000, tablet 834×1112, celular 390×844. Navegação Brasil → estado → região → município, seleção e mapas, downloads CSV/metadados/GeoJSON, proveniência, retorno ao explorador municipal e área nacional, sem transbordamento horizontal. Todos os seis estados exibem suas regiões. Município sem observações exibe somente categoria geográfica e mensagem explícita, sem CSV estatístico. Sem erros JavaScript nas três sessões de navegação.

Sintaxe JavaScript e Python verificada. Capturas inspecionadas visualmente em desktop e celular.

## Limitações transparentes

A cópia municipal de 2024 mantém somente valores numéricos: ela não permite distinguir ausência, não informação e supressão original. A interface explica isso e remete ao SIDRA. Nunca converte esses casos em zero. Totais são somas parciais das observações disponíveis, com cobertura explícita. Não são estimativas de produção total.

Nesta subárea, somente aquicultura e geografia têm conjuntos operacionais. Pesca, comércio exterior e pesquisa aguardam bases com granularidade territorial e reutilização verificadas. Os filtros exibem apenas as categorias, produtos e períodos presentes no recorte. O download geográfico inclui proveniência. O período estatístico disponível é 2024. Nenhum LLM, API paga, banco externo ou Atlantic AI foi criado.
