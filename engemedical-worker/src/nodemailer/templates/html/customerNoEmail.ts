type CustomerEmail = {
  nomeCliente?: string;
  nomeEmpresa?: string;
  linkAtualizacao?: string;
};

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const customerNoEmailHtml = (
  nomeCliente: string,
  nomeEmpresa: string,
  linkAtualizacao: string
) => {
  const primaryColor = '#1EAD60';
  const secondaryColor = '#2c3e50';
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atualiza&ccedil;&atilde;o de Dados</title>
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
                <h2 style="color:${secondaryColor}; font-size:24px; margin:0 0 10px 0; font-weight:700;">Atualiza&ccedil;&atilde;o de Dados</h2>
                <div style="width:50px; height:3px; background-color:${primaryColor}; border-radius:2px;"></div>
              </div>

              <p style="font-size:15px; line-height:1.6; color:#64748b; margin:0 0 25px 0;">
                Prezado(a) ${escapeHtml(nomeCliente)},<br><br>
                Verificamos que voc&ecirc; ainda n&atilde;o possui um e-mail cadastrado em nosso sistema para recebimento de documentos relacionados ao seu ASO. Para garantir que voc&ecirc; receba todas as informa&ccedil;&otilde;es necess&aacute;rias, favor atualizar seus dados atrav&eacute;s do link abaixo:
              </p>

              <div style="text-align:center; margin-bottom:30px;">
                <a href="${escapeHtml(linkAtualizacao)}" target="_blank" rel="noopener noreferrer" style="background-color:${primaryColor}; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; display:inline-block; font-weight:600; font-size:15px;">Atualizar E-mail</a>
              </div>

              <div style="background-color:#f8fafc; border-left:4px solid #cbd5e1; padding:14px 18px; border-radius:0 8px 8px 0;">
                <p style="margin:0; font-size:12px; color:#475569; line-height:1.5;">
                  <strong>Confidencialidade:</strong> Este e-mail cont&eacute;m informa&ccedil;&otilde;es sens&iacute;veis sobre sua sa&uacute;de ocupacional. Favor n&atilde;o compartilhar este link com terceiros.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">CMSO - Centro M&eacute;dico de Sa&uacute;de Ocupacional</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.4;">Este e-mail foi gerado automaticamente pelo portal CMSO 360.<br>Favor n&atilde;o responder a este endere&ccedil;o.</p>
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