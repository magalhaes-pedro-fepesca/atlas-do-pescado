# Atlas do Pescado

Explorador de dados abertos de pesca, aquicultura e comércio exterior de pescado.

Site: https://explorador-pesca-aquicultura.ph-magmelo.chatgpt.site

## Versão transferida

Snapshot completo de 04/10/2026, após a etapa 4 e a correção do catálogo. Fonte do Site: commit a51301eb7b29a98fa3cb4d1b742f4d6686c4adaa, versão publicada 24.

## Conteúdo

- `dist/`: site estático completo, imagens, mapas, dados, downloads e metadados.
- `scripts/` e `build-*.py`: preparação e transformação de dados.
- `data-snapshots/`: snapshots originais de esforço e capacidade pesqueira IMAS.
- `catalog-provenance.json`: proveniência do catálogo.
- `tests/`, `test-data-query.cjs`: testes e relatórios de validação.
- `output/pdf/`: relatório técnico existente.

## Executar o site

Com Python 3, na raiz do repositório:

```sh
python3 -m http.server 8000 --directory dist
```

Abra http://localhost:8000. O site está pronto para servir, sem recompilar os dados.

## Reconstituir os dois snapshots originais maiores

O limite de transferência da conexão exigiu dividir somente os dois arquivos originais IMAS em partes binárias. Todas as partes estão incluídas. Para recuperar os arquivos originais, execute:

```sh
python3 scripts/reassemble-snapshots.py
```

O script confere tamanho e hash Git SHA-1 antes de gravar os arquivos originais. Os arquivos usados diretamente pelo site estão completos e não exigem essa etapa.

## Validar

Com Node.js instalado:

```sh
node test-data-query.cjs
node tests/fishing-analysis.test.cjs
node tests/catalog-render.test.cjs
node tests/regions.test.cjs
```

Essas verificações passaram durante a transferência.

## Dados e metodologia

Consulte os arquivos `*.metadata.json`, `catalog-provenance.json`, a política em `dist/assets/politica-de-dados-v1.pdf` e as regras metodológicas da interface. Cada fonte conserva seus termos de reutilização e atribuição. Ausência de observação não representa zero; fontes, períodos, unidades e universos distintos não devem ser somados indiscriminadamente.

Os scripts ETL existentes podem exigir insumos externos e caminhos específicos do ambiente original; esta transferência não altera essas dependências.
