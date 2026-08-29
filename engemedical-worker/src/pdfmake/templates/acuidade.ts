import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';
import { buildPdfFooter } from '../pdfFooterHelper';

interface AcuidadeVisualData {
  // Dados do exame
  exameComLenteCorretiva: string;
  tipoLenteCorretiva: string;
  profissional: string;

  // Acuidade Visual - Longe
  longeOD: string;
  longeOE: string;
  longeBinocular: string;

  // Acuidade Visual - Perto
  pertoBinocular: string;

  ishiharaRealizado: boolean;

  // Teste de Ishihara
  ishiharaPlaca1: string;
  ishiharaResultado1: string;
  ishiharaPlaca2: string;
  ishiharaResultado2: string;
  ishiharaPlaca3: string;
  ishiharaResultado3: string;
  ishiharaPlaca4: string;
  ishiharaResultado4: string;
  ishiharaPlaca5: string;
  ishiharaResultado5: string;
  ishiharaPlaca6: string;
  ishiharaResultado6: string;
  ishiharaPlaca7: string;
  ishiharaResultado7: string;
  ishiharaPlaca8: string;
  ishiharaResultado8: string;
  ishiharaPlaca9: string;
  ishiharaResultado9: string;
  ishiharaPlaca10: string;
  ishiharaResultado10: string;

  // Conclusão Ishihara
  conclusaoIshihara: string;

  estereopsiaRealizado: boolean;

  // Teste de Estereopsia
  estereopsiaResultado: string;
  estereopsiaObservacao: string;
  estereopsiaAcertos: number;
  estereopsiaTotal: number;
  estereopsiaRespostas: { [key: number]: 'acerto' | 'erro' | null };

  // Conclusão Geral
  observacoesFinais: string;
  // Propriedade opcional para compatibilidade
  resultadoEstereopsia?: string;

  // Avaliação PCD
  laudoOftalmologistaRecomendado: boolean;
  criterioPCDIdentificado: string;
}

