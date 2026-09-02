type SftpReportFile = {
  remoteName: string;
  sha256: string;
  size: number;
};

export type SftpReportEmailRun = {
  clientKey: string;
  summary: Record<string, any>;
  invalidRowsPreview: unknown[];
  soapPreview?: unknown[];
  file: SftpReportFile;
};

const DEFAULT_LOGO_URL =
  'https://pages.greatpages.com.br/bh.engemedical.com-conteudo/1786624221/imagens/2.png';
const MAX_PREVIEW_ROWS = 50;

export function buildSftpDryRunReportEmail(run: SftpReportEmailRun): string {
  const situationRows = Object.entries(run.summary.situationCounts || {}).map(
    ([situation, total]) => [situation, String(total)],
  );
  const soapRows = limitRows(run.soapPreview).map((item: any) => [
    item.rowNumber,
    item.lookupKey,
    item.codigoEmpresaOrigem,
    item.situationToSend,
    item.maskedCpf,
    item.matriculaRh,
  ]);
  const errorRows = limitRows(run.invalidRowsPreview).map((item: any) => [
    item.rowNumber,
    (item.errors || []).join(', '),
  ]);

  return buildEmailShell({
    title: 'Dry-run do Integrador SFTP',
    eyebrow: clientLabel(run.clientKey),
    subtitle:
      'Validacao estrutural da planilha recebida e pre-visualizacao dos funcionarios elegiveis para envio ao SOC.',
    run,
    statusTone: Number(run.summary.invalidRows || 0) > 0 ? 'warning' : 'success',
    cards: [
      card('Total de linhas', run.summary.totalRows),
      card('Linhas validas', run.summary.validRows, 'success'),
      card('Linhas invalidas', run.summary.invalidRows, 'warning'),
      card('Payloads preparados', run.summary.payloadsPrepared, 'info'),
    ],
    sections: [
      tableSection('Situacoes na planilha', ['Situacao', 'Quantidade'], situationRows, {
        emptyText: 'Nenhuma situacao identificada.',
      }),
      tableSection(
        'Previa SOAP',
        ['Linha', 'Chave', 'Empresa origem', 'Situacao', 'CPF', 'Matricula RH'],
        soapRows,
        {
          emptyText: 'Nenhum payload SOAP preparado.',
          footerText: previewFooter(run.soapPreview),
        },
      ),
      tableSection('Ocorrencias estruturais', ['Linha', 'Erros'], errorRows, {
        emptyText: 'Nenhum erro estrutural identificado.',
        footerText: previewFooter(run.invalidRowsPreview),
      }),
    ],
  });
}

export function buildSftpSocReportEmail(run: SftpReportEmailRun): string {
  const failedRows = (run.soapPreview || []).filter(
    (item: any) => !item.success,
  );
  const soapRows = limitRows(failedRows).map((item: any) => [
    item.rowNumber,
    item.maskedCpf,
    item.codigoEmpresaSoc || item.codigoEmpresa,
    item.codigoFuncionario,
    item.situationToSend,
    'Falha',
    item.error || item.httpStatus || '',
  ]);
  const hasFailures = Number(run.summary.failed || 0) > 0;

  return buildEmailShell({
    title: 'Relatorio de Processamento SOC',
    eyebrow: clientLabel(run.clientKey),
    subtitle:
      'Resumo da rotina de atualizacao de funcionarios via SOAP Funcionario Modelo 2.',
    run,
    statusTone: hasFailures ? 'danger' : 'success',
    cards: [
      card('Selecionados', run.summary.totalSelected),
      card('Sucesso', run.summary.success, 'success'),
      card('Falhas', run.summary.failed, hasFailures ? 'danger' : 'success'),
      card('Delay aplicado', `${run.summary.delayMs || 0} ms`, 'info'),
    ],
    sections: [
      tableSection(
        'Retorno por funcionario',
        [
          'Linha',
          'CPF',
          'Empresa SOC',
          'Funcionario SOC',
          'Situacao',
          'Status',
          'Retorno',
        ],
        soapRows,
        {
          emptyText: 'Nenhuma falha retornada pelo SOC nesta execucao.',
          footerText: previewFooter(failedRows),
        },
      ),
    ],
  });
}

