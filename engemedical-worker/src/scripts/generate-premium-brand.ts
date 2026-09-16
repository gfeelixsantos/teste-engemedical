import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

(pdfMake as any).vfs = pdfFonts.vfs;

// ═══════════════════════════════════════════════════════════════
// CORES EXTRAÍDAS DO LOGO ENGENMEDICAL
// ═══════════════════════════════════════════════════════════════
const CYAN = '#29ABE2';
const CYAN_DARK = '#1A8BC7';
const GREEN = '#00A651';
const GREEN_DARK = '#008C44';
const LIME = '#7AC143';
const TEAL = '#0071BC';
const DARK = '#1B2A3D';
const LIGHT_TEXT = '#2C3E50';
const MUTED = '#5D6D7E';
const WHITE = '#FFFFFF';
const BG_LIGHT = '#F0F7FB';
const BG_CIANO = '#E8F6FD';
const BORDER = '#D5E8F0';
const ACCENT_YELLOW = '#F1C40F';

const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

const iconePath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'icone.png');
const iconeBase64 = fs.existsSync(iconePath)
  ? `data:image/png;base64,${fs.readFileSync(iconePath).toString('base64')}`
  : null;

const S = {
  nome: 'João da Silva Santos',
  cpf: '123.456.789-00',
  nasc: '15/03/1985',
  idade: '41 anos',
  cargo: 'Operador de Máquinas',
  setor: 'Produção Industrial',
  empresa: 'Empresa Exemplo Ltda',
  cnpj: '12.345.678/0001-90',
  unidade: 'Unidade Industrial - Campinas/SP',
  data: new Date().toLocaleDateString('pt-BR'),
  medico: 'Dr. Carlos Alberto Mendes',
  crm: 'CRM/SP 123456',
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function headerBlock(title: string, subtitle?: string): any {
  return [
    // Barra principal gradiente (simulado com 2 cores)
    {
      table: {
        widths: ['60%', '40%'],
        body: [[
          {
            stack: [
              logoBase64
                ? { image: logoBase64, fit: [50, 25], margin: [12, 0, 8, 0] }
                : { text: '' },
              { text: 'ENGENMEDICAL', fontSize: 18, bold: true, color: WHITE, characterSpacing: 2, margin: [0, 2, 0, 0] },
            ],
            columns: [
              logoBase64 ? { width: 60, image: logoBase64, fit: [50, 25], margin: [0, 6, 0, 0] } : { width: 0, text: '' },
              { width: '*', text: 'ENGENMEDICAL', fontSize: 18, bold: true, color: WHITE, characterSpacing: 2, margin: [0, 8, 0, 0] },
            ],
          },
          {
            stack: [
              { text: subtitle || 'SISTEMA DE GESTÃO EM SAÚDE OCUPACIONAL', fontSize: 7, color: WHITE, alignment: 'right', margin: [0, 8, 12, 0], characterSpacing: 1 },
              { text: S.data, fontSize: 8, color: WHITE, alignment: 'right', margin: [0, 2, 12, 0] },
            ],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => CYAN,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 0] as [number, number, number, number],
    },
    // Barra fina verde
    {
      table: {
        widths: ['*'],
        body: [[{ text: '', margin: [0, 0, 0, 0] }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => GREEN,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 3] as [number, number, number, number],
    },
    // Titulo do documento
    {
      text: title,
      fontSize: 13,
      bold: true,
      color: DARK,
      alignment: 'center',
      characterSpacing: 3,
      margin: [0, 8, 0, 4] as [number, number, number, number],
    },
    // Linha decorativa dupla
    {
      table: {
        widths: ['*'],
        body: [[{ text: '', margin: [0, 0, 0, 0] }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => CYAN,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 2] as [number, number, number, number],
    },
    {
      table: {
        widths: ['*'],
        body: [[{ text: '', margin: [0, 0, 0, 0] }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        fillColor: () => GREEN,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
  ];
}

function sectionBar(title: string, color: string = CYAN): any {
  return {
    table: {
      widths: ['*'],
      body: [[{
        text: `  ${title}`,
        fontSize: 9,
        bold: true,
        color: WHITE,
        fillColor: color,
        margin: [0, 5, 0, 5] as [number, number, number, number],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 0] as [number, number, number, number],
  };
}

function sectionGreen(title: string): any {
  return sectionBar(title, GREEN);
}

function fieldRow(l: string, v: string, lw: string = '22%', vw: string = '78%'): any {
  return {
    columns: [
      { text: l, width: lw as any, fontSize: 8, bold: true, color: MUTED },
      { text: v, width: vw as any, fontSize: 9, color: LIGHT_TEXT, bold: true },
    ],
    margin: [0, 0, 0, 2] as [number, number, number, number],
  };
}

function cardLight(content: any): any {
  return {
    table: {
      widths: ['*'],
      body: [[{ stack: content, margin: [10, 6, 10, 6] }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => BG_LIGHT,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 8] as [number, number, number, number],
  };
}

function cardCyan(content: any): any {
  return {
    table: {
      widths: ['*'],
      body: [[{ stack: content, margin: [10, 6, 10, 6] }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => BG_CIANO,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 8] as [number, number, number, number],
  };
}

function footerDefault(): any {
  return (currentPage: number, pageCount: number) => ({
    margin: [34, 8, 34, 14] as [number, number, number, number],
    columns: [
      {
        width: '*',
        stack: [
          {
            table: {
              widths: [108],
              body: [[{ text: '', margin: [0, 28, 0, 0] }]],
            },
            layout: {
              hLineWidth: (i: number) => (i === 1 ? 0.8 : 0),
              vLineWidth: () => 0,
              hLineColor: () => CYAN,
            },
          },
          { text: S.medico.toUpperCase(), fontSize: 6.5, bold: true, color: CYAN_DARK, margin: [0, 2, 0, 0] as [number, number, number, number] },
          { text: S.crm, fontSize: 6, color: MUTED },
        ],
      },
      {
        width: 140,
        stack: [
          { text: S.nome, fontSize: 6.5, bold: true, color: CYAN_DARK, alignment: 'right' as const },
          { text: `CPF: ${S.cpf}`, fontSize: 6, color: MUTED, alignment: 'right' as const },
          { text: `${S.unidade}, ${S.data}`, fontSize: 5.5, color: MUTED, alignment: 'right' as const, margin: [0, 1, 0, 0] as [number, number, number, number] },
        ],
      },
    ],
  });
}

// ═══════════════════════════════════════════════════════════════
// FICHA CLÍNICA - PREMIUM BRAND
// ═══════════════════════════════════════════════════════════════
function fichaClinicaPremium(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 25, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 280, opacity: 0.03, absolutePosition: { x: 180, y: 300 } }]
      : undefined,
    content: [
      ...headerBlock('FICHA CLÍNICA', 'AVALIAÇÃO CLÍNICA OCUPACIONAL'),

      // DADOS DO FUNCIONÁRIO
      sectionBar('DADOS DO FUNCIONÁRIO', CYAN),
      cardLight([
        fieldRow('Nome completo:', S.nome),
        fieldRow('CPF:', S.cpf),
        fieldRow('Data de nascimento:', `${S.nasc} — ${S.idade}`),
        fieldRow('Cargo:', S.cargo),
        fieldRow('Setor:', S.setor),
      ]),

      // EMPRESA
      sectionGreen('DADOS DA EMPRESA'),
      cardLight([
        fieldRow('Razão social:', S.empresa),
        fieldRow('CNPJ:', S.cnpj),
        fieldRow('Unidade de atendimento:', S.unidade),
      ]),

      // ANAMNESE
      sectionBar('ANAMNESE E HISTÓRICO FAMILIAR', CYAN_DARK),
      cardCyan([
        fieldRow('Doenças familiares:', 'Hipertensão, Diabetes Mellitus tipo 2'),
        fieldRow('Doenças pessoais:', 'Nenhuma referida'),
        fieldRow('Afastamento > 15 dias:', 'Não'),
        fieldRow('Relato de afastamento:', '—'),
      ]),

      // HÁBITOS
      sectionGreen('HÁBITOS E ESTILO DE VIDA'),
      cardLight([
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Tabagismo', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Etilismo', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Ativ. Física', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Acima do Peso', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Não', fontSize: 9, color: LIGHT_TEXT },
                { text: 'Social', fontSize: 9, color: LIGHT_TEXT },
                { text: 'Sim', fontSize: 9, color: GREEN },
                { text: 'Não', fontSize: 9, color: LIGHT_TEXT },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
        { text: '', margin: [0, 0, 0, 2] as [number, number, number, number] },
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Trabalho em Altura', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Espaço Confinado', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Operar Veículos', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Carregar Peso', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Sim', fontSize: 9, color: GREEN },
                { text: 'Não', fontSize: 9, color: LIGHT_TEXT },
                { text: 'Sim', fontSize: 9, color: GREEN },
                { text: 'Sim', fontSize: 9, color: GREEN },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // EXAME FÍSICO
      sectionBar('EXAME FÍSICO', CYAN),
      cardLight([
        {
          table: {
            widths: ['33%', '33%', '34%'],
            body: [
              [
                { text: 'Cabeça e Pescoço', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Tórax', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Abdome', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Normal', fontSize: 9, color: GREEN },
                { text: 'Normal', fontSize: 9, color: GREEN },
                { text: 'Normal', fontSize: 9, color: GREEN },
              ],
              [
                { text: 'Coluna', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Sup.', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Inf.', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 4, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Normal', fontSize: 9, color: GREEN },
                { text: 'Normal', fontSize: 9, color: GREEN },
                { text: 'Normal', fontSize: 9, color: GREEN },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 || i === 3 ? 0.3 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // DADOS VITAIS
      sectionGreen('DADOS VITAIS E ANTROPOMETRIA'),
      cardLight([
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Peso', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Altura', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'IMC', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Pressão Arterial', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: '78 kg', fontSize: 10, bold: true, color: LIGHT_TEXT, margin: [0, 0, 0, 0] },
                { text: '1,75 m', fontSize: 10, bold: true, color: LIGHT_TEXT, margin: [0, 0, 0, 0] },
                { text: '25,5', fontSize: 10, bold: true, color: LIGHT_TEXT, margin: [0, 0, 0, 0] },
                { text: '120x80', fontSize: 10, bold: true, color: GREEN, margin: [0, 0, 0, 0] },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
      ]),

      // CONCLUSÃO
      sectionBar('PARECER MÉDICO', GREEN),
      cardCyan([
        {
          table: {
            widths: ['*'],
            body: [[{
              text: 'APTO',
              fontSize: 20,
              bold: true,
              color: GREEN,
              alignment: 'center',
              margin: [0, 8, 0, 8] as [number, number, number, number],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => WHITE,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
      ]),

      // LEGAL
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
            fontSize: 6.5,
            color: MUTED,
            alignment: 'center',
            italics: true,
            margin: [0, 4, 0, 0] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => BG_LIGHT,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    footer: footerDefault(),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// AUDIOMETRIA - PREMIUM BRAND
// ═══════════════════════════════════════════════════════════════
function audiometriaPremium(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 25, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 280, opacity: 0.03, absolutePosition: { x: 180, y: 300 } }]
      : undefined,
    content: [
      ...headerBlock('AUDIOMETRIA OCUPACIONAL', 'EXAME AUDIOLÓGICO OCUPACIONAL'),

      // DADOS DO FUNCIONÁRIO
      sectionBar('DADOS DO FUNCIONÁRIO', CYAN),
      cardLight([
        fieldRow('Nome completo:', S.nome),
        fieldRow('CPF:', S.cpf),
        fieldRow('Data de nascimento:', `${S.nasc} — ${S.idade}`),
        fieldRow('Cargo:', S.cargo),
      ]),

      // DADOS TÉCNICOS
      sectionGreen('DADOS TÉCNICOS DO EXAME'),
      cardCyan([
        {
          table: {
            widths: ['25%', '25%', '25%', '25%'],
            body: [
              [
                { text: 'Data do Exame', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Tipo Audiômetro', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Data Calibração', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'Repouso Auditivo', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: S.data, fontSize: 9, color: LIGHT_TEXT },
                { text: 'AD 229', fontSize: 9, color: LIGHT_TEXT },
                { text: '01/01/2026', fontSize: 9, color: LIGHT_TEXT },
                { text: '14 horas', fontSize: 9, color: LIGHT_TEXT },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => WHITE,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // MEATOSCOPIA
      sectionBar('MEATOSCOPIA', CYAN_DARK),
      cardLight([
        {
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                { text: 'OD (Ouvido Direito)', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
                { text: 'OE (Ouvido Esquerdo)', fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Conduta normal — MEATO sem alterações', fontSize: 9, color: GREEN },
                { text: 'Conduta normal — MEATO sem alterações', fontSize: 9, color: GREEN },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
        },
      ]),

      // RESULTADOS
      sectionGreen('RESULTADOS LLOYD & KAPLAN'),
      cardLight([
        {
          table: {
            widths: ['16%', '16%', '16%', '16%', '18%', '18%'],
            body: [
              [
                { text: 'Ouvido', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Média Tonal', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Grau da Perda', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Configuração', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Tipo de Perda', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Classif. NR7', bold: true, fontSize: 7.5, color: WHITE, fillColor: CYAN, alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
              ],
              [
                { text: 'OD', bold: true, color: '#B71C1C', alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: '25 dB', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Leve', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number], color: '#E67E22' },
                { text: 'Plana', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Neurossensorial', alignment: 'center', fontSize: 8, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Leve', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number], color: '#E67E22' },
              ],
              [
                { text: 'OE', bold: true, color: '#0D47A1', alignment: 'center', margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: '20 dB', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Normal', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number], color: GREEN },
                { text: 'Plana', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: '—', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number] },
                { text: 'Normal', alignment: 'center', fontSize: 9, margin: [0, 3, 0, 3] as [number, number, number, number], color: GREEN },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i > 0 ? 0.5 : 0),
            vLineWidth: () => 0,
            hLineColor: () => BORDER,
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
        },
      ]),

      // CONCLUSÃO
      sectionBar('CONCLUSÃO AUDIOLÓGICA', GREEN),
      cardCyan([
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: 'APTO', fontSize: 18, bold: true, color: GREEN, alignment: 'center', margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Perda Auditiva Leve — Ouvido Direito (OD)', fontSize: 9, color: LIGHT_TEXT, alignment: 'center', margin: [0, 0, 0, 4] as [number, number, number, number] },
              ],
            }]],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => WHITE,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
        },
      ]),

      // AVISO
      {
        text: 'Os dados obtidos são subjetivos e correspondem ao exame realizado na presente data.',
        fontSize: 7,
        bold: true,
        alignment: 'center',
        color: MUTED,
        margin: [0, 6, 0, 4] as [number, number, number, number],
      },

      // LEGAL
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
            fontSize: 6.5,
            color: MUTED,
            alignment: 'center',
            italics: true,
            margin: [0, 4, 0, 0] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => BG_LIGHT,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    footer: footerDefault(),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// RESTRIÇÃO TEMPORÁRIA - PREMIUM BRAND
// ═══════════════════════════════════════════════════════════════
function restricaoPremium(): any {
  return {
    pageSize: 'A4',
    pageMargins: [30, 25, 30, 100],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 280, opacity: 0.03, absolutePosition: { x: 180, y: 300 } }]
      : undefined,
    content: [
      ...headerBlock('RESTRIÇÃO TEMPORÁRIA', 'CONTROLE MÉDICO DE AUSÊNCIA'),

      // DADOS DO FUNCIONÁRIO
      sectionBar('DADOS DO FUNCIONÁRIO', CYAN),
      cardLight([
        fieldRow('Nome completo:', S.nome),
        fieldRow('CPF:', S.cpf),
        fieldRow('Cargo:', S.cargo),
        fieldRow('Setor:', S.setor),
      ]),

      // EMPRESA
      sectionGreen('DADOS DA EMPRESA'),
      cardLight([
        fieldRow('Razão social:', S.empresa),
        fieldRow('CNPJ:', S.cnpj),
      ]),

      // DETALHES DA RESTRIÇÃO
      sectionBar('DETALHES DA RESTRIÇÃO TEMPORÁRIA', CYAN_DARK),
      cardCyan([
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              [
                { text: 'Data de Início:', bold: true, fontSize: 9, color: CYAN_DARK, margin: [10, 0, 0, 4] as [number, number, number, number] },
                { text: '15/09/2026', fontSize: 9, color: LIGHT_TEXT, margin: [10, 0, 0, 4] as [number, number, number, number] },
              ],
              [
                { text: 'Data de Término:', bold: true, fontSize: 9, color: CYAN_DARK, margin: [10, 0, 0, 4] as [number, number, number, number] },
                { text: '29/09/2026', fontSize: 9, color: LIGHT_TEXT, margin: [10, 0, 0, 4] as [number, number, number, number] },
              ],
              [
                { text: 'Duração:', bold: true, fontSize: 9, color: CYAN_DARK, margin: [10, 0, 0, 4] as [number, number, number, number] },
                { text: '14 dias', fontSize: 9, color: LIGHT_TEXT, margin: [10, 0, 0, 4] as [number, number, number, number] },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number) => (i > 0 && i < 3 ? 0.3 : 0),
            vLineWidth: () => 0,
            hLineColor: () => WHITE,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
        },
      ]),

      // RESTRIÇÕES MÉDICAS
      sectionBar('RESTRIÇÕES MÉDICAS', CYAN),
      cardLight([
        {
          stack: [
            { text: '▸ Evitar carregar peso acima de 5kg', fontSize: 9, color: LIGHT_TEXT, margin: [0, 0, 0, 3] as [number, number, number, number] },
            { text: '▸ Evitar elevação dos braços acima dos ombros', fontSize: 9, color: LIGHT_TEXT, margin: [0, 0, 0, 3] as [number, number, number, number] },
            { text: '▸ Evitar curvar tronco com frequência', fontSize: 9, color: LIGHT_TEXT, margin: [0, 0, 0, 3] as [number, number, number, number] },
            { text: '▸ Evitar subir/descer escadas ou degraus', fontSize: 9, color: LIGHT_TEXT, margin: [0, 0, 0, 3] as [number, number, number, number] },
          ],
        },
      ]),

      // OBSERVAÇÕES
      sectionGreen('OBSERVAÇÕES MÉDICAS'),
      cardLight([
        { text: 'Retorno previsto para reavaliação médica após o período de 14 dias. Paciente orientado a manter repouso relativo e comparecer à consulta de retorno.', fontSize: 9, color: LIGHT_TEXT, alignment: 'justify', lineHeight: 1.4 },
      ]),

      // ASSINATURAS
      sectionBar('ASSINATURAS', CYAN_DARK),
      cardLight([
        {
          columns: [
            {
              width: '*',
              stack: [
                { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8, lineColor: CYAN }], margin: [0, 0, 0, 3] as [number, number, number, number] },
                { text: S.nome, fontSize: 7, bold: true, color: CYAN_DARK, margin: [0, 0, 0, 1] as [number, number, number, number] },
                { text: `CPF: ${S.cpf}`, fontSize: 6.5, color: MUTED },
                { text: 'Assinatura do Funcionário', fontSize: 6, color: MUTED, italics: true, margin: [0, 1, 0, 0] as [number, number, number, number] },
              ],
            },
            { width: 20, text: '' },
            {
              width: '*',
              stack: [
                { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.8, lineColor: GREEN }], margin: [0, 0, 0, 3] as [number, number, number, number] },
                { text: S.empresa, fontSize: 7, bold: true, color: GREEN_DARK, margin: [0, 0, 0, 1] as [number, number, number, number] },
                { text: `CNPJ: ${S.cnpj}`, fontSize: 6.5, color: MUTED },
                { text: 'Assinatura do Responsável', fontSize: 6, color: MUTED, italics: true, margin: [0, 1, 0, 0] as [number, number, number, number] },
              ],
            },
          ],
        },
      ]),

      // LEGAL
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
            fontSize: 6.5,
            color: MUTED,
            alignment: 'center',
            italics: true,
            margin: [0, 4, 0, 0] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => BG_LIGHT,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    footer: footerDefault(),
    defaultStyle: { fontSize: 10, color: LIGHT_TEXT },
  };
}

// ═══════════════════════════════════════════════════════════════
// GENERATE
// ═══════════════════════════════════════════════════════════════
async function generate() {
  const dir = path.resolve(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const docs = [
    { name: 'premium-ficha-clinica', doc: fichaClinicaPremium() },
    { name: 'premium-audiometria', doc: audiometriaPremium() },
    { name: 'premium-restricao', doc: restricaoPremium() },
  ];

  for (const d of docs) {
    const pdfDoc = (pdfMake as any).createPdf(d.doc);
    const filePath = path.join(dir, `${d.name}.pdf`);
    await new Promise<void>((resolve) => {
      pdfDoc.getBuffer((buffer: Buffer) => {
        fs.writeFileSync(filePath, buffer);
        console.log(`✅ ${d.name}.pdf`);
        resolve();
      });
    });
  }
  console.log('\n🎉 3 PDFs premium brand gerados em temp_pdfs/');
}

generate().catch(console.error);