export async function gerarDocAcuidadeVisual(
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
    TIPOEXAMENOME,
    UNIDADEATENDIMENTO,
    CODIGOPRONTUARIO,
  } = asoData;

  const { codigo } = profissional;

  const acuidadeVisualExams = EXAMES?.filter(
    (e: any) => e.grupo === 'Acuidade Visual',
  ) || [];

  const acuidadeVisual =
    acuidadeVisualExams.find(
      (e: any) =>
        e.formulario?.ishiharaRealizado === true ||
        e.formulario?.estereopsiaRealizado === true,
    ) || acuidadeVisualExams[0];

  const form: AcuidadeVisualData = {} as AcuidadeVisualData;
  for (const ex of acuidadeVisualExams) {
    const exForm = ex.formulario || {};
    for (const key of Object.keys(exForm)) {
      const val = exForm[key];
      const currentVal = form[key];
      const isCurrentFalsy =
        currentVal === undefined ||
        currentVal === null ||
        currentVal === '' ||
        currentVal === false;
      const isNewTruthy =
        val !== undefined && val !== null && val !== '' && val !== false;

      if (isCurrentFalsy || isNewTruthy) {
        form[key] = val;
      }
    }
  }

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

  // ======= FUNÇÃO PARA CRIAR SETAS COM SVG =======
  const createArrowSVG = (direction: 'up' | 'down' | 'left' | 'right'): any => {
    const rotations = {
      right: 0,
      down: 90,
      left: 180,
      up: 270,
    };

    // SVG de uma seta apontando para direita
    const arrowPath =
      'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z';

    return {
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g transform="rotate(${rotations[direction]} 12 12)">
                <path d="${arrowPath}" fill="#114E34"/>
              </g>
            </svg>`,
      width: 12,
      height: 12,
    };
  };

  // ======= VERIFICAR SE EXISTEM TESTES OPCIONAIS =======
  const hasIshiharaData = Object.keys(form).some(
    (key) => key.startsWith('ishiharaPlaca') && form[key],
  );
  const hasEstereopsiaData =
    form.estereopsiaResultado || form.estereopsiaAcertos > 0;
  const hasPCDData =
    form.criterioPCDIdentificado || form.laudoOftalmologistaRecomendado;

  // ======= GRID DE ACUIDADE VISUAL - NOVA ESTRUTURA =======
  const acuidadeVisualGrid = {
    body: [
      [
        {
          text: 'Olho Direito (OD) - Longe',
          style: 'tableHeader',
          alignment: 'center',
        },
        {
          text: 'Olho Esquerdo (OE) - Longe',
          style: 'tableHeader',
          alignment: 'center',
        },
        {
          text: 'Binocular - Perto',
          style: 'tableHeader',
          alignment: 'center',
        },
      ],
      [
        { text: form.longeOD || '-', alignment: 'center', fontSize: 11 },
        { text: form.longeOE || '-', alignment: 'center', fontSize: 11 },
        { text: form.pertoBinocular || '-', alignment: 'center', fontSize: 11 },
      ],
    ],
  };

  // ======= DADOS DO EXAME =======
  const dadosExameGrid = {
    body: [
      [
        {
          text: 'Exame com lente corretiva?',
          style: 'tableLabel',
          fontSize: 11,
        },
        {
          text: form.exameComLenteCorretiva || 'Não',
          alignment: 'center',
          fontSize: 11,
        },
        { text: 'Tipo de lente', style: 'tableLabel', fontSize: 11 },
        {
          text: form.tipoLenteCorretiva || '-',
          alignment: 'center',
          fontSize: 11,
        },
      ],
    ],
  };

  // ======= TESTE DE ISHIHARA (SE EXISTIR) - 5 LINHAS E 6 COLUNAS =======
  let ishiharaGrid: { body: any[][] } | null = null;
  let ishiharaConclusao = '';

  if (hasIshiharaData) {
    const placas = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
      placa: n,
      numero: form[`ishiharaPlaca${n}`] || '-',
      resultado: form[`ishiharaResultado${n}`] || '-',
    }));

    const linhasIshihara: any[][] = [];

    linhasIshihara.push([
      { text: 'Placa', style: 'tableHeader', alignment: 'center' },
      { text: 'Resposta', style: 'tableHeader', alignment: 'center' },
      { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
      { text: 'Placa', style: 'tableHeader', alignment: 'center' },
      { text: 'Resposta', style: 'tableHeader', alignment: 'center' },
      { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
    ]);

    for (let i = 0; i < 5; i++) {
      const placa1 = placas[i * 2];
      const placa2 = placas[i * 2 + 1];

      const linha: any[] = [
        { text: placa1.placa.toString(), alignment: 'center', fontSize: 9 },
        { text: placa1.numero, alignment: 'center', fontSize: 9 },
        {
          text: placa1.resultado,
          alignment: 'center',
          fontSize: 8,
          color:
            placa1.resultado === 'Normal'
              ? '#16A34A'
              : placa1.resultado === 'Daltonismo verde-vermelho'
                ? '#F59E0B'
                : placa1.resultado === 'Daltonismo total'
                  ? '#DC2626'
                  : LIGHT_TEXT,
        },
        { text: placa2.placa.toString(), alignment: 'center', fontSize: 9 },
        { text: placa2.numero, alignment: 'center', fontSize: 9 },
        {
          text: placa2.resultado,
          alignment: 'center',
          fontSize: 8,
          color:
            placa2.resultado === 'Normal'
              ? '#16A34A'
              : placa2.resultado === 'Daltonismo verde-vermelho'
                ? '#F59E0B'
                : placa2.resultado === 'Daltonismo total'
                  ? '#DC2626'
                  : LIGHT_TEXT,
        },
      ];

      linhasIshihara.push(linha);
    }

    ishiharaGrid = {
      body: linhasIshihara,
    };

    ishiharaConclusao = form.conclusaoIshihara || 'Visão normal para cores.';
  }

  // ======= TESTE DE ESTEREOPSIA (SE EXISTIR) - COM RESULTADO DE CADA SETA =======
  let estereopsiaGrid: { body: any[][] } | null = null;
  const estereopsiaResumoGrid: { body: any[][] } | null = null;

  if (hasEstereopsiaData) {
    const setasData = [
      { id: 1, numero: '1', direction: 'down' as const },
      { id: 2, numero: '2', direction: 'left' as const },
      { id: 3, numero: '3', direction: 'down' as const },
      { id: 4, numero: '4', direction: 'up' as const },
      { id: 5, numero: '5', direction: 'up' as const },
      { id: 6, numero: '6', direction: 'left' as const },
      { id: 7, numero: '7', direction: 'right' as const },
      { id: 8, numero: '8', direction: 'left' as const },
      { id: 9, numero: '9', direction: 'right' as const },
    ];

    const linhasSetas: any[][] = [];

    linhasSetas.push([
      { text: 'Seta', style: 'tableHeader', alignment: 'center', colSpan: 2 },
      {},
      { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
      { text: 'Seta', style: 'tableHeader', alignment: 'center', colSpan: 2 },
      {},
      { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
      { text: 'Seta', style: 'tableHeader', alignment: 'center', colSpan: 2 },
      {},
      { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
    ]);

    for (let i = 0; i < 3; i++) {
      const seta1 = setasData[i * 3];
      const seta2 = setasData[i * 3 + 1];
      const seta3 = setasData[i * 3 + 2];

      const resposta1 = form.estereopsiaRespostas?.[seta1.id];
      const resposta2 = form.estereopsiaRespostas?.[seta2.id];
      const resposta3 = form.estereopsiaRespostas?.[seta3.id];

      const linha: any[] = [
        { text: `nº ${seta1.numero}`, alignment: 'center', fontSize: 8 },
        createArrowSVG(seta1.direction),
        {
          text: resposta1 || '-',
          alignment: 'center',
          fontSize: 10,
          color:
            resposta1 === 'acerto'
              ? '#16A34A'
              : resposta1 === 'erro'
                ? '#DC2626'
                : LIGHT_TEXT,
        },
        { text: `nº ${seta2.numero}`, alignment: 'center', fontSize: 8 },
        createArrowSVG(seta2.direction),
        {
          text: resposta2 || '-',
          alignment: 'center',
          fontSize: 10,
          color:
            resposta2 === 'acerto'
              ? '#16A34A'
              : resposta2 === 'erro'
                ? '#DC2626'
                : LIGHT_TEXT,
        },
        { text: `nº ${seta3.numero}`, alignment: 'center', fontSize: 8 },
        createArrowSVG(seta3.direction),
        {
          text: resposta3 || '-',
          alignment: 'center',
          fontSize: 10,
          color:
            resposta3 === 'acerto'
              ? '#16A34A'
              : resposta3 === 'erro'
                ? '#DC2626'
                : LIGHT_TEXT,
        },
      ];

      linhasSetas.push(linha);
    }

    estereopsiaGrid = {
      body: linhasSetas,
    };
  }

  // ======= AVALIAÇÃO PCD (SE EXISTIR) =======
  let pcdSection: any[] = [];

  if (hasPCDData) {
    pcdSection = [];

    if (form.criterioPCDIdentificado) {
      pcdSection.push(
        {
          text: 'Critério(s) PCD Identificado(s):',
          bold: true,
          fontSize: 10,
          margin: [0, 5, 0, 2],
        },
        {
          text: form.criterioPCDIdentificado,
          fontSize: 9,
          margin: [0, 0, 0, 5],
        },
      );
    }

    // pcdSection.push(
    //   {
    //     text: `Laudo médico oftalmologista recomendado: ${form.laudoOftalmologistaRecomendado ? 'SIM' : 'NÃO'}`,
    //     bold: true,
    //     fontSize: 10,
    //     color: form.laudoOftalmologistaRecomendado ? '#DC2626' : LIGHT_TEXT,
    //     margin: [0, 5, 0, 10]
    //   }
    // );
  }

  // ======= CONTEÚDO COM NOVO CABEÇALHO =======
  const content: any[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            {
              text: 'ACUIDADE VISUAL',
              style: 'mainTitle',
              margin: [0, 0, 0, 5],
              color: PRIMARY,
            },
            { text: `${TIPOEXAMENOME}`, margin: [0, 0, 0, 0], fontSize: 10 },

            form.criterioPCDIdentificado != ''
              ? {
                  text: `${form.criterioPCDIdentificado}`,
                  margin: [0, 0, 0, 0],
                  fontSize: 8,
                  color: ATTENTION_COLOR,
                }
              : { text: `` },
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
      margin: [0, 0, 0, 15],
    },

    {
      table: {
        widths: ['30%', '20%', '20%', '30%'],
        body: dadosExameGrid.body as any,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },

    {
      text: 'Acuidade Visual',
      style: 'sectionTitle',
      alignment: 'center',
      margin: [0, 5, 0, 5],
    },
    {
      table: {
        widths: ['33%', '34%', '33%'],
        body: acuidadeVisualGrid.body as any,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },
  ];

  if (ishiharaGrid) {
    content.push(
      {
        text: 'Teste de Ishihara (Colorimetria)',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },
      {
        table: {
          widths: ['10%', '15%', '25%', '10%', '15%', '25%'],
          body: ishiharaGrid.body,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 5],
      },
    );
  }

  if (estereopsiaGrid && estereopsiaResumoGrid) {
    content.push(
      {
        text: 'Teste de Estereopsia (Profundidade)',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },
      {
        text: 'Resultado por Seta:',
        bold: true,
        fontSize: 10,
        margin: [0, 0, 0, 5],
      },
      {
        table: {
          widths: [
            '10%',
            '10%',
            '13%',
            '10%',
            '10%',
            '13%',
            '10%',
            '10%',
            '14%',
          ],
          body: estereopsiaGrid.body,
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },
    );

    if (estereopsiaResumoGrid) {
      content.push(
        {
          text: 'Resumo:',
          bold: true,
          fontSize: 10,
          margin: [0, 10, 0, 5],
        },
        {
          text:
            form.estereopsiaTotal > 0
              ? `Acertos: ${form.estereopsiaAcertos?.toString() || '0'} (${Math.round((form.estereopsiaAcertos / form.estereopsiaTotal) * 100)})%`
              : '0%',
          alignment: 'center',
        },
      );
    }
  }

  if (pcdSection.length > 0) {
    content.push(...pcdSection);
  }

  if (form.observacoesFinais) {
    content.push(
      {
        text: 'Observações:',
        bold: true,
        fontSize: 10,
        margin: [0, 5, 0, 2],
      },
      {
        text: form.observacoesFinais,
        fontSize: 9,
        margin: [0, 0, 0, 5],
      },
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
    content,
    footer: buildPdfFooter(
      {
        ...profissional,
        nome: acuidadeVisual?.profissional || profissional?.nome,
        profissional:
          acuidadeVisual?.profissional ||
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
      sectionTitle: { fontSize: 12, bold: true, color: PRIMARY },
      tableHeader: {
        bold: true,
        fillColor: '#E8EAF6',
        color: PRIMARY,
        fontSize: 9,
      },
      tableLabel: { bold: true, color: LIGHT_TEXT, fontSize: 9 },
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}
