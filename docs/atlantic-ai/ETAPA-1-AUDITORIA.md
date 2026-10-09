# Atlantic AI — Etapa 1: auditoria inicial e preparação
Data: 2026-10-09
Estado: auditoria estática do snapshot do GitHub; nenhuma implantação realizada.

## Escopo e repositório
- Repositório: `magalhaes-pedro-fepesca/atlas-do-pescado` (branch principal `main`).
- README informa snapshot de 04/10/2026, versão publicada 24; isso **não comprova** sincronização com o site atual.
- Site é distribuído pela pasta `dist/` e pode ser servido por `python3 -m http.server 8000 --directory dist`.
- `package.json` não foi encontrado na raiz. Os testes registrados usam Node.js nativo.

## Evidências verificadas por leitura
- `dist/data-query.js`: módulo UMD sem DOM nem chamadas de rede, exporta `listDatasets`, `querySeries`, `queryTrade`, `queryMunicipal`, `compare`, `compareMunicipal`, `summarize`, `getMapValues`.
- `dist/query-artifacts.js`: exporta `chartSpec`, `mapSpec`, `rCode`, e não executa código gerado.
- `dist/assistant.js`: assistente antigo por busca textual e respostas prontas. Diz explicitamente que não calcula valores e não usa modelo generativo.
- `dist/catalog.json`: contém campos para proveniência, cobertura e licenciamento declarado de itens.
- `test-data-query.cjs`: define testes para datasets IBGE, FAO/MPA, MDIC, municipal, invariantes e artefatos. **Os testes não foram executados nesta auditoria**.
- `tests/fishing-analysis.test.cjs`: cobre ausências, zero explícito, variação com denominador zero, dados de desembarque e cobertura geográfica. Não executado.
- `dist/index.html`: ainda contém áreas `technology`, `news`, `technical` na cópia do GitHub. Verificar divergência com a versão publicada antes de integrar.

## Catálogo de consultas do módulo determinístico
1. `ibge-aquaculture`: IBGE PPM/SIDRA 3940, 2013–2024, UF.
2. `mpa-capture`: registros específicos de pargo/sardinha, 2021–2025, sem granularidade UF.
3. `fao-aquaculture`: FAO FishStat, 2015–2024, país.
4. `fao-capture`: FAO FishStat, 2015–2024, país.
5. `mdic-trade`: Comex Stat, NCM capítulo 03, 2022–2026; 2026 parcial.
6. `ibge-municipal`: aquicultura IBGE PPM, apenas 2024, município.

## Riscos e lacunas para Atlantic AI
- Não permitir ao modelo gerar números diretamente: toda resposta quantitativa deve resultar de consulta determinística validada.
- Não transformar nulos em zeros e não comparar anos parciais com completos sem alerta.
- Não misturar peso vivo FAO, peso líquido de comércio e outras unidades.
- Não tratar cobertura limitada de captura MPA como captura total do Brasil.
- `querySeries` aceita objetos de filtro; criar contratos com esquema estrito e allowlist de ferramentas para uso por IA.
- Confirmar o tratamento do filtro `flow: "both"` em `queryTrade`: a função filtra linhas aceitando both, mas `querySeries` rejeita fluxos fora de exp/imp quando fornecidos. Corrigir com teste antes de expor a ferramenta.
- `getMapValues` municipal sem filtro UF devolve `geometryFile:null`; definir comportamento claro para mapas municipais de todo o Brasil.
- `rCode` atualmente cobre apenas recortes selecionados; respostas da IA devem distinguir suporte de exportação por dataset.
- Revisar diferença entre snapshot GitHub e site em produção; **não** sobrescrever a versão mais recente.
- Validar efetivamente direitos de redistribuição de cada base e licença de cada modelo aberto.
- Verificar desempenho/memória no navegador e fallback sem WebGPU.

## Arquitetura proposta
```
Chat (UI isolada)
  -> Interpretador local (regras inicialmente; modelo pequeno opcional)
  -> Validador de intenção e parâmetros (allowlist / schema)
  -> Ferramentas AtlasQueries e AtlasQueryArtifacts (sem acesso direto a dados pelo modelo)
  -> Resultado estruturado com fonte, período, unidade, ausências e avisos
  -> Explicação fundamentada + tabela / gráfico / exportação
```

## Ações de implementação, próximas etapas
1. Sincronizar por inspeção o snapshot e a fonte atual publicada; confirmar a branch correta e não tocar no site em produção.
2. Executar todos os testes existentes em ambiente local e registrar saídas.
3. Criar testes de regressão para fluxos de comércio, filtros geográficos, ausência, unidades, anos parciais e comparações.
4. Criar `atlantic-ai/tool-contracts` com schemas rigorosos, erros estruturados e limitação de tamanho dos resultados.
5. Criar roteador de intenções determinístico: `listDatasets`, `querySeries`, `compare`, `summarize`, `chartSpec`, `mapSpec`.
6. Adicionar uma tela de protótipo separada, oculta da navegação pública, com respostas verificáveis sem LLM.
7. Avaliar modelo local/navegador mediante benchmark antes de decidir sobre bibliotecas e pesos; nenhuma API paga nem chave embutida.

## Critérios de aceite da Etapa 1
- Baseline de testes executado e documentado.
- Diferença GitHub/produção esclarecida.
- Tabela de compatibilidade de datasets, filtros e operações validada.
- Nenhuma modificação involuntária em arquivos de produção.
- Nenhum custo de API comercial de IA.
