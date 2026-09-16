// DinamometriaTemplate.ts
// Template PDF para Dinamometria - atualizado para interface DinamometriaData
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';
import * as fs from 'fs';
import * as path from 'path';

interface DinamometriaData {
  // Dados do exame
  profissional: string;

  // Dados do Paciente
  ladoDominante: string;
  sexo: string;

  // Dinamometria Palmar - Força de Preensão Manual
  palmarDireita1: string;
  palmarDireita2: string;
  palmarDireita3: string;
  palmarDireitaMedia: string;
  palmarEsquerda1: string;
  palmarEsquerda2: string;
  palmarEsquerda3: string;
  palmarEsquerdaMedia: string;
  classificacaoPalmar: string;

  // Dinamometria Escapular - Força de Membros Superiores
  escapularDireita1: string;
  escapularDireita2: string;
  escapularDireita3: string;
  escapularDireitaMedia: string;
  escapularEsquerda1: string;
  escapularEsquerda2: string;
  escapularEsquerda3: string;
  escapularEsquerdaMedia: string;
  classificacaoEscapular: string;

  // Dinamometria Dorsal - Força de Tronco
  dorsal1: string;
  dorsal2: string;
  dorsal3: string;
  dorsalMedia: string;
  classificacaoDorsal: string;

  // Resultado e Observações
  resultado: string;
  observacoesFinais: string;
}

