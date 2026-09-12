import ExcelJS from 'exceljs';

type ReportRow = {
  rowNumber: number;
  cpf?: string;
  maskedCpf?: string;
  nomeFuncionario?: string;
  nomeSetor?: string;
  nomeCargo?: string;
  matriculaRh?: string;
  codigoFuncionario?: string;
  codigoEmpresaSoc?: string;
  lookupKey?: string;
  situationToSend?: string;
  success?: boolean;
  notInBase?: boolean;
  httpStatus?: number;
  error?: string;
};

type ReportSummary = {
  totalSelected: number;
  success: number;
  failed: number;
  notInBase: number;
  skippedByLimit: number;
  delayMs: number;
  totalRows?: number;
  situationCounts?: Record<string, number>;
};

/**
 * Gera um Excel premium com o relatório completo de processamento SOC.
 * Retorna o buffer do arquivo Excel.
 */
export async function generateSocReportExcel(
  rows: ReportRow[],
  summary: ReportSummary,
  fileName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.creator = 'Engemedical Connect';

  // ═══════════════════════════════════════════════════════════════
  //  ABA 1: RESUMO
  // ═══════════════════════════════════════════════════════════════
  const summarySheet = workbook.addWorksheet('Resumo', {
    properties: { tabColor: { argb: '002E42' } },
  });

  // Title
  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'RELATÓRIO DE PROCESSAMENTO SOC — GRUPO TORA';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '002E42' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 40;

  // Subtitle
  summarySheet.mergeCells('A2:F2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = `Gerado em ${new Date().toLocaleString('pt-BR')} — Engemedical Connect`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: '66727C' } };
  subtitleCell.alignment = { horizontal: 'center' };
  summarySheet.getRow(2).height = 24;

  // Summary table header
  const summaryHeaderRow = summarySheet.addRow([]);
  summarySheet.addRow([]);
  const headerRow = summarySheet.addRow(['Métrica', 'Valor']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '005C7A' },
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'D8E1E8' } },
    };
  });

  // Summary data
  const summaryData = [
    ['Total de linhas na planilha', summary.totalRows || '—'],
    ['Selecionados para processamento', summary.totalSelected],
    ['Sucesso', summary.success],
    ['Não existem na base SOC', summary.notInBase],
    ['Falhas reais', summary.failed],
    ['Pulados (limite)', summary.skippedByLimit],
    ['Delay entre chamadas', `${summary.delayMs}ms`],
  ];

  const toneColors: Record<string, string> = {
    'Sucesso': '30D158',
    'Não existem na base SOC': '0698C2',
    'Falhas reais': 'DC2626',
  };

  for (const [label, value] of summaryData) {
    const row = summarySheet.addRow([label, value]);
    const color = toneColors[label];
    row.eachCell((cell, colNumber) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'E5EAEF' } },
      };
      if (colNumber === 1) {
        cell.font = { bold: true, size: 11, color: { argb: '1F2933' } };
      } else {
        cell.font = {
          bold: !!color,
          size: 12,
          color: { argb: color || '1F2933' },
        };
        cell.alignment = { horizontal: 'right' };
      }
    });
  }

  // Situation counts
  if (summary.situationCounts && Object.keys(summary.situationCounts).length > 0) {
    summarySheet.addRow([]);
    summarySheet.addRow([]);
    const sitHeaderRow = summarySheet.addRow(['Situação', 'Quantidade']);
    sitHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '005C7A' },
      };
    });
    for (const [sit, count] of Object.entries(summary.situationCounts)) {
      summarySheet.addRow([sit, count]);
    }
  }

  // Column widths
  summarySheet.getColumn(1).width = 38;
  summarySheet.getColumn(2).width = 20;

  // ═══════════════════════════════════════════════════════════════
  //  ABA 2: DETALHAMENTO (todas as linhas)
  // ═══════════════════════════════════════════════════════════════
  const detailSheet = workbook.addWorksheet('Detalhamento', {
    properties: { tabColor: { argb: '30D158' } },
  });

  const columns = [
    { header: 'Linha', key: 'rowNumber', width: 8 },
    { header: 'Nome', key: 'nomeFuncionario', width: 35 },
    { header: 'CPF', key: 'maskedCpf', width: 15 },
    { header: 'Matrícula RH', key: 'matriculaRh', width: 14 },
    { header: 'Código Func.', key: 'codigoFuncionario', width: 12 },
    { header: 'Empresa SOC', key: 'codigoEmpresaSoc', width: 14 },
    { header: 'Setor', key: 'nomeSetor', width: 25 },
    { header: 'Cargo', key: 'nomeCargo', width: 25 },
    { header: 'Situação', key: 'situationToSend', width: 14 },
    { header: 'Status', key: 'statusLabel', width: 16 },
    { header: 'Retorno', key: 'error', width: 45 },
  ];
  detailSheet.columns = columns;

  // Header style
  const detailHeaderRow = detailSheet.getRow(1);
  detailHeaderRow.height = 28;
  detailHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '002E42' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: '30D158' } },
    };
  });

  // Data rows
  const statusColors: Record<string, string> = {
    Sucesso: '30D158',
    'Fora da base': 'F59E0B',
    Falha: 'DC2626',
  };

  for (const row of rows) {
    const statusLabel = row.notInBase
      ? 'Fora da base'
      : row.success
        ? 'Sucesso'
        : 'Falha';
    const dataRow = detailSheet.addRow({
      ...row,
      statusLabel,
    });

    const rowColor = statusColors[statusLabel] || '1F2933';
    dataRow.eachCell((cell, colNumber) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'E5EAEF' } },
      };
      cell.font = { size: 10, color: { argb: '1F2933' } };

      // Status column coloring
      if (colNumber === 10) {
        cell.font = { bold: true, size: 10, color: { argb: rowColor } };
      }
      // Error column
      if (colNumber === 11 && row.error) {
        cell.font = {
          size: 9,
          color: { argb: row.notInBase ? 'F59E0B' : 'DC2626' },
        };
      }
    });

    // Alternate row coloring
    const rowIndex = detailSheet.rowCount;
    if (rowIndex % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F9FAFB' },
        };
      });
    }
  }

  // Auto-filter
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: detailSheet.rowCount, column: columns.length },
  };

  // Freeze header row
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ═══════════════════════════════════════════════════════════════
  //  ABA 3: FALHAS (apenas registros com erro)
  // ═══════════════════════════════════════════════════════════════
  const failedRows = rows.filter((r) => !r.success);
  if (failedRows.length > 0) {
    const failSheet = workbook.addWorksheet('Falhas', {
      properties: { tabColor: { argb: 'DC2626' } },
    });

    failSheet.columns = [
      { header: 'Linha', key: 'rowNumber', width: 8 },
      { header: 'Nome', key: 'nomeFuncionario', width: 35 },
      { header: 'CPF', key: 'maskedCpf', width: 15 },
      { header: 'Setor', key: 'nomeSetor', width: 25 },
      { header: 'Cargo', key: 'nomeCargo', width: 25 },
      { header: 'Situação', key: 'situationToSend', width: 14 },
      { header: 'Status', key: 'statusLabel', width: 16 },
      { header: 'Erro', key: 'error', width: 50 },
    ];

    const failHeaderRow = failSheet.getRow(1);
    failHeaderRow.height = 28;
    failHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'DC2626' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const row of failedRows) {
      const statusLabel = row.notInBase ? 'Fora da base' : 'Falha';
      const r = failSheet.addRow({ ...row, statusLabel });
      r.eachCell((cell, colNumber) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'E5EAEF' } },
        };
        cell.font = {
          size: 10,
          color: { argb: row.notInBase ? 'F59E0B' : 'DC2626' },
        };
      });
    }

    failSheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
