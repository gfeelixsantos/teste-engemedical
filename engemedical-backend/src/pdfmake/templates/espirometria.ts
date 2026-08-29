// Template PDF para Espirometria
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';

export async function gerarDocEspirometria(
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

  const espirometria = EXAMES?.find((e: any) => {
    // Verifica se a chave do grupo do exame existe como propriedade em EXAMES_LIST
    return Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo);
  });
  const form = espirometria?.formulario || {};

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

  // ======= HIST├ôRICO RESPIRAT├ôRIO E TABAGISMO =======
  const tabagismoTexto = form.tabagismo ? 'Sim' : 'N├úo';

  const historicoTabagismoGrid = [
    ['Voc├¬ fuma ou j├í fumou cigarros?', tabagismoTexto],
  ];

  // Adicionar linhas condicionais para tabagismo
  if (form.tabagismo) {
    historicoTabagismoGrid.push(
      ['Quantidade m├®dia di├íria', form.quantidadeCigarrosDia || '-'],
      ['Tempo desde que parou de fumar', form.tempoParouFumar || '-'],
      ['Fumou hoje? Se sim, h├í quanto tempo?', form.fumouHoje || '-'],
    );
  }

  // ======= SINTOMAS RESPIRAT├ôRIOS - 2 COLUNAS =======
  const sintomasRespiratoriosGrid = [
    [
      'Tosse ou pigarro frequente pela manh├ú?',
      form.tossePigarroManha || 'N/D',
    ],
    ['Produz catarro habitualmente?', form.catarroHabitual || 'N/D'],
    ['Seu peito chia com frequ├¬ncia (sibil├óncia)?', form.sibilancia || 'N/D'],
    ['Sente falta de ar com esfor├ºo leve?', form.faltaArEsforco || 'N/D'],
  ];

  // ======= DOEN├çAS PULMONARES E CONDI├ç├òES - 2 COLUNAS =======
  const doencasCondicoesGrid = [
    [
      'J├í teve alguma doen├ºa pulmonar diagnosticada (ex: bronquite, DPOC)?',
      form.doencaPulmonar || 'N/D',
    ],
    ['Tem ou teve asma?', form.asma || 'N/D'],
    [
      'Faz uso atual de medica├º├úo para asma ou respira├º├úo?',
      form.medicacaoAsma || 'N/D',
    ],
    [
      'J├í realizou cirurgia no t├│rax ou pulm├úo?',
      form.cirurgiaToraxPulmao || 'N/D',
    ],
    [
      'Tem alguma doen├ºa card├¡aca ou hipertens├úo?',
      form.doencaCardiacaHipertensao || 'N/D',
    ],
    ['Usa pr├│tese dent├íria?', form.proteseDentaria || 'N/D'],
  ];

  // ======= HIST├ôRICO OCUPACIONAL =======
  const historicoOcupacionalGrid = [
    [
      'J├í trabalhou em ambiente com poeira, fuma├ºa ou vapores qu├¡micos por um ano ou mais?',
      form.exposicaoPoeiraFumaca || 'N/D',
    ],
  ];

  // Adicionar descri├º├úo da exposi├º├úo se aplic├ível
  if (form.exposicaoPoeiraFumaca === 'Sim') {
    historicoOcupacionalGrid.push(
      [
        'Descri├º├úo da atividade de exposi├º├úo',
        form.descricaoExposicao || 'N├úo informada',
      ],
      [
        'Atualmente trabalha exposto a esses agentes?',
        form.exposicaoAtual || 'N/D',
      ],
    );
  }

  // Processar observa├º├Áes (separar autom├íticas e manuais)
  const processarObservacoes = () => {
    const observacoesCompletas = form.observacoes || '';

    // Verificar se h├í observa├º├Áes autom├íticas separadas
    if (observacoesCompletas.includes('--- Observa├º├Áes Autom├íticas ---')) {
      const partes = observacoesCompletas.split(
        '--- Observa├º├Áes Autom├íticas ---',
      );
      return {
        manuais: partes[0].trim(),
        automaticas: partes[1].trim(),
      };
    }

    // Se n├úo h├í separa├º├úo expl├¡cita, considerar tudo como manual
    // e gerar observa├º├Áes autom├íticas novamente para o PDF
    return {
      manuais: observacoesCompletas,
      automaticas: gerarObservacoesAutomaticasPDF(form),
    };
  };

  const observacoesProcessadas = processarObservacoes();

  return {
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
      // ===== T├ìTULO =====
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'ANAMNESE RESPIRAT├ôRIA',
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
                text: `${UNIDADEATENDIMENTO}, ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // ===== CABE├çALHO =====
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

      // ===== HIST├ôRICO RESPIRAT├ôRIO E TABAGISMO =====
      createGridSection(
        'Hist├│rico Respirat├│rio e Tabagismo',
        historicoTabagismoGrid,
        { fontSize: 8 },
      ),

      // ===== SINTOMAS RESPIRAT├ôRIOS =====
      createGridSection('Sintomas Respirat├│rios', sintomasRespiratoriosGrid, {
        fontSize: 8,
      }),

      // ===== DOEN├çAS PULMONARES E CONDI├ç├òES =====
      createGridSection(
        'Doen├ºas Pulmonares e Condi├º├Áes Associadas',
        doencasCondicoesGrid,
        { fontSize: 8 },
      ),

      // ===== HIST├ôRICO OCUPACIONAL =====
      createGridSection(
        'Hist├│rico Ocupacional e Exposi├º├úo',
        historicoOcupacionalGrid,
        { fontSize: 8 },
      ),

      // ===== OBSERVA├ç├òES =====
      {
        text: '5. Observa├º├Áes',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },

      // Observa├º├Áes Autom├íticas
      observacoesProcessadas.automaticas
        ? {
            stack: [
              {
                text: 'Observa├º├Áes Autom├íticas:',
                style: 'tableLabel',
                margin: [0, 0, 0, 3],
              },
              {
                text: observacoesProcessadas.automaticas,
                fontSize: 9,
                alignment: 'justify',
                margin: [0, 0, 0, 8],
                color: '#1E40AF',
              },
            ],
            margin: [0, 0, 0, 5],
          }
        : { text: '', margin: [0, 0, 0, 5] },

      // Observa├º├Áes Manuais
      observacoesProcessadas.manuais
        ? {
            stack: [
              {
                text: 'Observa├º├Áes do Avaliador:',
                style: 'tableLabel',
                margin: [0, 0, 0, 3],
              },
              {
                text: observacoesProcessadas.manuais,
                fontSize: 9,
                alignment: 'justify',
                margin: [0, 0, 0, 15],
                italics: true,
              },
            ],
            margin: [0, 0, 0, 5],
          }
        : { text: '', margin: [0, 0, 0, 15] },

      // ===== ASSINATURAS =====
      {
        columns: [
          {
            width: '50%',
            stack: [
              assinaturaProfissional
                ? {
                    image: assinaturaProfissional,
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
                text: espirometria?.profissional || 'N/D',
                fontSize: 8,
                alignment: 'left',
              },
              {
                text: `Registro: ${conselho || 'N/D'}`,
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
          {
            width: '50%',
            stack: [
              {
                text: `O(A) paciente/funcion├írio(a) atesta a realiza├º├úo da avalia├º├úo respirat├│ria em ${new Date().toLocaleString('pt-BR')}, e est├í ciente da finalidade de sa├║de ocupacional e legal deste documento. Confirma o aceite dos termos atrav├®s da autentica├º├úo biom├®trica/assinatura eletr├┤nica registrada no sistema SOC, conforme o Termo de Ciência e Registro de Aceite para Uso de Biometria.`,
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
          text: `${CODIGOPRONTUARIO} Processado em ${new Date().toLocaleString('pt-BR')} ÔÇô Centro M├®dico de Sa├║de Ocupacional - ${UNIDADEATENDIMENTO}`,
          alignment: 'left',
          fontSize: 6,
          color: '#555',
          margin: [35, 10, 35, 0],
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
      tableHeader: { bold: true, fillColor: '#E8EAF6', color: PRIMARY },
      tableLabel: { bold: true, color: LIGHT_TEXT },
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}

// Fun├º├úo para gerar observa├º├Áes autom├íticas para o PDF
function gerarObservacoesAutomaticasPDF(form: any): string {
  const observacoes: string[] = [];

  // Verificar tabagismo
  if (form.tabagismo) {
    let tabagismoInfo = 'Paciente com hist├│rico de tabagismo';

    if (
      form.quantidadeCigarrosDia &&
      form.quantidadeCigarrosDia !== 'N├úo se aplica'
    ) {
      tabagismoInfo += ` (${form.quantidadeCigarrosDia.toLowerCase()})`;
    }

    if (form.tempoParouFumar) {
      tabagismoInfo += `, parou h├í ${form.tempoParouFumar}`;
    }

    if (form.fumouHoje) {
      tabagismoInfo += `, fumou h├í ${form.fumouHoje}`;
    }

    observacoes.push(tabagismoInfo);
  }

  // Verificar sintomas respirat├│rios
  const sintomasRespiratorios = [
    { campo: form.tossePigarroManha, descricao: 'tosse/pigarro matinal' },
    { campo: form.catarroHabitual, descricao: 'catarro habitual' },
    { campo: form.sibilancia, descricao: 'sibil├óncia' },
    { campo: form.faltaArEsforco, descricao: 'dispneia aos esfor├ºos' },
  ].filter((sintoma) => sintoma.campo === 'Sim');

  if (sintomasRespiratorios.length > 0) {
    const sintomasDesc = sintomasRespiratorios
      .map((s) => s.descricao)
      .join(', ');
    observacoes.push(`Relata ${sintomasDesc}`);
  }

  // Verificar doen├ºas pulmonares
  const condicoesMedicas = [
    { campo: form.doencaPulmonar, descricao: 'doen├ºa pulmonar' },
    { campo: form.asma, descricao: 'asma' },
    {
      campo: form.medicacaoAsma,
      descricao: 'uso de medica├º├úo para asma/respira├º├úo',
    },
    {
      campo: form.cirurgiaToraxPulmao,
      descricao: 'cirurgia tor├ícica/pulmonar',
    },
    {
      campo: form.doencaCardiacaHipertensao,
      descricao: 'doen├ºa card├¡aca/hipertens├úo',
    },
  ].filter((condicao) => condicao.campo === 'Sim');

  if (condicoesMedicas.length > 0) {
    const condicoesDesc = condicoesMedicas.map((c) => c.descricao).join(', ');
    observacoes.push(`Hist├│rico de ${condicoesDesc}`);
  }

  // Verificar pr├│tese dent├íria
  if (form.proteseDentaria === 'Sim') {
    observacoes.push('Utiliza pr├│tese dent├íria');
  }

  // Verificar exposi├º├úo ocupacional
  if (form.exposicaoPoeiraFumaca === 'Sim') {
    let exposicaoInfo = 'Exposi├º├úo ocupacional a agentes respirat├│rios';

    if (form.descricaoExposicao) {
      exposicaoInfo += ` (${form.descricaoExposicao})`;
    }

    if (form.exposicaoAtual === 'Sim') {
      exposicaoInfo += ' - exposi├º├úo atual';
    } else {
      exposicaoInfo += ' - exposi├º├úo pregressa';
    }

    observacoes.push(exposicaoInfo);
  }

  return observacoes.join('. ') + (observacoes.length > 0 ? '.' : '');
}
