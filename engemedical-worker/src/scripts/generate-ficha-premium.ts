import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';

(pdfMake as any).vfs = pdfFonts.vfs;

// ═══════════════════════════════════════════════════════════════
// CORES PROFISSIONAIS - SAÚDE OCUPACIONAL
// ═══════════════════════════════════════════════════════════════
const C = {
  // Principais
  verdeEscuro: '#1B5E20',
  verde: '#2E7D32',
  verdeClaro: '#4CAF50',
  ciano: '#0097A7',
  cianoClaro: '#B2EBF2',
  azulEscuro: '#0D47A1',
  azul: '#1565C0',
  azulClaro: '#E3F2FD',

  // Neutros
  preto: '#1A1A1A',
  texto: '#212121',
  textoSec: '#424242',
  muted: '#757575',
  borda: '#E0E0E0',
  fundo: '#FAFAFA',
  branco: '#FFFFFF',

  // Status
  apto: '#2E7D32',
  inapto: '#C62828',
  alerta: '#E65100',
};

const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

const iconePath = path.resolve(process.cwd(), 'src', 'assets', 'images', 'icone.png');
const iconeBase64 = fs.existsSync(iconePath)
  ? `data:image/png;base64,${fs.readFileSync(iconePath).toString('base64')}`
  : null;

