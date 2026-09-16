// Template PDF para Ficha de Restrição Temporária - Engemedical Premium
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getImageBase64, formatCPF } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';

// ═══════════════════════════════════════════════════════════════
// CORES PREMIUM CORPORATE HEALTH
// ═══════════════════════════════════════════════════════════════
const C = {
  verdeEscuro: '#1B5E20',
  verde: '#2E7D32',
  verdeClaro: '#4CAF50',
  ciano: '#0097A7',
  azulEscuro: '#0D47A1',
  preto: '#1A1A1A',
  texto: '#212121',
  muted: '#757575',
  borda: '#E0E0E0',
  fundo: '#F5F5F5',
  branco: '#FFFFFF',
  apto: '#2E7D32',
  inapto: '#C62828',
};

export async function gerarDocRestricaoTemporaria(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const {
    NOMEEMPRESA,
    CNPJEMPRESA,
    NOME,
    CPFFUNCIONARIO,
    DATANASCIMENTO,
    NOMESETOR,
    NOMECARGO,
    UNIDADEATENDIMENTO,
    TIPOEXAMENOME,
    CODIGOPRONTUARIO,
    EXAMES,
  } = asoData;

  const { codigo } = profissional;

  const fichaClinica = EXAMES?.find(
    (e: any) => e.formulario?.restricoes || e.formulario?.duracaoRestricaoDias,
  )?.formulario;

  const form = fichaClinica || {};
  const idade = DATANASCIMENTO
    ? Math.floor(
        (Date.now() -
          new Date(DATANASCIMENTO.split('/').reverse().join('-')).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : 'N/D';

  // ═══ LOGOS LOCAIS ═══
  const logoLocalPath = path.resolve(
    process.cwd(),
    'src',
    'assets',
    'images',
    'logo.png',
  );
  const logoEmpresa = fs.existsSync(logoLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(logoLocalPath).toString('base64')}`
    : await getImageBase64('https://engemedical.com.br/images/logo.png');

  const iconeLocalPath = path.resolve(
    process.cwd(),
    'src',
    'assets',
    'images',
    'icone.png',
  );
  const watermarkBase64 = fs.existsSync(iconeLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(iconeLocalPath).toString('base64')}`
    : await getImageBase64('https://engemedical.com.br/images/icone.png');

  let assinaturaMedico = await getImageBase64(ASSINATURAS_URL[codigo]);
  if (!assinaturaMedico) {
    assinaturaMedico = await getImageBase64(
      'https://engemedical.com.br/images/logo.png',
    );
  }

  let dataInicioFormatada = '-';
  let dataFimFormatada = '-';

  if (form.dataInicioRestricao) {
    const dataInicio = new Date(form.dataInicioRestricao);
    if (!isNaN(dataInicio.getTime())) {
      dataInicioFormatada = dataInicio.toLocaleDateString('pt-BR');
      const duracao = parseInt(form.duracaoRestricaoDias || '0');
      if (duracao > 0) {
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + duracao);
        dataFimFormatada = dataFim.toLocaleDateString('pt-BR');
      }
    }
  }

  const restricoesObj = form.restricoes;
  let restricoesTexto = 'Sem restrições registradas.';
  if (restricoesObj && typeof restricoesObj === 'object') {
    const linhas: string[] = [];
    if (restricoesObj.evitarCarregarPeso) {
      linhas.push(
        restricoesObj.pesoMaximoKg
          ? `• Evitar carregar peso acima de ${restricoesObj.pesoMaximoKg}kg`
          : '• Evitar carregar peso excessivo',
      );
    }
    if (restricoesObj.evitarElevacaoBracos) {
      const lado = restricoesObj.tipoElevacaoBracos
        ? ` (${restricoesObj.tipoElevacaoBracos})`
        : '';
      linhas.push(`• Evitar elevação dos braços acima dos ombros${lado}`);
    }
    if (restricoesObj.evitarCurvarTronco) linhas.push('• Evitar curvar tronco com frequência');
    if (restricoesObj.evitarEscadas) linhas.push('• Evitar subir/descer escadas ou degraus');
    if (restricoesObj.evitarLongasCaminhadas) linhas.push('• Evitar longas caminhadas');
    if (restricoesObj.evitarAlterarPostura) linhas.push('• Evitar alternar postura sentado/em pé');
    if (restricoesObj.outros && restricoesObj.descricaoOutros) {
      linhas.push(`• Outros: ${restricoesObj.descricaoOutros}`);
    }
    if (linhas.length > 0) restricoesTexto = linhas.join('\n');
  } else if (typeof restricoesObj === 'string' && restricoesObj.trim()) {
    restricoesTexto = restricoesObj;
  }

  const observacoes = form.recomendacoesRestricao || 'Nenhuma observação adicional.';

  const geradoEm = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  const metadadosRodape = [
    CODIGOPRONTUARIO ? `Prontuário: ${CODIGOPRONTUARIO}` : '',
    `Gerado em: ${geradoEm}`,
    `Unidade: ${UNIDADEATENDIMENTO || ''}`,
  ]
    .filter(Boolean)
    .join('   |   ');

  const blocoAssinaturas: any = {
    margin: [0, 20, 0, 0] as [number, number, number, number],
    columns: [
      {
        width: '*',
        stack: [
          { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.8, lineColor: C.azulEscuro }] },
          { text: NOME || 'Funcionário', fontSize: 7, color: C.texto, margin: [0, 3, 0, 1] },
          { text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`, fontSize: 7, color: C.muted },
          { text: 'Assinatura do Funcionário', fontSize: 6.5, color: C.muted, italics: true, margin: [0, 1, 0, 0] },
        ],
      },
      { width: 20, text: '' },
      {
        width: '*',
        stack: [
          { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.8, lineColor: C.azulEscuro }] },
          { text: NOMEEMPRESA || 'Empresa', fontSize: 7, color: C.texto, margin: [0, 3, 0, 1] },
          { text: `CNPJ: ${CNPJEMPRESA || ''}`, fontSize: 7, color: C.muted },
          { text: 'Assinatura do Responsável pela Empresa', fontSize: 6.5, color: C.muted, italics: true, margin: [0, 1, 0, 0] },
        ],
      },
    ],
  };

  const section = (title: string, color: string = C.ciano) => ({
    table: {
      widths: ['*'],
      body: [[{
        columns: [
          { width: 4, text: '', fillColor: color },
          { width: '*', text: title, fontSize: 9.5, bold: true, color: C.texto, margin: [10, 5, 8, 5] as [number, number, number, number] },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => '#ECEFF1',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 10, 0, 0] as [number, number, number, number],
  });

  const card = (content: any) => ({
    table: {
      widths: ['*'],
      body: [[{ stack: content, margin: [12, 8, 12, 8] }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => C.branco,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  });

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 85],

    background: watermarkBase64
      ? [{ image: watermarkBase64, width: 600, opacity: 0.06, absolutePosition: { x: 320, y: 50 } }]
      : undefined,

    content: [
      // ═══ CABEÇALHO ═══
      {
        columns: [
          { width: 120, stack: [logoEmpresa ? { image: logoEmpresa, fit: [110, 110], alignment: 'center' } : { text: '' }] },
          {
            width: '*',
            stack: [
              { text: 'RESTRIÇÃO TEMPORÁRIA', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] as [number, number, number, number] },
              { text: TIPOEXAMENOME || 'Avaliação Clínica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1 },
            ],
            margin: [0, 8, 0, 0] as [number, number, number, number],
          },
          { width: 120, text: '' },
        ],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      {
        canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 553, y2: 0, lineWidth: 1.5, lineColor: C.ciano }],
        margin: [0, 4, 0, 8] as [number, number, number, number],
      },

      // ═══ IDENTIFICAÇÃO DO FUNCIONÁRIO + EMPRESA ═══
      {
        columns: [
          {
            width: '50%',
            stack: [
              section('DADOS DO FUNCIONÁRIO', C.azulEscuro),
              card([
                { columns: [{ text: 'Nome:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: NOME || 'N/D', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { columns: [{ text: 'CPF:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: formatCPF(CPFFUNCIONARIO), fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { columns: [{ text: 'Nascimento:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: `${DATANASCIMENTO || 'N/D'} — ${idade} anos`, fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { columns: [{ text: 'Cargo:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: NOMECARGO || 'N/D', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { columns: [{ text: 'Setor:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: NOMESETOR || 'N/D', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
              ]),
            ],
          },
          {
            width: '50%',
            stack: [
              section('DADOS DA EMPRESA', C.verde),
              card([
                { columns: [{ text: 'Razão social:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: NOMEEMPRESA || 'N/D', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { columns: [{ text: 'CNPJ:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: CNPJEMPRESA || 'N/D', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
                { text: '', margin: [0, 0, 0, 0] as [number, number, number, number] },
                { columns: [{ text: 'Data do exame:', width: 90, fontSize: 8.5, bold: true, color: C.muted }, { text: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()), fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
              ]),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ═══ DETALHES DA RESTRIÇÃO ═══
      section('DETALHES DA RESTRIÇÃO TEMPORÁRIA', C.ciano),
      card([
        { columns: [{ text: 'Data de Início:', width: 120, fontSize: 8.5, bold: true, color: C.muted }, { text: dataInicioFormatada, fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
        { columns: [{ text: 'Data de Término:', width: 120, fontSize: 8.5, bold: true, color: C.muted }, { text: dataFimFormatada, fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
        { columns: [{ text: 'Duração (dias):', width: 120, fontSize: 8.5, bold: true, color: C.muted }, { text: form.duracaoRestricaoDias || '-', fontSize: 9.5, color: C.texto }], margin: [0, 2, 0, 2] as [number, number, number, number] },
        { text: '', margin: [0, 0, 0, 0] as [number, number, number, number] },
        { columns: [{ text: 'Tipo(s) de Restrição:', width: 120, fontSize: 8.5, bold: true, color: C.muted }, { text: restricoesTexto, fontSize: 9.5, color: C.texto, lineHeight: 1.4 }], margin: [0, 2, 0, 2] as [number, number, number, number] },
      ]),

      // ═══ OBSERVAÇÕES MÉDICAS ═══
      section('OBSERVAÇÕES MÉDICAS', C.verde),
      card([
        { text: observacoes, fontSize: 9, color: C.texto, alignment: 'justify', lineHeight: 1.4 },
      ]),

      // ═══ ASSINATURAS ═══
      blocoAssinaturas,

      // ═══ METADADOS ═══
      {
        text: metadadosRodape,
        fontSize: 6,
        color: C.muted,
        alignment: 'center',
        margin: [0, 10, 0, 0] as [number, number, number, number],
      },
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: form.medico || profissional?.nome,
        profissional: form.medico || profissional?.profissional || profissional?.nome,
      },
      NOME,
      CPFFUNCIONARIO,
      CODIGOPRONTUARIO || '',
      UNIDADEATENDIMENTO,
      assinaturaMedico,
      assinaturaDigitalObrigatoria,
    ),

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: C.azulEscuro },
      sectionTitle: { fontSize: 12, bold: true, color: C.azulEscuro },
    },

    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.15,
      color: C.texto,
    },
  };
}
