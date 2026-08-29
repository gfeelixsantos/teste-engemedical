import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { getRestricoesCompletas } from '../ClinicoRestricoes';

interface RegistroPa {
  valor: string;
  horario: string;
  profissional: string;
}

interface RestricoesMedicas {
  evitarCarregarPeso: boolean;
  pesoMaximoKg?: string;
  evitarElevacaoBracos: boolean;
  tipoElevacaoBracos?: 'direito' | 'esquerdo' | 'ambos';
  evitarCurvarTronco: boolean;
  evitarEscadas: boolean;
  evitarLongasCaminhadas: boolean;
  evitarAlterarPostura: boolean;
  outros: boolean;
  descricaoOutros?: string;
}

export interface FichaClinicaData {
  // Anamnese
  doencasFamiliares: string[];
  doencasPessoais: string[];
  afastamento: string;
  observacaoAfastamento: string;

  // H├íbitos
  tabagismo: string;
  etilismo: string;
  atividadeFisica: string;
  acimaPeso: string;
  ultimaMenstruacao: string;

  // Aptid├Áes funcionais
  trabalhoAltura: string;
  trabalhoEspacoConfinado: string;
  capacidadeCarregarPeso: string;
  aptoOperarVeiculos: string;

  // Exame cl├¡nico
  cabecaPescoco: string;
  torax: string;
  abdome: string;
  coluna: string;
  membrosSuperiores: string;
  membrosInferiores: string;

  // Dados vitais
  pressaoArterial: RegistroPa[];
  peso: string;
  altura: string;
  imc: string;
  resultadoImc: string;

  // Conclus├úo
  conclusao: string;
  observacoesMedicas: string;
  codigoMedico: string;
  medico: string;

  // Novos campos para observa├º├Áes
  observacoesDoencasPessoais: string;

  // Novos campos para restri├º├Áes
  restricoes?: RestricoesMedicas;
  duracaoRestricaoDias?: string;
  dataInicioRestricao?: string;

  // Novo campo para aguardar avalia├º├úo
  informacaoAguardarAvaliacao?: string;
}

export async function gerarDocExameClinico(
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
  } = asoData;

  const { cpf, conselho, ufconselho, codigo } = profissional;

  const exameClinico = EXAMES?.find((e: any) => {
    // Verifica se a chave do grupo do exame existe como propriedade em EXAMES_LIST
    return Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo);
  });

  const form: FichaClinicaData = exameClinico?.formulario || {};
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

  // ======= GRID DE H├üBITOS E ATIVIDADES 4x4 =======
  const habitosGrid = [
    ['Tabagismo', form.tabagismo || 'N/D', 'Etilismo', form.etilismo || 'N/D'],
    [
      'Atividade F├¡sica',
      form.atividadeFisica || 'N/D',
      'Acima do Peso',
      form.acimaPeso || 'N/D',
    ],
    [
      'Trabalho em Altura',
      form.trabalhoAltura || 'N/D',
      'Espa├ºo Confinado',
      form.trabalhoEspacoConfinado || 'N/D',
    ],
    [
      'Apto a Ve├¡culos',
      form.aptoOperarVeiculos || 'N/D',
      'Carregar Peso',
      form.capacidadeCarregarPeso || 'N/D',
    ],
    form.ultimaMenstruacao != ''
      ? ['├Ültima Menstrua├º├úo', form.ultimaMenstruacao || 'N/D', '', '']
      : ['', '', '', ''],
  ];

  // ======= GRID DE EXAME F├ìSICO 3x4 =======
  const exameFisicoGrid = [
    [
      'Cabe├ºa e Pesco├ºo',
      form.cabecaPescoco || 'N/D',
      'T├│rax',
      form.torax || 'N/D',
    ],
    ['Abdome', form.abdome || 'N/D', 'Coluna', form.coluna || 'N/D'],
    [
      'Membros Superiores',
      form.membrosSuperiores || 'N/D',
      'Membros Inferiores',
      form.membrosInferiores || 'N/D',
    ],
  ];

  // ======= GRID DADOS VITAIS =======
  const pressaoRows = form.pressaoArterial?.map((p: any) => [
    `Press├úo`,
    p.valor,
    'Hor├írio',
    `${p.horario}`,
  ]) || [['Press├úo Arterial', 'N/D']];
  const dadosVitaisGrid = [
    ['Peso (kg)', form.peso || 'N/D', 'Altura (m)', form.altura || 'N/D'],
    [
      'IMC',
      `${form.imc || 'N/D'}`,
      'Resultado IMC',
      `${form.resultadoImc || 'N/D'}`,
    ],
    ...pressaoRows.map((r) => [r[0], r[1], r[2], r[3]]),
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
                text: 'FICHA CL├ìNICA OCUPACIONAL',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}:   ${form.conclusao.toUpperCase()}`,
                margin: [0, 0, 0, 0],
              },

              // campo de orienta├º├úo para parecer - aguardar avalia├º├úo
              form.informacaoAguardarAvaliacao != ''
                ? {
                    text: form.informacaoAguardarAvaliacao,
                    margin: [0, 0, 0, 0],
                    color: ATTENTION_COLOR,
                  }
                : { text: '', margin: [0, 0, 0, 0] },

              // Restri├º├Áes
              ...getRestricoesCompletas(form),
            ].filter((item) => item !== false && item.text !== ''), // Remove elementos vazios,
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
      createGridSection(
        'Anamnese e Hist├│rico Familiar',
        [
          ['Doen├ºas Familiares', form.doencasFamiliares?.join(', ') || 'N/D'],
          ['Doen├ºas Pessoais', form.doencasPessoais?.join(', ') || 'N/D'],
          ['Observa├º├úo m├®dica', form.observacoesDoencasPessoais || '-'],
          ['Afastamento > 15 dias', form.afastamento || 'N/D'],
          ['Relato', form.observacaoAfastamento || '-'],
        ],
        { fontSize: 9 },
      ),
      createGridSection('H├íbitos e Atividade', habitosGrid, { fontSize: 9 }),
      createGridSection('Exame F├¡sico', exameFisicoGrid, { fontSize: 9 }),
      createGridSection('Dados Vitais e Antropometria', dadosVitaisGrid, {
        fontSize: 9,
      }),
      // this.createGridSection('5. Conclus├úo M├®dica', conclusaoGrid),

      // Observa├º├Áes m├®dicas
      {
        text: form.observacoesMedicas || '-',
        alignment: 'justify',
        italics: true,
        margin: [0, 0, 0, 10],
      },

      // Parecer m├®dico destacado
      {
        text: `Conclus├úo: ${form.conclusao.toUpperCase()}` || 'PENDENTE', // ex: "APTO" ou "INAPTO"
        alignment: 'left',
        bold: true,
        fontSize: 12,
        color: form.conclusao?.toLowerCase() === 'inapto' ? '#B71C1C' : PRIMARY,
        margin: [0, 0, 0, 20],
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
                text: exameClinico?.profissional || 'N/D',
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
