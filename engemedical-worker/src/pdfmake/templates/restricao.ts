// Template PDF para Ficha de Restrição Temporária
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getImageBase64, formatCPF } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';

export async function gerarDocRestricaoTemporaria(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#114E34';
  const LIGHT_TEXT = '#333333';

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

  // ======= Imagens =======
  const logoEmpresa = await getImageBase64(
    'https://cmsocupacional.com.br/images/logo.png',
  );
  const watermarkBase64 = await getImageBase64(
    'https://centromedicodesaudeocupacional.formaedu.com.br/wp-content/uploads/sites/6/2024/11/LOGO-220x221.png',
  );
  let assinaturaMedico = await getImageBase64(ASSINATURAS_URL[codigo]);
  if (!assinaturaMedico)
    assinaturaMedico = await getImageBase64(
      'https://cmsocupacional.com.br/images/logo.png',
    );

  // ======= Datas =======
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

  // ======= Restrições Médicas =======
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
    // Compatibilidade com formato string legado
    restricoesTexto = restricoesObj;
  }

  const observacoes =
    form.recomendacoesRestricao ||
    'Nenhuma observação adicional.';

  // ======= Metadados para rastreio (AuditService) =======
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

  // ======= Bloco de assinaturas (funcionário + empresa) =======
  const blocoAssinaturas: any = {
    margin: [0, 20, 0, 0] as [number, number, number, number],
    columns: [
      {
        width: '*',
        stack: [
          { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.8, lineColor: '#333' }] },
          { text: NOME || 'Funcionário', fontSize: 7, color: LIGHT_TEXT, margin: [0, 3, 0, 1] },
          { text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`, fontSize: 7, color: LIGHT_TEXT },
          { text: 'Assinatura do Funcionário', fontSize: 6.5, color: '#888', italics: true, margin: [0, 1, 0, 0] },
        ],
      },
      { width: 20, text: '' },
      {
        width: '*',
        stack: [
          { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.8, lineColor: '#333' }] },
          { text: NOMEEMPRESA || 'Empresa', fontSize: 7, color: LIGHT_TEXT, margin: [0, 3, 0, 1] },
          { text: `CNPJ: ${CNPJEMPRESA || ''}`, fontSize: 7, color: LIGHT_TEXT },
          { text: 'Assinatura do Responsável pela Empresa', fontSize: 6.5, color: '#888', italics: true, margin: [0, 1, 0, 0] },
        ],
      },
    ],
  };

  return {
    pageSize: 'A4',
    pageMargins: [30, 35, 30, 110],

    // ======= MARCA D'ÁGUA =======
    background: watermarkBase64
      ? [
          {
            image: watermarkBase64,
            width: 350,
            opacity: 0.06,
            absolutePosition: { x: 150, y: 250 },
          },
        ]
      : undefined,

    content: [
      // ======= CABEÇALHO com LOGO =======
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'RESTRIÇÃO TEMPORÁRIA',
                style: 'mainTitle',
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME || 'Avaliação Clínica'}`,
                fontSize: 10,
                margin: [0, 0, 0, 5],
              },
            ],
          },
          {
            stack: [
              logoEmpresa
                ? { image: logoEmpresa, width: 100, alignment: 'right' }
                : { text: '' },
              {
                text: `${UNIDADEATENDIMENTO || ''}, ${new Date().toLocaleDateString('pt-BR')}`,
                alignment: 'right',
                fontSize: 8,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
      },

      // ======= IDENTIFICAÇÃO DO FUNCIONÁRIO =======
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: `${NOME || 'N/D'}`, bold: true, fontSize: 11 },
                  {
                    text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nascimento: ${DATANASCIMENTO || 'N/D'}   Idade: ${idade} anos`,
                    fontSize: 9,
                    color: LIGHT_TEXT,
                  },
                  {
                    text: `Cargo: ${NOMECARGO || 'N/D'}   Setor: ${NOMESETOR || 'N/D'}`,
                    fontSize: 9,
                    color: LIGHT_TEXT,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // ======= EMPRESA =======
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: `Empresa: ${NOMEEMPRESA || 'N/D'}`, bold: true },
                  {
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}`,
                    fontSize: 9,
                    color: LIGHT_TEXT,
                  },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15],
      },

      // ======= DETALHES DA RESTRIÇÃO =======
      {
        text: 'Detalhes da Restrição Temporária',
        style: 'sectionTitle',
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          widths: ['35%', '*'],
          body: [
            [
              { text: 'Data de Início:', bold: true },
              { text: dataInicioFormatada },
            ],
            [
              { text: 'Data de Término:', bold: true },
              { text: dataFimFormatada },
            ],
            [
              { text: 'Duração (dias):', bold: true },
              { text: form.duracaoRestricaoDias || '-' },
            ],
            [
              { text: 'Tipo(s) de Restrição:', bold: true },
              { text: restricoesTexto, lineHeight: 1.4 },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },

      // ======= OBSERVAÇÕES MÉDICAS =======
      {
        text: 'Observações Médicas',
        style: 'sectionTitle',
        margin: [0, 0, 0, 6],
      },
      {
        text: observacoes,
        fontSize: 10,
        color: LIGHT_TEXT,
        margin: [0, 0, 0, 70],
      },

      // ======= ASSINATURAS: FUNCIONÁRIO + EMPRESA =======
      blocoAssinaturas,
    ],

    // ======= RODAPÉ COM ASSINATURA DO MÉDICO (padrão buildPdfFooter) =======
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
      mainTitle: { fontSize: 16, bold: true },
      sectionTitle: { fontSize: 12, bold: true, color: PRIMARY },
    },

    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.15,
    },
  };
}
