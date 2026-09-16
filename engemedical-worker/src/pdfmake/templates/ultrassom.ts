// Template PDF para Exame de Ultrassom
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';
import * as fs from 'fs';
import * as path from 'path';

export async function gerarDocUltrassom(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#0D47A1';
  const LIGHT_TEXT = '#333333';
  const WARNING_COLOR = '#DC2626';

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

  const ultrassom = EXAMES?.find((e: any) => e.grupo === 'Ultrassom');

  const form = ultrassom?.formulario || {};

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

  // ======= RESULTADO DO EXAME =======
  const resultadoGrid: { body: any[][] } = {
    body: [
      [
        {
          text: 'Parâmetro Avaliado',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
        {
          text: 'Resultado',
          style: 'tableHeader',
          alignment: 'center' as const,
        },
      ],
      [
        {
          text: 'Exame dentro da normalidade?',
          style: 'tableLabel',
          bold: true,
        },
        {
          text: form.normal || '-',
          alignment: 'center' as const,
          color: form.normal === 'Não' ? WARNING_COLOR : PRIMARY,
          bold: form.normal === 'Não',
        },
      ],
    ],
  };

  // ======= STATUS VISUAL =======
  const statusExame =
    form.normal === 'Não'
      ? {
          text: 'EXAME COM ALTERAÇÕES DETECTADAS',
          margin: [0, 10, 0, 5] as [number, number, number, number],
        }
      : {
          text: 'EXAME DENTRO DA NORMALIDADE',
          margin: [0, 10, 0, 5] as [number, number, number, number],
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
      // ===== TÍTULO =====
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'LAUDO DE ULTRASSOM',
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

      // ===== CABEÇALHO =====
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

      // ===== EMPRESA =====
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

      // ===== STATUS DO EXAME =====
      statusExame,

      // ===== RESULTADO DO EXAME =====
      {
        text: 'Resultado do Exame',
        style: 'sectionTitle',
        alignment: 'left',
        margin: [0, 5, 0, 5] as [number, number, number, number],
      },
      {
        table: {
          widths: ['50%', '50%'],
          body: resultadoGrid.body as any,
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: (i: number) => 0.5,
          hLineColor: (i: number) => '#aaaaaa',
          vLineColor: (i: number) => '#aaaaaa',
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome:
          ultrassom?.profissional ||
          form.profissionalResponsavel ||
          profissional?.nome,
        profissional:
          ultrassom?.profissional ||
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
      statusNormal: {
        fontSize: 14,
        bold: true,
        alignment: 'center' as const,
        background: '#D1FAE5',
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      statusAlterado: {
        fontSize: 14,
        bold: true,
        alignment: 'center' as const,
        background: '#FEE2E2',
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
      statusAguardando: {
        fontSize: 14,
        bold: true,
        color: '#D97706',
        alignment: 'center' as const,
        background: '#FEF3C7',
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };

  return doc;
}
