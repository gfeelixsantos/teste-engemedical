import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { formatCPF, getImageBase64 } from 'src/utils/util';
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

// ═══════════════════════════════════════════════════════════════
// CORES PREMIUM CORPORATE HEALTH
// ═══════════════════════════════════════════════════════════════
const C = {
  verdeEscuro: '#1B5E20',
  verde: '#2E7D32',
  verdeClaro: '#4CAF50',
  ciano: '#0097A7',
  azulEscuro: '#0D47A1',
  preto: '#1A1A1A',
  texto: '#212121',
  muted: '#757575',
  borda: '#E0E0E0',
  fundo: '#F5F5F5',
  branco: '#FFFFFF',
  apto: '#2E7D32',
  inapto: '#C62828',
  attention: '#E65100',
};

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

  // ═══ LOGOS LOCAIS ═══
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
    : await getImageBase64(
        'https://engemedical.com.br/images/icone.png',
      );

  let assinaturaProfissional = await getImageBase64(ASSINATURAS_URL[codigo]);
  if (!assinaturaProfissional) {
    assinaturaProfissional = await getImageBase64(
      'https://engemedical.com.br/images/logo.png',
    );
  }
  let assinaturaMedico: string | null = null;
  if (form.codigoMedico && form.codigoMedico !== codigo) {
    assinaturaMedico = await getImageBase64(ASSINATURAS_URL[form.codigoMedico]);
    if (!assinaturaMedico) {
      assinaturaMedico = await getImageBase64(
        'https://engemedical.com.br/images/logo.png',
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

  // ═══ HELPERS LOCAIS ═══
  const section = (title: string, color: string = C.ciano) => ({
    table: {
      widths: ['*'],
      body: [[{
        columns: [
          { width: 4, text: '', fillColor: color },
          { width: '*', text: title, fontSize: 9.5, bold: true, color: C.texto, margin: [10, 5, 8, 5] as [number, number, number, number] },
        ],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => '#ECEFF1',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 10, 0, 0] as [number, number, number, number],
  });

  const card = (content: any) => ({
    table: {
      widths: ['*'],
      body: [[{ stack: content, margin: [12, 8, 12, 8] }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => C.branco,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  });

  const field = (label: string, value: string) => ({
    columns: [
      { text: label, width: 110, fontSize: 8.5, bold: true, color: C.muted },
      { text: value || 'N/D', width: '*', fontSize: 9.5, color: C.texto },
    ],
    margin: [0, 2, 0, 2] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 85],
    background: watermarkBase64
      ? [
          {
            image: watermarkBase64,
            width: 600,
            opacity: 0.06,
            absolutePosition: { x: 320, y: 50 },
          },
        ]
      : undefined,
    content: [
      // ═══ CABEÇALHO: Logo esquerda + Tipo da ficha centro ═══
      {
        columns: [
          {
            width: 120,
            stack: [
              logoEmpresa
                ? { image: logoEmpresa, fit: [110, 110], alignment: 'center' }
                : { text: '' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'FICHA CLÍNICA', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] as [number, number, number, number] },
              { text: TIPOEXAMENOME || 'Avaliação Clínica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1, margin: [0, 0, 0, 0] as [number, number, number, number] },
            ],
            margin: [0, 8, 0, 0] as [number, number, number, number],
          },
          { width: 120, text: '' },
        ],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      // Linha separadora
      {
        canvas: [
          { type: 'line' as const, x1: 0, y1: 0, x2: 553, y2: 0, lineWidth: 1.5, lineColor: C.ciano },
        ],
        margin: [0, 4, 0, 8] as [number, number, number, number],
      },

      // ═══ DADOS DO FUNCIONÁRIO + EMPRESA lado a lado ═══
      {
        columns: [
          {
            width: '50%',
            stack: [
              section('DADOS DO FUNCIONÁRIO', C.azulEscuro),
              card([
                field('Nome:', NOME),
                field('CPF:', formatCPF(CPFFUNCIONARIO)),
                field('Nascimento:', `${DATANASCIMENTO || 'N/D'} — ${idade} anos`),
                field('Cargo:', NOMECARGO),
                field('Setor:', NOMESETOR),
              ]),
            ],
          },
          {
            width: '50%',
            stack: [
              section('DADOS DA EMPRESA', C.verde),
              card([
                field('Razão social:', NOMEEMPRESA),
                field('CNPJ:', CNPJEMPRESA),
                field('Unidade:', UNIDADEATENDIMENTO),
                { text: '', margin: [0, 0, 0, 0] as [number, number, number, number] },
                field('Data do exame:', new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())),
              ]),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ═══ ANAMNESE (se admissional) ═══
      ...(isAdmissional
        ? [
            section('ANAMNESE E HISTÓRICO FAMILIAR', C.azulEscuro),
            card([
              field('Doenças familiares:', form.doencasFamiliares?.join(', ')),
              field('Doenças pessoais:', form.doencasPessoais?.join(', ')),
              field('Observação médica:', form.observacoesDoencasPessoais),
              field('Afastamento > 15 dias:', form.afastamento),
              field('Relato:', form.observacaoAfastamento),
            ]),
          ]
        : []),

      // ═══ INFORMAÇÕES CLÍNICAS (se demissional com menstruação) ═══
      ...(isDemissional && hasMenstruacaoData
        ? [
            section('INFORMAÇÕES CLÍNICAS', C.azulEscuro),
            card([
              field('Última Menstruação:', form.ultimaMenstruacao),
            ]),
          ]
        : []),

      // ═══ HÁBITOS + PRESSÃO ARTERIAL lado a lado ═══
      {
        columns: [
          {
            width: '50%',
            stack: [
              section('HÁBITOS E ESTILO DE VIDA', C.verde),
              card([
                {
                  table: {
                    widths: ['50%', '50%'],
                    body: [
                      [
                        { text: 'Tabagismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                        { text: 'Etilismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                      ],
                      [
                        { text: form.tabagismo || 'N/D', fontSize: 9, color: C.texto },
                        { text: form.etilismo || 'N/D', fontSize: 9, color: C.texto },
                      ],
                      [
                        { text: 'Ativ. Física', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                        { text: 'Acima do Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                      ],
                      [
                        { text: form.atividadeFisica || 'N/D', fontSize: 9, color: C.texto },
                        { text: form.acimaPeso || 'N/D', fontSize: 9, color: C.texto },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: (i: number) => (i === 1 || i === 3 ? 0.3 : 0),
                    vLineWidth: () => 0,
                    hLineColor: () => C.borda,
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 2,
                    paddingBottom: () => 2,
                  },
                },
              ]),
            ],
          },
          {
            width: '50%',
            stack: [
              section('PRESSÃO ARTERIAL', C.ciano),
              card([
                ...form.pressaoArterial?.map((reg: RegistroPa) => ({
                  columns: [
                    { text: reg.valor || 'N/D', width: '50%', fontSize: 10, bold: true, color: C.texto },
                    { text: reg.horario ? `${reg.horario}h` : 'N/D', width: '50%', fontSize: 9, color: C.muted, alignment: 'right' as const },
                  ],
                  margin: [0, 2, 0, 2] as [number, number, number, number],
                })) || [
                  { text: 'N/D', fontSize: 10, bold: true, color: C.texto, margin: [0, 2, 0, 2] as [number, number, number, number] },
                ],
              ]),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ═══ EXAME FÍSICO ═══
      section('EXAME FÍSICO', C.azulEscuro),
      card([
        {
          table: {
            widths: ['33%', '33%', '34%'],
            body: [
              [
                { text: 'Cabeça e Pescoço', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Tórax', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Abdome', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: form.cabecaPescoco || 'N/D', fontSize: 9, color: C.texto },
                { text: form.torax || 'N/D', fontSize: 9, color: C.texto },
                { text: form.abdome || 'N/D', fontSize: 9, color: C.texto },
              ],
              [
                { text: 'Coluna', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Sup.', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Inf.', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: form.coluna || 'N/D', fontSize: 9, color: C.texto },
                { text: form.membrosSuperiores || 'N/D', fontSize: 9, color: C.texto },
                { text: form.membrosInferiores || 'N/D', fontSize: 9, color: C.texto },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 || i === 3 ? 0.3 : 0),
            vLineWidth: () => 0,
            hLineColor: () => C.borda,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // ═══ DADOS VITAIS ═══
      section('DADOS VITAIS E ANTROPOMETRIA', C.verde),
      card([
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Altura', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'IMC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Resultado IMC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: form.peso || 'N/D', fontSize: 9, color: C.texto },
                { text: form.altura || 'N/D', fontSize: 9, color: C.texto },
                { text: form.imc || 'N/D', fontSize: 9, color: C.texto },
                { text: form.resultadoImc || 'N/D', fontSize: 9, color: C.texto },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.3 : 0),
            vLineWidth: () => 0,
            hLineColor: () => C.borda,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // ═══ OBSERVAÇÕES MÉDICAS ═══
      ...(form.observacoesMedicas
        ? [
            section('OBSERVAÇÕES MÉDICAS', C.ciano),
            card([
              { text: form.observacoesMedicas, fontSize: 9, color: C.texto, alignment: 'justify', lineHeight: 1.4 },
            ]),
          ]
        : []),

      // ═══ PARECER MÉDICO ═══
      section('PARECER MÉDICO', C.verde),
      {
        text: conclusao,
        fontSize: 20,
        bold: true,
        color: conclusao.toLowerCase() === 'inapto' ? C.inapto : C.apto,
        alignment: 'center',
        margin: [0, 8, 0, 8] as [number, number, number, number],
      },

      // ═══ INFORMAÇÃO AGUARDAR AVALIAÇÃO ═══
      ...(form.informacaoAguardarAvaliacao
        ? [
            {
              text: form.informacaoAguardarAvaliacao,
              fontSize: 9,
              color: C.attention,
              alignment: 'center',
              margin: [0, 4, 0, 8] as [number, number, number, number],
            },
          ]
        : []),

      // ═══ TESTES ARTICULARES (se houver, nova página) ═══
      ...(testesArticularesGrid.length > 0
        ? [
            { text: '', pageBreak: 'before' as const },
            // Cabeçalho da página de testes
            {
              columns: [
                {
                  width: 120,
                  stack: [
                    logoEmpresa
                      ? { image: logoEmpresa, fit: [110, 110], alignment: 'center' }
                      : { text: '' },
                  ],
                },
                {
                  width: '*',
                  stack: [
                    { text: 'TESTES ARTICULARES', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] as [number, number, number, number] },
                    { text: TIPOEXAMENOME || 'Avaliação Clínica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1 },
                  ],
                  margin: [0, 8, 0, 0] as [number, number, number, number],
                },
                { width: 120, text: '' },
              ],
              margin: [0, 0, 0, 0] as [number, number, number, number],
            },
            {
              canvas: [
                { type: 'line' as const, x1: 0, y1: 0, x2: 553, y2: 0, lineWidth: 1.5, lineColor: C.ciano },
              ],
              margin: [0, 4, 0, 8] as [number, number, number, number],
            },
            // Dados paciente resumido
            {
              columns: [
                { text: NOME || 'N/D', width: '*', bold: true, fontSize: 10, color: C.texto },
                { text: `CPF: ${formatCPF(CPFFUNCIONARIO)}`, width: 'auto', fontSize: 9, color: C.muted },
              ],
              margin: [0, 0, 0, 10] as [number, number, number, number],
            },
            // Grid testes
            section('TESTES ARTICULARES', C.azulEscuro),
            card([
              {
                table: {
                  widths: ['25%', '25%', '25%', '25%'],
                  body: testesArticularesGrid.map((row) => [
                    { text: row[0], fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: row[1], fontSize: 9, color: C.texto, margin: [0, 2, 0, 2] as [number, number, number, number] },
                    { text: row[2], fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: row[3], fontSize: 9, color: C.texto, margin: [0, 2, 0, 2] as [number, number, number, number] },
                  ]),
                },
                layout: {
                  hLineWidth: (i: number) => (i > 0 ? 0.3 : 0),
                  vLineWidth: () => 0,
                  hLineColor: () => C.borda,
                  paddingLeft: () => 4,
                  paddingRight: () => 4,
                  paddingTop: () => 2,
                  paddingBottom: () => 2,
                },
              },
            ]),
          ]
        : []),

      // ═══ LEGAL ═══
      {
        text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
        fontSize: 7,
        color: C.muted,
        alignment: 'center',
        italics: true,
        margin: [0, 10, 0, 0] as [number, number, number, number],
      },
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
    defaultStyle: { fontSize: 10, lineHeight: 1.15, color: C.texto },
  };
}