// ═══════════════════════════════════════════════════════════════
// DADOS DE EXEMPLO
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// VERSÃO A - CLEAN MEDICAL
// Design limpo, tipografia clara, fundo branco com acentos verdes
// ═══════════════════════════════════════════════════════════════
function fichaA(): any {
  const section = (title: string) => ({
    table: {
      widths: ['*'],
      body: [[{
        text: title,
        fontSize: 10,
        bold: true,
        color: C.branco,
        fillColor: C.verdeEscuro,
        margin: [8, 6, 8, 6] as [number, number, number, number],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 10, 0, 0] as [number, number, number, number],
  });

  const field = (label: string, value: string) => ({
    columns: [
      { text: label, width: 120, fontSize: 8.5, bold: true, color: C.muted },
      { text: value, width: '*', fontSize: 9.5, color: C.texto },
    ],
    margin: [8, 3, 8, 3] as [number, number, number, number],
  });

  const grid2 = (rows: [string, string, string, string][]) => ({
    table: {
      widths: ['22%', '28%', '22%', '28%'],
      body: rows.map(r => [
        { text: r[0], fontSize: 8, bold: true, color: C.muted, margin: [8, 4, 4, 4] as [number, number, number, number] },
        { text: r[1], fontSize: 9, color: C.texto, margin: [4, 4, 8, 4] as [number, number, number, number] },
        { text: r[2], fontSize: 8, bold: true, color: C.muted, margin: [8, 4, 4, 4] as [number, number, number, number] },
        { text: r[3], fontSize: 9, color: C.texto, margin: [4, 4, 8, 4] as [number, number, number, number] },
      ]),
    },
    layout: {
      hLineWidth: (i: number) => (i > 0 ? 0.3 : 0),
      vLineWidth: () => 0,
      hLineColor: () => C.borda,
      fillColor: () => C.fundo,
      paddingTop: () => 0,
      paddingBottom: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
    },
    margin: [0, 0, 0, 0] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 35, 40, 90],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 250, opacity: 0.02, absolutePosition: { x: 200, y: 350 } }]
      : undefined,
    content: [
      // CABEÇALHO
      {
        columns: [
          logoBase64
            ? { image: logoBase64, fit: [45, 45], width: 55 }
            : { width: 55, text: '' },
          {
            width: '*',
            stack: [
              { text: 'ENGENMEDICAL', fontSize: 20, bold: true, color: C.verdeEscuro, characterSpacing: 1.5 },
              { text: 'Sistema de Gestão em Saúde Ocupacional', fontSize: 8, color: C.muted, margin: [0, 1, 0, 0] as [number, number, number, number] },
            ],
            margin: [0, 5, 0, 0] as [number, number, number, number],
          },
          {
            width: 100,
            stack: [
              { text: P.data, fontSize: 8, color: C.muted, alignment: 'right' as const },
            ],
            margin: [0, 5, 0, 0] as [number, number, number, number],
          },
        ],
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      // Linha separadora
      {
        canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: C.verde }],
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      // Título
      {
        text: 'FICHA CLÍNICA',
        fontSize: 14,
        bold: true,
        color: C.verdeEscuro,
        alignment: 'center',
        characterSpacing: 4,
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        text: 'Avaliação Clínica Ocupacional',
        fontSize: 9,
        color: C.muted,
        alignment: 'center',
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },

      // DADOS DO FUNCIONÁRIO
      section('DADOS DO FUNCIONÁRIO'),
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              field('Nome completo:', P.nome),
              field('CPF:', P.cpf),
              field('Data de nascimento:', `${P.nasc} — ${P.idade}`),
              field('Cargo:', P.cargo),
              field('Setor:', P.setor),
            ],
          }]],
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => C.fundo, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      },

      // EMPRESA
      section('DADOS DA EMPRESA'),
      grid2([
        ['Razão social:', P.empresa, 'CNPJ:', P.cnpj],
        ['Unidade:', P.unidade, '', ''],
      ]),

      // ANAMNESE
      section('ANAMNESE E HISTÓRICO FAMILIAR'),
      grid2([
        ['Doenças familiares:', 'Hipertensão, Diabetes', 'Doenças pessoais:', 'Nenhuma referida'],
        ['Afastamento > 15 dias:', 'Não', 'Relato:', '—'],
      ]),

      // HÁBITOS
      section('HÁBITOS E ESTILO DE VIDA'),
      {
        table: {
          widths: ['17%', '17%', '17%', '17%', '16%', '16%'],
          body: [
            [
              { text: 'Tabagismo', fontSize: 7.5, bold: true, color: C.muted, margin: [8, 4, 4, 2] as [number, number, number, number] },
              { text: 'Etilismo', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'Ativ. Física', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'Altura', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'IMC', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 8, 2] as [number, number, number, number] },
            ],
            [
              { text: 'Não', fontSize: 9, color: C.texto, margin: [8, 2, 4, 4] as [number, number, number, number] },
              { text: 'Social', fontSize: 9, color: C.texto, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: 'Sim', fontSize: 9, color: C.verde, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: '78 kg', fontSize: 9, color: C.texto, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: '1,75 m', fontSize: 9, color: C.texto, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: '25,5', fontSize: 9, color: C.texto, margin: [4, 2, 8, 4] as [number, number, number, number] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 1 ? 0.3 : 0),
          vLineWidth: () => 0,
          hLineColor: () => C.borda,
          fillColor: (i: number) => (i === 0 ? C.branco : C.fundo),
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },

      // EXAME FÍSICO
      section('EXAME FÍSICO'),
      {
        table: {
          widths: ['33%', '33%', '34%'],
          body: [
            [
              { text: 'Cabeça e Pescoço', fontSize: 7.5, bold: true, color: C.muted, margin: [8, 4, 4, 2] as [number, number, number, number] },
              { text: 'Tórax', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'Abdome', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 8, 2] as [number, number, number, number] },
            ],
            [
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [8, 2, 4, 4] as [number, number, number, number] },
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [4, 2, 8, 4] as [number, number, number, number] },
            ],
            [
              { text: 'Coluna', fontSize: 7.5, bold: true, color: C.muted, margin: [8, 4, 4, 2] as [number, number, number, number] },
              { text: 'Membros Superiores', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 4, 2] as [number, number, number, number] },
              { text: 'Membros Inferiores', fontSize: 7.5, bold: true, color: C.muted, margin: [4, 4, 8, 2] as [number, number, number, number] },
            ],
            [
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [8, 2, 4, 4] as [number, number, number, number] },
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [4, 2, 4, 4] as [number, number, number, number] },
              { text: 'Normal', fontSize: 9, color: C.verde, margin: [4, 2, 8, 4] as [number, number, number, number] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 1 || i === 3 ? 0.3 : 0),
          vLineWidth: () => 0,
          hLineColor: () => C.borda,
          fillColor: (i: number) => (i === 0 || i === 2 ? C.branco : C.fundo),
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },

      // PRESSÃO ARTERIAL
      section('PRESSÃO ARTERIAL'),
      grid2([
        ['PA Sistólica:', '120 mmHg', 'PA Diastólica:', '80 mmHg'],
      ]),

      // CONCLUSÃO
      section('PARECER MÉDICO'),
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'APTO',
            fontSize: 18,
            bold: true,
            color: C.apto,
            alignment: 'center',
            margin: [0, 8, 0, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => '#E8F5E9',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // LEGAL
      {
        text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
        fontSize: 7,
        color: C.muted,
        alignment: 'center',
        italics: true,
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 8, 40, 12] as [number, number, number, number],
      columns: [
        {
          width: '*',
          stack: [
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.8, lineColor: C.verde }],
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            { text: P.medico.toUpperCase(), fontSize: 7, bold: true, color: C.verdeEscuro, margin: [0, 0, 0, 1] as [number, number, number, number] },
            { text: P.crm, fontSize: 6.5, color: C.muted },
          ],
        },
        {
          width: 150,
          stack: [
            { text: P.nome, fontSize: 7, bold: true, color: C.verdeEscuro, alignment: 'right' as const },
            { text: `CPF: ${P.cpf}`, fontSize: 6.5, color: C.muted, alignment: 'right' as const },
            { text: `${P.unidade}, ${P.data}`, fontSize: 6, color: C.muted, alignment: 'right' as const, margin: [0, 1, 0, 0] as [number, number, number, number] },
          ],
        },
      ],
    }),
    defaultStyle: { fontSize: 10, color: C.texto },
  };
}

