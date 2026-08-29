import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';
import { getExameByCodigo } from 'src/exames/exames.provider';

interface RegistroPa {
  valor: string;
  horario: string;
  profissional: string;
}

export interface FichaAssistencialData {
  // Sinais Vitais
  pressaoArterial: RegistroPa[];
  peso: string;
  altura: string;
  imc: string;
  resultadoImc: string;

  // Informações Clínicas
  queixaPrincipal: string;
  historiaDoencaAtual: string;
  hipoteseDiagnostica: string;
  antecedentesPessoais: string;
  exameFisico: string;
  resultadoExame: string;
  condutaMedica: string;

  // Aspectos Ocupacionais
  nexoOcupacional: 'Sim' | 'Não' | 'Inconclusivo';
  descricaoNexo: string;
  restricaoLaboral: 'Sim' | 'Não';
  descricaoRestricao: string;

  // Retorno
  retorno: 'Sim' | 'Não';
  retornoDias: string;

  // Identificação do Profissional
  codigoMedico: string;
  medico: string;
}

export async function gerarDocFichaAssistencial(
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

  // Localiza o exame com grupo correspondente a esta ficha
  const exameAssistencial = EXAMES?.find((e: any) => {
    if (e.grupo === 'Especialista Consulta Clínica Geral') return true;
    if (e.templateKey === 'fichaAssistencial') return true;
    const resolved = getExameByCodigo(e.codigoExame);
    return resolved?.template === gerarDocFichaAssistencial;
  });

  const form: FichaAssistencialData =
    exameAssistencial?.formulario || ({} as FichaAssistencialData);

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

  // Monta grade de sinais vitais
  const pressaoRows = form.pressaoArterial?.map((registro: RegistroPa) => [
    'Pressão Arterial',
    registro.valor || 'N/D',
    'Horário',
    registro.horario || 'N/D',
  ]) || [['Pressão Arterial', 'N/D', 'Horário', 'N/D']];

  const sinaisVitaisGrid = [
    ['Peso (kg)', form.peso || 'N/D', 'Altura (m)', form.altura || 'N/D'],
    ['IMC', form.imc || 'N/D', 'Resultado IMC', form.resultadoImc || 'N/D'],
    ...pressaoRows,
  ];

  // Monta grade de informações clínicas (texto longo em célula única)
  const buildTextRow = (label: string, value?: string): any[][] => [
    [label, { text: value || '-', colSpan: 3 }, '', ''],
  ];

  const anamneseRows = [
    ...buildTextRow('Queixa Principal (QP)', form.queixaPrincipal),
    ...buildTextRow('História da Doença Atual (HDA)', form.historiaDoencaAtual),
    ...buildTextRow('Antecedentes Pessoais', form.antecedentesPessoais),
  ];

  const avaliacaoRows = [
    ...buildTextRow('Exame Físico', form.exameFisico),
    ...buildTextRow('Resultado de Exames', form.resultadoExame),
    ...buildTextRow('Conduta Médica / Prescrição', form.condutaMedica),
    ...buildTextRow('Hipótese Diagnóstica (HD)', form.hipoteseDiagnostica),
  ];

  // Aspectos ocupacionais
  const nexoLabel =
    form.nexoOcupacional === 'Sim' || form.nexoOcupacional === 'Inconclusivo'
      ? `${form.nexoOcupacional} — ${form.descricaoNexo || '-'}`
      : form.nexoOcupacional || 'Não';

  const restricaoLabel =
    form.restricaoLaboral === 'Sim'
      ? `Sim — ${form.descricaoRestricao || '-'}`
      : form.restricaoLaboral || 'Não';

  const retornoLabel =
    form.retorno === 'Sim'
      ? `Sim — ${form.retornoDias || '-'} dia(s)`
      : form.retorno || 'Não';

  const aspectosGrid = [
    ['Nexo Ocupacional', nexoLabel, 'Restrição Laboral', restricaoLabel],
    ['Necessita Retorno', retornoLabel, '', ''],
  ];

  const medicoNome =
    form.medico || exameAssistencial?.profissional || profissional?.nome || 'N/D';

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
      // ----- Cabeçalho principal -----
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'FICHA ASSISTENCIAL',
                style: 'mainTitle',
                margin: [0, 0, 0, 5],
                color: PRIMARY,
              },
              {
                text: TIPOEXAMENOME || 'Consulta Clínica Geral',
                fontSize: 10,
                color: LIGHT_TEXT,
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
                  { timeZone: 'America/Sao_Paulo' },
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

      // ----- Dados do Funcionário -----
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

      // ----- Dados da Empresa -----
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

      // ----- Seções do formulário -----
      createGridSection('Sinais Vitais e Medidas', sinaisVitaisGrid, {
        fontSize: 9,
      }),
      createGridSection('Anamnese e Informações Clínicas', anamneseRows, {
        fontSize: 9,
      }),
      createGridSection('Avaliação Médica e Conduta', avaliacaoRows, {
        fontSize: 9,
      }),
      {
        ...createGridSection('Aspectos Ocupacionais e Planejamento', aspectosGrid, {
          fontSize: 9,
        }),
        pageBreak: 'before',
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
    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
