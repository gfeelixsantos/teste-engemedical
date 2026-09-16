import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

(pdfMake as any).vfs = pdfFonts.vfs;

const PRIMARY = '#114E34';
const PRIMARY_DARK = '#0A3522';
const LIGHT_TEXT = '#333333';
const MUTED = '#5B5B5B';
const ACCENT = '#A8CE3B';
const WHITE = '#FFFFFF';
const BORDER_COLOR = '#E0E0E0';
const COR_OD = '#B71C1C';
const COR_OE = '#0D47A1';

const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

const iconePath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'icone.png');
const iconeBase64 = fs.existsSync(iconePath)
  ? `data:image/png;base64,${fs.readFileSync(iconePath).toString('base64')}`
  : null;

const sample = {
  nome: 'João da Silva Santos',
  cpf: '123.456.789-00',
  nascimento: '15/03/1985',
  idade: '41 anos',
  cargo: 'Operador de Máquinas',
  setor: 'Produção Industrial',
  empresa: 'Empresa Exemplo Ltda',
  cnpj: '12.345.678/0001-90',
  unidade: 'Unidade Industrial - Campinas/SP',
  dataExame: new Date().toLocaleDateString('pt-BR'),
  medico: 'Dr. Carlos Alberto Mendes',
  crm: 'CRM/SP 123456',
};

// ═══════════════════════════════════════════════════════════════
// HELPERS COMUNS
// ═══════════════════════════════════════════════════════════════
function sectionHeaderExecutive(title: string): any {
  return {
    table: {
      widths: [4, '*'],
      body: [[
        { text: '', fillColor: PRIMARY },
        { text: title, fontSize: 10, bold: true, color: PRIMARY, margin: [10, 4, 10, 4] },
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 0, 0, 6] as [number, number, number, number],
  };
}

function sectionHeaderMinimalist(title: string, lineWidth: number = 80): any {
  return [
    { text: title, fontSize: 10, bold: true, color: PRIMARY, characterSpacing: 2, margin: [0, 0, 0, 3] as [number, number, number, number] },
    { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: lineWidth, y2: 0, lineWidth: 2, lineColor: PRIMARY }], margin: [0, 0, 0, 8] as [number, number, number, number] },
  ];
}

