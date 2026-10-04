# Etapa 5 — qualidade e rastreabilidade

Revisão: 04/10/2026. Fonte inicial: a51301eb7b29a98fa3cb4d1b742f4d6686c4adaa (Site versão 24).

`python scripts/audit-quality.py` verifica as cópias locais e gera `dist/quality-audit.json`, `dist/downloads/quality-manifest.csv`, as fichas do catálogo e o histórico `dist/updates.json`.

O relatório distingue 7 itens do catálogo integrados aos painéis, 9 arquivos preparados e 282 referências. Arraial do Cabo é uma fonte municipal integrada adicional, fora do catálogo; está incluída nos 17 CSVs verificados. Recortes não são fontes independentes.

Valida SHA-256, tamanho, estrutura CSV, esquema registrado, metadados obrigatórios, medidas finitas não negativas, anos, unidades documentadas, códigos IBGE/NCM, campos ausentes e duplicatas. Datas de processamento não registradas continuam desconhecidas. A referência territorial é a cópia IBGE local; não houve atualização remota das geometrias.

Nenhuma observação, unidade, lacuna, série temporal ou cálculo foi alterado. Os dados FAO podem incluir estimativas dos autores; esta auditoria não atribui uma condição a cada linha nem certifica a coleta original. Downloads externos não foram testados universalmente e não recebem aprovação de integridade local.

Licença HydroShare reconfirmada: https://www.hydroshare.org/resource/de4190f0eff74b09a5e0844a0de482a5/ declara CC BY 4.0. Seu README exige autorizações para captura global e comentários estendidos, não integrados ao Atlas. As duas referências JCU 10.25903/4zas-ct62 e 10.25903/2yve-a322 mantêm versão de licença pendente; a licença do artigo não foi usada como substituto da licença do conjunto.

`python tests/test-quality.py` testa corrupção, código desconhecido, valor negativo, ano inválido, esquema divergente, CSV malformado e preservação de zero versus ausência. Os testes existentes de consultas, regiões, pesca municipal e catálogo continuam obrigatórios.
