# Ampliação de dados abertos de pesca — 04/10/2026

## Entrega

Três CSVs de pesca adicionados ao catálogo, sem mistura com as séries operacionais anteriores:

| Arquivo | Período | Linhas | Natureza |
| --- | --- | ---: | --- |
| Desembarques demersais em Santa Catarina | 2000–2019 | 1.560 | 78 espécies monitoradas, captura em kg |
| Capacidade/frota brasileira IMAS | 1950–2017 | 4.088 | Reconstrução histórica, filtro Country=BRA |
| Esforço brasileiro IMAS | 1950–2017 | 3.528 | Estimativas por grupo, setor e ano |

Os dois recortes IMAS provêm de uma mesma base, não de fontes independentes. Esforço nominal e efetivo são medidas diferentes. kW × horas não significa horas isoladas. Arqueação bruta não significa massa de pescado. Embarcações fracionárias são resultados de reconstrução, não contagens de cadastro.

Referências existentes revisadas: desembarques de Santarém (Mendeley, CC BY 4.0), Global Fishing Effort (IMAS, CC BY 4.0) e pesca amadora na Hungria (Dryad, CC0). Para Santarém há divergência entre período do título e da descrição; ambos foram registrados. Arquivos Mendeley e Dryad não puderam ser obtidos nesta execução e não foram convertidos nem incluídos nos cálculos do Atlas. As páginas públicas e licenças foram verificadas.

## Fontes e autorização

- Perez e Sant’Ana, PANGAEA: https://doi.pangaea.de/10.1594/PANGAEA.946292 — licença CC BY 4.0 explícita na página e no TSV original. Autoria, DOI e transformação preservados.
- Rousseau et al., IMAS/UTAS: https://doi.org/10.25959/MNGY-0Q43 — licença CC BY 4.0 explícita nos metadados XML da instituição. Arquivos CSV globais originais preservados sem alteração em `data-snapshots`, comprimidos em gzip, fora do pacote público do site. O catálogo oferece links diretos aos originais na instituição. README original e metadados preservados.
- Santarém: https://data.mendeley.com/datasets/ntprfhdypn/1 — CC BY 4.0 na página do conjunto.
- Pesca amadora: https://datadryad.org/dataset/doi:10.5061/dryad.7pvmcvf6k — CC0 nos metadados do conjunto na API pública Dryad.

CC BY exige atribuição e identificação de adaptações. Não apresentar os autores como apoiadores do Atlas. Dados locais, históricos e estimados não representam totais atuais nacionais.

## Validação

- 10 blocos de consultas e 15 testes regionais passaram.
- Sintaxe de atlas.js validada.
- CSVs IMAS conferidos linha a linha contra filtro Country=BRA dos originais.
- Valores de captura reconciliados com TSV PANGAEA, incluindo quantidade de zeros explícitos.
- Nenhuma conversão indevida, imputação, linha duplicada ou incorporação de dados pessoais de respondentes.
- Hash dos arquivos preparados e dos arquivos originais descomprimidos conferidos.
- Campos vazios e NA mantidos como ausência.
- Reprodução sem rede: `python scripts/prepare-fisheries.py`; a auditoria geral pode ser executada em seguida com `python scripts/prepare-foundation.py`.

## Regra permanente para novas incorporações

Antes de incorporar novos dados: verificar fonte pública e versão, permissão de reutilização e redistribuição do conjunto específico, exigências de atribuição, cobertura, unidades e eventuais exceções. Preservar origem e arquivo bruto quando obtido. Não assumir que página acessível, artigo aberto ou licença de software autoriza uso dos dados. Bases com licença ausente, ambígua, restrita ou condição não satisfeita ficam fora da camada de cálculo e da redistribuição. Diferenciar referência externa, dado tratado e indicador calculado. Não fabricar cobertura ou transformar ausência em zero.
