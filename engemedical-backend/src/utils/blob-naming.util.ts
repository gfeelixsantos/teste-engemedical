/**
 * Utilitário para geração de nomes padronizados de arquivos no Blob Storage
 *
 * Padrão: {TIPO}_{EMPRESA}_{NOME_FUNCIONARIO}_{DOCUMENTO}_{DATA}_{HASH}.pdf
 *
 * Exemplos:
 * - ASO_EMP001_JOAO_SILVA_ADM_20260115_A7B3.pdf
 * - EXM_EMP001_JOAO_SILVA_CLINICO_20260115_X9K2.pdf
 * - EXM_EMP001_JOAO_SILVA_CLINICO_DIGITAL_20260115_Z1P9.pdf (assinado)
 * - ANX_EMP001_JOAO_SILVA_RG_20260115_B4K2.pdf
 * - PRT_EMP001_JOAO_SILVA_COMPLETO_20260115_L2N4.pdf
 */

export type BlobFileType =
  | 'ASO'
  | 'ASO_SIGNED'
  | 'EXAM'
  | 'EXAM_SIGNED'
  | 'ATTACHMENT'
  | 'RECORD'
  | 'RESTRICTION';

interface GenerateBlobFileNameOptions {
  /** Tipo do documento */
  type: BlobFileType;
  /** Código da empresa (ex: EMP001) */
  empresaCode: string;
  /** Nome completo do funcionário */
  funcionarioName: string;
  /** Tipo/nome do documento (ex: ADM, CLINICO, RG) */
  documentType: string;
  /** Data do documento (default: now) */
  date?: Date;
  /** Adicionar hash único de 4 caracteres (default: true) */
  addHash?: boolean;
}

/**
 * Normaliza uma string para uso em nomes de arquivo
 * - Remove acentos
 * - Substitui caracteres não alfanuméricos por underscore
 * - Remove underscores duplicados
 * - Converte para uppercase
 */
function normalizeFileName(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]/g, '_') // não-alfanuméricos → underscore
    .replace(/_+/g, '_') // remove underscores duplicados
    .replace(/^_+|_+$/g, '') // remove underscores no início/fim
    .toUpperCase();
}

/**
 * Gera nome padronizado para arquivo no Blob Storage
 */
export function generateBlobFileName(
  options: GenerateBlobFileNameOptions,
): string {
  const {
    type,
    empresaCode,
    funcionarioName,
    documentType,
    date = new Date(),
    addHash = true,
  } = options;

  // Formata data como YYYYMMDD
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Mapeamento de tipos para prefixos
  const prefixMap: Record<BlobFileType, string> = {
    ASO: 'ASO',
    ASO_SIGNED: 'ASO',
    EXAM: 'EXM',
    EXAM_SIGNED: 'EXM',
    ATTACHMENT: 'ANX',
    RECORD: 'PRT',
    RESTRICTION: 'RST',
  };

  // Sufixo para documentos assinados digitalmente
  const signedSuffix = type.includes('SIGNED') ? '_DIGITAL' : '';

  const prefix = prefixMap[type];
  const nameClean = normalizeFileName(funcionarioName);
  const docClean = normalizeFileName(documentType);

  let fileName = `${prefix}_${empresaCode}_${nameClean}_${docClean}${signedSuffix}_${dateStr}`;

  // Adiciona hash único de 4 caracteres para evitar colisões
  if (addHash) {
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    fileName += `_${hash}`;
  }

  return `${fileName}.pdf`;
}

/**
 * Gera o path completo para upload no Blob Storage
 * Estrutura: {tipo}/{ano}/{mes}/{empresa}/{prontuario}/{nome-arquivo}
 */
export function generateBlobPath(options: {
  fileType: 'aso' | 'exames' | 'anexos' | 'prontuarios' | 'laudos';
  empresaCode: string;
  prontuario: string;
  fileName: string;
  date?: Date;
}): string {
  const {
    fileType,
    empresaCode,
    prontuario,
    fileName,
    date = new Date(),
  } = options;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${fileType}/${year}/${month}/${empresaCode}/${prontuario}/${fileName}`;
}

/**
 * Extrai informações de um nome de arquivo gerado pelo generateBlobFileName
 * Útil para parsing e debugging
 */
export function parseBlobFileName(fileName: string): {
  prefix: string;
  empresaCode: string;
  funcionarioName: string;
  documentType: string;
  isSigned: boolean;
  date: string;
  hash: string | null;
} | null {
  // Remove extensão
  const nameWithoutExt = fileName.replace(/\.pdf$/i, '');

  // Divide por underscore
  const parts = nameWithoutExt.split('_');

  // Mínimo de partes: PREFIXO_EMPRESA_NOME_DOCUMENTO_DATA
  if (parts.length < 5) return null;

  const prefix = parts[0];
  const empresaCode = parts[1];
  const date = parts[parts.length - 1];
  const hash = parts.length > 5 ? parts[parts.length - 2] : null;

  // Detecta se é assinado (contém DIGITAL)
  const isSigned = parts.includes('DIGITAL');

  // Reconstrói nome do funcionário (pode ter múltiplas partes)
  const nameParts: string[] = [];
  const docParts: string[] = [];
  let inDocumentPart = false;

  for (let i = 2; i < parts.length; i++) {
    if (parts[i] === 'DIGITAL') continue; // skip DIGITAL marker

    if (!inDocumentPart) {
      // Ainda estamos na parte do nome
      if (i < parts.length - 2) {
        nameParts.push(parts[i]);
      } else {
        inDocumentPart = true;
        docParts.push(parts[i]);
      }
    } else {
      docParts.push(parts[i]);
    }
  }

  return {
    prefix,
    empresaCode,
    funcionarioName: nameParts.join('_'),
    documentType: docParts.join('_'),
    isSigned,
    date,
    hash,
  };
}
