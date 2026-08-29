import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ASSINATURAS_URL } from 'src/soc/assinaturas';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import { createGridSection, formatCPF, getImageBase64 } from 'src/utils/util';

export async function gerarDocAcuidadeVisual(
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

  const acuidadeVisual = EXAMES?.find((e: any) =>
    Object.prototype.hasOwnProperty.call(getExamesList(), e.grupo),
  );
  const form = acuidadeVisual?.formulario || {};

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

  // ======= VERIFICAR SE EXISTEM TESTES OPCIONAIS =======
  const hasIshiharaData = Object.keys(form).some(
    (key) => key.startsWith('ishiharaPlaca') && form[key],
  );
  const hasEstereopsiaData =
    form.estereopsiaResultado ||
    form.estereopsiaObservacao ||
    form.estereopsiaAcertos > 0;

  // ======= GRID DE ACUIDADE VISUAL =======
  const acuidadeVisualGrid = {
    body: [
      [
        { text: 'Dist├óncia', style: 'tableHeader', alignment: 'center' },
        {
          text: 'Olho Direito (OD)',
          style: 'tableHeader',
          alignment: 'center',
        },
        {
          text: 'Olho Esquerdo (OE)',
          style: 'tableHeader',
          alignment: 'center',
        },
        { text: 'Binocular', style: 'tableHeader', alignment: 'center' },
      ],
      [
        { text: 'Para Longe', style: 'tableLabel' },
        { text: form.longeOD || '-', alignment: 'center' },
        { text: form.longeOE || '-', alignment: 'center' },
        { text: form.longeBinocular || '-', alignment: 'center' },
      ],
      [
        { text: 'Para Perto', style: 'tableLabel' },
        { text: '-', alignment: 'center' },
        { text: '-', alignment: 'center' },
        { text: form.pertoBinocular || '-', alignment: 'center' },
      ],
    ],
  };

  // ======= TESTE DE ISHIHARA (SE EXISTIR) =======
  let ishiharaGrid: { body: any[][] } | null = null;
  let ishiharaConclusao = '';

  if (hasIshiharaData) {
    const placas = Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
      placa: n,
      numero: form[`ishiharaPlaca${n}`] || '-',
      resultado: form[`ishiharaResultado${n}`] || '-',
    }));

    ishiharaGrid = {
      body: [
        [
          { text: 'Placa', style: 'tableHeader', alignment: 'center' },
          {
            text: 'N├║mero Identificado',
            style: 'tableHeader',
            alignment: 'center',
          },
          { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
        ],
        ...placas.map((p) => [
          { text: p.placa.toString(), alignment: 'center' },
          { text: p.numero, alignment: 'center' },
          { text: p.resultado, alignment: 'center' },
        ]),
      ],
    };

    ishiharaConclusao = form.conclusaoIshihara || 'Vis├úo normal para cores.';
  }

  // ======= TESTE DE ESTEREOPSIA (SE EXISTIR) =======
  const hasRespostasEstereopsia =
    form.estereopsiaRespostas &&
    Object.keys(form.estereopsiaRespostas).length > 0;

  let estereopsiaResumo;
  if (hasEstereopsiaData) {
    estereopsiaResumo = {
      body: [
        [
          { text: 'Resultado', style: 'tableHeader', alignment: 'center' },
          { text: 'Observa├º├úo', style: 'tableHeader', alignment: 'center' },
        ],
        [
          {
            text: form.estereopsiaResultado || '-',
            alignment: 'center',
            color:
              form.estereopsiaResultado === 'Normal'
                ? '#16A34A'
                : form.estereopsiaResultado === 'Alterado'
                  ? '#DC2626'
                  : LIGHT_TEXT,
          },
          { text: form.estereopsiaObservacao || '-', alignment: 'center' },
        ],
      ],
    };
  }

  // ======= CONTE├ÜDO =======
  const content: any[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'ACUIDADE VISUAL', style: 'mainTitle', color: PRIMARY },
            { text: `${TIPOEXAMENOME}: ${form.resultado || 'PENDENTE'}` },
          ],
        },
        {
          stack: [
            logoEmpresa
              ? { image: logoEmpresa, width: 110, alignment: 'right' }
              : { text: '' },
            {
              text: `${UNIDADEATENDIMENTO}, ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date())}`,
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
      text: `Exame realizado ${form.exameComLenteCorretiva === 'Sim' ? 'COM' : 'SEM'} lentes corretivas`,
      alignment: 'center',
      bold: true,
      fontSize: 12,
      color: PRIMARY,
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
        widths: ['*', '*', '*', '*'],
        body: acuidadeVisualGrid.body as any,
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 15],
    },
  ];

  // Ishihara (opcional)
  if (ishiharaGrid) {
    content.push(
      {
        text: 'Teste de Ishihara (Colorimetria)',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },
      {
        table: { widths: ['15%', '35%', '50%'], body: ishiharaGrid.body },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 5],
      },
      {
        text: `Conclus├úo: ${ishiharaConclusao}`,
        alignment: 'center',
        bold: true,
        fontSize: 10,
        color: ishiharaConclusao.toLowerCase().includes('normal')
          ? '#16A34A'
          : '#DC2626',
        margin: [0, 0, 0, 15],
      },
    );
  }

  // Estereopsia (opcional)
  if (estereopsiaResumo) {
    content.push(
      {
        text: 'Teste de Estereopsia (Profundidade)',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 5, 0, 5],
      },
      {
        table: { widths: ['30%', '70%'], body: estereopsiaResumo.body },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15],
      },
    );
  }

  // Resultado e observa├º├Áes
  content.push(
    {
      text: `RESULTADO: ${form.resultado?.toUpperCase() || 'PENDENTE'}`,
      alignment: 'center',
      bold: true,
      fontSize: 14,
      color:
        form.resultado === 'Vis├úo Normal'
          ? '#16A34A'
          : form.resultado?.includes('Defici├¬ncia')
            ? '#F57C00'
            : PRIMARY,
      margin: [0, 10, 0, 5],
    },
    form.observacoesFinais
      ? {
          text: `Observa├º├Áes: ${form.observacoesFinais}`,
          alignment: 'center',
          italics: true,
          fontSize: 9,
          margin: [0, 0, 0, 15],
        }
      : {},
  );

  // Assinaturas
  content.push({
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
          { text: form.profissional || 'N/D', fontSize: 8, alignment: 'left' },
          {
            text: `Registro: ${conselho || 'N/D'}`,
            fontSize: 8,
            alignment: 'left',
          },
          { text: `CPF: ${formatCPF(cpf)}`, fontSize: 8, alignment: 'left' },
        ],
      },
      {
        width: '50%',
        stack: [
          {
            text: `O(a) funcion├írio(a) confirma a realiza├º├úo do exame em ${new Date().toLocaleString('pt-BR')}.`,
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
  });

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
    content,
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
