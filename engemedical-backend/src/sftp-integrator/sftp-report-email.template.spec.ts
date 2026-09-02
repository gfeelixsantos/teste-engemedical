import {
  buildSftpDryRunReportEmail,
  buildSftpSocReportEmail,
} from './sftp-report-email.template';

describe('SFTP report email template', () => {
  const file = {
    remoteName: 'LOG_INTEGRACAO_2026-09-01.xlsx',
    sha256: 'abc123',
    size: 2048,
  };

  it('builds a branded dry-run report and escapes dynamic content', () => {
    const html = buildSftpDryRunReportEmail({
      clientKey: 'grupo-tora',
      summary: {
        totalRows: 3,
        validRows: 2,
        invalidRows: 1,
        payloadsPrepared: 2,
        skippedRows: 1,
        situationCounts: {
          FERIAS: 1,
          INATIVO: 1,
        },
      },
      invalidRowsPreview: [
        {
          rowNumber: 4,
          errors: ['CPF ausente', '<script>alert(1)</script>'],
        },
      ],
      soapPreview: [
        {
          rowNumber: 2,
          lookupKey: 'CPF',
          codigoEmpresaOrigem: '04',
          situationToSend: 'FERIAS',
          maskedCpf: '*******8901',
          matriculaRh: 'RH456',
        },
      ],
      file,
    });

    expect(html).toContain(
      'https://pages.greatpages.com.br/bh.engemedical.com-conteudo/1786624221/imagens/2.png',
    );
    expect(html).toContain('Dry-run do Integrador SFTP');
    expect(html).toContain('Grupo Tora');
    expect(html).toContain('LOG_INTEGRACAO_2026-09-01.xlsx');
    expect(html).toContain('Payloads preparados');
    expect(html).toContain('*******8901');
    expect(html).toContain('CPF ausente');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('builds a SOC processing report showing only employee failures in details', () => {
    const html = buildSftpSocReportEmail({
      clientKey: 'grupo-tora',
      summary: {
        totalSelected: 2,
        success: 1,
        failed: 1,
        skippedByLimit: 0,
        delayMs: 2500,
      },
      invalidRowsPreview: [],
      soapPreview: [
        {
          rowNumber: 2,
          maskedCpf: '*******8901',
          codigoEmpresa: '2182291',
          codigoFuncionario: '6716',
          situationToSend: 'FERIAS',
          success: true,
        },
        {
          rowNumber: 3,
          maskedCpf: '*******2100',
          codigoEmpresa: '2182291',
          codigoFuncionario: '',
          situationToSend: 'INATIVO',
          success: false,
          error: 'Funcionario nao encontrado',
        },
      ],
      file,
    });

    expect(html).toContain('Relatorio de Processamento SOC');
    expect(html).toContain('Sucesso');
    expect(html).toContain('Falhas');
    expect(html).not.toContain('6716');
    expect(html).not.toContain('*******8901');
    expect(html).toContain('Funcionario nao encontrado');
    expect(html).toContain('*******2100');
  });

  it('explains when SOC processing has no employee failures to list', () => {
    const html = buildSftpSocReportEmail({
      clientKey: 'grupo-tora',
      summary: {
        totalSelected: 1,
        success: 1,
        failed: 0,
        skippedByLimit: 0,
        delayMs: 2500,
      },
      invalidRowsPreview: [],
      soapPreview: [
        {
          rowNumber: 2,
          maskedCpf: '*******8901',
          codigoEmpresaSoc: '2182291',
          codigoFuncionario: '6716',
          situationToSend: 'FERIAS',
          success: true,
        },
      ],
      file,
    });

    expect(html).toContain('Nenhuma falha retornada pelo SOC nesta execucao.');
    expect(html).not.toContain('*******8901');
    expect(html).not.toContain('6716');
  });
});
