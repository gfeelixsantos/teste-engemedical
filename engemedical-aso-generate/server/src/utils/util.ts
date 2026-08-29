import JSZip from "jszip";
import path from "node:path"
import fs from "fs-extra"
import { PDFDocument } from "pdf-lib";

/**
 * Função responsável por formatar o CPF XXX.XXX.XXX-XX
 * @param cpf string
 * @returns 
 */
export function formatCPF(cpf?: string) {
  if (!cpf || cpf.length !== 11) return cpf || 'N/D';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}


/**
 * Extrai o pdf do zip como buffer
 * @param zipBuffer 
 * @param outputDir 
 * @returns 
 */
export async function extractPdfFromZipBuffer(
  zipBuffer: Buffer,
  outputDir: string
): Promise<string> {

  const zip = await JSZip.loadAsync(zipBuffer)

  // 🔍 Localiza o primeiro PDF real (ignora diretórios)
  const pdfEntry = Object.values(zip.files)
    .find(
      file =>
        !file.dir &&
        file.name.toLowerCase().endsWith(".pdf")
    )

  if (!pdfEntry) {
    throw new Error("Nenhum PDF encontrado dentro do ZIP")
  }

  // 📦 Buffer do PDF
  const pdfBuffer = await pdfEntry.async("nodebuffer")

  // 📁 Garante que o diretório exista
  await fs.ensureDir(outputDir)

  const outputPath = path.join(
    outputDir,
    path.basename(pdfEntry.name)
  )

  await fs.writeFile(outputPath, pdfBuffer)

  return outputPath
}



export async function mergePdfFiles(pdfPaths: string[], outputPath: string) {
  if (!pdfPaths.length) {
    throw new Error("Ao menos um PDF e obrigatorio para realizar o merge");
  }

  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    console.log("merge source", pdfPath);

    const pdfBytes = await fs.promises.readFile(pdfPath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const sourcePages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

    sourcePages.forEach((page) => mergedPdf.addPage(page));
  }

  console.log("merge output", outputPath);

  const mergedPdfBytes = await mergedPdf.save();
  await fs.promises.writeFile(outputPath, mergedPdfBytes);
}

export async function mergePdfs(
  firstPdfPath: string,
  secondPdfPath: string,
  outputPath: string
) {
  await mergePdfFiles([firstPdfPath, secondPdfPath], outputPath);
}

// ============================================================
// ============   NOVO SISTEMA DE NOMENCLATURA BLOB   ==========
// ============================================================

export type BlobFileType =
  | 'ASO'
  | 'ASO_SIGNED'
  | 'EXAM'
  | 'EXAM_SIGNED'
  | 'ATTACHMENT'
  | 'RECORD'
  | 'RESTRICTION';

interface GenerateBlobFileNameOptions {
  type: BlobFileType;
  empresaCode: string;
  funcionarioName: string;
  documentType: string;
  date?: Date;
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
 * Padrão: {TIPO}_{EMPRESA}_{NOME_FUNCIONARIO}_{DOCUMENTO}_{DATA}_{HASH}.pdf
 *
 * Exemplos:
 * - ASO_EMP001_JOAO_SILVA_ADM_20260115_A7B3.pdf
 * - ASO_EMP001_JOAO_SILVA_ADM_DIGITAL_20260115_B2C4.pdf (assinado)
 */
export function generateBlobFileName(options: GenerateBlobFileNameOptions): string {
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
  const { fileType, empresaCode, prontuario, fileName, date = new Date() } = options;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${fileType}/${year}/${month}/${empresaCode}/${prontuario}/${fileName}`;
}