function sectionHeaderCorporate(title: string): any {
  return {
    table: {
      widths: ['*'],
      body: [[{ text: `  ▸ ${title}`, fontSize: 9, bold: true, color: WHITE, fillColor: PRIMARY, margin: [0, 5, 0, 5] as [number, number, number, number] }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 6] as [number, number, number, number],
  };
}

function fieldRow(label: string, value: string, labelW: string = '25%', valueW: string = '75%'): any {
  return {
    columns: [
      { text: label, width: labelW as any, fontSize: 8, bold: true, color: MUTED },
      { text: value, width: valueW as any, fontSize: 9, color: LIGHT_TEXT },
    ],
    margin: [0, 0, 0, 2] as [number, number, number, number],
  };
}

function buildFooter(medico: string, crm: string, nomeFunc: string, cpfFunc: string, unidade: string): any {
  return (currentPage: number, pageCount: number) => ({
    margin: [34, 8, 34, 14] as [number, number, number, number],
    columns: [
      {
        width: '*',
        stack: [
          { table: { widths: [108], body: [[{ text: '', margin: [0, 28, 0, 0] as [number, number, number, number] }]] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.8 : 0), vLineWidth: () => 0, hLineColor: () => PRIMARY } },
          { text: medico.toUpperCase(), fontSize: 6.5, bold: true, color: PRIMARY, margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: crm, fontSize: 6, color: MUTED, margin: [0, 1, 0, 0] as [number, number, number, number] },
        ],
      },
      {
        width: 140,
        stack: [
          { text: nomeFunc, fontSize: 6.5, bold: true, color: PRIMARY, alignment: 'right' as const },
          { text: `CPF: ${cpfFunc}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
          { text: `${unidade}, ${sample.dataExame}`, fontSize: 5.5, color: MUTED, alignment: 'right' as const, margin: [0, 1, 0, 0] as [number, number, number, number] },
        ],
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// FICHA CLÍNICA - VERSÃO A (EXECUTIVE)
// ═══════════════════════════════════════════════════════════════
function fichaClinicaA(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 350, opacity: 0.04, absolutePosition: { x: 150, y: 250 } }]
      : undefined,
    content: [
      // HEADER
      {
        table: {
          widths: ['*'],
          body: [[{
            table: {
              widths: [90, '*', 90],
              body: [[
                logoBase64 ? { image: logoBase64, fit: [75, 38], alignment: 'left', margin: [10, 8, 10, 8] } : { text: '' },
                { stack: [
                  { text: 'ENGENMEDICAL', fontSize: 17, bold: true, color: WHITE, alignment: 'center', margin: [0, 5, 0, 0] },
                  { text: 'FICHA CLÍNICA', fontSize: 10, bold: true, color: ACCENT, alignment: 'center', margin: [0, 2, 0, 0] },
                ]},
                { text: sample.dataExame, fontSize: 8, color: WHITE, alignment: 'right', margin: [10, 10, 10, 0] },
              ]],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => PRIMARY, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12],
      },

      // DADOS DO FUNCIONÁRIO
      sectionHeaderExecutive('DADOS DO FUNCIONÁRIO'),
      { table: { widths: ['*'], body: [[{ stack: [
        fieldRow('Nome:', sample.nome),
        fieldRow('CPF:', sample.cpf),
        fieldRow('Nascimento:', `${sample.nascimento} - ${sample.idade}`),
        fieldRow('Cargo:', sample.cargo),
        fieldRow('Setor:', sample.setor),
      ], margin: [8, 4, 8, 4] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 10] },

      // EMPRESA
      sectionHeaderExecutive('EMPRESA'),
      { table: { widths: ['*'], body: [[{ stack: [
        fieldRow('Razão Social:', sample.empresa),
        fieldRow('CNPJ:', sample.cnpj),
        fieldRow('Unidade:', sample.unidade),
      ], margin: [8, 4, 8, 4] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 10] },

      // ANAMNESE
      sectionHeaderExecutive('ANAMNESE E HISTÓRICO FAMILIAR'),
      { table: { widths: ['*'], body: [[{ stack: [
        fieldRow('Doenças Familiares:', 'Hipertensão, Diabetes'),
        fieldRow('Doenças Pessoais:', 'Nenhuma referida'),
        fieldRow('Afastamento > 15 dias:', 'Não'),
      ], margin: [8, 4, 8, 4] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 10] },

      // HÁBITOS
      sectionHeaderExecutive('HÁBITOS E ATIVIDADE'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('Tabagismo:', 'Não', '40%', '60%'), fieldRow('Etilismo:', 'Social', '40%', '60%')],
        [fieldRow('Atividade Física:', 'Sim', '40%', '60%'), fieldRow('Acima do Peso:', 'Não', '40%', '60%')],
        [fieldRow('Trabalho em Altura:', 'Sim', '40%', '60%'), fieldRow('Espaço Confinado:', 'Não', '40%', '60%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // EXAME FÍSICO
      sectionHeaderExecutive('EXAME FÍSICO'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('Cabeça e Pescoço:', 'Normal', '40%', '60%'), fieldRow('Tórax:', 'Normal', '40%', '60%')],
        [fieldRow('Abdome:', 'Normal', '40%', '60%'), fieldRow('Coluna:', 'Normal', '40%', '60%')],
        [fieldRow('Membros Superiores:', 'Normal', '40%', '60%'), fieldRow('Membros Inferiores:', 'Normal', '40%', '60%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // DADOS VITAIS
      sectionHeaderExecutive('DADOS VITAIS E ANTROPOMETRIA'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('Peso:', '78 kg', '40%', '60%'), fieldRow('Altura:', '1,75 m', '40%', '60%')],
        [fieldRow('IMC:', '25,5', '40%', '60%'), fieldRow('Pressão Arterial:', '120x80 mmHg', '40%', '60%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 12] },

      // CONCLUSÃO
      sectionHeaderExecutive('CONCLUSÃO'),
      { text: 'APTO', fontSize: 14, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 10] },

      // LEGAL
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true, margin: [0, 8, 0, 0] },
    ],
    footer: buildFooter(sample.medico, sample.crm, sample.nome, sample.cpf, sample.unidade),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// FICHA CLÍNICA - VERSÃO B (MINIMALIST)
// ═══════════════════════════════════════════════════════════════
function fichaClinicaB(): any {
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 110],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 300, opacity: 0.03, absolutePosition: { x: 170, y: 280 } }]
      : undefined,
    content: [
      // HEADER
      { columns: [
        logoBase64 ? { image: logoBase64, fit: [65, 32], width: '12%' } : { text: '', width: '12%' },
        { width: '*', stack: [
          { text: 'ENGENMEDICAL', fontSize: 20, bold: true, color: '#1A1A1A', alignment: 'right', characterSpacing: 2 },
        ], margin: [0, 4, 0, 0] },
      ], margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: PRIMARY }], margin: [0, 0, 0, 4] },
      { text: 'FICHA CLÍNICA', fontSize: 10, color: MUTED, alignment: 'right', characterSpacing: 3, margin: [0, 0, 0, 18] },

      // DADOS PESSOAIS
      ...sectionHeaderMinimalist('DADOS DO FUNCIONÁRIO', 100),
      { table: { widths: ['20%', '30%', '20%', '30%'], body: [
        [{ text: 'Nome', fontSize: 7, bold: true, color: MUTED }, { text: 'CPF', fontSize: 7, bold: true, color: MUTED }, { text: 'Nascimento', fontSize: 7, bold: true, color: MUTED }, { text: 'Idade', fontSize: 7, bold: true, color: MUTED }],
        [{ text: sample.nome, fontSize: 9, bold: true, color: LIGHT_TEXT }, { text: sample.cpf, fontSize: 9, color: LIGHT_TEXT }, { text: sample.nascimento, fontSize: 9, color: LIGHT_TEXT }, { text: sample.idade, fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 6] },
      { table: { widths: ['20%', '30%', '20%', '30%'], body: [
        [{ text: 'Cargo', fontSize: 7, bold: true, color: MUTED }, { text: 'Setor', fontSize: 7, bold: true, color: MUTED }, { text: '', fontSize: 7 }, { text: '', fontSize: 7 }],
        [{ text: sample.cargo, fontSize: 9, color: LIGHT_TEXT }, { text: sample.setor, fontSize: 9, color: LIGHT_TEXT }, { text: '', fontSize: 9 }, { text: '', fontSize: 9 }],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // EMPRESA
      ...sectionHeaderMinimalist('EMPRESA', 60),
      { table: { widths: ['33%', '33%', '34%'], body: [
        [{ text: 'Razão Social', fontSize: 7, bold: true, color: MUTED }, { text: 'CNPJ', fontSize: 7, bold: true, color: MUTED }, { text: 'Unidade', fontSize: 7, bold: true, color: MUTED }],
        [{ text: sample.empresa, fontSize: 9, bold: true, color: LIGHT_TEXT }, { text: sample.cnpj, fontSize: 9, color: LIGHT_TEXT }, { text: sample.unidade, fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // ANAMNESE
      ...sectionHeaderMinimalist('ANAMNESE E HISTÓRICO FAMILIAR', 150),
      fieldRow('Doenças Familiares:', 'Hipertensão, Diabetes'),
      fieldRow('Doenças Pessoais:', 'Nenhuma referida'),
      fieldRow('Afastamento > 15 dias:', 'Não'),
      { text: '', margin: [0, 0, 0, 10] as [number, number, number, number] },

      // HÁBITOS
      ...sectionHeaderMinimalist('HÁBITOS E ATIVIDADE', 110),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Tabagismo', fontSize: 7, bold: true, color: MUTED }, { text: 'Etilismo', fontSize: 7, bold: true, color: MUTED }, { text: 'Ativ. Física', fontSize: 7, bold: true, color: MUTED }, { text: 'Acima Peso', fontSize: 7, bold: true, color: MUTED }],
        [{ text: 'Não', fontSize: 9, color: LIGHT_TEXT }, { text: 'Social', fontSize: 9, color: LIGHT_TEXT }, { text: 'Sim', fontSize: 9, color: LIGHT_TEXT }, { text: 'Não', fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // EXAME FÍSICO
      ...sectionHeaderMinimalist('EXAME FÍSICO', 80),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Cabeça/Pescoço', fontSize: 7, bold: true, color: MUTED }, { text: 'Tórax', fontSize: 7, bold: true, color: MUTED }, { text: 'Abdome', fontSize: 7, bold: true, color: MUTED }, { text: 'Coluna', fontSize: 7, bold: true, color: MUTED }],
        [{ text: 'Normal', fontSize: 9, color: LIGHT_TEXT }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // DADOS VITAIS
      ...sectionHeaderMinimalist('DADOS VITAIS', 90),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Peso', fontSize: 7, bold: true, color: MUTED }, { text: 'Altura', fontSize: 7, bold: true, color: MUTED }, { text: 'IMC', fontSize: 7, bold: true, color: MUTED }, { text: 'PA', fontSize: 7, bold: true, color: MUTED }],
        [{ text: '78 kg', fontSize: 9, color: LIGHT_TEXT }, { text: '1,75 m', fontSize: 9, color: LIGHT_TEXT }, { text: '25,5', fontSize: 9, color: LIGHT_TEXT }, { text: '120x80', fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // CONCLUSÃO
      ...sectionHeaderMinimalist('CONCLUSÃO', 80),
      { text: 'APTO', fontSize: 18, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 12] },

      // LEGAL
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 10, 0, 6] },
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 8, 40, 14] as [number, number, number, number],
      columns: [
        { width: '*', stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.8, lineColor: '#1A1A1A' }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.medico.toUpperCase(), fontSize: 6.5, bold: true, color: '#1A1A1A', margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: sample.crm, fontSize: 6, color: MUTED },
        ]},
        { width: 140, stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.8, lineColor: '#1A1A1A' }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.nome, fontSize: 6.5, bold: true, color: '#1A1A1A', alignment: 'right' as const },
          { text: `CPF: ${sample.cpf}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
        ]},
      ],
    }),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// FICHA CLÍNICA - VERSÃO C (CORPORATE FLEX)
// ═══════════════════════════════════════════════════════════════
function fichaClinicaC(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 350, opacity: 0.04, absolutePosition: { x: 150, y: 250 } }]
      : undefined,
    content: [
      // HEADER
      {
        table: {
          widths: ['*'],
          body: [[{
            table: {
              widths: ['*'],
              body: [[{
                stack: [{ columns: [
                  logoBase64 ? { image: logoBase64, fit: [55, 28], width: '10%', margin: [10, 0, 0, 0] } : { text: '', width: '10%' },
                  { width: '*', stack: [
                    { text: 'ENGENMEDICAL', fontSize: 15, bold: true, color: WHITE, characterSpacing: 3, margin: [0, 3, 0, 0] },
                    { text: 'SISTEMA DE GESTÃO EM SAÚDE OCUPACIONAL', fontSize: 6.5, color: ACCENT, characterSpacing: 1, margin: [0, 1, 0, 0] },
                  ]},
                ]}],
                margin: [0, 5, 10, 5] as [number, number, number, number],
              }]],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => PRIMARY, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      { table: { widths: ['*'], body: [[{ text: 'FICHA CLÍNICA', fontSize: 9, bold: true, color: WHITE, alignment: 'center', fillColor: PRIMARY_DARK, margin: [0, 4, 0, 4] }]] }, layout: 'noBorders', margin: [0, 0, 0, 12] },

      // DADOS DO FUNCIONÁRIO
      sectionHeaderCorporate('DADOS DO FUNCIONÁRIO'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Nome', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'CPF', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Nascimento', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Idade', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: sample.nome, fontSize: 9, bold: true, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.cpf, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.nascimento, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.idade, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
        [{ text: 'Cargo', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Setor', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: '', fontSize: 7 }, { text: '', fontSize: 7 }],
        [{ text: sample.cargo, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.setor, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '', fontSize: 9 }, { text: '', fontSize: 9 }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 || i === 3 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // EMPRESA
      sectionHeaderCorporate('EMPRESA'),
      { table: { widths: ['33%', '33%', '34%'], body: [
        [{ text: 'Razão Social', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'CNPJ', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Unidade', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: sample.empresa, fontSize: 9, bold: true, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.cnpj, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.unidade, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // ANAMNESE
      sectionHeaderCorporate('ANAMNESE E HISTÓRICO FAMILIAR'),
      { table: { widths: ['*'], body: [[{ stack: [
        fieldRow('Doenças Familiares:', 'Hipertensão, Diabetes'),
        fieldRow('Doenças Pessoais:', 'Nenhuma referida'),
        fieldRow('Afastamento > 15 dias:', 'Não'),
      ], margin: [8, 4, 8, 4] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F0FAF4', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 10] },

      // HÁBITOS
      sectionHeaderCorporate('HÁBITOS E ATIVIDADE'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Tabagismo', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Etilismo', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Ativ. Física', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Acima Peso', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: 'Não', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Social', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Sim', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Não', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // EXAME FÍSICO
      sectionHeaderCorporate('EXAME FÍSICO'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Cabeça/Pescoço', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Tórax', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Abdome', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Coluna', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: 'Normal', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'Normal', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // DADOS VITAIS
      sectionHeaderCorporate('DADOS VITAIS E ANTROPOMETRIA'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Peso', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Altura', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'IMC', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'PA', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: '78 kg', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '1,75 m', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '25,5', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '120x80', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 12] },

      // CONCLUSÃO
      sectionHeaderCorporate('CONCLUSÃO'),
      { text: 'APTO', fontSize: 16, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 12] },

      // LEGAL
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 8, 0, 6] },
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [30, 8, 30, 14] as [number, number, number, number],
      columns: [
        { width: '*', stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1, lineColor: PRIMARY }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.medico.toUpperCase(), fontSize: 6.5, bold: true, color: PRIMARY, margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: sample.crm, fontSize: 6, color: MUTED },
        ]},
        { width: 140, stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, lineColor: PRIMARY }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.nome, fontSize: 6.5, bold: true, color: PRIMARY, alignment: 'right' as const },
          { text: `CPF: ${sample.cpf}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
        ]},
      ],
    }),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// AUDIOMETRIA - VERSÃO A (EXECUTIVE)
// ═══════════════════════════════════════════════════════════════
function audiometriaA(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 350, opacity: 0.04, absolutePosition: { x: 150, y: 250 } }]
      : undefined,
    content: [
      // HEADER
      {
        table: {
          widths: ['*'],
          body: [[{
            table: {
              widths: [90, '*', 90],
              body: [[
                logoBase64 ? { image: logoBase64, fit: [75, 38], alignment: 'left', margin: [10, 8, 10, 8] } : { text: '' },
                { stack: [
                  { text: 'ENGENMEDICAL', fontSize: 17, bold: true, color: WHITE, alignment: 'center', margin: [0, 5, 0, 0] },
                  { text: 'AUDIOMETRIA OCUPACIONAL', fontSize: 9, bold: true, color: ACCENT, alignment: 'center', margin: [0, 2, 0, 0] },
                ]},
                { text: sample.dataExame, fontSize: 8, color: WHITE, alignment: 'right', margin: [10, 10, 10, 0] },
              ]],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => PRIMARY, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      // DADOS DO FUNCIONÁRIO
      sectionHeaderExecutive('DADOS DO FUNCIONÁRIO'),
      { table: { widths: ['*'], body: [[{ stack: [
        fieldRow('Nome:', sample.nome),
        fieldRow('CPF:', sample.cpf),
        fieldRow('Nascimento:', `${sample.nascimento} - ${sample.idade}`),
        fieldRow('Cargo:', sample.cargo),
      ], margin: [8, 4, 8, 4] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 10] },

      // DADOS TÉCNICOS
      sectionHeaderExecutive('DADOS TÉCNICOS DO EXAME'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('Data Exame:', sample.dataExame, '40%', '60%'), fieldRow('Tipo Audiômetro:', 'AD 229', '40%', '60%')],
        [fieldRow('Calibração:', '01/01/2026', '40%', '60%'), fieldRow('Repouso Auditivo:', '14h', '40%', '60%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // MEATOSCOPIA
      sectionHeaderExecutive('MEATOSCOPIA'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('OD (Ouvido Direito):', 'Conduta normal', '40%', '60%'), fieldRow('OE (Ouvido Esquerdo):', 'Conduta normal', '40%', '60%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // RESULTADOS
      sectionHeaderExecutive('RESULTADOS LLOYD & KAPLAN'),
      { table: {
        widths: ['20%', '20%', '20%', '20%', '20%'],
        body: [
          [{ text: 'Ouvido', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center' }, { text: 'Média Tonal', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center' }, { text: 'Grau Perda', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center' }, { text: 'Configuração', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center' }, { text: 'Tipo Perda', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center' }],
          [{ text: 'OD', bold: true, color: COR_OD, alignment: 'center' }, { text: '25 dB', alignment: 'center', fontSize: 9 }, { text: 'Leve', alignment: 'center', fontSize: 9 }, { text: 'Plana', alignment: 'center', fontSize: 9 }, { text: 'Neurossensorial', alignment: 'center', fontSize: 9 }],
          [{ text: 'OE', bold: true, color: COR_OE, alignment: 'center' }, { text: '20 dB', alignment: 'center', fontSize: 9 }, { text: 'Normal', alignment: 'center', fontSize: 9 }, { text: 'Plana', alignment: 'center', fontSize: 9 }, { text: '-', alignment: 'center', fontSize: 9 }],
        ],
      }, layout: { hLineWidth: (i: number) => (i > 0 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 4, paddingBottom: () => 4 }, margin: [0, 0, 0, 10] },

      // CLASSIFICAÇÃO NR7
      sectionHeaderExecutive('CLASSIFICAÇÃO NR-7'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('OD:', 'Perda Auditiva Leve', '15%', '85%'), fieldRow('OE:', 'Normal', '15%', '85%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F9FAFB', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // CONCLUSÃO
      sectionHeaderExecutive('CONCLUSÃO'),
      { text: 'APTO - Perda Auditiva Leve OD', fontSize: 12, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 10] },

      // LEGAL
      { text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data.', fontSize: 7, bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true },
    ],
    footer: buildFooter(sample.medico, sample.crm, sample.nome, sample.cpf, sample.unidade),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// AUDIOMETRIA - VERSÃO B (MINIMALIST)
// ═══════════════════════════════════════════════════════════════
function audiometriaB(): any {
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 110],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 300, opacity: 0.03, absolutePosition: { x: 170, y: 280 } }]
      : undefined,
    content: [
      // HEADER
      { columns: [
        logoBase64 ? { image: logoBase64, fit: [65, 32], width: '12%' } : { text: '', width: '12%' },
        { width: '*', stack: [
          { text: 'ENGENMEDICAL', fontSize: 20, bold: true, color: '#1A1A1A', alignment: 'right', characterSpacing: 2 },
        ], margin: [0, 4, 0, 0] },
      ], margin: [0, 0, 0, 4] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: PRIMARY }], margin: [0, 0, 0, 4] },
      { text: 'AUDIOMETRIA OCUPACIONAL', fontSize: 10, color: MUTED, alignment: 'right', characterSpacing: 3, margin: [0, 0, 0, 18] },

      // DADOS PESSOAIS
      ...sectionHeaderMinimalist('DADOS DO FUNCIONÁRIO', 100),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Nome', fontSize: 7, bold: true, color: MUTED }, { text: 'CPF', fontSize: 7, bold: true, color: MUTED }, { text: 'Nascimento', fontSize: 7, bold: true, color: MUTED }, { text: 'Idade', fontSize: 7, bold: true, color: MUTED }],
        [{ text: sample.nome, fontSize: 9, bold: true, color: LIGHT_TEXT }, { text: sample.cpf, fontSize: 9, color: LIGHT_TEXT }, { text: sample.nascimento, fontSize: 9, color: LIGHT_TEXT }, { text: sample.idade, fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // DADOS TÉCNICOS
      ...sectionHeaderMinimalist('DADOS TÉCNICOS DO EXAME', 120),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Data', fontSize: 7, bold: true, color: MUTED }, { text: 'Audiômetro', fontSize: 7, bold: true, color: MUTED }, { text: 'Calibração', fontSize: 7, bold: true, color: MUTED }, { text: 'Repouso', fontSize: 7, bold: true, color: MUTED }],
        [{ text: sample.dataExame, fontSize: 9, color: LIGHT_TEXT }, { text: 'AD 229', fontSize: 9, color: LIGHT_TEXT }, { text: '01/01/2026', fontSize: 9, color: LIGHT_TEXT }, { text: '14h', fontSize: 9, color: LIGHT_TEXT }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 16] },

      // RESULTADOS
      ...sectionHeaderMinimalist('RESULTADOS', 70),
      { table: {
        widths: ['20%', '20%', '20%', '20%', '20%'],
        body: [
          [{ text: 'Ouvido', bold: true, fontSize: 8, color: PRIMARY }, { text: 'Média Tonal', bold: true, fontSize: 8, color: PRIMARY }, { text: 'Grau', bold: true, fontSize: 8, color: PRIMARY }, { text: 'Config.', bold: true, fontSize: 8, color: PRIMARY }, { text: 'Tipo', bold: true, fontSize: 8, color: PRIMARY }],
          [{ text: 'OD', bold: true, color: COR_OD, alignment: 'center' }, { text: '25 dB', alignment: 'center', fontSize: 9 }, { text: 'Leve', alignment: 'center', fontSize: 9 }, { text: 'Plana', alignment: 'center', fontSize: 9 }, { text: 'Neuro.', alignment: 'center', fontSize: 9 }],
          [{ text: 'OE', bold: true, color: COR_OE, alignment: 'center' }, { text: '20 dB', alignment: 'center', fontSize: 9 }, { text: 'Normal', alignment: 'center', fontSize: 9 }, { text: 'Plana', alignment: 'center', fontSize: 9 }, { text: '-', alignment: 'center', fontSize: 9 }],
        ],
      }, layout: { hLineWidth: (i: number) => (i > 0 ? 0.5 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 4, paddingBottom: () => 4 }, margin: [0, 0, 0, 16] },

      // CONCLUSÃO
      ...sectionHeaderMinimalist('CONCLUSÃO', 80),
      { text: 'APTO - Perda Auditiva Leve OD', fontSize: 14, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 12] },

      // LEGAL
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 10, 0, 6] },
      { text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data.', fontSize: 7, bold: true, alignment: 'center', margin: [0, 3, 0, 3] },
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 8, 40, 14] as [number, number, number, number],
      columns: [
        { width: '*', stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 110, y2: 0, lineWidth: 0.8, lineColor: '#1A1A1A' }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.medico.toUpperCase(), fontSize: 6.5, bold: true, color: '#1A1A1A', margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: sample.crm, fontSize: 6, color: MUTED },
        ]},
        { width: 140, stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.8, lineColor: '#1A1A1A' }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.nome, fontSize: 6.5, bold: true, color: '#1A1A1A', alignment: 'right' as const },
          { text: `CPF: ${sample.cpf}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
        ]},
      ],
    }),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// AUDIOMETRIA - VERSÃO C (CORPORATE FLEX)
// ═══════════════════════════════════════════════════════════════
function audiometriaC(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 350, opacity: 0.04, absolutePosition: { x: 150, y: 250 } }]
      : undefined,
    content: [
      // HEADER
      {
        table: {
          widths: ['*'],
          body: [[{
            table: {
              widths: ['*'],
              body: [[{
                stack: [{ columns: [
                  logoBase64 ? { image: logoBase64, fit: [55, 28], width: '10%', margin: [10, 0, 0, 0] } : { text: '', width: '10%' },
                  { width: '*', stack: [
                    { text: 'ENGENMEDICAL', fontSize: 15, bold: true, color: WHITE, characterSpacing: 3, margin: [0, 3, 0, 0] },
                    { text: 'SISTEMA DE GESTÃO EM SAÚDE OCUPACIONAL', fontSize: 6.5, color: ACCENT, characterSpacing: 1, margin: [0, 1, 0, 0] },
                  ]},
                ]}],
                margin: [0, 5, 10, 5] as [number, number, number, number],
              }]],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => PRIMARY, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      { table: { widths: ['*'], body: [[{ text: 'AUDIOMETRIA OCUPACIONAL', fontSize: 9, bold: true, color: WHITE, alignment: 'center', fillColor: PRIMARY_DARK, margin: [0, 4, 0, 4] }]] }, layout: 'noBorders', margin: [0, 0, 0, 12] },

      // DADOS DO FUNCIONÁRIO
      sectionHeaderCorporate('DADOS DO FUNCIONÁRIO'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Nome', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'CPF', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Nascimento', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Idade', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: sample.nome, fontSize: 9, bold: true, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.cpf, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.nascimento, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: sample.idade, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // DADOS TÉCNICOS
      sectionHeaderCorporate('DADOS TÉCNICOS DO EXAME'),
      { table: { widths: ['25%', '25%', '25%', '25%'], body: [
        [{ text: 'Data', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Audiômetro', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Calibração', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }, { text: 'Repouso', fontSize: 7, bold: true, color: MUTED, margin: [5, 0, 0, 2] }],
        [{ text: sample.dataExame, fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: 'AD 229', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '01/01/2026', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }, { text: '14h', fontSize: 9, color: LIGHT_TEXT, margin: [5, 0, 0, 4] }],
      ] }, layout: { hLineWidth: (i: number) => (i === 1 ? 0.3 : 0), vLineWidth: () => 0, hLineColor: () => BORDER_COLOR, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 0, 0, 10] },

      // RESULTADOS
      sectionHeaderCorporate('RESULTADOS LLOYD & KAPLAN'),
      { table: {
        widths: ['20%', '20%', '20%', '20%', '20%'],
        body: [
          [{ text: 'Ouvido', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center', margin: [0, 3, 0, 3] }, { text: 'Média', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center', margin: [0, 3, 0, 3] }, { text: 'Grau', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center', margin: [0, 3, 0, 3] }, { text: 'Config.', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center', margin: [0, 3, 0, 3] }, { text: 'Tipo', bold: true, fontSize: 8, color: WHITE, fillColor: PRIMARY, alignment: 'center', margin: [0, 3, 0, 3] }],
          [{ text: 'OD', bold: true, color: COR_OD, alignment: 'center', margin: [0, 3, 0, 3] }, { text: '25 dB', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: 'Leve', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: 'Plana', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: 'Neuro.', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }],
          [{ text: 'OE', bold: true, color: COR_OE, alignment: 'center', margin: [0, 3, 0, 3] }, { text: '20 dB', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: 'Normal', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: 'Plana', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }, { text: '-', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] }],
        ],
      }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2, fillColor: () => '#F0FAF4' }, margin: [0, 0, 0, 10] },

      // CLASSIFICAÇÃO NR7
      sectionHeaderCorporate('CLASSIFICAÇÃO NR-7'),
      { table: { widths: ['50%', '50%'], body: [
        [fieldRow('OD:', 'Perda Auditiva Leve', '15%', '85%'), fieldRow('OE:', 'Normal', '15%', '85%')],
      ] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#F0FAF4', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3 }, margin: [0, 0, 0, 10] },

      // CONCLUSÃO
      sectionHeaderCorporate('CONCLUSÃO'),
      { text: 'APTO - Perda Auditiva Leve OD', fontSize: 12, bold: true, color: PRIMARY, alignment: 'center', margin: [0, 5, 0, 10] },

      // LEGAL
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_COLOR }], margin: [0, 8, 0, 6] },
      { text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data.', fontSize: 7, bold: true, alignment: 'center', margin: [0, 3, 0, 3] },
      { text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.', fontSize: 6.5, color: MUTED, alignment: 'center', italics: true },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [30, 8, 30, 14] as [number, number, number, number],
      columns: [
        { width: '*', stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1, lineColor: PRIMARY }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.medico.toUpperCase(), fontSize: 6.5, bold: true, color: PRIMARY, margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: sample.crm, fontSize: 6, color: MUTED },
        ]},
        { width: 140, stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 1, lineColor: PRIMARY }], margin: [0, 0, 0, 3] as [number, number, number, number] },
          { text: sample.nome, fontSize: 6.5, bold: true, color: PRIMARY, alignment: 'right' as const },
          { text: `CPF: ${sample.cpf}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
        ]},
      ],
    }),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// GENERATE ALL SAMPLES
// ═══════════════════════════════════════════════════════════════
async function generateSamples() {
  const outputDir = path.resolve(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const versions = [
    // FICHA CLÍNICA
    { name: 'ficha-clinica-A-executive', doc: fichaClinicaA() },
    { name: 'ficha-clinica-B-minimalist', doc: fichaClinicaB() },
    { name: 'ficha-clinica-C-corporate', doc: fichaClinicaC() },
    // AUDIOMETRIA
    { name: 'audiometria-A-executive', doc: audiometriaA() },
    { name: 'audiometria-B-minimalist', doc: audiometriaB() },
    { name: 'audiometria-C-corporate', doc: audiometriaC() },
  ];

  for (const v of versions) {
    const pdfDoc = (pdfMake as any).createPdf(v.doc);
    const filePath = path.join(outputDir, `${v.name}.pdf`);

    await new Promise<void>((resolve, reject) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ ${v.name}.pdf`);
        resolve();
      });
    });
  }

  console.log('\n🎉 6 PDFs gerados em temp_pdfs/');
}

generateSamples().catch(console.error);
