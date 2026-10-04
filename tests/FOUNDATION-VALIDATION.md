# Etapas 1 e 2 — primeira entrega, 04/10/2026

Etapas em andamento. Esta entrega não conclui a curadoria científica nem atualiza as séries diretamente nas instituições.

## Organização e confiabilidade

- 12 arquivos CSV preparados com SHA-256, contagem, colunas, notas metodológicas e metadados JSON disponíveis no catálogo.
- 6 arquivos preexistentes e 6 recortes estaduais novos. Os recortes têm vínculo explícito com a base de origem e camada `treated`. Referências externas usam `source_reference`; não se apresentam como arquivos brutos preservados.
- Datas de conferência antigas mantidas nas referências não revistas. Revisão local e preparação dos novos recortes identificadas separadamente.
- Exportação do catálogo inclui identificadores, camada, origem, dicionário e hash.
- Nenhum registro ausente foi imputado; nenhum indicador ou estimativa foi criado.

## Ampliação inicial

| Recorte | Observações |
| --- | ---: |
| Pará, aquicultura por produto e ano, 2013–2024 | 205 |
| Pará, aquicultura municipal, 2024 | 393 |
| Pará, comércio NCM 03, 2022–2025 | 1.210 |
| Amapá, aquicultura por produto e ano, 2013–2024 | 60 |
| Amapá, aquicultura municipal, 2024 | 22 |
| Amapá, comércio NCM 03, 2022–2025 | 136 |

Todos preservam os valores das cópias preparadas existentes. Os seis recortes não são seis fontes independentes. Comércio inclui os fluxos disponíveis separadamente e exclui 2026 parcial. Não há junção entre peso vivo, peso líquido e produção aquícola.

## Fontes e condições consultadas

- IBGE PPM: https://www.ibge.gov.br/estatisticas/economicas/agricultura-e-pecuaria/9107-producao-da-pecuaria-municipal.html
- MDIC dados abertos: https://www.gov.br/mdic/pt-br/assuntos/comercio-exterior/estatisticas/base-de-dados-bruta
- Uso de bases federais: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8777.htm
- Termos estatísticos FAO: https://www.fao.org/contact-us/terms/db-terms-of-use/en

As consultas verificam páginas e condições gerais, sem constituir nova coleta. Nenhum novo recorte FAO foi adicionado. As condições específicas e eventuais exceções de terceiros devem continuar sendo respeitadas.

## Verificação

- Sintaxe de `dist/atlas.js` válida.
- 10 blocos de consultas determinísticas passaram.
- 15 testes regionais passaram.
- Todos os recortes conferidos integralmente contra o filtro da base de origem; hashes e metadados dos 12 CSVs conferidos; sem linhas integralmente duplicadas ou CSVs malformados.
- Reprodução dos recortes e metadados: `python scripts/prepare-foundation.py`. Não depende da rede.

## Próximas entregas destas etapas

1. Incorporar as observações da curadoria humana, quando fornecidas.
2. Auditar conteúdo, unidades, cobertura e licença individual das referências externas; não confundir integridade local com certificação científica.
3. Preservar arquivos brutos e versões das próximas coletas, com histórico de transformações.
4. Adicionar novas fontes independentes e séries verificadas; expandir os demais estados por demanda.
