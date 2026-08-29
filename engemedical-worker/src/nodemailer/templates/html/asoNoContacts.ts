const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCPF = (value?: string) => {
  if (!value) return 'N/D';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 11) return escapeHtml(value);
  return cleaned.replace(/(\d{3})\d{3}\d{3}(\d{2})/, '$1.***.***-$2');
};

export function asoNoContactsHtml(
  nomeFuncionario: string,
  nomeEmpresa: string,
  tipoExame: string,
  dataFicha: string,
  cpf: string,
  parecer: string,
  asoFileName: string,
) {
  const primaryColor = '#1EAD60';
  const secondaryColor = '#2c3e50';
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
  const dataEnvio = new Date().toLocaleString('pt-BR');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta Interno - Empresa sem Contatos</title>
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
                <h2 style="color:${secondaryColor}; font-size:24px; margin:0 0 10px 0; font-weight:700;">Alerta Interno</h2>
                <div style="width:50px; height:3px; background-color:#dc2626; border-radius:2px;"></div>
              </div>

              <p style="font-size:15px; line-height:1.6; color:#64748b; margin:0 0 25px 0;">
                <strong>ATEN&Ccedil;&Atilde;O EQUIPE CMSO:</strong><br><br>
                A empresa abaixo <strong>n&atilde;o possui contatos cadastrados no SOC</strong> para recebimento de ASO.
              </p>

              <div style="background-color:#f8fafc; border:1px solid #edf2f7; border-radius:12px; padding:22px; margin-bottom:26px;">
                <h3 style="color:${secondaryColor}; font-size:14px; margin:0 0 12px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Dados do Atendimento</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:6px 0; color:#94a3b8; width:130px; font-weight:600; text-transform:uppercase; font-size:12px;">Empresa:</td><td style="padding:6px 0; color:#1e293b; font-weight:600; font-size:15px;">${escapeHtml(nomeEmpresa).toUpperCase()}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Funcion&aacute;rio:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(nomeFuncionario).toUpperCase()}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">CPF:</td><td style="padding:6px 0; color:#475569;">${formatCPF(cpf)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Tipo de Exame:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(tipoExame)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Parecer M&eacute;dico:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(parecer)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Data da Ficha:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(dataFicha)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Nome do ASO:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(asoFileName)}</td></tr>
                </table>
              </div>

              <div style="background-color:#fff3e0; border:1px solid #f57c00; border-radius:12px; padding:18px; margin-bottom:16px;">
                <h4 style="margin:0 0 10px 0; font-size:14px; color:#e65100; font-weight:700;">Status do Processamento</h4>
                <table width="100%" style="font-size:13px; color:#e65100; line-height:1.6;">
                  <tr><td style="padding:2px 0;">&#10003; <strong>ASO Processado:</strong> O documento foi gerado com sucesso.</td></tr>
                  <tr><td style="padding:2px 0;">&#10003; <strong>ASO Enviado:</strong> Encaminhado automaticamente para o SOCGED.</td></tr>
                  <tr><td style="padding:2px 0; color:#dc2626;">&#10007; <strong>Notifica&ccedil;&atilde;o &agrave; Empresa:</strong> <strong>N&Atilde;O REALIZADA</strong> - Sem contatos cadastrados.</td></tr>
                </table>
              </div>

              <div style="background-color:#e8f5e9; border:1px solid #2e7d32; border-radius:12px; padding:18px; margin-bottom:16px;">
                <h4 style="margin:0 0 10px 0; font-size:14px; color:#1b5e20; font-weight:700;">&#128203; Recomenda&ccedil;&atilde;o</h4>
                <ol style="margin:0; padding-left:20px; font-size:13px; color:#1b5e20; line-height:1.7;">
                  <li>Entre em contato com a empresa <strong>${escapeHtml(nomeEmpresa).toUpperCase()}</strong></li>
                  <li>Solicite o cadastro de <strong>ao menos um e-mail</strong> para recebimento dos futuros atendimentos</li>
                  <li>Informe que os ASOs est&atilde;o sendo armazenados no SOCGED para acesso posterior</li>
                </ol>
              </div>

              <div style="background-color:#fce4ec; border:1px solid #c2185b; border-radius:12px; padding:18px; margin-bottom:26px;">
                <h4 style="margin:0 0 10px 0; font-size:14px; color:#880e4f; font-weight:700;">&#128276; A&ccedil;&otilde;es Necess&aacute;rias</h4>
                <ul style="margin:0; padding-left:20px; font-size:13px; color:#880e4f; line-height:1.7;">
                  <li>Verificar no sistema se h&aacute; outros contatos cadastrados</li>
                  <li>Registrar esta ocorr&ecirc;ncia no hist&oacute;rico da empresa</li>
                  <li>Atualizar cadastro quando receber os contatos</li>
                </ul>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">CMSO - Centro Medico de Saude Ocupacional</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.4;">Este &eacute; um alerta interno autom&aacute;tico do sistema de envio de ASO.<br>Favor n&atilde;o responder a este endere&ccedil;o.</p>
              <div style="margin-top:12px; font-size:11px; color:#cbd5e1;">Alerta gerado em ${escapeHtml(dataEnvio)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