// ═══════════════════════════════════════════════════════════════
// VERSÃO B - CORPORATE HEALTH
// Header azul-ciano, cards brancos sobre fundo cinza, visual corporativo
// ═══════════════════════════════════════════════════════════════
function fichaB(): any {
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
    margin: [0, 0, 0, 0] as [number, number, number, number],
  });

  const field = (label: string, value: string) => ({
    columns: [
      { text: label, width: 130, fontSize: 8.5, bold: true, color: C.muted },
      { text: value, width: '*', fontSize: 9.5, color: C.texto },
    ],
    margin: [0, 3, 0, 3] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    background: () => ({
      table: {
        widths: ['*'],
        body: [[{
          text: '',
          fillColor: C.fundo,
        }]],
      },
      layout: 'noBorders',
    }),
    content: [
      // HEADER
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              {
                columns: [
                  logoBase64
                    ? { image: logoBase64, fit: [40, 40], width: 50, margin: [20, 0, 0, 0] }
                    : { width: 50, text: '' },
                  {
                    width: '*',
                    stack: [
                      { text: 'ENGENMEDICAL', fontSize: 18, bold: true, color: C.branco, characterSpacing: 2, margin: [0, 6, 0, 0] as [number, number, number, number] },
                      { text: 'SISTEMA DE GESTÃO EM SAÚDE OCUPACIONAL', fontSize: 7, color: C.cianoClaro, characterSpacing: 1, margin: [0, 2, 0, 0] as [number, number, number, number] },
                    ],
                  },
                  {
                    width: 120,
                    stack: [
                      { text: P.data, fontSize: 8, color: C.branco, alignment: 'right' as const, margin: [0, 8, 20, 0] as [number, number, number, number] },
                    ],
                  },
                ],
              },
            ],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => C.azulEscuro,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      // Barra ciano
      {
        table: { widths: ['*'], body: [[{ text: '', margin: [0, 0, 0, 0] }]] },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => C.ciano, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      },
      // Conteúdo
      {
        margin: [20, 16, 20, 0] as [number, number, number, number],
        stack: [
          // Título
          {
            text: 'FICHA CLÍNICA',
            fontSize: 14,
            bold: true,
            color: C.azulEscuro,
            alignment: 'center',
            characterSpacing: 3,
            margin: [0, 0, 0, 2] as [number, number, number, number],
          },
          {
            text: 'Avaliação Clínica Ocupacional',
            fontSize: 9,
            color: C.muted,
            alignment: 'center',
            margin: [0, 0, 0, 10] as [number, number, number, number],
          },

          // DADOS DO FUNCIONÁRIO
          section('DADOS DO FUNCIONÁRIO', C.azulEscuro),
          card([
            field('Nome completo:', P.nome),
            field('CPF:', P.cpf),
            field('Data de nascimento:', `${P.nasc} — ${P.idade}`),
            field('Cargo:', P.cargo),
            field('Setor:', P.setor),
          ]),

          // EMPRESA
          section('DADOS DA EMPRESA', C.verde),
          card([
            field('Razão social:', P.empresa),
            field('CNPJ:', P.cnpj),
            field('Unidade:', P.unidade),
          ]),

          // ANAMNESE
          section('ANAMNESE E HISTÓRICO FAMILIAR', C.azulEscuro),
          card([
            field('Doenças familiares:', 'Hipertensão, Diabetes Mellitus tipo 2'),
            field('Doenças pessoais:', 'Nenhuma referida'),
            field('Afastamento > 15 dias:', 'Não'),
          ]),

          // HÁBITOS
          section('HÁBITOS E ESTILO DE VIDA', C.verde),
          card([
            {
              table: {
                widths: ['16%', '17%', '17%', '17%', '16%', '17%'],
                body: [
                  [
                    { text: 'Tabagismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'Etilismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'Ativ. Física', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'Altura', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'IMC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                  ],
                  [
                    { text: 'Não', fontSize: 9, color: C.texto },
                    { text: 'Social', fontSize: 9, color: C.texto },
                    { text: 'Sim', fontSize: 9, color: C.verde },
                    { text: '1,75 m', fontSize: 9, color: C.texto },
                    { text: '78 kg', fontSize: 9, color: C.texto },
                    { text: '25,5', fontSize: 9, color: C.texto },
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

          // EXAME FÍSICO
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

          // PRESSÃO ARTERIAL
          section('PRESSÃO ARTERIAL', C.verde),
          card([
            {
              table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [
                  [
                    { text: 'PAS', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'PAD', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'FC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: 'SpO2', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
                  ],
                  [
                    { text: '120 mmHg', fontSize: 9, color: C.texto },
                    { text: '80 mmHg', fontSize: 9, color: C.texto },
                    { text: '72 bpm', fontSize: 9, color: C.texto },
                    { text: '98%', fontSize: 9, color: C.texto },
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

          // CONCLUSÃO
          section('PARECER MÉDICO', C.verde),
          card([
            {
              table: {
                widths: ['*'],
                body: [[{
                  text: 'APTO',
                  fontSize: 18,
                  bold: true,
                  color: C.apto,
                  alignment: 'center',
                  margin: [0, 8, 0, 8] as [number, number, number, number],
                }]],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                fillColor: () => '#E8F5E9',
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0,
              },
            },
          ]),

          // LEGAL
          {
            text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
            fontSize: 7,
            color: C.muted,
            alignment: 'center',
            italics: true,
            margin: [0, 10, 0, 0] as [number, number, number, number],
          },
        ],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [20, 8, 20, 12] as [number, number, number, number],
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

// ═══════════════════════════════════════════════════════════════
// VERSÃO C - EXECUTIVE HEALTH
// Design executivo, bordas finas, muito espaço em branco, elegante
// ═══════════════════════════════════════════════════════════════
function fichaC(): any {
  const section = (title: string) => [
    {
      canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: C.verde }],
      margin: [0, 12, 0, 0] as [number, number, number, number],
    },
    {
      text: title,
      fontSize: 9,
      bold: true,
      color: C.verdeEscuro,
      characterSpacing: 2,
      margin: [0, 4, 0, 6] as [number, number, number, number],
    },
  ];

  const field = (label: string, value: string) => ({
    columns: [
      { text: label, width: 110, fontSize: 8, bold: true, color: C.muted },
      { text: value, width: '*', fontSize: 9, color: C.texto },
    ],
    margin: [0, 2, 0, 2] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [50, 40, 50, 90],
    background: iconeBase64
      ? [{ image: iconeBase64, width: 200, opacity: 0.015, absolutePosition: { x: 220, y: 400 } }]
      : undefined,
    content: [
      // CABEÇALHO
      {
        columns: [
          logoBase64
            ? { image: logoBase64, fit: [40, 40], width: 50 }
            : { width: 50, text: '' },
          {
            width: '*',
            stack: [
              { text: 'ENGENMEDICAL', fontSize: 22, bold: true, color: C.preto, characterSpacing: 3 },
              { text: ' Saúde Ocupacional', fontSize: 9, color: C.muted, margin: [0, 1, 0, 0] as [number, number, number, number] },
            ],
            margin: [0, 8, 0, 0] as [number, number, number, number],
          },
        ],
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: C.preto }],
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: C.verde }],
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        text: 'FICHA CLÍNICA',
        fontSize: 16,
        bold: true,
        color: C.preto,
        alignment: 'center',
        characterSpacing: 5,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      {
        text: 'Avaliação Clínica Ocupacional',
        fontSize: 8,
        color: C.muted,
        alignment: 'center',
        characterSpacing: 1,
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      // DADOS DO FUNCIONÁRIO
      ...section('DADOS DO FUNCIONÁRIO'),
      field('Nome completo:', P.nome),
      field('CPF:', P.cpf),
      field('Data de nascimento:', `${P.nasc} — ${P.idade}`),
      field('Cargo:', P.cargo),
      field('Setor:', P.setor),

      // EMPRESA
      ...section('DADOS DA EMPRESA'),
      field('Razão social:', P.empresa),
      field('CNPJ:', P.cnpj),
      field('Unidade de atendimento:', P.unidade),

      // ANAMNESE
      ...section('ANAMNESE E HISTÓRICO FAMILIAR'),
      field('Doenças familiares:', 'Hipertensão, Diabetes Mellitus tipo 2'),
      field('Doenças pessoais:', 'Nenhuma referida'),
      field('Afastamento > 15 dias:', 'Não'),

      // HÁBITOS
      ...section('HÁBITOS E ESTILO DE VIDA'),
      {
        table: {
          widths: ['16%', '17%', '17%', '17%', '16%', '17%'],
          body: [
            [
              { text: 'Tabagismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: 'Etilismo', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: 'Ativ. Física', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: 'Altura', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: 'Peso', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
              { text: 'IMC', fontSize: 7.5, bold: true, color: C.muted, margin: [0, 0, 0, 2] as [number, number, number, number] },
            ],
            [
              { text: 'Não', fontSize: 9, color: C.texto },
              { text: 'Social', fontSize: 9, color: C.texto },
              { text: 'Sim', fontSize: 9, color: C.verde },
              { text: '1,75 m', fontSize: 9, color: C.texto },
              { text: '78 kg', fontSize: 9, color: C.texto },
              { text: '25,5', fontSize: 9, color: C.texto },
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
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },

      // EXAME FÍSICO
      ...section('EXAME FÍSICO'),
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
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },

      // PRESSÃO ARTERIAL
      ...section('PRESSÃO ARTERIAL'),
      field('PA Sistólica:', '120 mmHg'),
      field('PA Diastólica:', '80 mmHg'),

      // CONCLUSÃO
      ...section('PARECER MÉDICO'),
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'APTO',
            fontSize: 18,
            bold: true,
            color: C.apto,
            alignment: 'center',
            margin: [0, 8, 0, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          fillColor: () => '#E8F5E9',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      // LEGAL
      {
        canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: C.borda }],
        margin: [0, 8, 0, 6] as [number, number, number, number],
      },
      {
        text: 'Documento assinado eletronicamente, conforme MP nº 2.200-2/2001 e Lei nº 14.063/2020.',
        fontSize: 7,
        color: C.muted,
        alignment: 'center',
        italics: true,
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [50, 8, 50, 12] as [number, number, number, number],
      columns: [
        {
          width: '*',
          stack: [
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.5, lineColor: C.preto }],
              margin: [0, 0, 0, 4] as [number, number, number, number],
            },
            { text: P.medico.toUpperCase(), fontSize: 7, bold: true, color: C.preto, margin: [0, 0, 0, 1] as [number, number, number, number] },
            { text: P.crm, fontSize: 6.5, color: C.muted },
          ],
        },
        {
          width: 160,
          stack: [
            { text: P.nome, fontSize: 7, bold: true, color: C.preto, alignment: 'right' as const },
            { text: `CPF: ${P.cpf}`, fontSize: 6.5, color: C.muted, alignment: 'right' as const },
            { text: `${P.unidade}, ${P.data}`, fontSize: 6, color: C.muted, alignment: 'right' as const, margin: [0, 1, 0, 0] as [number, number, number, number] },
          ],
        },
      ],
    }),
    defaultStyle: { fontSize: 10, color: C.texto },
  };
}

// ═══════════════════════════════════════════════════════════════
// GERAR PDFs
// ═══════════════════════════════════════════════════════════════
async function generate() {
  const dir = path.resolve(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const docs = [
    { name: 'v1-clean-medical', doc: fichaA() },
    { name: 'v2-corporate-health', doc: fichaB() },
    { name: 'v3-executive-health', doc: fichaC() },
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
  console.log('\n🎉 3 versões premium geradas em temp_pdfs/');
}

generate().catch(console.error);
