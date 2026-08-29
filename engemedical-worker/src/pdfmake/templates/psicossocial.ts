// Template PDF para Avaliação Psicossocial
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';

export async function gerarDocPsicossocial(
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
    EXAMES,
    TIPOEXAMENOME,
    UNIDADEATENDIMENTO,
    CODIGOPRONTUARIO,
  } = asoData;

  const { codigo } = profissional;

  const psicossocial = EXAMES?.find((e: any) => e.grupo === 'Psicossocial');

  const form = psicossocial?.formulario || {};

  const idade = DATANASCIMENTO
    ? Math.floor(
        (Date.now() -
          new Date(DATANASCIMENTO.split('/').reverse().join('-')).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : 'N/D';

  const logoEmpresa = await getImageBase64(
    'https://cmsocupacional.com.br/images/logo.png',
  );
  const watermarkBase64 = await getImageBase64(
    'https://centromedicodesaudeocupacional.formaedu.com.br/wp-content/uploads/sites/6/2024/11/LOGO-220x221.png',
  );
  let assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);

  // fallback caso não tenha assinatura
  if (!assinaturaProfissional)
    assinaturaProfissional = await getImageBase64(
      'https://cmsocupacional.com.br/images/logo.png',
    );

  // ======= SAÚDE MENTAL E HÁBITOS =======
  const saudeMentalGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Aspecto Avaliado',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
        {
          text: 'Resposta',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Transtorno Emocional', style: 'tableLabel' },
        { text: form.transtornoEmocional || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Medicamentos Controlados', style: 'tableLabel' },
        {
          text: form.medicamentosControlados || '-',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Uso de Álcool/Drogas', style: 'tableLabel' },
        { text: form.usoAlcoolDrogas || '-', alignment: 'center' as const },
      ],
    ],
  };

  // ======= CONDIÇÕES CLÍNICAS E SENSORIAIS =======
  const condicoesClinicasGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Condição',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
        {
          text: 'Resposta',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Tontura/Desmaios', style: 'tableLabel' },
        { text: form.tonturaDesmaios || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Problemas Sensoriais', style: 'tableLabel' },
        { text: form.problemasSensoriais || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Hipertensão/Diabetes', style: 'tableLabel' },
        { text: form.hipertensaoDiabetes || '-', alignment: 'center' as const },
      ],
    ],
  };

  // ======= ASPECTOS PSICOSSOCIAIS =======
  const aspectosPsicossociaisGrid: { body: any[][] } = {
    body: [
      [
        { text: 'Aspecto', style: 'tableHeader', alignment: 'center' as const },
        {
          text: 'Resposta',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Relacionamento Familiar', style: 'tableLabel' },
        {
          text: form.relacionamentoFamiliar || '-',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Medo de Altura/Espaços', style: 'tableLabel' },
        { text: form.medoAlturaEspacos || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Experiência em Altura/Confinado', style: 'tableLabel' },
        {
          text: form.experienciaAlturaConfinado || '-',
          alignment: 'center' as const,
        },
      ],
    ],
  };

  // ======= AUTOAVALIAÇÃO =======
  const autoavaliacaoGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Tipo de Trabalho',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
        {
          text: 'Resposta',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Trabalho em Altura', style: 'tableLabel' },
        { text: form.autoAvaliacaoAltura || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Trabalho em Espaço Confinado', style: 'tableLabel' },
        {
          text: form.autoAvaliacaoConfinado || '-',
          alignment: 'center' as const,
        },
      ],
    ],
  };

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [30, 35, 30, 110],

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
      // ===== TÍTULO ===== (MESMO FORMATO DA DINAMOMETRIA)
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'QUESTIONÁRIO PSICOSSOCIAL',
                style: 'mainTitle',
                margin: [0, 0, 0, 5] as [number, number, number, number],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}`,
                margin: [0, 0, 0, 0] as [number, number, number, number],
              },
            ],
          },
          {
            stack: [
              logoEmpresa
                ? {
                    image: logoEmpresa,
                    width: 120,
                    alignment: 'right' as const,
                  }
                : { text: '' },
              {
                text: `${UNIDADEATENDIMENTO}, ${new Date().toLocaleDateString('pt-br')}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },

      // ===== CABEÇALHO ===== (MESMO FORMATO DA DINAMOMETRIA)
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `${NOME || 'N/D'}`, bold: true, fontSize: 11 },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nascimento: ${DATANASCIMENTO || 'N/D'}   Idade: ${idade} anos`,
                fontSize: 10,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },

      // ===== EMPRESA ===== (MESMO FORMATO DA DINAMOMETRIA)
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: `${NOMEEMPRESA || 'N/D'}`, bold: true },
                  {
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}   Cargo: ${NOMECARGO || 'N/D'}   Setor: ${NOMESETOR || 'N/D'}`,
                    fontSize: 10,
                    color: LIGHT_TEXT,
                  },
                ],
              },
            ],
          ] as any,
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // ===== SAÚDE MENTAL E HÁBITOS =====
      {
        text: 'Saúde Mental e Hábitos',
        style: 'sectionTitle',
        alignment: 'left',
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['35%', '20%', '45%'],
          body: saudeMentalGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // ===== CONDIÇÕES CLÍNICAS E SENSORIAIS =====
      {
        text: 'Condições Clínicas e Sensoriais',
        style: 'sectionTitle',
        alignment: 'left' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['35%', '20%', '45%'],
          body: condicoesClinicasGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // ===== ASPECTOS PSICOSSOCIAIS =====
      {
        text: 'Aspectos Psicossociais',
        style: 'sectionTitle',
        alignment: 'left',
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['35%', '20%', '45%'],
          body: aspectosPsicossociaisGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // ===== AUTOAVALIAÇÃO =====
      {
        text: 'Autoavaliação',
        style: 'sectionTitle',
        alignment: 'left' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['35%', '20%', '45%'],
          body: autoavaliacaoGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 25],
      },

      // ===== INFORMAÇÕES RELEVANTES =====
      ...(form.informacoesRelevantes
        ? [
            {
              text: '5. Informações Relevantes',
              style: 'sectionTitle',
              alignment: 'center' as const,
              margin: [0, 5, 0, 5] as [number, number, number, number],
            },
            {
              text: form.informacoesRelevantes,
              alignment: 'justify' as const,
              italics: true,
              fontSize: 9,
              margin: [0, 0, 0, 10] as [number, number, number, number],
              background: '#f8fafc',
            },
          ]
        : []),

      // ===== OBSERVAÇÕES E CONCLUSÃO =====
      // Observações do profissional
      ...(form.observacoes
        ? [
            {
              text: `Observações do Profissional: ${form.observacoes}`,
              alignment: 'justify' as const,
              italics: true,
              fontSize: 9,
              margin: [0, 0, 0, 25] as [number, number, number, number],
            },
          ]
        : []),
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome:
          psicossocial?.profissional ||
          form.profissionalResponsavel ||
          profissional?.nome,
        profissional:
          psicossocial?.profissional ||
          form.profissionalResponsavel ||
          profissional?.profissional ||
          profissional?.nome,
      },
      NOME,
      CPFFUNCIONARIO,
      CODIGOPRONTUARIO || '',
      UNIDADEATENDIMENTO,
      assinaturaProfissional,
      assinaturaDigitalObrigatoria,
    ),

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: PRIMARY },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: PRIMARY,
        margin: [0, 3, 0, 4] as [number, number, number, number],
      },
      tableHeader: {
        bold: true,
        fillColor: '#E0E7FF',
        color: PRIMARY,
        fontSize: 9,
      },
      tableLabel: { bold: true, color: LIGHT_TEXT, fontSize: 9 },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };

  return doc;
}