function buildEmailShell(input: {
  title: string;
  eyebrow: string;
  subtitle: string;
  run: SftpReportEmailRun;
  statusTone: 'success' | 'warning' | 'danger';
  cards: string[];
  sections: string[];
}): string {
  const generatedAt = new Date().toLocaleString('pt-BR');
  const logoUrl = process.env.SFTP_INTEGRATOR_REPORT_LOGO_URL || DEFAULT_LOGO_URL;
  const accent = toneColor(input.statusTone);

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f8;padding:28px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background:#ffffff;border:1px solid #d8e1e8;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#002e42;padding:24px 28px;border-bottom:4px solid ${accent};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${escapeHtml(logoUrl)}" width="156" alt="Engemedical" style="display:block;max-width:156px;height:auto;">
                    </td>
                    <td align="right" style="vertical-align:middle;color:#b8d7e3;font-size:12px;line-height:18px;">
                      ${escapeHtml(generatedAt)}
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 6px;color:#30d158;font-size:12px;line-height:16px;text-transform:uppercase;font-weight:700;letter-spacing:.6px;">${escapeHtml(input.eyebrow)}</p>
                <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:32px;font-weight:700;">${escapeHtml(input.title)}</h1>
                <p style="margin:10px 0 0;color:#d7edf4;font-size:14px;line-height:22px;">${escapeHtml(input.subtitle)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px;">
                ${fileInfo(input.run.file)}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>${input.cards.join('')}</tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                ${input.sections.join('')}
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #d8e1e8;padding:18px 28px;color:#66727c;font-size:12px;line-height:18px;">
                Relatorio automatico gerado pelo Engemedical Connect para acompanhamento operacional da rotina SFTP.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function fileInfo(file: SftpReportFile): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8e1e8;border-radius:8px;background:#f9fafb;">
      <tr>
        <td style="padding:14px 16px;color:#66727c;font-size:12px;line-height:18px;">Arquivo</td>
        <td style="padding:14px 16px;color:#1f2933;font-size:13px;line-height:18px;font-weight:700;text-align:right;">${escapeHtml(file.remoteName)}</td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px;color:#66727c;font-size:12px;line-height:18px;">SHA256</td>
        <td style="padding:0 16px 14px;color:#1f2933;font-size:12px;line-height:18px;text-align:right;word-break:break-all;">${escapeHtml(file.sha256)}</td>
      </tr>
    </table>`;
}

function card(
  label: string,
  value: unknown,
  tone: 'info' | 'success' | 'warning' | 'danger' = 'info',
): string {
  const color = toneColor(tone);
  return `
    <td width="25%" style="padding:0 8px 12px 0;vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8e1e8;border-radius:8px;background:#ffffff;">
        <tr>
          <td style="padding:14px 14px 12px;border-top:3px solid ${color};">
            <div style="color:#66727c;font-size:11px;line-height:14px;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</div>
            <div style="margin-top:6px;color:#002e42;font-size:22px;line-height:28px;font-weight:700;">${escapeHtml(value)}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function tableSection(
  title: string,
  headers: string[],
  rows: unknown[][],
  options: { emptyText: string; footerText?: string },
): string {
  const body = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td style="padding:10px 12px;border-top:1px solid #e5eaef;color:#1f2933;font-size:12px;line-height:17px;vertical-align:top;">${escapeHtml(cell)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('')
    : `<tr><td colspan="${headers.length}" style="padding:12px;color:#66727c;font-size:12px;line-height:18px;border-top:1px solid #e5eaef;">${escapeHtml(options.emptyText)}</td></tr>`;

  return `
    <h2 style="margin:22px 0 10px;color:#002e42;font-size:17px;line-height:22px;">${escapeHtml(title)}</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8e1e8;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
      <thead>
        <tr>
          ${headers
            .map(
              (header) =>
                `<th align="left" style="padding:10px 12px;background:#eef6f9;color:#005c7a;font-size:11px;line-height:14px;text-transform:uppercase;">${escapeHtml(header)}</th>`,
            )
            .join('')}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    ${
      options.footerText
        ? `<p style="margin:8px 0 0;color:#66727c;font-size:12px;line-height:18px;">${escapeHtml(options.footerText)}</p>`
        : ''
    }`;
}

function limitRows(rows: unknown[] | undefined): unknown[] {
  return (rows || []).slice(0, MAX_PREVIEW_ROWS);
}

function previewFooter(rows: unknown[] | undefined): string | undefined {
  const total = rows?.length || 0;
  if (total <= MAX_PREVIEW_ROWS) {
    return undefined;
  }
  return `Exibindo ${MAX_PREVIEW_ROWS} de ${total} registros nesta mensagem.`;
}

function clientLabel(clientKey: string): string {
  return clientKey
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toneColor(tone: 'info' | 'success' | 'warning' | 'danger'): string {
  const colors = {
    info: '#0698c2',
    success: '#30d158',
    warning: '#f59e0b',
    danger: '#dc2626',
  };
  return colors[tone];
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
