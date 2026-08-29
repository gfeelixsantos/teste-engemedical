import { AsoStatus, AtendimentoStatus } from 'src/mongo/enum/scheduling.enum';
import {
  ExamsScheduled,
  FileUpload,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { ExameRealizadoPorDataPorEmpresa } from 'src/soc/types/ExameRealizadoPorDataPorEmpresa';
import { PedidoExame } from 'src/soc/types/PedidoExame';
import { ResultadoDataFichaExame } from 'src/soc/types/ResultadoExameDataFicha';
import axios from 'axios';
import { EXAMES_LIST } from 'src/soc/exames';
import { getExamesList } from 'src/exames/exames.provider';
import { ExameSocnet } from 'src/soc/types/ExameSocnet';
import { PDFDocument } from 'pdf-lib';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import {
  format,
  fromZonedTime,
  toZonedTime,
  formatInTimeZone,
} from 'date-fns-tz';
import { ICadastroPessoas } from 'src/soc/types/CadastroPessoas';
import { IUserInfo } from 'src/user/interfaces/user.interface';

export function mapPedidoExameToSchedulingDocument(
  pedido: PedidoExame,
  codigoInternoEmpresa?: string | null,
): Partial<SchedulingDocument> {
  const { diaBrStr } = calcularRangePipeline();
  const codigoInternoNormalizado =
    codigoInternoEmpresa?.trim() || pedido.CODIGOCENTROCUSTO || '';

  return {
    ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO, // default ou de outra lógica
    ASOSTATUS: AsoStatus.NAO_GERADO,
    ASOINFO: null,
    AUTENTICACAOATENDIMENTO: { metodo: 'SOC' },
    // RISCOSASO: pedido.RISCOSASO,

    // Empresa
    CODIGOEMPRESA: pedido.CODIGOEMPRESA,
    CODIGOINTERNOEMPRESA: codigoInternoNormalizado,
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
    DATAAGENDAMENTO: diaBrStr,
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
  };
}

/**
 * Mapeia PedidoExame para atualização do SchedulingDocument
 */
export function mapUpdateSchedulingWithPedidoExame(
  pedido: PedidoExame,
  codigoInternoEmpresa?: string | null,
): Partial<SchedulingDocument> {
  const codigoInternoNormalizado =
    codigoInternoEmpresa?.trim() || pedido.CODIGOCENTROCUSTO || '';

  return {
    // ========== CAMPOS ORIGINAIS (mantidos) ==========
    ASOSTATUS: AsoStatus.NAO_GERADO,
    ASOINFO: null,
    AUTENTICACAOATENDIMENTO: { metodo: 'SOC' },
    SUBGRUPOEMPRESA: pedido.SUBGRUPOEMPRESA,
    CNPJEMPRESA: pedido.CNPJEMPRESA,
    CPFEMPRESA: pedido.CPFEMPRESA ?? pedido.CEIEMPRESA,
    DATANASCIMENTO: pedido.DATANASCIMENTO,
    SEXO: pedido.SEXO || '',
    SEQUENCIAFICHA: pedido.SEQUENCIAFICHA,

    // ========== CAMPOS ADICIONADOS (CORRIGIDO) ==========

    // Dados da Empresa
    CODIGOEMPRESA: pedido.CODIGOEMPRESA,
    NOMEEMPRESA: pedido.NOMEEMPRESA,

    // Dados do Funcionário
    CODIGO: pedido.CODIGOFUNCIONARIO,
    NOME: pedido.NOMEFUNCIONARIO,
    CPFFUNCIONARIO: pedido.CPFFUNCIONARIO,
    MATRICULAFUNCIONARIO: pedido.MATRICULAFUNCIONARIO,

    // Dados da Unidade
    CODIGOUNIDADE: pedido.CODIGOUNIDADE || '',
    NOMEUNIDADE: pedido.NOMEUNIDADE || '',

    // Dados do Setor
    CODIGOSETOR: pedido.CODIGOSETOR || '',
    NOMESETOR: pedido.NOMESETOR || '',

    // Dados do Cargo
    CODIGOCARGO: pedido.CODIGOCARGO || '',
    NOMECARGO: pedido.NOMECARGO || '',

    // Dados do Tipo de Exame
    TIPOEXAME: pedido.CODIGOTIPOEXAME,
    TIPOEXAMENOME: getTipoExameNome(pedido.CODIGOTIPOEXAME),

    // Prioriza o código interno do cadastro da empresa no SOC.
    CODIGOINTERNOEMPRESA: codigoInternoNormalizado,

    // Código Prontuário atualizado
    CODIGOPRONTUARIO: gerarCodigoProntuario(pedido),
  };
}

/**
 * Helper: Retorna o nome do tipo de exame
 */
export function getTipoExameNome(codigoTipoExame: string): string {
  const tipos: Record<string, string> = {
    '1': 'ADMISSIONAL',
    '2': 'PERIODICO',
    '3': 'RETORNO TRABALHO',
    '4': 'MUDANCA FUNCAO',
    '6': 'MONITORACAO PONTUAL',
    '8': 'MONITORACAO PONTUAL',
    '5': 'DEMISSIONAL',
  };

  return tipos[codigoTipoExame] || codigoTipoExame;
}

// export function correcaoTipoExame(codigoTipoExame: string): string {
//   const tipos: Record<string, string> = {
//     '0': 'ADMISSIONAL',
//     '1': 'PERIODICO',
//     '2': 'RETORNO AO TRABALHO',
//     '3': 'MUDANCA FUNCAO',
//     '8': 'DEMISSIONAL',
//   };

//   return tipos[codigoTipoExame] || 'MONITORAÇÃO PONTUAL';
// }

/**
 * Helper: Gera código do prontuário
 */
export function gerarCodigoProntuario(pedido: PedidoExame): string {
  const dataFormatada = pedido.DATAFICHA
    ? pedido.DATAFICHA.replace(/\//g, '')
    : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .format(new Date())
        .replace(/\//g, '');

  return `${pedido.CODIGOEMPRESA}-${pedido.CODIGOFUNCIONARIO}-${pedido.CODIGOTIPOEXAME}-${dataFormatada}`;
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
    console.warn('⚠️ Falha ao carregar imagem:', url);
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
    text?.toLowerCase().includes(w.toLowerCase()),
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

/**
 * Retorna o grupo e o exame correspondente baseado no código
 */
export function getExamGroupAndItemByCodigo(codigo: string) {
  const codigoNormalizado = normalizarCodigoExame(codigo);
  if (!codigoNormalizado) return null;

  // Usa EXAMES_LIST hardcoded imutável — nunca falha por cache ou latência do Supabase
  for (const [grupo, exames] of Object.entries(EXAMES_LIST)) {
    for (const exame of exames) {
      const encontrouCodigo = exame.codigos.some(
        (codigoExame) =>
          normalizarCodigoExame(codigoExame) === codigoNormalizado,
      );

      if (encontrouCodigo) {
        return { grupo, exame };
      }
    }
  }
  return null;
}

/**
 * Versão assíncrona com fallback para Supabase quando o código não é encontrado no cache local.
 */
export async function getExamGroupAndItemByCodigoAsync(codigo: string) {
  const result = getExamGroupAndItemByCodigo(codigo);
  if (result) return result;

  const { lookupGrupoByCodigoFromSupabase } = await import('../exames/exames.provider');
  const fallbackResult = await lookupGrupoByCodigoFromSupabase(codigo);
  if (fallbackResult) {
    console.log(`[EXAM_LOOKUP_FALLBACK] Código "${codigo}" resolvido via Supabase: ${fallbackResult.grupo}`);
  }
  return fallbackResult;
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

export function mapCredenciadasExames(item: ExameSocnet) {
  let resultado;

  // Normaliza o nome do exame para evitar problemas de acentuação e capitalização
  const nome = item.NOMEEXAME?.trim().toLowerCase();

  switch (nome) {
    // --- Clínico / Ocupacional ---
    case 'exame clinico':
    case 'exame clínico':
    case 'consulta ocupacional':
      resultado = getExamesList()['Exame Clínico'];
      break;

    // --- Audiometria ---
    case 'audiometria tonal ocupacional':
    case 'audiometria ocupacional':
    case 'audiometria ocupacional (tonal)':
    case 'audiometria ocupacional tonal':
      resultado = getExamesList()['Audiometria'];
      break;

    // --- Acuidade Visual / Oftalmológica ---
    case 'avaliacao da acuidade visual':
    case 'avaliação da acuidade visual':
    case 'acuidade visual':
    case 'avaliacao oftalmologica':
    case 'avaliação oftalmológica':
      resultado = getExamesList()['Acuidade Visual'];
      break;

    // --- Psicológico / Psicossocial ---
    case 'avaliacao dos fatores psicossociais':
    case 'avaliação dos fatores psicossociais':
    case 'avaliacao psicologica':
    case 'avaliação psicológica':
      resultado = getExamesList()['Psicossocial'];
      break;

    // --- ECG ---
    case 'eletrocardiograma-ecg':
    case 'eletrocardiograma - ecg':
    case 'ecg':
      resultado = getExamesList()['ECG'];
      break;

    // --- EEG ---
    case 'eletroencefalograma-eeg':
    case 'eletroencefalograma - eeg':
    case 'eeg':
      resultado = getExamesList()['EEG'];
      break;

    // --- Espirometria ---
    case 'espirometria':
      resultado = getExamesList()['Espirometria'];
      break;

    // --- Glicemia ---
    case 'glicemia':
    case 'glicemia de jejum':
      resultado = getExamesList()['Laboratório']?.find(
        (e) => e.nome === 'Glicemia',
      );
      break;

    // --- Hemograma ---
    case 'hemograma completo':
    case 'hemograma completo com contagem de plaquetas':
      resultado = getExamesList()['Laboratório']?.find((e) =>
        e.nome.includes('Hemograma'),
      );
      break;

    // --- Parasitológico ---
    case 'parasitologico de fezes - ppf':
    case 'parasitológico de fezes - ppf':
    case 'ppf':
      resultado = getExamesList()['Laboratório']?.find((e) =>
        e.nome.includes('Parasitológico'),
      );
      break;

    default:
      resultado = undefined;
      break;
  }

  return resultado;
}

export async function mergePdfs(files: Buffer[]) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const pdf = await PDFDocument.load(file);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBuffer = await mergedPdf.save();
  return Buffer.from(mergedBuffer);
}

/**
 * Função responsável por "limpar" os arquivos dentro da pasta
 * temp/audiometria - executado no cron
 *
 */
export async function clearAudiometriaFolder() {
  try {
    const folder = join(process.cwd(), 'temp', 'audio');

    // Ler arquivos da pasta
    const files = await fs.readdir(folder);

    // Deletar cada arquivo
    for (const file of files) {
      const filePath = join(folder, file);
      await fs.unlink(filePath);
    }

    console.log(
      `🧹 Pasta audiometria limpa (${files.length} arquivos removidos).`,
    );
    return true;
  } catch (err) {
    console.error('Erro ao limpar pasta audiometria:', err);
    return false;
  }
}

/**
 * Função auxiliar para calcular dia e datas Brasileiros
 *
 * @returns diaBrStr - dia brasileiro
 * inicioDoDiaBR - inicio dia brasileiro
 * fimDoDiaBR - fim dia brasileiro
 */
export const calcularRangePipeline = () => {
  const hoje = new Date(); // agora (UTC absolute)

  // Format based strictly on timezone explicitly
  const dateStrAtBR = formatInTimeZone(hoje, 'America/Sao_Paulo', 'yyyy-MM-dd');

  const inicioDoDiaBR = fromZonedTime(
    `${dateStrAtBR} 00:00:00`,
    'America/Sao_Paulo',
  );
  const fimDoDiaBR = fromZonedTime(
    `${dateStrAtBR} 23:59:59.999`,
    'America/Sao_Paulo',
  );
  const diaBrStr = formatInTimeZone(hoje, 'America/Sao_Paulo', 'dd/MM/yyyy');

  return {
    diaBrStr,
    inicioDoDiaBR,
    fimDoDiaBR,
  };
};

/**
 * Função auxiliar para converter datas formato DD/MM/YYYY
 * no formato ISO para comparação de datas.
 * @param dateStr recebe string formato DD/MM/YYYY
 * @returns
 */
export function parseDDMMYYYYtoDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [dd, mm, yyyy] = dateStr.split('/').map(Number);
  if (!dd || !mm || !yyyy) return null;

  // cria como data BR (00:00) interpretada como America/Sao_Paulo
  const zoned = toZonedTime(
    `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')} 00:00:00`,
    'America/Sao_Paulo',
  );

  return zoned instanceof Date ? zoned : null;
}

/**
 * Função auxiliar para fazer download do blob storage como ArrayBuffer
 * @param url do blob storage
 * @returns array buffer
 */
async function downloadPdfAsBuffer(
  url: string,
  downloader?: (url: string) => Promise<Buffer>,
): Promise<Buffer> {
  try {
    if (downloader) {
      return await downloader(url);
    }
    const response = await fetch(url);
    const arrBuff = await response.arrayBuffer();

    return Buffer.from(arrBuff);
  } catch (err) {
    console.error('Erro ao baixar PDF:', url, err);
    throw new Error(`Erro ao baixar arquivo: ${url}`);
  }
}

/**
 * Função para geração de array buffer de exames podendo incluir anexos.
 * retorna um array buffer que pode gerar SAS url com prontuário completo
 * @param doc funcionário
 * @param includeAttachments incluir anexos no merge
 * @returns ArrayBuffer
 */
export async function collectExamBuffers(
  doc: SchedulingDocument,
  includeAttachments = false,
  downloader?: (url: string) => Promise<Buffer>,
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  const seenUrls = new Set<string>();

  // 1) PDFs de resultados dos exames (doc.EXAMES)
  for (const exame of doc.EXAMES) {
    if (exame.url && exame.url.trim() !== '' && !seenUrls.has(exame.url)) {
      seenUrls.add(exame.url);
      const pdfBuffer = await downloadPdfAsBuffer(exame.url, downloader);
      buffers.push(pdfBuffer);
    }
  }

  // 2) PDFs de anexos (doc.ANEXOS)
  if (includeAttachments && doc.ANEXOS?.length > 0) {
    for (const anex of doc.ANEXOS) {
      if (anex.StoragePath) {
        const anexBuffer = await downloadPdfAsBuffer(
          anex.StoragePath,
          downloader,
        );
        buffers.push(anexBuffer);
      }
    }
  }

  return buffers;
}

/**
 * Função auxiliar para encontrar grupo pelo código do exame
 * @param codigoExame
 * @returns
 */
export function encontrarGrupoPorCodigo(codigoExame: string) {
  const codigoNormalizado = normalizarCodigoExame(codigoExame);
  if (!codigoNormalizado) return undefined;

  for (const [grupo, exames] of Object.entries(getExamesList())) {
    for (const exame of exames) {
      const encontrado = exame.codigos.some(
        (codigo) => normalizarCodigoExame(codigo) === codigoNormalizado,
      );

      if (encontrado) {
        return grupo;
      }
    }
  }
}

/**
 * Função auxiliar de conversão do cadastro de pessoa SOC
 * para IUserInfo da aplicação.
 * @param socUser Cadastro de Pessoa SOC
 * @returns IUserInfo
 */
export function mapCadastroPessoasToUserInfo(
  socUser: ICadastroPessoas,
): IUserInfo {
  return {
    codigo: socUser.CODIGO,
    nome: socUser.NOME ?? '',
    cpf: socUser.CPF ?? '',
    conselho: socUser.CONSELHO_CLASSE ?? '',
    ufconselho: socUser.UF_CONSELHO ?? '',
    perfil: socUser.REGISTRO_FUNCIONAL ?? '',
  };
}

function calculateWaitTime(ticketEmissao?: string, dataExame?: string): string {
  if (!ticketEmissao || !dataExame) return '';

  const inicio = new Date(ticketEmissao);
  const fim = new Date(dataExame);

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    return '';
  }

  const diffMs = fim.getTime() - inicio.getTime();

  // Evita tempos negativos (inconsistência de dados)
  if (diffMs < 0) return '';

  const totalMin = Math.floor(diffMs / 60000);

  // Menor que 60 → mantém em minutos
  if (totalMin < 60) {
    return totalMin.toString();
  }

  // 60 ou mais → hh:mm
  const horas = Math.floor(totalMin / 60);
  const minutos = totalMin % 60;

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Função para geração de CSV - Exportar CSV da página de relatório.
 * @param atendimentos
 * @returns
 */
export function generateCSV(atendimentos: any[]): string {
  try {
    const headers = [
      'Nome Funcionário',
      'CPF Funcionário',
      'Empresa',
      'Cargo',
      'Tipo Exame',

      'Grupo Exame',
      'Nome Exame',
      'Status Exame',
      'Profissional Exame',
      'Sala Exame',
      'Data Exame',
      'Sequencial Resultado',

      'Tempo de Espera (min)',

      'Data Agendamento',
      'Hora Agendamento',
      'Unidade Atendimento',
      'Status Atendimento',

      'Ticket Número',
      'Ticket Emissão',
      'Ticket Unidade',
      'Ticket Atendente',

      'Observações',
    ];

    const rows: string[][] = [];

    atendimentos.forEach((atendimento) => {
      const exames = Array.isArray(atendimento.EXAMES)
        ? atendimento.EXAMES
        : [];

      const ticket = atendimento.TICKET ?? {};

      // Se não houver exames, ainda assim gera uma linha
      if (exames.length === 0) {
        rows.push([
          `"${(atendimento.NOME ?? '').replace(/"/g, '""')}"`,
          atendimento.CPFFUNCIONARIO ?? '',
          `"${(atendimento.NOMEEMPRESA ?? '').replace(/"/g, '""')}"`,
          `"${(atendimento.NOMECARGO ?? '').replace(/"/g, '""')}"`,
          `"${(atendimento.TIPOEXAMENOME ?? '').replace(/"/g, '""')}"`,

          '',
          '',
          '',
          '',
          '',
          '',

          atendimento.DATAAGENDAMENTO ?? '',
          atendimento.HORARIO ?? '',
          `"${(atendimento.UNIDADEATENDIMENTO ?? '').replace(/"/g, '""')}"`,
          atendimento.ATENDIMENTOSTATUS ?? '',

          ticket.numero ?? '',
          ticket.emissao ?? '',
          `"${(ticket.unidade ?? '').replace(/"/g, '""')}"`,
          `"${(ticket.atendente ?? '').replace(/"/g, '""')}"`,

          `"${(atendimento.OBSERVACOES ?? '').replace(/"/g, '""')}"`,
        ]);
        return;
      }

      // Uma linha por exame
      exames.forEach((exame) => {
        const tempoEsperaMin = calculateWaitTime(
          ticket.emissao,
          exame.dataExame,
        );

        rows.push([
          `"${(atendimento.NOME ?? '').replace(/"/g, '""')}"`,
          atendimento.CPFFUNCIONARIO ?? '',
          `"${(atendimento.NOMEEMPRESA ?? '').replace(/"/g, '""')}"`,
          `"${(atendimento.NOMECARGO ?? '').replace(/"/g, '""')}"`,
          `"${(atendimento.TIPOEXAMENOME ?? '').replace(/"/g, '""')}"`,

          `"${(exame.grupo ?? '').replace(/"/g, '""')}"`,
          `"${(exame.nomeExame ?? '').replace(/"/g, '""')}"`,
          exame.status ?? '',
          `"${(exame.profissional ?? '').replace(/"/g, '""')}"`,
          `"${(exame.sala ?? '').replace(/"/g, '""')}"`,
          exame.dataExame ?? '',
          exame.sequencialResultadoExame ?? '',

          tempoEsperaMin,

          atendimento.DATAAGENDAMENTO ?? '',
          atendimento.HORARIO ?? '',
          `"${(atendimento.UNIDADEATENDIMENTO ?? '').replace(/"/g, '""')}"`,
          atendimento.ATENDIMENTOSTATUS ?? '',

          ticket.numero ?? '',
          ticket.emissao ?? '',
          `"${(ticket.unidade ?? '').replace(/"/g, '""')}"`,
          `"${(ticket.atendente ?? '').replace(/"/g, '""')}"`,

          `"${(atendimento.OBSERVACOES ?? '').replace(/"/g, '""')}"`,
        ]);
      });
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  } catch (error) {
    console.error('Erro ao gerar CSV:', error);
    throw new Error('Falha na geração do arquivo CSV');
  }
}

/**
 * Normaliza uma string de exame removendo acentos e caracteres não alfanuméricos.
 */
export function normalizeExamString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

/**
 * Normaliza o nome do arquivo removendo acentos, espaços e caracteres especiais.
 */
export function standardizeFileName(name: string): string {
  if (!name) return 'ARQUIVO';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toUpperCase();
}

/**
 * Normaliza o nome do arquivo removendo acentos, mantém espaços e hifens, converte para UPPERCASE.
 */
export function standardizeDocumentName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Constrói o nome padronizado: {PREFIX} - {NOME} - {EMPRESA} - {TIPO}_{DATA}
 */
export function formatDocumentFileName(params: {
  prefix: 'ASO' | 'PRONTUARIO' | 'PRONTUÁRIO';
  nome?: string;
  empresa?: string;
  tipo?: string;
  data?: string;
}): string {
  const { prefix, nome, empresa, tipo, data } = params;

  const p = prefix.toUpperCase().replace('Á', 'A');
  const n = standardizeDocumentName(nome || 'FUNCIONARIO');
  const e = empresa ? standardizeDocumentName(empresa) : undefined;
  const t = standardizeDocumentName(tipo || 'ASO');
  const d = (data || '').replace(/\//g, '-');

  // {ASO | PRONTUARIO} - {NOME FUNCIONARIO} - {NOME EMPRESA} - {TIPO EXAME NOME}_DIA-MES-ANO
  if (e) {
    return `${p} - ${n} - ${e} - ${t}_${d}`;
  }
  return `${p} - ${n} - ${t}_${d}`;
}
