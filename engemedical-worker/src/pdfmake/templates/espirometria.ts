// Template PDF para Espirometria
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';

interface EspirometriaData {
  // Histórico Respiratório e Tabagismo
  tabagismo: boolean;
  tempoParouFumar: string;
  quantidadeCigarrosDia: string;
  fumouHoje: string;

  // Sintomas Respiratórios
  tossePigarroManha: string;
  catarroHabitual: string;
  sibilancia: string;
  faltaArEsforco: string;

  // Doenças Pulmonares e Outras Condições
  doencaPulmonar: string;
  asma: string;
  medicacaoAsma: string;
  cirurgiaToraxPulmao: string;
  doencaCardiacaHipertensao: string;
  proteseDentaria: string;

  // Histórico Ocupacional e Exposição
  exposicaoPoeiraFumaca: string;
  descricaoExposicao: string;
  exposicaoAtual: string;

  // Observações
  observacoes: string;
}

export async function gerarDocEspirometria(
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

  const espirometria = EXAMES?.find((e: any) => e.grupo === 'Espirometria');

  const form: EspirometriaData = espirometria?.formulario || {};

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

  // ======= HISTÓRICO RESPIRATÓRIO E TABAGISMO =======
  const tabagismoTexto = form.tabagismo ? 'Sim' : 'Não';

  const historicoTabagismoGrid = [
    ['Você fuma ou já fumou cigarros?', tabagismoTexto],
  ];

  // Adicionar linhas condicionais para tabagismo
  if (form.tabagismo) {
    historicoTabagismoGrid.push(
      ['Quantidade média diária', form.quantidadeCigarrosDia || '-'],
      ['Tempo desde que parou de fumar', form.tempoParouFumar || '-'],
      ['Fumou hoje? Há quanto tempo?', form.fumouHoje || '-'],
    );
  }

  // ======= SINTOMAS RESPIRATÓRIOS - 2 COLUNAS =======
  const sintomasRespiratoriosGrid = [
    ['Tosse ou pigarro frequente pela manhã?', form.tossePigarroManha || 'N/D'],
    ['Produz catarro habitualmente?', form.catarroHabitual || 'N/D'],
    ['Seu peito chia com frequência (sibilância)?', form.sibilancia || 'N/D'],
    ['Sente falta de ar com esforço leve?', form.faltaArEsforco || 'N/D'],
  ];

  // ======= DOENÇAS PULMONARES E CONDIÇÕES - 2 COLUNAS =======
  const doencasCondicoesGrid = [
    [
      'Já teve alguma doença pulmonar diagnosticada (ex: bronquite, DPOC)?',
      form.doencaPulmonar || 'N/D',
    ],
    ['Tem ou teve asma?', form.asma || 'N/D'],
    [
      'Faz uso atual de medicação para asma ou respiração?',
      form.medicacaoAsma || 'N/D',
    ],
    [
      'Já realizou cirurgia no tórax ou pulmão?',
      form.cirurgiaToraxPulmao || 'N/D',
    ],
    [
      'Tem alguma doença cardíaca ou hipertensão?',
      form.doencaCardiacaHipertensao || 'N/D',
    ],
    ['Usa prótese dentária?', form.proteseDentaria || 'N/D'],
  ];

  // ======= HISTÓRICO OCUPACIONAL =======
  const historicoOcupacionalGrid = [
    [
      'Já trabalhou em ambiente com poeira, fumaça ou vapores químicos por um ano ou mais?',
      form.exposicaoPoeiraFumaca || 'N/D',
    ],
  ];

  // Adicionar descrição da exposição se aplicável
  if (form.exposicaoPoeiraFumaca === 'Sim') {
    historicoOcupacionalGrid.push(
      [
        'Descrição da atividade de exposição',
        form.descricaoExposicao || 'Não informada',
      ],
      [
        'Atualmente trabalha exposto a esses agentes?',
        form.exposicaoAtual || 'N/D',
      ],
    );
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
                text: 'ANAMNESE RESPIRATÓRIA',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              { text: `${TIPOEXAMENOME}`, margin: [0, 0, 0, 0] },
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
                text: `CPF: ${formatCPF(CPFFUNCIONARIO)}   Nascimento: ${DATANASCIMENTO || 'N/D'}   Idade: ${idade} anos`,
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
                    text: `CNPJ: ${CNPJEMPRESA || 'N/D'}   Cargo: ${NOMECARGO || 'N/D'}   Setor: ${NOMESETOR || 'N/D'}`,
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

      // ===== HISTÓRICO RESPIRATÓRIO E TABAGISMO =====
      createGridSection(
        'Histórico Respiratório e Tabagismo',
        historicoTabagismoGrid,
        { fontSize: 8 },
      ),

      // ===== SINTOMAS RESPIRATÓRIOS =====
      createGridSection('Sintomas Respiratórios', sintomasRespiratoriosGrid, {
        fontSize: 8,
      }),

      // ===== DOENÇAS PULMONARES E CONDIÇÕES =====
      createGridSection(
        'Doenças Pulmonares e Condições Associadas',
        doencasCondicoesGrid,
        { fontSize: 8 },
      ),

      // ===== HISTÓRICO OCUPACIONAL =====
      createGridSection(
        'Histórico Ocupacional e Exposição',
        historicoOcupacionalGrid,
        { fontSize: 8 },
      ),

      // ===== OBSERVAÇÕES =====
      form.observacoes
        ? {
            stack: [
              {
                text: 'Observações:',
                style: 'tableLabel',
                margin: [0, 0, 0, 3],
              },
              {
                text: form.observacoes,
                fontSize: 9,
                alignment: 'justify',
                margin: [0, 0, 0, 15],
                italics: true,
              },
            ],
            margin: [30, 0, 0, 5],
          }
        : { text: '', margin: [0, 0, 0, 15] },
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: espirometria?.profissional || profissional?.nome,
        profissional:
          espirometria?.profissional ||
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
        margin: [0, 3, 0, 4],
      },
      tableHeader: { bold: true, fillColor: '#E8EAF6', color: PRIMARY },
      tableLabel: { bold: true, color: LIGHT_TEXT },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
