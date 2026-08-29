import { AsoStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import { FileUpload, SchedulingDocument } from 'src/mongo/types/scheduling';
import { ExameRealizadoPorDataPorEmpresa } from 'src/soc/types/IExameRealizadoPorDataPorEmpresa';
import { PedidoExame } from 'src/soc/types/IPedidoExame';
import { ResultadoDataFichaExame } from 'src/soc/types/IResultadoExameDataFicha';
import axios from 'axios';
import { getExamesList } from 'src/exames/exames.provider';
import { PDFDocument } from 'pdf-lib';

/**
 * Normaliza uma string de exame removendo acentos e caracteres não alfanuméricos.
 * @param str String a ser normalizada
 * @returns String normalizada
 */
export function normalizeExamString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

/**
 * Padroniza o nome do arquivo para o formato: PREFIXO_NOME_TIPO_DATA.pdf
 * @param prefix 'ASO' ou 'Prontuario'
 * @param name Nome do funcionário
 * @param type Tipo do exame (Admissional, Periódico, etc.)
 * @param date Data formatada (DD-MM-YYYY)
 * @returns Nome do arquivo padronizado
 */
export function standardizeFileName(
  prefix: 'ASO' | 'Prontuario' | 'Prontuário',
  name: string,
  type: string,
  date: string,
): string {
  const normalize = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-zA-Z0-9]/g, '_') // substitui não-alfanuméricos por _
      .replace(/_+/g, '_') // remove múltiplos underscores seguidos
      .replace(/^_|_$/g, '') // remove underscores no início ou fim
      .toUpperCase();

  const cleanDate = (date || '').replace(/\//g, '-');
  const cleanName = normalize(name);
  const cleanType = normalize(type);
  const cleanPrefix =
    prefix === 'Prontuário' || prefix === 'Prontuario' ? 'Prontuario' : 'ASO';

  return `${cleanPrefix}_${cleanName}_${cleanType}_${cleanDate}.pdf`;
}

export function mapPedidoExameToSchedulingDocument(
  pedido: PedidoExame,
): Partial<SchedulingDocument> {
  return {
    ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO, // default ou de outra lógica
    ASOSTATUS: AsoStatus.GERADO,
    // RISCOSASO: pedido.RISCOSASO,

    // Empresa
    CODIGOEMPRESA: pedido.CODIGOEMPRESA,
    CODIGOINTERNOEMPRESA: '', // VIDA OU NÃO
    SUBGRUPOEMPRESA: pedido.SUBGRUPOEMPRESA,
    CNPJEMPRESA: pedido.CNPJEMPRESA,
    CPFEMPRESA: pedido.CPFEMPRESA ?? pedido.CEIEMPRESA,
    NOMEEMPRESA: pedido.NOMEEMPRESA,

    // Funcionário
    CODIGO: pedido.CODIGOFUNCIONARIO,
    NOME: pedido.NOMEFUNCIONARIO,
    CODIGOUNIDADE: pedido.CODIGOUNIDADE,
    NOMEUNIDADE: pedido.NOMEUNIDADE,
    CODIGOSETOR: pedido.CODIGOSETOR,
    NOMESETOR: pedido.NOMESETOR,
    CODIGOCARGO: pedido.CODIGOCARGO,
    NOMECARGO: pedido.NOMECARGO,
    MATRICULAFUNCIONARIO: pedido.MATRICULAFUNCIONARIO,
    CPFFUNCIONARIO: pedido.CPFFUNCIONARIO,
    DATANASCIMENTO: pedido.DATANASCIMENTO,
    SEXO: pedido.SEXO || '',

    // Situação / agendamento
    SITUACAO: 'Ativo', // default
    DATAAGENDAMENTO: new Date().toLocaleDateString('pt-br'),
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: pedido.SEQUENCIAFICHA,
    TIPOEXAME: pedido.CODIGOTIPOEXAME,
    TIPOEXAMENOME: '',

    // Observações
    OBSERVACOES: null,
    ANOTACOES: null,
    RECOMENDACAOMEDICA: null,
    MEDICO: null,

    // Anexos (sem informação no PedidoExame, inicia vazio)
    ANEXOS: [] as FileUpload[],

    TERM: true,
    CLIENT: null,
    EXAMES: [],

    // // Ticket (vai ser preenchido depois)
    TICKET: null,
  };
}

