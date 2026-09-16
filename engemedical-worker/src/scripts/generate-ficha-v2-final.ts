import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

(pdfMake as any).vfs = pdfFonts.vfs;

const C = {
  verdeEscuro: '#1B5E20',
  verde: '#2E7D32',
  verdeClaro: '#4CAF50',
  ciano: '#0097A7',
  cianoClaro: '#B2EBF2',
  azulEscuro: '#0D47A1',
  azul: '#1565C0',
  azulClaro: '#E3F2FD',
  preto: '#1A1A1A',
  texto: '#212121',
  textoSec: '#424242',
  muted: '#757575',
  borda: '#E0E0E0',
  fundo: '#F5F5F5',
  branco: '#FFFFFF',
  apto: '#2E7D32',
};

const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

const iconePath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'icone.png');
const iconeBase64 = fs.existsSync(iconePath)
  ? `data:image/png;base64,${fs.readFileSync(iconePath).toString('base64')}`
  : null;

const P = {
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

function fichaV2Final(): any {
  // Helper: seção com borda lateral ciano
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

  // Helper: card branco
  const card = (content: any, margin?: [number, number, number, number]) => ({
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
    margin: margin || [0, 0, 0, 0] as [number, number, number, number],
  });

  // Helper: campo label/value
  const field = (label: string, value: string) => ({
    columns: [
      { text: label, width: 110, fontSize: 8.5, bold: true, color: C.muted },
      { text: value, width: '*', fontSize: 9.5, color: C.texto },
    ],
    margin: [0, 2, 0, 2] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [20, 20, 20, 85],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 600, opacity: 0.06, absolutePosition: { x: 320, y: 50 } }]
      : undefined,
    content: [
      // ═══ CABEÇALHO: Logo esquerda + Tipo da ficha centro ═══
      {
        columns: [
          // Logo (maior)
          {
            width: 120,
            stack: [
              logoBase64
                ? { image: logoBase64, fit: [110, 110], alignment: 'center' }
                : { text: '' },
            ],
          },
          // Tipo da ficha e subtítulo centralizados
          {
            width: '*',
            stack: [
              { text: 'FICHA CLÍNICA', fontSize: 22, bold: true, color: C.azulEscuro, alignment: 'center', characterSpacing: 3, margin: [0, 4, 0, 3] as [number, number, number, number] },
              { text: 'Avaliação Clínica Ocupacional', fontSize: 9, color: C.muted, alignment: 'center', characterSpacing: 1, margin: [0, 0, 0, 0] as [number, number, number, number] },
            ],
            margin: [0, 8, 0, 0] as [number, number, number, number],
          },
          // Espaço reservado para simetria
          { width: 80, text: '' },
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
          // COLUNA ESQUERDA - Funcionário
          {
            width: '50%',
            stack: [
              section('DADOS DO FUNCIONÁRIO', C.azulEscuro),
              card([
                field('Nome:', P.nome),
                field('CPF:', P.cpf),
                field('Nascimento:', `${P.nasc} — ${P.idade}`),
                field('Cargo:', P.cargo),
                field('Setor:', P.setor),
              ]),
            ],
          },
          // COLUNA DIREITA - Empresa
          {
            width: '50%',
            stack: [
              section('DADOS DA EMPRESA', C.verde),
              card([
                field('Razão social:', P.empresa),
                field('CNPJ:', P.cnpj),
                field('Unidade:', P.unidade),
                { text: '', margin: [0, 0, 0, 0] as [number, number, number, number] },
                field('Data do exame:', P.data),
              ]),
            ],
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ═══ ANAMNESE ═══
      section('ANAMNESE E HISTÓRICO FAMILIAR', C.azulEscuro),
      card([
        field('Doenças familiares:', 'Hipertensão, Diabetes Mellitus tipo 2'),
        field('Doenças pessoais:', 'Nenhuma referida'),
        field('Afastamento > 15 dias:', 'Não'),
      ]),

      // ═══ HÁBITOS + PRESSÃO ARTERIAL lado a lado ═══
      {
        columns: [
          // COLUNA ESQUERDA - Hábitos
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
                        { text: 'Não', fontSize: 9, color: C.texto },
                        { text: 'Social', fontSize: 9, color: C.texto },
                      ],
                      [
                        { text: 'Ativ. Física', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                        { text: 'Acima do Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                      ],
                      [
                        { text: 'Sim', fontSize: 9, color: C.verde },
                        { text: 'Não', fontSize: 9, color: C.texto },
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
          // COLUNA DIREITA - Pressão Arterial
          {
            width: '50%',
            stack: [
              section('PRESSÃO ARTERIAL', C.ciano),
              card([
                {
                  table: {
                    widths: ['50%', '50%'],
                    body: [
                      [
                        { text: 'PAS (Sistólica)', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                        { text: 'PAD (Diastólica)', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                      ],
                      [
                        { text: '120 mmHg', fontSize: 10, bold: true, color: C.texto },
                        { text: '80 mmHg', fontSize: 10, bold: true, color: C.texto },
                      ],
                      [
                        { text: 'FC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                        { text: 'SpO2', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                      ],
                      [
                        { text: '72 bpm', fontSize: 10, bold: true, color: C.texto },
                        { text: '98%', fontSize: 10, bold: true, color: C.texto },
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
                { text: 'Normal', fontSize: 9, color: C.verde },
                { text: 'Normal', fontSize: 9, color: C.verde },
                { text: 'Normal', fontSize: 9, color: C.verde },
              ],
              [
                { text: 'Coluna', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Sup.', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
                { text: 'Membros Inf.', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 4, 0, 2] as [number, number, number, number] },
              ],
              [
                { text: 'Normal', fontSize: 9, color: C.verde },
                { text: 'Normal', fontSize: 9, color: C.verde },
                { text: 'Normal', fontSize: 9, color: C.verde },
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

      // ═══ PARECER MÉDICO ═══
      section('PARECER MÉDICO', C.verde),
      {
        text: 'APTO',
        fontSize: 20,
        bold: true,
        color: C.apto,
        alignment: 'center',
        margin: [0, 8, 0, 8] as [number, number, number, number],
      },

      // LEGAL
      {
        text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
        fontSize: 7,
        color: C.muted,
        alignment: 'center',
        italics: true,
        margin: [0, 8, 0, 0] as [number, number, number, number],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [20, 8, 20, 10] as [number, number, number, number],
      table: {
        widths: ['*', 150],
        body: [[
          {
            stack: [
              {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: C.ciano }],
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              { text: P.medico.toUpperCase(), fontSize: 7, bold: true, color: C.azulEscuro, margin: [0, 0, 0, 1] as [number, number, number, number] },
              { text: P.crm, fontSize: 6.5, color: C.muted },
            ],
          },
          {
            stack: [
              { text: P.nome, fontSize: 7, bold: true, color: C.azulEscuro, alignment: 'right' as const },
              { text: `CPF: ${P.cpf}`, fontSize: 6.5, color: C.muted, alignment: 'right' as const },
              { text: `${P.unidade}, ${P.data}`, fontSize: 6, color: C.muted, alignment: 'right' as const, margin: [0, 1, 0, 0] as [number, number, number, number] },
            ],
          },
        ]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 10,
        paddingRight: () => 10,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    }),
    defaultStyle: { fontSize: 10, color: C.texto },
  };
}

async function generate() {
  const dir = path.resolve(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const doc = fichaV2Final();
  const pdfDoc = (pdfMake as any).createPdf(doc);
  const filePath = path.join(dir, 'v2-final-ficha-clinica.pdf');

  await new Promise<void>((resolve) => {
    pdfDoc.getBuffer((buffer: Buffer) => {
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ v2-final-ficha-clinica.pdf`);
      resolve();
    });
  });
  console.log('\n🎉 Versão final gerada em temp_pdfs/');
}

generate().catch(console.error);
