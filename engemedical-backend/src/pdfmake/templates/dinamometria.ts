// Template PDF para Dinamometria - atualizado para interface DinamometriaData
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';

interface DinamometriaData {
  // Dados do exame
  profissional: string;

  // Dados do Paciente
  ladoDominante: string;
  sexo: string;

  // Dinamometria Palmar - For├ºa de Preens├úo Manual
  palmarDireita1: string;
  palmarDireita2: string;
  palmarDireita3: string;
  palmarDireitaMedia: string;
  palmarEsquerda1: string;
  palmarEsquerda2: string;
  palmarEsquerda3: string;
  palmarEsquerdaMedia: string;
  classificacaoPalmar: string;

  // Dinamometria Escapular - For├ºa de Membros Superiores
  escapular1: string;
  escapular2: string;
  escapular3: string;
  escapularMedia: string;
  classificacaoEscapular: string;

  // Dinamometria Dorsal - For├ºa de Tronco
  dorsal1: string;
  dorsal2: string;
  dorsal3: string;
  dorsalMedia: string;
  classificacaoDorsal: string;

  // Resultado e Observa├º├Áes
  resultado: string;
  observacoesFinais: string;
}

export async function gerarDocDinamometria(
  asoData: any,
  profissional: any,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#114E34';
  const LIGHT_TEXT = '#333333';
  const ATTENTION_COLOR = '#F57C00';

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

  const dinamometria = EXAMES?.find((e: any) =>
    Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo),
  );

  const form: DinamometriaData = dinamometria?.formulario || {};
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
  const assinaturaMedico = await getImageBase64(ASSINATURAS_URL[codigo]);

  // ======= DINAMOMETRIA PALMAR =======
  const dinamometriaPalmarGrid = [
    [
      { text: 'Lado', style: 'tableHeader', alignment: 'center' },
      { text: '1┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'M├®dia (kgf)', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: 'Direito', style: 'tableLabel', alignment: 'center' },
      { text: form.palmarDireita1 || '-', alignment: 'center' },
      { text: form.palmarDireita2 || '-', alignment: 'center' },
      { text: form.palmarDireita3 || '-', alignment: 'center' },
      { text: form.palmarDireitaMedia || '-', alignment: 'center', bold: true },
    ],
    [
      { text: 'Esquerdo', style: 'tableLabel', alignment: 'center' },
      { text: form.palmarEsquerda1 || '-', alignment: 'center' },
      { text: form.palmarEsquerda2 || '-', alignment: 'center' },
      { text: form.palmarEsquerda3 || '-', alignment: 'center' },
      {
        text: form.palmarEsquerdaMedia || '-',
        alignment: 'center',
        bold: true,
      },
    ],
  ];

  // ======= DINAMOMETRIA ESCAPULAR =======
  const dinamometriaEscapularGrid = [
    [
      { text: '1┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'M├®dia (kgf)', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: form.escapular1 || '-', alignment: 'center' },
      { text: form.escapular2 || '-', alignment: 'center' },
      { text: form.escapular3 || '-', alignment: 'center' },
      { text: form.escapularMedia || '-', alignment: 'center', bold: true },
    ],
  ];

  // ======= DINAMOMETRIA DORSAL =======
  const dinamometriaDorsalGrid = [
    [
      { text: '1┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3┬¬ Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'M├®dia (kgf)', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: form.dorsal1 || '-', alignment: 'center' },
      { text: form.dorsal2 || '-', alignment: 'center' },
      { text: form.dorsal3 || '-', alignment: 'center' },
      { text: form.dorsalMedia || '-', alignment: 'center', bold: true },
    ],
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 35, 40, 45],

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
      // ===== T├ìTULO =====
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'DINAMOMETRIA',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}:   ${form.observacoesFinais}`,
                margin: [0, 0, 0, 0],
              },
            ],
          },
          {
            stack: [
              logoEmpresa
                ? { image: logoEmpresa, width: 120, alignment: 'right' }
                : { text: '', width: 90 },
              {
                text: `${UNIDADEATENDIMENTO}, ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5], // espa├ºamento abaixo
      },

      // ===== CABE├çALHO =====
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `${NOME || 'N/D'}`, bold: true, fontSize: 11 },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nascimento: ${
                  DATANASCIMENTO || 'N/D'
                }   Idade: ${idade} anos`,
                fontSize: 10,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 8],
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
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}   Cargo: ${
                      NOMECARGO || 'N/D'
                    }   Setor: ${NOMESETOR || 'N/D'}`,
                    fontSize: 10,
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

      // ===== SE├ç├òES EM GRID =====
      createGridSection('Dinamometria Palmar', dinamometriaPalmarGrid, {
        fontSize: 9,
      }),
      createGridSection('Dinamometria Escapular', dinamometriaEscapularGrid, {
        fontSize: 9,
      }),
      createGridSection('Dinamometria Dorsal', dinamometriaDorsalGrid, {
        fontSize: 9,
      }),

      // Parecer m├®dico destacado
      {
        text: `Resultado: ${form.observacoesFinais}` || 'PENDENTE',
        alignment: 'center',
        bold: true,
        fontSize: 12,
        color: form.observacoesFinais.toLowerCase().includes('fora')
          ? ATTENTION_COLOR
          : PRIMARY,
        margin: [25, 0, 0, 25],
      },

      // ===== ASSINATURAS =====
      {
        columns: [
          // Coluna do m├®dico ÔÇö alinhada ├á esquerda
          {
            width: '50%',
            stack: [
              assinaturaMedico
                ? {
                    image: assinaturaMedico,
                    width: 100,
                    alignment: 'left',
                    margin: [0, 0, 0, 5],
                  }
                : { text: '', margin: [0, 0, 0, 5] },
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
                text: dinamometria?.profissional || 'N/D',
                fontSize: 8,
                alignment: 'left',
              },
              {
                text: `CRM: ${conselho} / ${ufconselho}`,
                fontSize: 8,
                alignment: 'left',
              },
              {
                text: `CPF: ${formatCPF(cpf)}`,
                fontSize: 8,
                alignment: 'left',
              },
            ],
          },

          // Coluna do funcion├írio ÔÇö alinhada ├á direita
          {
            width: '50%',
            stack: [
              {
                text: `O(A) paciente/funcion├írio(a) atesta a realiza├º├úo da consulta/exame em ${new Date().toLocaleString('pt-BR')}, e est├í ciente da finalidade de sa├║de ocupacional e legal deste documento. Confirma o aceite dos termos atrav├®s da autentica├º├úo biom├®trica registrada no sistema SOC, conforme o Termo de Ciência e Registro de Aceite para Uso de Biometria.`,
                fontSize: 6,
                italics: true,
                alignment: 'right',
                margin: [0, 0, 0, 5],
              },
              { text: NOME, fontSize: 8, alignment: 'right' },
              {
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`,
                fontSize: 8,
                alignment: 'right',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 0],
      },
    ],

    footer: {
      columns: [
        {
          text: `Processado em ${new Date().toLocaleString(
            'pt-BR',
          )} ÔÇô Centro M├®dico de Sa├║de Ocupacional - ${UNIDADEATENDIMENTO}`,
          alignment: 'left',
          fontSize: 6,
          color: '#555',
          margin: [40, 10, 40, 0],
        },
      ],
    },

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: PRIMARY },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: PRIMARY,
        margin: [0, 3, 0, 4],
      },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