export function mapUpdateSchedulingWithPedidoExame(
  pedido: PedidoExame,
): Partial<SchedulingDocument> {
  return {
    // ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO, // default ou de outra lógica
    ASOSTATUS: AsoStatus.GERADO,
    // RISCOSASO: pedido.RISCOSASO,
    SUBGRUPOEMPRESA: pedido.SUBGRUPOEMPRESA,
    CNPJEMPRESA: pedido.CNPJEMPRESA,
    CPFEMPRESA: pedido.CPFEMPRESA ?? pedido.CEIEMPRESA,
    DATANASCIMENTO: pedido.DATANASCIMENTO,
    SEXO: pedido.SEXO || '',
    SEQUENCIAFICHA: pedido.SEQUENCIAFICHA,
  };
}

export function mapExameRealizadoPorDataPorEmpresaToResultadoDataFichaExame(
  exame: ExameRealizadoPorDataPorEmpresa,
): ResultadoDataFichaExame {
  return {
    EMPRESA: exame.EMPRESA,
    NOME: exame.NOMEFUNCIONARIO, // Mapeando NOMEFUNCIONARIO para NOME
    CODFUNCIONARIO: exame.CODFUNCIONARIO,
    NOMEFUNCIONARIO: exame.NOMEFUNCIONARIO,
    MATRICULA: exame.MATRICULA,
    DATAFICHA: exame.DATAFICHA,
    TIPOFICHA: exame.TIPOFICHA,
    DATAEXAME: exame.DATAEXAME,
    CODEXAME: exame.CODEXAME,
    NOMEEXAME: exame.NOMEEXAME,
    SEQUENCIARESULTADOEXAME: exame.CODIGOSEQUENCIALRESULTADO, // Mapeando CODIGOSEQUENCIALRESULTADO
    SEQUENCIAFICHA: exame.CODIGOSEQUENCIALFICHA, // Mapeando CODIGOSEQUENCIALFICHA
    RESULTADOEXAME: exame.PARECERASO, // Mapeando PARECERASO para RESULTADOEXAME
  };
}

// uso para geração de imagem no pdf maker
export async function getImageBase64(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    return 'data:image/png;base64,' + Buffer.from(data).toString('base64');
  } catch (err) {
    console.warn(`⚠️ Falha ao carregar imagem: ${err}`, url);
    return null;
  }
}

/**
 *
 * @param text Função que recebe um texto e de acordo com a palavra pré-estabelecida,
 * destaca em vermelho e negrito ou não.
 * @returns
 */
export function highlightIfAltered(text: string) {
  const alteredWords = [
    'alterado',
    'sim',
    'positivo',
    'irregular',
    'inapto',
    'obesidade',
    'sobrepeso',
    'severa',
  ];
  const isAltered = alteredWords.some((w) =>
    String(text || '')
      .toLowerCase()
      .includes(w.toLowerCase()),
  );
  return isAltered ? { text, bold: true, color: '#B71C1C' } : { text };
}

/** Uso pdf-maker - Cria tabela com múltiplas colunas (4x4, 3x4) */
/**
 * Cria uma seção de tabela genérica com título e corpo, suportando células PDFMake (objects) e strings simples.
 *
 * @param title - título da seção
 * @param gridData - matriz de strings ou objetos PDFMake
 * @param options - configurações opcionais (fontSize, margin, layout, alignment)
 */
