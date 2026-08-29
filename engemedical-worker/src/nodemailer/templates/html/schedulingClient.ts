import { SchedulingDocument } from 'src/mongo/types/scheduling';

const primaryColor = '#114F36';
const secondaryColor = '#AFCA07';
const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
const agendaBaseUrl = 'https://agenda.cmsocupacional.com.br';

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type UnitInfo = {
  displayName: string;
  addressHtml: string;
  functioningHtml: string;
  contactHtml: string;
  qrCodeUrl: string;
};

const getUnitInfo = (unit: string): UnitInfo => {
  const key = (unit || '').trim().toUpperCase();
  const cases: Record<string, UnitInfo> = {
    ARARAS: {
      displayName: 'Araras',
      addressHtml: 'Rua Coronel Justiniano, 509 - Centro - Araras/SP<br>CEP: 13600-700',
      functioningHtml: 'Segunda a sexta: 07:30 às 12:00',
      contactHtml: 'agendamento.araras@cmsocupacional.com.br<br>WhatsApp (19) 98218-2200',
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/araras`,
    },
    CORDEIRÓPOLIS: {
      displayName: 'Cordeirópolis',
      addressHtml: 'Rua Guilherme Krauter, 507 - Centro - Cordeirópolis/SP<br>CEP: 13490-000',
      functioningHtml: 'Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00',
      contactHtml: 'agendamento.cordeiro@cmsocupacional.com.br<br>WhatsApp (19) 99175-0727',
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/cordeiropolis`,
    },
    'RIO CLARO': {
      displayName: 'Rio Claro',
      addressHtml: 'Avenida Onze, 254 - Saúde - Rio Claro/SP<br>CEP: 13500-312',
      functioningHtml: 'Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00<br>Sábado: 07:30 às 12:00',
      contactHtml: 'agendamento@cmsocupacional.com.br<br>WhatsApp (19) 99136-3590',
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/rioclaro`,
    },
  };
  return cases[key] ?? {
    displayName: unit || 'Unidade',
    addressHtml: 'Endereço não informado',
    functioningHtml: 'Funcionamento não informado',
    contactHtml: 'Contato não informado',
    qrCodeUrl: `${agendaBaseUrl}/api/qrcode/araras`,
  };
};

export const schedulingClientHtml = (
  funcionario: SchedulingDocument,
): string => {
  const unit = getUnitInfo(funcionario.UNIDADEATENDIMENTO);
  const requesterName = escapeHtml(funcionario.CLIENT?.Name);
  const requesterEmail = escapeHtml(funcionario.CLIENT?.Email);
  const requesterPhone = escapeHtml(funcionario.CLIENT?.Phone);
  const requesterContact = requesterPhone ? `${requesterEmail} · ${requesterPhone}` : requesterEmail;

  const cpfRaw = funcionario.CPFFUNCIONARIO || '';
  const cpfFormatted = cpfRaw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const cpfRowHtml = cpfFormatted
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px dashed #e3e9e1;margin:0;"><tr><td width="118" style="padding:0 8px 6px 0;vertical-align:top;font-size:11px;font-weight:700;color:#2d6e52;text-transform:uppercase;letter-spacing:.05em;">CPF</td><td style="padding:0 0 6px 0;vertical-align:top;font-size:13px;line-height:1.35;color:#213329;">${cpfFormatted}</td></tr></table>`
    : '';

  const preparationItems = (funcionario.EXAMES || [])
    .filter(item => item.preparacao && item.preparacao.trim() !== '')
    .map(item => `<li>${escapeHtml(item.preparacao)}</li>`)
    .filter((value, index, array) => array.indexOf(value) === index);

  const preparationBlock = preparationItems.length > 0
    ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
      <tr>
        <td style="padding:10px 12px;border-radius:14px;border:1px solid #d8e1d6;background:#f7faf7;">
          <strong style="font-size:13px;font-weight:700;color:#114f36;display:block;margin-bottom:4px;">Preparo para o exame</strong>
          <ul style="margin:0;padding-left:20px;font-size:12px;line-height:1.4;color:#66776d;">
            ${preparationItems.join('')}
          </ul>
        </td>
      </tr>
    </table>`
    : '';

  const solicitationLabel = escapeHtml(funcionario.CREATED || '');

  const summaryCell = (label: string, value: string) => `
    <td width="25%" style="padding:0 4px 0 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:10px;border-radius:14px;background:#fff;border:1px solid #d8e1d6;">
        <tr>
          <td style="text-align:left;">
            <span style="display:block;margin-bottom:5px;color:#66776d;font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">${label}</span>
            <strong style="font-size:13px;line-height:1.3;color:#114f36;">${value}</strong>
          </td>
        </tr>
      </table>
    </td>`;

  const kvRow = (label: string, value: string, allowHtml = false, isLast = false) => {
    const renderedValue = allowHtml ? value : escapeHtml(value);
    const border = isLast ? '0' : '1px dashed #e3e9e1';
    const p = isLast ? '0' : '6px';
    return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:${border};margin:0;">
      <tr>
        <td width="118" style="padding:0 8px ${p} 0;vertical-align:top;font-size:11px;font-weight:700;color:#2d6e52;text-transform:uppercase;letter-spacing:.05em;">${label}</td>
        <td style="padding:0 0 ${p} 0;vertical-align:top;font-size:13px;line-height:1.35;color:#213329;">${renderedValue}</td>
      </tr>
    </table>`;
  };

  const sectionHeader = (label: string) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background:#fff;padding:10px 13px;border-bottom:1px solid #d8e1d6;font-size:12px;font-weight:800;color:#114f36;text-transform:uppercase;letter-spacing:.05em;">
          ${label}
        </td>
      </tr>
    </table>`;

  const sectionContent = (content: string) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding:12px 13px;">
          ${content}
        </td>
      </tr>
    </table>`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agendamento Centro Médico de Saúde Ocupacional</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f2;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#213329;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;">
    <tr>
      <td align="center" style="padding:16px 10px;">
        <table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d8e1d6;border-radius:20px;">
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;">
                <tr>
                  <td style="padding:14px 18px;color:#114f36;">
                    <div style="margin-bottom:8px;font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#2d6e52;">
                      Agendamento Centro Médico de Saúde Ocupacional
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="font-size:21px;line-height:1.08;font-weight:700;margin:0 0 2px;">
                            ${escapeHtml(funcionario.NOME)}
                          </div>
                          <div style="margin:0;font-size:13px;line-height:1.4;color:#2d6e52;font-weight:600;">
                            Exame ${escapeHtml(funcionario.TIPOEXAMENOME)}
                          </div>
                        </td>
                        <td width="110" style="text-align:right;vertical-align:middle;">
                          <img src="${logoUrl}" alt="Logo" width="92" style="display:block;margin-left:auto;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#fff;padding:14px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                      <tr>
                        ${summaryCell('Data', escapeHtml(funcionario.DATAAGENDAMENTO))}
                        ${summaryCell('Horário', escapeHtml(funcionario.HORARIO))}
                        ${summaryCell('Unidade', escapeHtml(unit.displayName))}
                        ${summaryCell('Solicitante', requesterName)}
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8e1d6;border-radius:18px;background:#fff;margin-bottom:8px;">
                      <tr>
                        <td>
                          ${sectionHeader('Detalhes do Agendamento')}
                          ${sectionContent(
                            kvRow('Empresa', funcionario.NOMEEMPRESA) +
                            kvRow('Colaborador', funcionario.NOME) +
                            cpfRowHtml +
                            kvRow('Cargo', funcionario.NOMECARGO) +
                            kvRow('Setor', funcionario.NOMESETOR) +
                            kvRow('Unidade Empresa', funcionario.NOMEUNIDADE) +
                            kvRow('Exame', funcionario.TIPOEXAMENOME) +
                            kvRow('Solicitante', requesterContact, false, true)
                          )}
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8e1d6;border-radius:18px;background:#fff;margin-bottom:8px;">
                      <tr>
                        <td>
                          ${sectionHeader('Orientações Importantes')}
                          ${sectionContent(
                            preparationBlock +
                            `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="padding:10px 12px;border-radius:14px;border:1px solid #d8e1d6;background:#f7faf7;">
                                  <div style="margin-bottom:4px;font-size:13px;font-weight:700;color:#114f36;">O que levar</div>
                                  <p style="margin:0;font-size:12px;line-height:1.35;color:#66776d;">
                                    Documento com foto e eventual guia ou observação enviada pela empresa.
                                  </p>
                                </td>
                              </tr>
                            </table>`
                          )}
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8e1d6;border-radius:18px;background:#fff;">
                      <tr>
                        <td>
                          ${sectionHeader(`Informações da Unidade · ${escapeHtml(unit.displayName)}`)}
                          ${sectionContent(`
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8e1d6;border-radius:16px;background:#f8fbf7;background:linear-gradient(180deg,#f8fbf7,#fff);">
                              <tr>
                                <td style="padding:10px 10px 10px 12px;vertical-align:top;">
                                  ${kvRow('Endereço', unit.addressHtml, true)}
                                  ${kvRow('Funcionamento', unit.functioningHtml, true)}
                                  ${kvRow('Contato', unit.contactHtml, true, true)}
                                </td>
                                <td width="138" style="padding:10px 10px 10px 0;vertical-align:middle;">
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align:center;border-radius:14px;padding:8px;background:#fff;border:1px solid #d8e1d6;">
                                    <tr>
                                      <td align="center">
                                        <img src="${unit.qrCodeUrl}" alt="QR Code" width="108" height="108" style="display:block;">
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          `)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#114f36;background:linear-gradient(135deg,#114f36,#1d5f44);padding:8px 16px;text-align:center;color:#fff;font-size:11px;font-weight:600;line-height:1.15;">
                    Centro Médico de Saúde Ocupacional${solicitationLabel ? `<span style="font-size:10px;font-weight:500;color:rgba(255,255,255,.82);"> · Solicitação: ${solicitationLabel}</span>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
