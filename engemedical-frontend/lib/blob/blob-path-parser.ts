/**
 * Utilitário de parsing para BlobPaths e nomes de arquivo do Azure Blob Storage.
 *
 * Funções puras — nenhuma delas lança exceção para entradas inválidas.
 * Retornam `null` quando o formato não corresponde ao esperado.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ParsedBlobPath {
  tipo: string;
  ano: string;
  mes: string;
  codigoEmpresa: string;
  codigoProntuario: string;
  fileName: string;
}

export interface ParsedBlobFileName {
  /** Prefixo do documento: ASO, EXM, ANX, PRT, RST, etc. */
  prefix: string;
  codigoEmpresa: string;
  nomeFuncionario: string;
  tipoExame: string;
  data: string;
  hash: string;
}

// ---------------------------------------------------------------------------
// parseBlobPath
// ---------------------------------------------------------------------------

/**
 * Extrai os segmentos de um BlobPath no formato:
 *   `{tipo}/{ano}/{mes}/{CODIGOEMPRESA}/{CODIGOPRONTUARIO}/{nomeArquivo}`
 *
 * Retorna `null` se o path não tiver exatamente 6 segmentos não-vazios.
 * Nunca lança exceção.
 */
export function parseBlobPath(blobName: string): ParsedBlobPath | null {
  try {
    if (!blobName || typeof blobName !== "string") return null;

    const segments = blobName.split("/");

    if (segments.length !== 6) return null;

    const [tipo, ano, mes, codigoEmpresa, codigoProntuario, fileName] =
      segments;

    // Todos os segmentos devem ser strings não-vazias
    if (
      !tipo ||
      !ano ||
      !mes ||
      !codigoEmpresa ||
      !codigoProntuario ||
      !fileName
    ) {
      return null;
    }

    return { tipo, ano, mes, codigoEmpresa, codigoProntuario, fileName };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// parseBlobFileName
// ---------------------------------------------------------------------------

/**
 * Extrai os campos de um nome de arquivo no formato:
 *   `{PREFIXO}_{CODIGOEMPRESA}_{NOME_FUNCIONARIO}_{TIPO_EXAME}_{DATA}_{HASH}.pdf`
 *
 * O nome do funcionário pode conter underscores (múltiplas palavras).
 * A estratégia é: o prefixo é o primeiro segmento, o código da empresa é o
 * segundo, o hash é o penúltimo (antes de `.pdf`), a data é o antepenúltimo,
 * o tipo de exame é o terceiro a partir do final (após remover hash e data),
 * e o nome do funcionário é tudo que sobrar entre empresa e tipo de exame.
 *
 * Retorna `null` se o formato não corresponder. Nunca lança exceção.
 */
export function parseBlobFileName(fileName: string): ParsedBlobFileName | null {
  try {
    if (!fileName || typeof fileName !== "string") return null;

    // Deve terminar com .pdf (case-insensitive)
    if (!fileName.toLowerCase().endsWith(".pdf")) return null;

    // Remove a extensão .pdf
    const withoutExt = fileName.slice(0, -4);

    const parts = withoutExt.split("_");

    // Mínimo de segmentos: prefix + empresa + nomeFuncionario(1+) + tipoExame + data + hash = 6
    if (parts.length < 6) return null;

    const prefix = parts[0];
    const codigoEmpresa = parts[1];
    const hash = parts[parts.length - 1];
    const data = parts[parts.length - 2];
    const tipoExame = parts[parts.length - 3];

    // O nome do funcionário é tudo entre o índice 2 e o índice (length - 3)
    const nomeFuncionarioSegments = parts.slice(2, parts.length - 3);
    const nomeFuncionario = nomeFuncionarioSegments.join("_");

    // Validações básicas: nenhum campo pode ser vazio
    if (
      !prefix ||
      !codigoEmpresa ||
      !nomeFuncionario ||
      !tipoExame ||
      !data ||
      !hash
    ) {
      return null;
    }

    return { prefix, codigoEmpresa, nomeFuncionario, tipoExame, data, hash };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// normalizeSearchString
// ---------------------------------------------------------------------------

/**
 * Normaliza uma string para busca: converte para minúsculas e remove acentos/diacríticos.
 *
 * Exemplo: "João Ação" → "joao acao"
 */
export function normalizeSearchString(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