export function createGridSection(
  title: string,
  gridData: (string | any)[][],
  options?: {
    fontSize?: number;
    titleFontSize?: number;
    margin?: number[];
    alignment?: 'left' | 'center' | 'right';
    layout?: any;
  },
): any {
  const {
    fontSize = 10,
    titleFontSize = 12,
    margin = [0, 5, 0, 10],
    alignment = 'center',
    layout = {
      hLineColor: '#f6f6f6',
      vLineColor: '#f6f6f6',
    },
  } = options || {};

  const body = gridData.map((row) =>
    row.map((cell) => {
      if (typeof cell === 'object' && cell !== null) {
        // Se já for um objeto PDFMake (ex: { text, style, colSpan, color })
        return { fontSize, ...cell };
      } else {
        // Se for string, aplica highlight e cria o objeto text
        return { text: highlightIfAltered(cell), fontSize };
      }
    }),
  );

  return {
    stack: [
      {
        text: title,
        style: 'sectionTitle',
        alignment,
        fontSize: titleFontSize,
        margin: [0, 5, 0, 5],
      },
      {
        table: {
          widths: Array(gridData[0].length).fill('*'),
          body,
        },
        layout,
        margin,
      },
    ],
  };
}

export function getExamGroupAndItemByCodigo(codigo: string) {
  const codigoNormalizado = normalizarCodigoExame(codigo);
  if (!codigoNormalizado) return null;

  for (const [grupo, exames] of Object.entries(getExamesList())) {
    for (const exame of exames) {
      const encontrado = exame.codigos.some(
        (codigoExame) =>
          normalizarCodigoExame(codigoExame) === codigoNormalizado,
      );

      if (encontrado) {
        return { grupo, exame };
      }
    }
  }
  return null;
}

function normalizarCodigoExame(codigo?: string) {
  return (codigo || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 *
 * @param cpf Função para formatar CPF como XXX.XXX.XXX-XX
 * @returns
 */
export function formatCPF(cpf?: string) {
  if (!cpf || cpf.length !== 11) return cpf || 'N/D';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Função auxiliar para fazer download do blob storage como ArrayBuffer
 * @param url do blob storage
 * @returns array buffer
 */
async function downloadPdfAsBuffer(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    const arrBuff = await response.arrayBuffer();

    return Buffer.from(arrBuff);
  } catch (err) {
    console.error('Erro ao baixar PDF:', url, err);
    throw new Error(`Erro ao baixar arquivo: ${url}`);
  }
}

export async function mergeExamBuffers(
  doc: SchedulingDocument,
  includeAttachments = false,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Set para evitar PDFs duplicados
  const processedUrls = new Set<string>();

  const processPdf = async (url: string) => {
    const normalizedUrl = url.trim();

    if (processedUrls.has(normalizedUrl)) {
      return; // já foi processado
    }

    processedUrls.add(normalizedUrl);

    const pdfBuffer = await downloadPdfAsBuffer(normalizedUrl);
    const loadedPdf = await PDFDocument.load(pdfBuffer);

    const copiedPages = await pdfDoc.copyPages(
      loadedPdf,
      loadedPdf.getPageIndices(),
    );

    copiedPages.forEach((page) => pdfDoc.addPage(page));
  };

  // 1) PDFs de resultados dos exames
  for (const exame of doc.EXAMES) {
    if (exame.url) {
      try {
        await processPdf(exame.url);
      } catch (err) {
        console.error(`Erro ao processar exame ${exame.url}:`, err);
      }
    }
  }

  // 2) PDFs de anexos
  if (includeAttachments && doc.ANEXOS?.length > 0) {
    for (const anex of doc.ANEXOS) {
      if (anex.StoragePath) {
        try {
          await processPdf(anex.StoragePath);
        } catch (err) {
          console.error(`Erro ao processar anexo ${anex.StoragePath}:`, err);
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
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
 * - EXM_EMP001_JOAO_SILVA_CLINICO_20260115_X9K2.pdf
 * - EXM_EMP001_JOAO_SILVA_CLINICO_DIGITAL_20260115_Z1P9.pdf (assinado)
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
