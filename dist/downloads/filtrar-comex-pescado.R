# Atlas do Pescado — extrair pescado de arquivos oficiais volumosos
# Fonte: MDIC / Comex Stat. Permissão: Decreto 8.777/2016, art. 4º.
# R base; nenhuma chave ou pacote adicional é necessário.
# Arquivo de ENTRADA: CSV anual detalhado por NCM (não o arquivo municipal).
# Baixe o CSV no catálogo do Atlas e escolha-o ao executar este script.
# O script lê 50 mil linhas por vez; não carrega a base inteira na memória.
# Escopo: NCM 03, 1604, 1605, 150410, 150420 e 230120.
# Exclui 03076000 e 16055800 (caracóis exceto os do mar).
# Revise a nomenclatura e as correspondências para séries históricas.

filtrar_pescado <- function(entrada, saida = "comex_pescado_filtrado.csv") {
  stopifnot(file.exists(entrada))
  if (normalizePath(entrada, mustWork = TRUE) == normalizePath(saida, mustWork = FALSE)) {
    stop("Escolha um nome de saída diferente do arquivo original.")
  }
  if (file.exists(saida)) stop("O arquivo de saída já existe. Escolha outro nome.")
  con <- file(entrada, open = "rt", encoding = "UTF-8")
  on.exit(close(con), add = TRUE)
  cabecalho <- readLines(con, n = 1L, warn = FALSE)
  cabecalho <- sub("^\ufeff", "", cabecalho)
  nomes <- gsub('"', "", strsplit(cabecalho, ";", fixed = TRUE)[[1]])
  posicao <- match("CO_NCM", nomes)
  if (is.na(posicao)) stop("Este arquivo não contém CO_NCM. Use a base detalhada por NCM.")
  dest <- file(saida, open = "wt", encoding = "UTF-8")
  on.exit(close(dest), add = TRUE)
  writeLines(cabecalho, dest)
  lidas <- mantidas <- 0
  repeat {
    linhas <- readLines(con, n = 50000L, warn = FALSE)
    if (!length(linhas)) break
    campos <- strsplit(linhas, ";", fixed = TRUE)
    codigos <- vapply(campos, function(x) {
      if (length(x) < posicao) return("")
      gsub('"', "", x[[posicao]], fixed = TRUE)
    }, character(1))
    codigos <- trimws(codigos)
    # Alguns leitores removem o zero inicial; preserve os oito dígitos.
    codigos[nchar(codigos) == 7L] <- paste0("0", codigos[nchar(codigos) == 7L])
    manter <- grepl("^(03|1604|1605|150410|150420|230120)", codigos) &
      !codigos %in% c("03076000", "16055800") & nchar(codigos) == 8L
    writeLines(linhas[manter], dest)
    lidas <- lidas + length(linhas)
    mantidas <- mantidas + sum(manter)
  }
  message("Concluído: ", mantidas, " linhas de pescado em ", lidas, " linhas lidas.")
  message("Saída: ", normalizePath(saida, mustWork = FALSE))
  invisible(list(lidas = lidas, mantidas = mantidas, arquivo = saida))
}

# No RStudio, selecione o arquivo baixado no diálogo:
if (interactive()) {
  entrada <- file.choose()
  saida <- file.path(dirname(entrada), paste0("pescado_", basename(entrada)))
  filtrar_pescado(entrada, saida)
}

# Exemplo para executar sem diálogo:
# filtrar_pescado("EXP_2025.csv", "pescado_exportacao_2025.csv")
# O resultado preserva todas as colunas oficiais, sem agregar nem zerar ausências.
# A tabela de apoio do Atlas reflete a NCM vigente em 28/09/2026.
