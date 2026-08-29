// Template PDF para Avalia├º├úo Psicossocial
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';

function getPsicossocialCodigos() {
  return new Set(
    (getExamesList().Psicossocial || []).flatMap((item) => item.codigos || []),
  );
}

export function resolvePsicossocialExam(EXAMES: any[] | undefined) {
  if (!Array.isArray(EXAMES)) return null;

  return (
    EXAMES.find((e: any) => {
      const codigoExame = String(e?.codigoExame || '').trim();
      const grupo = String(e?.grupo || '').trim().toLowerCase();
      const nomeExame = String(e?.nomeExame || '').trim().toLowerCase();
      const psicossocialCodigos = getPsicossocialCodigos();

      return (
        grupo === 'psicossocial' ||
        psicossocialCodigos.has(codigoExame) ||
        nomeExame.includes('psicossocial')
      );
    }) || null
  );
}

export async function gerarDocPsicossocial(
  asoData: any,
  profissional: any,
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

  const { codigo, cpf, conselho, ufconselho } = profissional;

  const psicossocial = resolvePsicossocialExam(EXAMES);

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
  const assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);

  // ======= SA├ÜDE MENTAL E H├üBITOS =======
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
        { text: 'Uso de ├ülcool/Drogas', style: 'tableLabel' },
        { text: form.usoAlcoolDrogas || '-', alignment: 'center' as const },
      ],
    ],
  };

  // ======= CONDI├ç├òES CL├ìNICAS E SENSORIAIS =======
  const condicoesClinicasGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Condi├º├úo',
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
        { text: 'Hipertens├úo/Diabetes', style: 'tableLabel' },
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
        { text: 'Medo de Altura/Espa├ºos', style: 'tableLabel' },
        { text: form.medoAlturaEspacos || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Experi├¬ncia em Altura/Confinado', style: 'tableLabel' },
        {
          text: form.experienciaAlturaConfinado || '-',
          alignment: 'center' as const,
        },
      ],
    ],
  };

  // ======= AUTOAVALIA├ç├âO =======
  const autoavaliacaoGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Tipo de Trabalho',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
        {
          text: 'Autoavalia├º├úo',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        { text: 'Trabalho em Altura', style: 'tableLabel' },
        { text: form.autoAvaliacaoAltura || '-', alignment: 'center' as const },
      ],
      [
        { text: 'Trabalho em Espa├ºo Confinado', style: 'tableLabel' },
        {
          text: form.autoAvaliacaoConfinado || '-',
          alignment: 'center' as const,
        },
      ],
    ],
  };

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [35, 35, 35, 45],

    background: watermarkBase64
      ? [
          {
            image: watermarkBase64,
            width: 350,
            opacity: 0.04,
            absolutePosition: { x: 150, y: 250 },
          },
        ]
      : undefined,

    content: [
      // ===== T├ìTULO ===== (MESMO FORMATO DA DINAMOMETRIA)
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'QUESTION├üRIO PSICOSSOCIAL',
                style: 'mainTitle',
                margin: [0, 0, 0, 5] as [number, number, number, number],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}:   ${form.conclusao || 'PENDENTE'}`,
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
                text: `${UNIDADEATENDIMENTO}, ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },

      // ===== CABE├çALHO ===== (MESMO FORMATO DA DINAMOMETRIA)
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

      // ===== SA├ÜDE MENTAL E H├üBITOS =====
      {
        text: 'Sa├║de Mental e H├íbitos',
        style: 'sectionTitle',
        alignment: 'center' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['65%', '35%'],
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

      // ===== CONDI├ç├òES CL├ìNICAS E SENSORIAIS =====
      {
        text: 'Condi├º├Áes Cl├¡nicas e Sensoriais',
        style: 'sectionTitle',
        alignment: 'center' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['65%', '35%'],
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
        alignment: 'center' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['65%', '35%'],
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

      // ===== AUTOAVALIA├ç├âO =====
      {
        text: 'Autoavalia├º├úo',
        style: 'sectionTitle',
        alignment: 'center' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['65%', '35%'],
          body: autoavaliacaoGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // ===== INFORMA├ç├òES RELEVANTES =====
      ...(form.informacoesRelevantes
        ? [
            {
              text: '5. Informa├º├Áes Relevantes',
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

      // ===== OBSERVA├ç├òES E CONCLUS├âO =====
      {
        text: form.informacoesRelevantes
          ? '6. Observa├º├Áes e Conclus├úo'
          : '5. Observa├º├Áes e Conclus├úo',
        style: 'sectionTitle',
        alignment: 'center' as const,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },

      // Observa├º├Áes do profissional
      ...(form.observacoes
        ? [
            {
              text: `Observa├º├Áes do Profissional: ${form.observacoes}`,
              alignment: 'justify' as const,
              italics: true,
              fontSize: 9,
              margin: [0, 0, 0, 5] as [number, number, number, number],
            },
          ]
        : []),

      // Recomenda├º├Áes
      ...(form.recomendacoes
        ? [
            {
              text: `Recomenda├º├Áes: ${form.recomendacoes}`,
              alignment: 'justify' as const,
              italics: true,
              fontSize: 9,
              margin: [0, 0, 0, 5] as [number, number, number, number],
            },
          ]
        : []),

      // Conclus├úo
      {
        text: `Conclus├úo: ${form.conclusao?.toUpperCase() || 'PENDENTE'}`,
        alignment: 'center' as const,
        bold: true,
        fontSize: 12,
        color:
          form.conclusao === 'Apto'
            ? '#16A34A'
            : form.conclusao?.includes('Inapto')
              ? '#DC2626'
              : form.conclusao?.includes('Temporariamente')
                ? '#F57C00'
                : PRIMARY,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },

      // ===== ASSINATURAS ===== (MESMO FORMATO DA DINAMOMETRIA)
      {
        columns: [
          {
            width: '50%',
            stack: [
              assinaturaProfissional
                ? {
                    image: assinaturaProfissional,
                    width: 100,
                    alignment: 'left' as const,
                    margin: [0, 0, 0, 5] as [number, number, number, number],
                  }
                : {
                    text: '',
                    margin: [0, 0, 0, 5] as [number, number, number, number],
                  },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 160,
                    y2: 0,
                    lineColor: PRIMARY,
                  },
                ],
              },
              {
                text:
                  psicossocial?.profissional ||
                  form.profissionalResponsavel ||
                  'N/D',
                fontSize: 8,
                alignment: 'left' as const,
              },
              {
                text: `Registro: ${conselho || 'N/D'} / ${ufconselho || ''}`,
                fontSize: 8,
                alignment: 'left' as const,
              },
              {
                text: `CPF: ${formatCPF(cpf)}`,
                fontSize: 8,
                alignment: 'left' as const,
              },
            ],
          },
          {
            width: '50%',
            stack: [
              {
                text: `O(A) paciente/funcion├írio(a) atesta a realiza├º├úo da avalia├º├úo psicossocial em ${new Date().toLocaleString('pt-BR')}, e est├í ciente da finalidade de sa├║de ocupacional e legal deste documento. Confirma o aceite dos termos atrav├®s da autentica├º├úo biom├®trica/assinatura eletr├┤nica registrada no sistema SOC, conforme o Termo de Ciência e Registro de Aceite para Uso de Biometria.`,
                fontSize: 6,
                italics: true,
                alignment: 'right' as const,
                margin: [0, 0, 0, 5] as [number, number, number, number],
              },
              { text: NOME, fontSize: 8, alignment: 'right' as const },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`,
                fontSize: 8,
                alignment: 'right' as const,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
    ],

    footer: {
      columns: [
        {
          text: `${CODIGOPRONTUARIO} Processado em ${new Date().toLocaleString('pt-BR')} ÔÇô Centro M├®dico de Sa├║de Ocupacional - ${UNIDADEATENDIMENTO}`,
          alignment: 'left' as const,
          fontSize: 6,
          color: '#555',
          margin: [35, 10, 35, 0] as [number, number, number, number],
        },
      ],
    },

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