export async function gerarDocDinamometria(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#0D47A1';
  const LIGHT_TEXT = '#333333';
  const ATTENTION_COLOR = '#F57C00';
  const NORMAL_COLOR = '#388E3C';
  const ALTERADO_COLOR = '#F57C00';

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

  const VERMELHO = '#B71C1C';
  const AZUL = '#0D47A1';

  // const dinamometria = EXAMES?.find((e: any) => e.grupo === 'Dinamometria');

  // Filtra todos os exames que pertencem ao grupo Dinamometria
  const examesDinamometria =
    EXAMES?.filter((e: any) => e.grupo === 'Dinamometria') || [];

  // Mescla todos os formulários em um único objeto 'form'
  // Isso garante que se o dado escapular estiver em um objeto e o palmar em outro,
  // todos estarão disponíveis na interface DinamometriaData
  const form: DinamometriaData = examesDinamometria.reduce(
    (acc: any, exame: any) => {
      return { ...acc, ...exame.formulario };
    },
    {},
  );

  // Mantém a referência de um profissional (usando o do primeiro exame do grupo)
  const dinamometria = examesDinamometria[0];

  // const form: DinamometriaData = dinamometria?.formulario || {};
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
  let assinaturaMedico = await getImageBase64(ASSINATURAS_URL[codigo]);
  // fallback caso não tenha assinatura
  if (!assinaturaMedico)
    assinaturaMedico = await getImageBase64(
      'https://engemedical.com.br/images/logo.png',
    );

  // Função para verificar se um tipo de dinamometria foi preenchido
  const isPalmarPreenchido = () => {
    return (
      form.palmarDireita1 ||
      form.palmarDireita2 ||
      form.palmarDireita3 ||
      form.palmarEsquerda1 ||
      form.palmarEsquerda2 ||
      form.palmarEsquerda3
    );
  };

  const isEscapularPreenchido = () => {
    return (
      form.escapularDireita1 ||
      form.escapularDireita2 ||
      form.escapularDireita3 ||
      form.escapularEsquerda1 ||
      form.escapularEsquerda2 ||
      form.escapularEsquerda3
    );
  };

  const isDorsalPreenchido = () => {
    return form.dorsal1 || form.dorsal2 || form.dorsal3;
  };

  // ======= DINAMOMETRIA PALMAR =======
  const dinamometriaPalmarGrid = [
    [
      { text: 'Lado', style: 'tableHeader', alignment: 'center' },
      { text: '1ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'Média (kgf)', style: 'tableHeader', alignment: 'center' },
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

  // ======= DINAMOMETRIA ESCAPULAR (ATUALIZADA PARA LADO DIREITO E ESQUERDO) =======
  const dinamometriaEscapularGrid = [
    [
      { text: 'Lado', style: 'tableHeader', alignment: 'center' },
      { text: '1ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'Média (kgf)', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: 'Direito', style: 'tableLabel', alignment: 'center' },
      { text: form.escapularDireita1 || '-', alignment: 'center' },
      { text: form.escapularDireita2 || '-', alignment: 'center' },
      { text: form.escapularDireita3 || '-', alignment: 'center' },
      {
        text: form.escapularDireitaMedia || '-',
        alignment: 'center',
        bold: true,
      },
    ],
    [
      { text: 'Esquerdo', style: 'tableLabel', alignment: 'center' },
      { text: form.escapularEsquerda1 || '-', alignment: 'center' },
      { text: form.escapularEsquerda2 || '-', alignment: 'center' },
      { text: form.escapularEsquerda3 || '-', alignment: 'center' },
      {
        text: form.escapularEsquerdaMedia || '-',
        alignment: 'center',
        bold: true,
      },
    ],
  ];

  // ======= DINAMOMETRIA DORSAL =======
  const dinamometriaDorsalGrid = [
    [
      { text: '1ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '2ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: '3ª Medida', style: 'tableHeader', alignment: 'center' },
      { text: 'Média (kgf)', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: form.dorsal1 || '-', alignment: 'center' },
      { text: form.dorsal2 || '-', alignment: 'center' },
      { text: form.dorsal3 || '-', alignment: 'center' },
      { text: form.dorsalMedia || '-', alignment: 'center', bold: true },
    ],
  ];

  // Array para armazenar as seções que serão exibidas
  const sections: any[] = [];

  // Adiciona apenas as seções que foram preenchidas
  if (isPalmarPreenchido()) {
    sections.push(
      createGridSection('Dinamometria Palmar', dinamometriaPalmarGrid, {
        fontSize: 9,
      }),
    );
  }

  if (isEscapularPreenchido()) {
    sections.push(
      createGridSection('Dinamometria Escapular', dinamometriaEscapularGrid, {
        fontSize: 9,
      }),
    );
  }

  if (isDorsalPreenchido()) {
    sections.push(
      createGridSection('Dinamometria Dorsal', dinamometriaDorsalGrid, {
        fontSize: 9,
      }),
    );
  }

  // Seção de resultados individuais
  const resultadosIndividuais: any[] = [];

  if (isPalmarPreenchido() && form.classificacaoPalmar) {
    const cor =
      form.classificacaoPalmar === 'Normal' ? NORMAL_COLOR : ALTERADO_COLOR;
    resultadosIndividuais.push({
      text: `• Dinamometria Palmar: ${form.classificacaoPalmar}`,
      color: cor,
      bold: form.classificacaoPalmar !== 'Normal',
      margin: [0, 2, 0, 2],
    });
  }

  if (isEscapularPreenchido() && form.classificacaoEscapular) {
    const cor =
      form.classificacaoEscapular === 'Normal' ? NORMAL_COLOR : ALTERADO_COLOR;
    resultadosIndividuais.push({
      text: `• Dinamometria Escapular: ${form.classificacaoEscapular}`,
      color: cor,
      bold: form.classificacaoEscapular !== 'Normal',
      margin: [0, 2, 0, 2],
    });
  }

  if (isDorsalPreenchido() && form.classificacaoDorsal) {
    const cor =
      form.classificacaoDorsal === 'Normal' ? NORMAL_COLOR : ALTERADO_COLOR;
    resultadosIndividuais.push({
      text: `• Dinamometria Dorsal: ${form.classificacaoDorsal}`,
      color: cor,
      bold: form.classificacaoDorsal !== 'Normal',
      margin: [0, 2, 0, 2],
    });
  }

  // Adicionar resultado final se disponível
  if (form.resultado) {
    const resultadoCor =
      form.resultado === 'Normal' ? NORMAL_COLOR : ALTERADO_COLOR;
    resultadosIndividuais.push({
      text: `• Resultado Final: ${form.resultado}`,
      color: resultadoCor,
      bold: form.resultado !== 'Normal',
      margin: [0, 2, 0, 2],
    });
  }

  return {
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
                text: 'DINAMOMETRIA',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}`,
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
                text: `${UNIDADEATENDIMENTO}, ${new Date().toLocaleDateString('pt-br')}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // ===== CABEÇALHO =====
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

      // ===== DADOS DO EXAME =====
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                stack: [
                  {
                    text: 'Dados do Exame',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: `Lado Dominante: ${form.ladoDominante || 'N/D'}`,
                    bold: true,
                  },
                  {
                    text: `Sexo: ${form.sexo || 'N/D'}`,
                    color:
                      form.sexo && form.sexo.includes('Fem') ? VERMELHO : AZUL,
                  },
                ],
              },
              {
                stack: [
                  {
                    text: 'Técnica Utilizada',
                    style: 'sectionTitle',
                    margin: [0, 0, 0, 5],
                  },
                  { text: 'Protocolo de 3 repetições' },
                  { text: 'Média das 3 medidas' },
                ],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15],
      },

      // ===== SEÇÕES DINAMOMETRIA (APENAS AS PREENCHIDAS) =====
      ...sections,

      // ===== RESULTADOS INDIVIDUAIS =====
      {
        stack: [
          {
            text: 'Resultados',
            style: 'sectionTitle',
            margin: [0, 15, 0, 8],
          },
          ...resultadosIndividuais,
        ],
        margin: [0, 10, 0, 0],
      },

      // ===== RESULTADO FINAL E OBSERVAÇÕES =====
      {
        stack: [
          {
            text: 'Observações:',
            style: 'sectionTitle',
            margin: [0, 10, 0, 5],
          },
          {
            text: form.observacoesFinais || '',
            fontSize: 10,
            margin: [0, 0, 0, 20],
          },
        ],
      },
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: dinamometria?.profissional || profissional?.nome,
        profissional:
          dinamometria?.profissional ||
          profissional?.profissional ||
          profissional?.nome,
      },
      NOME,
      CPFFUNCIONARIO,
      '',
      UNIDADEATENDIMENTO,
      assinaturaMedico,
      assinaturaDigitalObrigatoria,
    ),

    styles: {
      mainTitle: { fontSize: 16, bold: true, color: PRIMARY },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: PRIMARY,
        margin: [0, 3, 0, 4],
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        fillColor: '#F5F5F5',
        color: PRIMARY,
      },
      tableLabel: {
        fontSize: 9,
        bold: true,
        color: LIGHT_TEXT,
      },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
