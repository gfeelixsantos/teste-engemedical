// Template PDF para Avaliação Psicossocial
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';
import * as fs from 'fs';
import * as path from 'path';

export async function gerarDocPsicossocial(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#0D47A1';
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
  let assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);

  // fallback caso não tenha assinatura
  if (!assinaturaProfissional)
    assinaturaProfissional = await getImageBase64(
      'https://engemedical.com.br/images/logo.png',
    );

  // ======= SAÚDE MENTAL E HÁBITOS =======
  const saudeMentalGrid = [
    ['Transtorno Emocional', form.transtornoEmocional || '-'],
    ['Medicamentos Controlados', form.medicamentosControlados || '-'],
    ['Uso de Álcool/Drogas', form.usoAlcoolDrogas || '-'],
  ];

  // ======= CONDIÇÕES CLÍNICAS E SENSORIAIS =======
  const condicoesClinicasGrid = [
    ['Tontura/Desmaios', form.tonturaDesmaios || '-'],
    ['Problemas Sensoriais', form.problemasSensoriais || '-'],
    ['Hipertensão/Diabetes', form.hipertensaoDiabetes || '-'],
  ];

  // ======= ASPECTOS PSICOSSOCIAIS =======
  const aspectosPsicossociaisGrid = [
    ['Relacionamento Familiar', form.relacionamentoFamiliar || '-'],
    ['Medo de Altura/Espaços', form.medoAlturaEspacos || '-'],
    ['Experiência em Altura/Confinado', form.experienciaAlturaConfinado || '-'],
  ];

  // ======= AUTOAVALIAÇÃO =======
  const autoavaliacaoGrid = [
    ['Trabalho em Altura', form.autoAvaliacaoAltura || '-'],
    ['Trabalho em Espaço Confinado', form.autoAvaliacaoConfinado || '-'],
  ];

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
      createGridSection('Saúde Mental e Hábitos', saudeMentalGrid, {
        margin: [0, 5, 0, 10],
      }),

      // ===== CONDIÇÕES CLÍNICAS E SENSORIAIS =====
      createGridSection('Condições Clínicas e Sensoriais', condicoesClinicasGrid, {
        margin: [0, 5, 0, 10],
      }),

      // ===== ASPECTOS PSICOSSOCIAIS =====
      createGridSection('Aspectos Psicossociais', aspectosPsicossociaisGrid, {
        margin: [0, 5, 0, 10],
      }),

      // ===== AUTOAVALIAÇÃO =====
      createGridSection('Autoavaliação', autoavaliacaoGrid, {
        margin: [0, 5, 0, 25],
      }),

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
