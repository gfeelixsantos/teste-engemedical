import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';
import { getImageBase64 } from 'src/utils/util';
import { WorkerAsoInput } from '../aso-worker.types';

export async function gerarTemplateRelatorioAtendimento(
  data: WorkerAsoInput,
): Promise<TDocumentDefinitions> {
  const PRIMARY = '#1f5f46';
  const LIGHT_TEXT = '#111827';
  const MUTED = '#6b7280';
  const BORDER_COLOR = '#e5e7eb';

  const {
    funcionario,
    empresa,
    unidade,
    unidadeAtendimento,
    atendimento,
    exames,
    parecer,
  } = data;

  const logoLocalPath = path.resolve(
    process.cwd(),
    '..',
    'engemedical-connect-frontend',
    'public',
    'images',
    'cmso_logo.png',
  );
  const logoCmso = fs.existsSync(logoLocalPath)
    ? `data:image/png;base64,${fs.readFileSync(logoLocalPath).toString('base64')}`
    : await getImageBase64('https://cmsocupacional.com.br/images/logo.png');

  // Formatação de data/hora
  const formatDateTime = (value?: string | null): string => {
    if (!value) return 'Pendente';
    const trimmed = value.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return trimmed;
  };

  const safeFormatDate = (value?: string | null): string => {
    if (!value) return 'N/D';
    const trimmed = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return trimmed;
  };

  const dataFicha = safeFormatDate(atendimento.dataAgendamento);
  const horaFicha = atendimento.horario
    ? atendimento.horario.substring(0, 5)
    : 'N/A';

  const empresaDocumento = empresa.cnpj || 'N/A';
  const recomendacaoMedica = parecer?.details || '';

  // Filtra exames que possuem sala definida (mesmo comportamento do Puppeteer)
  const examesRealizados = (exames || [])
    .filter((exam) => exam.sala?.trim());

  const examesTableBody = [
    [
      { text: 'EXAME', style: 'tableHeader' },
      { text: 'SALA', style: 'tableHeader' },
      { text: 'DATA/HORA', style: 'tableHeader' },
    ],
  ];

  if (examesRealizados.length > 0) {
    examesRealizados.forEach((exam) => {
      examesTableBody.push([
        { text: exam.nomeExame || 'N/A', style: 'tableCell' } as any,
        { text: exam.sala || 'N/A', style: 'tableCell' } as any,
        { text: formatDateTime(exam.dataExame), style: 'tableCell' } as any,
      ]);
    });
  } else {
    examesTableBody.push([
      { text: 'Nenhum exame realizado registrado', colSpan: 3, style: 'tableCellEmpty' } as any,
      {} as any,
      {} as any,
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [45, 45, 45, 45],
    content: [
      // Cabeçalho
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: funcionario.nome, style: 'employeeName' },
              {
                text: `CPF: ${funcionario.cpfMascarado || 'N/D'} | Matrícula: ${funcionario.codigo || 'N/D'}`,
                style: 'employeeMeta',
              },
              {
                text: [
                  { text: 'Empresa: ', bold: true },
                  { text: empresa.nome },
                ],
                style: 'employeeMeta',
              },
            ],
          },
          {
            width: 100,
            image: logoCmso ?? undefined,
            alignment: 'right',
          } as any,
        ],
        margin: [0, 0, 0, 15],
      },
      // Linha separadora
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 505,
            y2: 0,
            lineWidth: 1,
            lineColor: BORDER_COLOR,
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Seção: Informações Gerais
      { text: 'INFORMAÇÕES GERAIS', style: 'sectionTitle' },
      {
        columns: [
          {
            width: '50%',
            table: {
              widths: ['35%', '65%'],
              body: [
                [
                  { text: 'CNPJ', style: 'metaLabel' },
                  { text: empresaDocumento, style: 'metaValue' },
                ],
                [
                  { text: 'Cargo', style: 'metaLabel' },
                  { text: funcionario.cargo || 'N/A', style: 'metaValue' },
                ],
                [
                  { text: 'Setor', style: 'metaLabel' },
                  { text: funcionario.setor || 'N/A', style: 'metaValue' },
                ],
                [
                  { text: 'Unidade', style: 'metaLabel' },
                  { text: unidade.nome || 'N/A', style: 'metaValue' },
                ],
              ],
            },
            layout: 'noBorders',
          },
          {
            width: '50%',
            table: {
              widths: ['40%', '60%'],
              body: [
                [
                  { text: 'Data e hora', style: 'metaLabel' },
                  { text: `${dataFicha} às ${horaFicha}`, style: 'metaValue' },
                ],
                [
                  { text: 'Unid. Atendimento', style: 'metaLabel' },
                  { text: unidadeAtendimento || 'N/A', style: 'metaValue' },
                ],
                [
                  { text: 'Tipo Exame', style: 'metaLabel' },
                  { text: atendimento.tipoExameNome || 'N/A', style: 'metaValue' },
                ],
                [
                  { text: 'Senha', style: 'metaLabel' },
                  {
                    text: atendimento.ticket
                      ? `${atendimento.ticket.prefixo || ''}${atendimento.ticket.numero || ''}`
                      : 'N/A',
                    style: 'metaValueBold'
                  },
                ],
              ],
            },
            layout: 'noBorders',
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Seção: Recomendação Médica (se houver)
      ...(recomendacaoMedica
        ? [
            { text: 'RECOMENDAÇÃO MÉDICA', style: 'sectionTitle' },
            {
              table: {
                widths: ['100%'],
                body: [[{ text: recomendacaoMedica, style: 'blockContent' }]],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => BORDER_COLOR,
                vLineColor: () => BORDER_COLOR,
              },
              margin: [0, 0, 0, 20] as [number, number, number, number],
            },
          ]
        : []),

      // Seção: Exames Realizados
      { text: 'EXAMES REALIZADOS', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['60%', '15%', '25%'],
          body: examesTableBody,
        },
        layout: {
          hLineWidth: (i) => (i === 1 ? 2 : 1),
          vLineWidth: () => 0,
          hLineColor: (i) => (i === 1 ? PRIMARY : BORDER_COLOR),
        },
      },

      // Rodapé dentro da página
      {
        text: `Relatório gerado em ${new Date().toLocaleString('pt-BR')}\nDocumento confidencial`,
        style: 'footerText',
        margin: [0, 30, 0, 0],
      },
    ],
    styles: {
      employeeName: {
        fontSize: 16,
        bold: true,
        color: PRIMARY,
      },
      employeeMeta: {
        fontSize: 10,
        color: MUTED,
        margin: [0, 2, 0, 0],
      },
      sectionTitle: {
        fontSize: 9,
        bold: true,
        color: PRIMARY,
        characterSpacing: 1,
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      metaLabel: {
        fontSize: 10,
        color: MUTED,
        margin: [0, 2, 0, 2],
      },
      metaValue: {
        fontSize: 10,
        color: LIGHT_TEXT,
        margin: [0, 2, 0, 2],
      },
      metaValueBold: {
        fontSize: 10,
        bold: true,
        color: LIGHT_TEXT,
        margin: [0, 2, 0, 2] as [number, number, number, number],
      },
      blockContent: {
        fontSize: 10,
        color: LIGHT_TEXT,
        margin: [6, 6, 6, 6],
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: MUTED,
        margin: [0, 4, 0, 4] as [number, number, number, number],
      },
      tableCell: {
        fontSize: 8,
        color: LIGHT_TEXT,
        margin: [0, 4, 0, 4],
      },
      tableCellEmpty: {
        fontSize: 10,
        color: MUTED,
        alignment: 'center',
        margin: [0, 8, 0, 8],
      },
      footerText: {
        fontSize: 8,
        color: MUTED,
        alignment: 'center',
      },
    },
  };

  return docDefinition;
}
