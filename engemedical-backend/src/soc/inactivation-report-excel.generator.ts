import * as ExcelJS from 'exceljs';

export type InactivationReportStats = {
  startedAt: Date;
  finishedAt: Date;
  dryRun: boolean;
  totalEmpresasAlvo: number;
  totalEmpresasProcessadas: number;
  totalEmpresasElegiveis: number;
  totalEmpresasInelegiveis: number;
  totalFuncionariosEncontrados: number;
  totalFuncionariosPrevistos: number;
  totalFuncionariosInativados: number;
  empresas: Array<{
    codigo: string;
    razaoSocial: string;
    isElegivel: boolean;
    motivo: string;
    tipoCobranca: string;
    totalFuncionarios: number;
    previstos: number;
    inativados: number;
    erros: number;
  }>;
  erros: Array<{ company: string; employee?: string; error: string }>;
};

const navy = '002E42';
const cyan = '005C7A';
const green = '15803D';
const border = 'D9E4EA';

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cyan } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

export async function generateInactivationReportExcel(stats: InactivationReportStats): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Engemedical Connect';
  workbook.created = stats.finishedAt;

  const summary = workbook.addWorksheet('Resumo', { properties: { tabColor: { argb: navy } } });
  summary.mergeCells('A1:B1');
  summary.getCell('A1').value = 'RELATÓRIO DE INATIVAÇÃO EM MASSA — SOC';
  summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
  summary.getCell('A1').alignment = { horizontal: 'center' };
  summary.getRow(1).height = 36;
  summary.addRow(['Métrica', 'Valor']);
  styleHeader(summary.getRow(2));
  [
    ['Modo', stats.dryRun ? 'DRY-RUN' : 'PRODUÇÃO'],
    ['Início', stats.startedAt],
    ['Fim', stats.finishedAt],
    ['Empresas alvo', stats.totalEmpresasAlvo],
    ['Empresas processadas', stats.totalEmpresasProcessadas],
    ['Empresas elegíveis', stats.totalEmpresasElegiveis],
    ['Empresas protegidas', stats.totalEmpresasInelegiveis],
    ['Funcionários encontrados', stats.totalFuncionariosEncontrados],
    ['Funcionários previstos', stats.totalFuncionariosPrevistos],
    ['Funcionários inativados', stats.totalFuncionariosInativados],
    ['Erros', stats.erros.length],
  ].forEach((row) => summary.addRow(row));
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 28;
  summary.getCell('B4').numFmt = 'dd/mm/yyyy hh:mm';
  summary.getCell('B5').numFmt = 'dd/mm/yyyy hh:mm';

  const companies = workbook.addWorksheet('Empresas', { properties: { tabColor: { argb: cyan } } });
  companies.addRow(['Código', 'Empresa', 'Elegibilidade', 'Motivo', 'Tipo de cobrança', 'Funcionários', 'Previstos', 'Inativados', 'Erros']);
  styleHeader(companies.getRow(1));
  stats.empresas.filter((company) => company.isElegivel).forEach((company) => companies.addRow([
    company.codigo, company.razaoSocial, company.isElegivel ? 'Elegível' : 'Protegida', company.motivo,
    company.tipoCobranca, company.totalFuncionarios, company.previstos, company.inativados, company.erros,
  ]));
  companies.columns.forEach((column) => { column.width = 20; });
  companies.getColumn(2).width = 34;
  companies.getColumn(4).width = 42;

  const errors = workbook.addWorksheet('Erros', { properties: { tabColor: { argb: 'B91C1C' } } });
  errors.addRow(['Empresa', 'Funcionário', 'Detalhe']);
  styleHeader(errors.getRow(1));
  stats.erros.forEach((error) => errors.addRow([error.company, error.employee || '-', error.error]));
  errors.columns.forEach((column) => { column.width = 36; });

  const criteria = workbook.addWorksheet('Critérios', { properties: { tabColor: { argb: green } } });
  criteria.addRows([
    ['Critério', 'Descrição'],
    ['Elegibilidade', 'Empresas sem cobrança protegida por Vida Ativa ou eSocial.'],
    ['Funcionários', 'Foram consultados funcionários com situação ativa.'],
    ['Execução', stats.dryRun ? 'Simulação: nenhum SOAP de inativação foi executado.' : 'Produção: chamadas SOAP de inativação foram executadas.'],
    ['Gerado em', stats.finishedAt],
  ]);
  styleHeader(criteria.getRow(1));
  criteria.getColumn(1).width = 22;
  criteria.getColumn(2).width = 90;
  criteria.getCell('B5').numFmt = 'dd/mm/yyyy hh:mm';

  [summary, companies, errors, criteria].forEach((sheet) => {
    sheet.views = [{ state: 'frozen', ySplit: sheet.name === 'Resumo' ? 2 : 1 }];
    sheet.eachRow((row) => row.eachCell((cell) => { cell.border = { bottom: { style: 'thin', color: { argb: border } } }; }));
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
