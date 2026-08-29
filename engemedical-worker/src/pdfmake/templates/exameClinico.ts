import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { getRestricoesCompletas } from '../ClinicoRestricoes';
import { buildPdfFooter } from '../pdfFooterHelper';

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

interface TestesArticulares {
  testePhalen?: 'Positivo' | 'Negativo';
  testeFinkelstein?: 'Positivo' | 'Negativo';
  cotovelosMovimentacao?: 'Normal' | 'Alterado';
  cotovelosObservacoes?: string;
  testeJobe?: 'Positivo' | 'Negativo';
  testeGerber?: 'Positivo' | 'Negativo';
  testeNeer?: 'Positivo' | 'Negativo';
  testeYocum?: 'Positivo' | 'Negativo';
  amplitudeMovimentosArticulares?: 'Normal' | 'Alterado';
  amplitudeAlteradoEm?: string;
  desviosCifose?: boolean;
  desviosLordose?: boolean;
  desviosEscoliose?: boolean;
  desviosNaoIdentificados?: boolean;
  alongamentoBoaAmplitude?: boolean;
  alongamentoFlexaoLimitada?: boolean;
  alongamentoFlexaoLimitadaGraus?: string;
  laseguePositivo?: boolean;
  lasegueNegativo?: boolean;
  andarPontasPesSim?: boolean;
  andarPontasPesComDificuldade?: boolean;
  andarPontasPesNaoConsegue?: boolean;
  andarCalcanharesSim?: boolean;
  andarCalcanharesComDificuldade?: boolean;
  andarCalcanharesNaoConsegue?: boolean;
  cicatrizesArticularesPresente?: boolean;
  cicatrizesArticularesEspecifique?: string;
  nodulosCistosPresente?: boolean;
  nodulosCistosEspecifique?: string;
}

export interface FichaClinicaData {
  doencasFamiliares: string[];
  doencasPessoais: string[];
  afastamento: string;
  observacaoAfastamento: string;
  tabagismo: string;
  etilismo: string;
  atividadeFisica: string;
  acimaPeso: string;
  ultimaMenstruacao: string;
  trabalhoAltura: string;
  trabalhoEspacoConfinado: string;
  capacidadeCarregarPeso: string;
  aptoOperarVeiculos: string;
  cabecaPescoco: string;
  torax: string;
  abdome: string;
  coluna: string;
  membrosSuperiores: string;
  membrosInferiores: string;
  pressaoArterial: RegistroPa[];
  peso: string;
  altura: string;
  imc: string;
  resultadoImc: string;
  conclusao: string;
  observacoesMedicas: string;
  codigoMedico: string;
  medico: string;
  observacoesDoencasPessoais: string;
  restricoes?: RestricoesMedicas;
  duracaoRestricaoDias?: string;
  dataInicioRestricao?: string;
  informacaoAguardarAvaliacao?: string;
  testesArticulares?: TestesArticulares;
  recomendacoesRestricao?: string;
}

function hasValue(value: unknown): boolean {
  return (
    value !== undefined && value !== null && value !== '' && value !== false
  );
}

function buildTestesArticularesGrid4Cols(t?: TestesArticulares): string[][] {
  if (!t) return [];

  const rows: string[][] = [];
  const add = (label: string, value?: unknown) => {
    if (!hasValue(value)) return;
    rows.push([
      label,
      typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value),
    ]);
  };

  add('Teste de Phalen', t.testePhalen);
  add('Teste de Finkelstein', t.testeFinkelstein);
  add('Cotovelo - Movimentação', t.cotovelosMovimentacao);
  add('Cotovelo - Observações', t.cotovelosObservacoes);
  add('Teste de Jobe', t.testeJobe);
  add('Teste de Gerber', t.testeGerber);
  add('Teste de Neer', t.testeNeer);
  add('Teste de Yocum', t.testeYocum);
  add('Amplitude articular', t.amplitudeMovimentosArticulares);
  add('Alteração de amplitude', t.amplitudeAlteradoEm);
  add('Desvio - Cifose', t.desviosCifose);
  add('Desvio - Lordose', t.desviosLordose);
  add('Desvio - Escoliose', t.desviosEscoliose);
  add('Desvio - Não identificado', t.desviosNaoIdentificados);
  add('Alongamento - boa amplitude', t.alongamentoBoaAmplitude);
  add('Flexão limitada', t.alongamentoFlexaoLimitada);
  add('Flexão limitada (graus)', t.alongamentoFlexaoLimitadaGraus);
  add('Lasegue positivo', t.laseguePositivo);
  add('Lasegue negativo', t.lasegueNegativo);
  add('Pontas dos pés - normal', t.andarPontasPesSim);
  add('Pontas dos pés - dificuldade', t.andarPontasPesComDificuldade);
  add('Pontas dos pés - não consegue', t.andarPontasPesNaoConsegue);
  add('Calcanhares - normal', t.andarCalcanharesSim);
  add('Calcanhares - dificuldade', t.andarCalcanharesComDificuldade);
  add('Calcanhares - não consegue', t.andarCalcanharesNaoConsegue);
  add('Cicatrizes presentes', t.cicatrizesArticularesPresente);
  add('Detalhe das cicatrizes', t.cicatrizesArticularesEspecifique);
  add('Nódulos/cistos presentes', t.nodulosCistosPresente);
  add('Detalhe dos nódulos/cistos', t.nodulosCistosEspecifique);

  const finalRows: string[][] = [];
  for (let index = 0; index < rows.length; index += 2) {
    const current = rows[index];
    const next = rows[index + 1];
    finalRows.push(
      next
        ? [current[0], current[1], next[0], next[1]]
        : [current[0], current[1], '', ''],
    );
  }

  return finalRows;
}

