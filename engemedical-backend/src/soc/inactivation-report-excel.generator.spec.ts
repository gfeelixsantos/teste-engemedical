import { generateInactivationReportExcel } from './inactivation-report-excel.generator';

describe('generateInactivationReportExcel', () => {
  it('generates a workbook with summary, companies and errors sheets', async () => {
    const buffer = await generateInactivationReportExcel({
      startedAt: new Date('2026-09-12T18:30:00Z'),
      finishedAt: new Date('2026-09-12T18:31:00Z'),
      dryRun: false,
      totalEmpresasAlvo: 1,
      totalEmpresasProcessadas: 1,
      totalEmpresasElegiveis: 1,
      totalEmpresasInelegiveis: 0,
      totalFuncionariosEncontrados: 2,
      totalFuncionariosPrevistos: 2,
      totalFuncionariosInativados: 1,
      empresas: [{ codigo: '123', razaoSocial: 'Empresa Teste', isElegivel: true, motivo: 'Sem Serviço Mensal', tipoCobranca: '', totalFuncionarios: 2, previstos: 2, inativados: 1, erros: 1 }],
      erros: [{ company: 'Empresa Teste', employee: 'João', error: 'Falha SOAP' }],
    });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Resumo',
      'Empresas',
      'Erros',
      'Critérios',
    ]);
    expect(workbook.getWorksheet('Resumo')?.getCell('B12').value).toBe(1);
  });

  it('excludes protected companies from the companies sheet', async () => {
    const buffer = await generateInactivationReportExcel({
      startedAt: new Date('2026-09-12T18:30:00Z'),
      finishedAt: new Date('2026-09-12T18:31:00Z'),
      dryRun: true,
      totalEmpresasAlvo: 2,
      totalEmpresasProcessadas: 2,
      totalEmpresasElegiveis: 1,
      totalEmpresasInelegiveis: 1,
      totalFuncionariosEncontrados: 1,
      totalFuncionariosPrevistos: 1,
      totalFuncionariosInativados: 0,
      empresas: [
        { codigo: '123', razaoSocial: 'Elegível', isElegivel: true, motivo: 'Sem serviço', tipoCobranca: '', totalFuncionarios: 1, previstos: 1, inativados: 0, erros: 0 },
        { codigo: '456', razaoSocial: 'Protegida', isElegivel: false, motivo: 'Serviço mensal', tipoCobranca: 'Vida Ativa', totalFuncionarios: 0, previstos: 0, inativados: 0, erros: 0 },
      ],
      erros: [],
    });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const companies = workbook.getWorksheet('Empresas');

    expect(companies?.rowCount).toBe(2);
    expect(companies?.getRow(2).getCell(2).value).toBe('Elegível');
  });
});
