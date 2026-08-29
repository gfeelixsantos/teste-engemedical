const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCpf = (value?: string) => {
  if (!value) return 'N/D';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 11) return escapeHtml(value);

  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatCnpj = (value?: string) => {
  if (!value) return 'N/D';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 14) return escapeHtml(value);

  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5',
  );
};

export const positionCreationNotificationHtml = (input: {
  nomeEmpresa: string;
  cnpjEmpresa: string;
  nomeUnidade: string;
  nomeSetor: string;
  codigoCargo: string;
  nomeCargo: string;
  descricaoAtividades: string;
  trabalhoAltura: boolean;
  espacoConfinado: boolean;
  operaEmpilhadeira: boolean;
  manipulacaoAlimentos: boolean;
  ponteRolante: boolean;
  conducaoVeiculos: boolean;
  atividadesComplementares: string;
  informacoesAdicionais: string;
  autorizacaoLabel: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  solicitanteCpf: string;
  solicitanteTelefone: string;
  dataSolicitacao: string;
  adendoFileName: string;
  nomeUnidadeSimilar?: string;
  nomeSetorSimilar?: string;
  nomeCargoSimilar?: string;
}) => {
  const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
  const primaryColor = '#114E34';
  const secondaryColor = '#2c3e50';
  const surface = '#F8FAFC';
  const accent = '#D9A441';

  const isAdendo = input.codigoCargo?.toUpperCase().includes('ADENDO-WEB');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação de inclusão de cargo</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px; background-color:#f1f5f9;">
    <tr>
      <td align="center">
        <table width="720" cellpadding="0" cellspacing="0" style="width:720px; max-width:100%; background-color:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #dbe4ee; box-shadow:0 10px 24px rgba(15,23,42,0.08);">
          ${
            isAdendo
              ? `
          <tr>
            <td style="background-color: #fff3cd; color: #856404; padding: 15px; border-bottom: 1px solid #ffeeba; text-align: center;">
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">⚠️ ATENÇÃO: NOVA FUNÇÃO (ADENDO-WEB)</div>
              <div style="font-size: 13px;">Este cargo foi criado via Web e aguarda validação técnica.</div>
            </td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding:30px 40px; text-align:center; border-bottom:4px solid ${primaryColor}; background-color:#f8fafc; background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);">
              <img src="${logoUrl}" alt="CMSO" width="160" style="display:block; margin:0 auto 18px auto;" />
              <h1 style="margin:0; font-size:24px; color:${secondaryColor}; font-weight:700;">Notificação de inclusão de cargo</h1>
              <p style="margin:10px 0 0 0; color:#64748b; font-size:14px; line-height:1.6;">O cadastro do cargo foi processado no SOC e o adendo da solicitação segue em anexo para conferência.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 40px;">
              <div style="background:${surface}; border:1px solid #dbe4ee; border-radius:14px; padding:22px 24px; margin-bottom:22px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr>
                    <td style="padding:0 0 8px 0;">
                      <span style="display:inline-block; background-color:${primaryColor}; color:#ffffff; padding:6px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:0.3px;">SOLICITAÇÃO CONCLUÍDA</span>
                    </td>
                    <td style="padding:0 0 8px 0; text-align:right; color:#64748b; font-size:12px; font-weight:600;">Adendo: ${escapeHtml(input.adendoFileName)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:6px; color:#475569; line-height:1.6;">
                      O cargo <strong style="color:${secondaryColor};">${escapeHtml(input.nomeCargo)}</strong> foi incluído para a empresa <strong style="color:${secondaryColor};">${escapeHtml(input.nomeEmpresa)}</strong>.
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom:22px;">
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Empresa e estrutura</h2>
                <div style="width:52px; height:3px; background-color:${primaryColor}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  <p style="margin:6px 0;"><strong>Empresa:</strong> ${escapeHtml(input.nomeEmpresa)}</p>
                  <p style="margin:6px 0;"><strong>CNPJ:</strong> ${formatCnpj(input.cnpjEmpresa)}</p>
                  <p style="margin:6px 0;"><strong>Unidade:</strong> ${escapeHtml(input.nomeUnidade)}</p>
                  <p style="margin:6px 0;"><strong>Setor:</strong> ${escapeHtml(input.nomeSetor)}</p>
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Dados do cargo</h2>
                <div style="width:52px; height:3px; background-color:${accent}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  <p style="margin:6px 0;"><strong>Código do cargo:</strong> ${escapeHtml(input.codigoCargo)}</p>
                  <p style="margin:6px 0;"><strong>Nome do cargo:</strong> ${escapeHtml(input.nomeCargo)}</p>
                  <p style="margin:6px 0;"><strong>Autorização:</strong> ${escapeHtml(input.autorizacaoLabel)}</p>
                  ${
                    input.nomeCargoSimilar ||
                    input.nomeSetorSimilar ||
                    input.nomeUnidadeSimilar
                      ? `
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                    <p style="margin:4px 0; font-size: 13px; color: #64748b;"><strong>Referência de similaridade:</strong></p>
                    <p style="margin:2px 0; font-size: 13px;">• Unidade: ${escapeHtml(input.nomeUnidadeSimilar || 'N/I')}</p>
                    <p style="margin:2px 0; font-size: 13px;">• Setor: ${escapeHtml(input.nomeSetorSimilar || 'N/I')}</p>
                    <p style="margin:2px 0; font-size: 13px;">• Cargo: ${escapeHtml(input.nomeCargoSimilar || 'N/I')}</p>
                  </div>
                  `
                      : ''
                  }
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Descrição das atividades</h2>
                <div style="width:52px; height:3px; background-color:${primaryColor}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  <p style="margin:0; white-space:pre-line; line-height:1.7; color:#475569;">${escapeHtml(input.descricaoAtividades || 'Não informada')}</p>
                </div>
              </div>

              ${
                (input.trabalhoAltura || input.espacoConfinado || input.operaEmpilhadeira || input.manipulacaoAlimentos || input.ponteRolante || input.conducaoVeiculos || input.atividadesComplementares)
                  ? `
              <div style="margin-bottom:22px;">
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Atividades complementares</h2>
                <div style="width:52px; height:3px; background-color:${accent}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  ${input.trabalhoAltura ? '<p style="margin:4px 0;">• Trabalho em altura</p>' : ''}
                  ${input.espacoConfinado ? '<p style="margin:4px 0;">• Espaço Confinado</p>' : ''}
                  ${input.operaEmpilhadeira ? '<p style="margin:4px 0;">• Opera Empilhadeira</p>' : ''}
                  ${input.manipulacaoAlimentos ? '<p style="margin:4px 0;">• Manipulação de Alimentos</p>' : ''}
                  ${input.ponteRolante ? '<p style="margin:4px 0;">• Ponte Rolante</p>' : ''}
                  ${input.conducaoVeiculos ? '<p style="margin:4px 0;">• Condução de Veículos</p>' : ''}
                  ${input.atividadesComplementares ? `<p style="margin:4px 0; white-space:pre-line;">${escapeHtml(input.atividadesComplementares)}</p>` : ''}
                </div>
              </div>
              `
                  : ''
              }

              ${
                input.informacoesAdicionais
                  ? `
              <div style="margin-bottom:22px;">
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Informações adicionais</h2>
                <div style="width:52px; height:3px; background-color:${primaryColor}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  <p style="margin:0; white-space:pre-line; line-height:1.7; color:#475569;">${escapeHtml(input.informacoesAdicionais)}</p>
                </div>
              </div>
              `
                  : ''
              }

              <div>
                <h2 style="color:${secondaryColor}; font-size:15px; margin:0 0 10px 0; font-weight:700; text-transform:uppercase; letter-spacing:0.4px;">Solicitante</h2>
                <div style="width:52px; height:3px; background-color:${accent}; border-radius:2px; margin-bottom:14px;"></div>
                <div style="background:${surface}; border:1px solid #e2e8f0; border-radius:14px; padding:18px 20px;">
                  <p style="margin:6px 0;"><strong>Nome:</strong> ${escapeHtml(input.solicitanteNome)}</p>
                  <p style="margin:6px 0;"><strong>E-mail:</strong> ${escapeHtml(input.solicitanteEmail)}</p>
                  <p style="margin:6px 0;"><strong>CPF:</strong> ${formatCpf(input.solicitanteCpf)}</p>
                  <p style="margin:6px 0;"><strong>Telefone:</strong> ${escapeHtml(input.solicitanteTelefone || 'N/D')}</p>
                  <p style="margin:6px 0;"><strong>Data da solicitação:</strong> ${escapeHtml(input.dataSolicitacao)}</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 36px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:13px; color:#64748b; font-weight:600;">CMSO - Centro Médico de Saúde Ocupacional</p>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8; line-height:1.5;">Este e-mail foi gerado automaticamente pelo portal CMSO 360.<br>Favor não responder a este endereço.</p>
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
