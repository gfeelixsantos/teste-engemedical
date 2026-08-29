type EmailExam = {
  nomeExame?: string;
  status?: string;
  dataExame?: string | Date;
  sala?: string;
};

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

const formatDateTime = (value?: string | Date) => {
  if (!value) return '-';

  const raw = String(value).trim();
  if (!raw) return '-';
  if (raw.includes(' - ')) return escapeHtml(raw);
  if (/^\d{2}\/\d{2}\/\d{4}/.test(raw) && !raw.includes('T')) {
    return escapeHtml(raw);
  }

  const parsed = value instanceof Date ? value : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(raw);

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
};

export const complementarReleaseHtml = (
  nomeFuncionario: string,
  nomeEmpresa: string,
  tipoExame: string,
  data: string,
  chegada?: string | Date,
  cpf?: string,
  unidade?: string,
  examesRealizados?: EmailExam[],
) => {
  const primaryColor = '#1EAD60';
  const secondaryColor = '#2c3e50';
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';

  const examRows = (examesRealizados || [])
    .map(
      (exam) => `
            <tr>
              <td style="border-bottom:1px solid #dbe4ee; border-right:1px solid #dbe4ee; padding:12px; vertical-align:top; font-size:13px; color:#0f172a; font-weight:700;">
                ${escapeHtml(exam.nomeExame || '-')}
              </td>
              <td style="border-bottom:1px solid #dbe4ee; border-right:1px solid #dbe4ee; padding:12px; font-size:12px; color:#0f172a;">${escapeHtml(exam.sala || '-')}</td>
              <td style="border-bottom:1px solid #dbe4ee; padding:12px; font-size:12px; color:#0f172a;">${formatDateTime(exam.dataExame)}</td>
            </tr>
          `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exames Finalizados</title>
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
                <h2 style="color:${secondaryColor}; font-size:24px; margin:0 0 10px 0; font-weight:700;">Exames Finalizados</h2>
                <div style="width:50px; height:3px; background-color:${primaryColor}; border-radius:2px;"></div>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#64748b; margin:0 0 25px 0;">
                Ola,<br><br>
                Informamos que todos os exames do colaborador abaixo foram <strong>finalizados</strong> e seus resultados ja estao disponiveis para consulta.
              </p>
              <div style="background-color:#f8fafc; border:1px solid #edf2f7; border-radius:12px; padding:22px; margin-bottom:26px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr><td style="padding:6px 0; color:#94a3b8; width:130px; font-weight:600; text-transform:uppercase; font-size:12px;">Funcionario:</td><td style="padding:6px 0; color:#1e293b; font-weight:600; font-size:15px;">${escapeHtml(nomeFuncionario).toUpperCase()}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">CPF:</td><td style="padding:6px 0; color:#475569;">${formatCPF(cpf)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Empresa:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(nomeEmpresa)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Tipo de Exame:</td><td style="padding:6px 0; color:#475569;">${escapeHtml(tipoExame)}</td></tr>
                  <tr><td style="padding:6px 0; color:#94a3b8; font-weight:600; text-transform:uppercase; font-size:12px;">Chegada:</td><td style="padding:6px 0; color:#475569;">${formatDateTime(chegada)}${unidade ? ` - ${escapeHtml(unidade)}` : ''}</td></tr>
                </table>
              </div>
              ${
                examRows
                  ? `
              <div style="margin-bottom:28px;">
                <h3 style="color:${secondaryColor}; font-size:14px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Exames realizados</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0; background:#fff; border:1px solid #dbe4ee;">
                  <thead>
                    <tr style="background-color:#eef2f7;">
                      <th style="border-bottom:1px solid #dbe4ee; border-right:1px solid #dbe4ee; padding:10px 12px; text-align:left; font-size:12px; color:#334155; font-weight:700; text-transform:uppercase;">Exame</th>
                      <th style="border-bottom:1px solid #dbe4ee; border-right:1px solid #dbe4ee; padding:10px 12px; text-align:left; font-size:12px; color:#334155; font-weight:700; text-transform:uppercase; width:90px;">Sala</th>
                      <th style="border-bottom:1px solid #dbe4ee; padding:10px 12px; text-align:left; font-size:12px; color:#334155; font-weight:700; text-transform:uppercase; width:145px;">Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${examRows}
                  </tbody>
                </table>
              </div>
              `
                  : ''
              }
              <div style="background-color:#f1f5f9; border-left:4px solid #cbd5e1; padding:14px 18px; border-radius:0 8px 8px 0;">
                <p style="margin:0; font-size:12px; color:#475569; line-height:1.5;">
                  <strong>Confidencialidade:</strong> Este documento contem informacoes de saude ocupacional protegidas pela LGPD e normas do CRM.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">CMSO - Centro Medico de Saude Ocupacional</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.4;">Este e-mail foi gerado automaticamente pelo portal CMSO 360.<br>Favor nao responder a este endereco.</p>
              <div style="margin-top:12px; font-size:11px; color:#cbd5e1;">Emitido em ${escapeHtml(data)}</div>
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
