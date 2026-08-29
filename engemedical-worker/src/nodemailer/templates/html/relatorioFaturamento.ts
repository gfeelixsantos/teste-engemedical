const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCNPJ = (value?: string) => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 14) return value;
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const relatorioFaturamentoHtml = (
  nomeEmpresa: string,
  dataReferencia: string,
  tipoDocumento: string,
  arquivoUrl: string,
  nomeArquivo: string,
  observacoes?: string,
  cnpj?: string,
) => {
  const primaryColor = '#44735e';
  const secondaryColor = '#2c3e50';
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';

  const hasUrl = arquivoUrl && arquivoUrl.startsWith('http');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relat&oacute;rio de Faturamento</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7f9; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#ffffff; padding:30px 40px; text-align:center; border-bottom:4px solid ${primaryColor};">
              <img src="${logoUrl}" alt="CMSO 360" width="160" style="display:block; margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px;">
              <div style="margin-bottom:25px;">
                <h2 style="color:${secondaryColor}; font-size:24px; margin:0 0 10px 0; font-weight:700;">Relat&oacute;rio de Faturamento</h2>
                <div style="width:50px; height:3px; background-color:${primaryColor}; border-radius:2px;"></div>
              </div>

              <p style="font-size:15px; line-height:1.6; color:#64748b; margin:0 0 25px 0;">
                Ol&aacute;,<br><br>
                Encaminhamos o <strong>Relat&oacute;rio de Faturamento</strong> referente ao per&iacute;odo de <strong>${escapeHtml(dataReferencia)}</strong>.
              </p>

              <p style="font-size:15px; line-height:1.6; color:#64748b; margin:0 0 25px 0;">
                Este relatório refere-se à cobran&ccedil;a que ser&aacute; realizada nos pr&oacute;ximos dias. Caso haja inconsist&ecirc;ncias ou necessidade de esclarecimentos, pedimos que responda a este e-mail para que nossa equipe possa atender seu chamado.
              </p>

              <div style="background-color:#f8fafc; border:1px solid #edf2f7; border-radius:12px; padding:22px; margin-bottom:26px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:6px 0; color:#94a3b8; width:140px; font-weight:600; text-transform:uppercase; font-size:12px;">Empresa:</td><td style="padding:6px 0; color:#1e293b; font-weight:600; font-size:15px;">${escapeHtml(nomeEmpresa).toUpperCase()}</td></tr>
                  ${cnpj ? `<tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">CNPJ:</td><td style="padding:6px 0; color:#475569; font-family:monospace;">${formatCNPJ(cnpj)}</td></tr>` : ''}
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Tipo:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(tipoDocumento)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Refer&ecirc;ncia:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(dataReferencia)}</td></tr>
                  ${observacoes ? `<tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Observa&ccedil;&otilde;es:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(observacoes)}</td></tr>` : ''}
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Arquivo:</td><td style="padding:6px 0; color:#475569; font-family:monospace; font-size:13px;">${escapeHtml(nomeArquivo)}</td></tr>
                </table>
              </div>

              <div style="text-align:center; margin-bottom:30px;">
                <p style="font-size:14px; color:#94a3b8; margin-bottom:12px;">O documento est&aacute; dispon&iacute;vel para download no link abaixo:</p>
                ${hasUrl
                  ? `<a href="${escapeHtml(arquivoUrl)}" target="_blank" rel="noopener noreferrer" style="background-color:${primaryColor}; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; display:inline-block; font-weight:600; font-size:15px;">Baixar Relat&oacute;rio</a>`
                  : `<div style="background-color:${primaryColor}; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; display:inline-block; font-weight:600; font-size:15px;">Documento em Anexo</div>`}
              </div>

              <div style="background-color:#f1f5f9; border-left:4px solid #cbd5e1; padding:14px 18px; border-radius:0 8px 8px 0;">
                <p style="margin:0; font-size:12px; color:#475569; line-height:1.5;">
                  <strong>Confidencialidade:</strong> Este documento cont&eacute;m informa&ccedil;&otilde;es comerciais confidenciais. O link de download &eacute; v&aacute;lido por 30 dias.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">CMSO - Centro Medico de Saude Ocupacional</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.4;">Este &eacute; um e-mail autom&aacute;tico enviado pelo portal CMSO 360.<br>Em caso de d&uacute;vidas, responda a esta mensagem para abrir um chamado com nossa equipe.</p>
              <div style="margin-top:12px; font-size:11px; color:#cbd5e1;">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
