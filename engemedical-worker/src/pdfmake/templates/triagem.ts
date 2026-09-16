import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { getRestricoesCompletas } from '../ClinicoRestricoes';
import { buildPdfFooter } from '../pdfFooterHelper';
import * as fs from 'fs';
import * as path from 'path';

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

  // Hábitos
  tabagismo: string;
  etilismo: string;
  atividadeFisica: string;
  acimaPeso: string;
  ultimaMenstruacao: string;

  // Aptidões funcionais
  trabalhoAltura: string;
  trabalhoEspacoConfinado: string;
  capacidadeCarregarPeso: string;
  aptoOperarVeiculos: string;

  // Exame clínico
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

  // Conclusão
  conclusao: string;
  observacoesMedicas: string;
  codigoMedico: string;
  medico: string;

  // Novos campos para observações
  observacoesDoencasPessoais: string;

  // Novos campos para restrições
  restricoes?: RestricoesMedicas;
  duracaoRestricaoDias?: string;
  dataInicioRestricao?: string;

  // Novo campo para aguardar avaliação
  informacaoAguardarAvaliacao?: string;
}

export async function gerarDocTriagem(
  asoData: any,
  profissional: any,
  assinaturaDigitalObrigatoria: boolean = false,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#0D47A1';
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

  const { cpf, codigo, nome } = profissional;

  const exameClinico = EXAMES?.find((e: any) => e.grupo === 'Triagem');

  const form: FichaClinicaData = exameClinico?.formulario || {};

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

  // ======= GRID DADOS VITAIS =======
  const pressaoRows = form.pressaoArterial?.map((p: any) => [
    `Pressão`,
    p.valor,
    'Horário',
    `${p.horario}`,
  ]) || [['Pressão Arterial', 'N/D']];
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
                text: 'TRIAGEM',
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
        margin: [0, 0, 0, 5], // espaçamento abaixo
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

      createGridSection('Dados Vitais e Antropometria', dadosVitaisGrid, {
        fontSize: 9,
      }),

      // Observações médicas
      // {
      //   text: form.observacoesMedicas || '-',
      //   alignment: 'justify',
      //   italics: true,
      //   margin: [0, 0, 0, 10],
      // },
    ],

    footer: buildPdfFooter(
      {
        ...profissional,
        nome: nome || profissional?.nome,
        profissional: profissional?.profissional || nome || profissional?.nome,
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
    },

    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