export async function gerarDocExameClinico(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
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
    TIPOEXAME,
    TIPOEXAMENOME,
    UNIDADEATENDIMENTO,
    CODIGOPRONTUARIO,
  } = asoData;

  const { codigo } = profissional;

  const exameClinico =
    EXAMES?.find((e: any) => e.grupo === 'Exame Clínico') ||
    EXAMES?.find((e: any) =>
      Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo),
    );

  const form: FichaClinicaData =
    exameClinico?.formulario || ({} as FichaClinicaData);

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
  if (!assinaturaProfissional) {
    assinaturaProfissional = await getImageBase64(
      'https://cmsocupacional.com.br/images/logo.png',
    );
  }
  let assinaturaMedico: string | null = null;
  if (form.codigoMedico && form.codigoMedico !== codigo) {
    assinaturaMedico = await getImageBase64(ASSINATURAS_URL[form.codigoMedico]);
    if (!assinaturaMedico) {
      assinaturaMedico = await getImageBase64(
        'https://cmsocupacional.com.br/images/logo.png',
      );
    }
  }

  const isAdmissional = TIPOEXAME === '1' || TIPOEXAME === 1;
  const isDemissional = TIPOEXAME === '5' || TIPOEXAME === 5;
  const hasMenstruacaoData =
    !!form.ultimaMenstruacao &&
    form.ultimaMenstruacao.trim() !== '' &&
    form.ultimaMenstruacao !== 'N/D';

  const habitosGridAdmissional = [
    ['Tabagismo', form.tabagismo || 'N/D', 'Etilismo', form.etilismo || 'N/D'],
    [
      'Atividade Física',
      form.atividadeFisica || 'N/D',
      'Acima do Peso',
      form.acimaPeso || 'N/D',
    ],
    [
      'Trabalho em Altura',
      form.trabalhoAltura || 'N/D',
      'Espaço Confinado',
      form.trabalhoEspacoConfinado || 'N/D',
    ],
    [
      'Apto a Veículos',
      form.aptoOperarVeiculos || 'N/D',
      'Carregar Peso',
      form.capacidadeCarregarPeso || 'N/D',
    ],
  ];

  const menstruacaoGridDemissional =
    isDemissional && hasMenstruacaoData
      ? [['Última Menstruação', form.ultimaMenstruacao.trim(), '', '']]
      : [];

  const exameFisicoGrid = [
    [
      'Cabeça e Pescoço',
      form.cabecaPescoco || 'N/D',
      'Tórax',
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

  const pressaoRows = form.pressaoArterial?.map((registro: RegistroPa) => [
    'Pressão arterial',
    registro.valor || 'N/D',
    'Horário',
    registro.horario || 'N/D',
  ]) || [['Pressão arterial', 'N/D', 'Horário', 'N/D']];

  const dadosVitaisGrid = [
    ['Peso (kg)', form.peso || 'N/D', 'Altura (m)', form.altura || 'N/D'],
    ['IMC', form.imc || 'N/D', 'Resultado IMC', form.resultadoImc || 'N/D'],
    ...pressaoRows,
  ];

  const testesArticularesGrid = buildTestesArticularesGrid4Cols(
    form.testesArticulares,
  );
  const conclusao = (form.conclusao || 'Pendente').toUpperCase();
  const medicoNome =
    form.medico || exameClinico?.profissional || profissional?.nome || 'N/D';

  return {
    pageSize: 'A4',
    pageMargins: [34, 35, 34, 128],
    background: watermarkBase64
      ? [
          {
            image: watermarkBase64,
            width: 350,
            opacity: 0.05,
            absolutePosition: { x: 122, y: 235 },
          },
        ]
      : undefined,
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'FICHA CLÍNICA',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              {
                text: `${TIPOEXAMENOME}: ${conclusao}`,
                margin: [0, 0, 0, 0],
              },
              form.informacaoAguardarAvaliacao
                ? {
                    text: form.informacaoAguardarAvaliacao,
                    margin: [0, 2, 0, 0],
                    color: ATTENTION_COLOR,
                  }
                : { text: '' },
              ...getRestricoesCompletas(form),
            ].filter((item: any) => item && item.text !== ''),
          },
          {
            width: 130,
            stack: [
              logoEmpresa
                ? { image: logoEmpresa, width: 118, alignment: 'right' }
                : { text: '' },
              {
                text: `${UNIDADEATENDIMENTO || ''}, ${new Intl.DateTimeFormat(
                  'pt-BR',
                  {
                    timeZone: 'America/Sao_Paulo',
                  },
                ).format(new Date())}`,
                alignment: 'right',
                fontSize: 7,
                color: LIGHT_TEXT,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: NOME || 'N/D', bold: true, fontSize: 11 },
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
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: NOMEEMPRESA || 'N/D', bold: true },
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
      ...(isAdmissional
        ? [
            createGridSection(
              'Anamnese e Histórico Familiar',
              [
                [
                  'Doenças Familiares',
                  form.doencasFamiliares?.join(', ') || 'N/D',
                ],
                ['Doenças Pessoais', form.doencasPessoais?.join(', ') || 'N/D'],
                ['Observação médica', form.observacoesDoencasPessoais || '-'],
                ['Afastamento > 15 dias', form.afastamento || 'N/D'],
                ['Relato', form.observacaoAfastamento || '-'],
              ],
              { fontSize: 9 },
            ),
            createGridSection('Hábitos e Atividade', habitosGridAdmissional, {
              fontSize: 9,
            }),
          ]
        : []),
      ...(isDemissional && hasMenstruacaoData
        ? [
            createGridSection(
              'Informações Clínicas',
              menstruacaoGridDemissional,
              {
                fontSize: 9,
              },
            ),
          ]
        : []),
      createGridSection('Exame Físico', exameFisicoGrid, { fontSize: 9 }),
      createGridSection('Dados Vitais e Antropometria', dadosVitaisGrid, {
        fontSize: 9,
      }),
      {
        text: form.observacoesMedicas || '-',
        alignment: 'justify',
        italics: true,
        fontSize: 10,
        margin: [0, 0, 0, 10],
      },
      {
        text: `Conclusão: ${conclusao}`,
        alignment: 'left',
        bold: true,
        fontSize: 10,
        color: conclusao.toLowerCase() === 'inapto' ? '#B71C1C' : PRIMARY,
        margin: [0, 0, 0, 16],
      },
      ...(testesArticularesGrid.length > 0
        ? [
            { text: '', pageBreak: 'before' },
            {
              columns: [
                {
                  width: '*',
                  stack: [
                    {
                      text: 'TESTES ARTICULARES',
                      style: 'mainTitle',
                      margin: [0, 0, 0, 5],
                      color: PRIMARY,
                    },
                  ],
                },
                {
                  width: 130,
                  stack: [
                    logoEmpresa
                      ? { image: logoEmpresa, width: 118, alignment: 'right' }
                      : { text: '' },
                    {
                      text: `${UNIDADEATENDIMENTO || ''}, ${new Intl.DateTimeFormat(
                        'pt-BR',
                        {
                          timeZone: 'America/Sao_Paulo',
                        },
                      ).format(new Date())}`,
                      alignment: 'right',
                      fontSize: 7,
                      color: LIGHT_TEXT,
                    },
                  ],
                },
              ],
              margin: [0, 0, 0, 10],
            },
            {
              columns: [
                {
                  width: '*',
                  stack: [
                    { text: NOME || 'N/D', bold: true, fontSize: 11 },
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
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        { text: NOMEEMPRESA || 'N/D', bold: true },
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
            createGridSection('Testes Articulares', testesArticularesGrid, {
              fontSize: 9,
            }),
          ]
        : []),
    ],
    footer: buildPdfFooter(
      profissional,
      NOME,
      CPFFUNCIONARIO,
      CODIGOPRONTUARIO || '',
      UNIDADEATENDIMENTO,
      assinaturaProfissional,
      assinaturaDigitalObrigatoria,
      form.codigoMedico && form.codigoMedico !== codigo
        ? { nome: medicoNome, codigo: form.codigoMedico }
        : null,
      assinaturaMedico,
    ),
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
