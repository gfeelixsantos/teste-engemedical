/**
 * preview-html.js
 * Atualiza o arquivo local preview-parecer.html garantindo que o corpo interno do e-mail seja 100% BRANCO (#FFFFFF) puro,
 * destacando o card do parecer médico sobre um fundo limpo e profissional.
 */

const fs = require('fs');
const path = require('path');

const primaryColor = '#1EAD60';
const mainBadgeColor = '#F59E0B';

const htmlPreview = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Parecer Médico (Modelo Branco Limpo)</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:30px 0;">
    <tr>
      <td align="center">
        <!-- Container principal do e-mail (TUDO BRANCO 100%) -->
        <table width="680" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
          
          <!-- Header (Branco) -->
          <tr>
            <td style="padding:24px 28px;background:#FFFFFF;border-bottom:1px solid #F1F5F9;">
              <table width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <h2 style="margin:0;font-size:18px;color:#0F172A;font-weight:700;">FLAVIO LUIZ HENRIQUE GRAMASCO FOSALUZA</h2>
                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;line-height:1.4;">
                      CPF: 311.737.938-01<br />
                      Empresa: <strong>RH BRASIL SERVICOS TEMPORARIOS LTDA</strong> (230890)<br />
                      CNPJ: 01.395.176/0004-03
                    </p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <img src="https://cmsocupacional.com.br/images/logo.png" alt="CMSO 360" width="130" style="display:block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Informações do Funcionário (Fundo Branco Suave) -->
          <tr>
            <td style="padding:16px 28px;background:#FFFFFF;border-bottom:1px solid #F1F5F9;">
              <table width="100%" style="font-size:13px;color:#334155;">
                <tr>
                  <td style="padding:5px 0;"><strong>Unidade:</strong> UNIDADE RIO CLARO</td>
                  <td style="padding:5px 0;"><strong>Setor:</strong> M014718</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;"><strong>Cargo:</strong> OPERADOR DE PRODUÇÃO I</td>
                  <td style="padding:5px 0;"><strong>Tipo de Exame:</strong> ADMISSIONAL</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;"><strong>Atendimento:</strong> 23/07/2026 - RIO CLARO</td>
                  <td style="padding:5px 0;"><strong>Horário:</strong> 08:43:07</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Seção do Parecer Médico (Corpo 100% Branco) -->
          <tr>
            <td style="padding:28px;background:#FFFFFF;">
              <div style="text-align:center;margin-bottom:20px;">
                <h3 style="margin:0;font-size:18px;color:#0F172A;font-weight:700;letter-spacing:0.3px;">PARECER MÉDICO</h3>
                <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Resultado da avaliação ocupacional</p>
              </div>

              <!-- Card de Parecer com destaque de borda e fundo leve -->
              <div style="background:#FFFFFF;border-radius:10px;padding:22px;border:2px solid ${mainBadgeColor};box-shadow:0 4px 12px rgba(245,158,11,0.08);">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                  <tr>
                    <td style="font-size:14px;color:#334155;font-weight:600;vertical-align:middle;">Resultado:</td>
                    <td align="right" style="vertical-align:middle;">
                      <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                        <tr>
                          <td style="padding:10px 22px;border-radius:8px;background:${mainBadgeColor};color:white;font-weight:700;font-size:14px;letter-spacing:0.5px;white-space:nowrap;">
                            APTO COM ORIENTAÇÃO
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Observações com Fundo Destacado Limpo -->
                <div style="margin-top:16px;">
                  <h4 style="margin:0 0 8px 0;font-size:13px;color:#0F172A;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Observações e Recomendações:</h4>
                  <div style="padding:14px;background:#FFFBEB;border-radius:8px;border-left:4px solid ${mainBadgeColor};">
                    <p style="margin:0;font-size:13px;color:#78350F;line-height:1.6;font-weight:500;">
                      Orientar acompanhamento com cardiologista e manutenção de rotina preventiva.
                    </p>
                  </div>
                </div>

                <!-- Botão de ASO Posicionado Diretamente no Card do Parecer -->
                <div style="margin-top:22px;padding-top:18px;border-top:1px dashed #E2E8F0;text-align:center;">
                  <p style="font-size:13px;color:#475569;margin:0 0 12px 0;font-weight:600;">Documento ASO disponível para a equipe de liberação:</p>
                  <a href="https://cmsodocs.blob.core.windows.net/documents/ASO_EXEMPLO.pdf" target="_blank" rel="noopener noreferrer" style="background-color:${primaryColor};color:#ffffff;padding:12px 26px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;box-shadow:0 3px 8px rgba(30,173,96,0.25);">📄 Visualizar / Baixar ASO</a>
                </div>

                <div style="margin-top:18px;font-size:12px;color:#64748B;border-top:1px solid #F1F5F9;padding-top:12px;">
                  Emitido por: <strong>MARIA JULIA TONELOTTO - CMSO</strong> em 18/08/2026, 19:43:00
                </div>
              </div>
            </td>
          </tr>

          <!-- Riscos (Corpo Branco) -->
          <tr>
            <td style="padding:0 28px 24px 28px;background:#FFFFFF;">
              <h4 style="margin:0 0 10px 0;font-size:14px;color:#0F172A;font-weight:700;">Riscos Ocupacionais</h4>
              <ul style="margin:0;padding-left:20px;color:#334155;">
                <li style="margin:4px 0;font-size:13px;">Ruído Contínuo ou intermitente <span style="color:#94A3B8;font-size:12px;">(cód. 332)</span></li>
              </ul>
            </td>
          </tr>

          <!-- Exames Realizados (Corpo Branco) -->
          <tr>
            <td style="padding:0 28px 24px 28px;background:#FFFFFF;">
              <h4 style="margin:0 0 12px 0;font-size:14px;color:#0F172A;font-weight:700;">Exames Realizados</h4>
              <div style="margin-bottom:12px;padding:14px;border:1px solid #E2E8F0;border-radius:8px;background:#FFFFFF;">
                <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:6px;">
                  Audiometria tonal ocupacional (Cód. eSocial - 0281)
                </div>
                <div style="font-size:12px;color:#64748B;line-height:1.5;">
                  <span style="margin-right:14px;">Profissional: <strong>MAYRA KLEINER</strong></span>
                  <span style="margin-right:14px;">Horário: 09:24:19</span>
                  <span>Sala: SALA 8</span>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#1EAD60;font-weight:600;">Status: FINALIZADO</div>
              </div>
              <div style="margin-bottom:12px;padding:14px;border:1px solid #E2E8F0;border-radius:8px;background:#FFFFFF;">
                <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:6px;">
                  Avaliação Clínica Ocupacional (Anamnese e Exame físico) (Cód. eSocial - 0295)
                </div>
                <div style="font-size:12px;color:#64748B;line-height:1.5;">
                  <span style="margin-right:14px;">Profissional: <strong>MARIA JULIA TONELOTTO - CMSO</strong></span>
                  <span style="margin-right:14px;">Horário: 09:14:53</span>
                  <span>Sala: SALA 2</span>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#1EAD60;font-weight:600;">Status: FINALIZADO</div>
              </div>
            </td>
          </tr>

          <!-- Footer (Fundo Branco Limpo) -->
          <tr>
            <td style="padding:20px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="font-size:12px;color:#64748B;margin:0;line-height:1.5;">
                Este é um comunicado interno automático gerado pelo sistema CMSO 360.<br />Em caso de dúvidas, entre em contato com o setor responsável.
              </p>
              <p style="margin-top:8px;font-size:12px;color:#94A3B8;">© 2026 CMSO 360. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const outputPath = path.join(__dirname, '..', '..', 'preview-parecer.html');
fs.writeFileSync(outputPath, htmlPreview, 'utf8');

console.log(`✅ Preview com fundo 100% BRANCO gerado com sucesso em:\n   ${outputPath}\n`);
