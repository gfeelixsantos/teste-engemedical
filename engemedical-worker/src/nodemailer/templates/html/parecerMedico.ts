// parecerMedico.ts

import {
  MedicalOpinionData,
  SchedulingDocument,
} from 'src/mongo/types/scheduling';
import { IUserInfo } from 'src/mongo/types/user';

const logoUrl = 'https://cmsocupacional.com.br/images/logo.png';
const primaryColor = '#1EAD60';

export function parecerMedicoHtml(
  employee: SchedulingDocument,
  opinion: MedicalOpinionData,
  issuedBy?: IUserInfo,
  asoFileUrl?: string,
  observacoesParecer?: string[],
) {
  const safe = (v: any) => (v === null || v === undefined ? '' : v);

  const escapeHtml = (value?: string | number | null) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatDate = (d: any) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString('pt-BR');
    } catch {
      return d;
    }
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
  };

  const opinionLabels: Record<string, string> = {
    APTO: 'APTO',
    APTO_COM_ORIENTACAO: 'APTO COM ORIENTAÇÃO',
    APTO_COM_RESTRICAO: 'APTO COM RESTRIÇÃO TEMPORÁRIA',
    SOLICITAR_REPETICAO: 'SOLICITAR REPETIÇÃO',
    INAPTO: 'INAPTO',
    INAPTO_TEMPORARIAMENTE: 'INAPTO TEMPORARIAMENTE',
  };

  const badgeColor = (type: string) => {
    switch (type) {
      case 'APTO':
        return '#1EAD60';
      case 'APTO_COM_ORIENTACAO':
        return '#F59E0B';
      case 'APTO_COM_RESTRICAO':
        return '#D97706';
      case 'SOLICITAR_REPETICAO':
        return '#0EA5E9';
      case 'INAPTO':
        return '#DC2626';
      case 'INAPTO_TEMPORARIAMENTE':
        return '#D97706';
      default:
        return '#6B7280';
    }
  };

  const tipoExameLabels: Record<number, string> = {
    1: 'ADMISSIONAL',
    2: 'PERIÓDICO',
    3: 'RETORNO AO TRABALHO',
    4: 'MUDANÇA DE RISCO',
    5: 'DEMISSIONAL',
    6: 'MONITORAÇÃO PONTUAL',
  };

  const riscosHtml = employee.RISCOSASO?.length
    ? employee.RISCOSASO.map(
        (r) =>
          `<li style="margin:4px 0;font-size:13px">${r.risco} <span style="color:#9CA3AF;font-size:12px">(cód. ${r.codigo})</span></li>`,
      ).join('')
    : "<li style='font-size:13px;color:#6B7280'>Nenhum risco registrado</li>";

  const examsHtml = employee.EXAMES?.length
    ? employee.EXAMES.map(
        (ex) => `
        <div style="margin-bottom:16px;padding:12px;border:1px solid #E5E7EB;border-radius:6px;">
          <div style="font-weight:600;font-size:13px;color:#111;margin-bottom:8px;">
            ${safe(ex.nomeExame)}
          </div>
          <div style="font-size:12px;color:#6B7280;">
            <span style="margin-right:12px;">Profissional: ${safe(ex.profissional)}</span>
            <span>Horário: ${ex.dataExame ? formatDate(ex.dataExame).split(' ')[1] : '-'}</span>
            <span>Sala: ${ex.sala ?? 'Sala não informada'}</span>
          </div>
          <div style="margin-top:8px;font-size:12px;">
            <span style="color:#374151;">Status: ${safe(ex.status)}</span>
            ${ex.url ? `<span style="margin-left:12px;"><a href="${ex.url}" style="color:#0EA5E9;text-decoration:none;">Ver Resultado</a></span>` : ''}
          </div>
        </div>
      `,
      ).join('')
    : `<div style="padding:12px;text-align:center;color:#6B7280;font-size:13px;border:1px solid #E5E7EB;border-radius:6px;">Nenhum exame registrado</div>`;

  const anexosHtml = employee.ANEXOS?.length
    ? employee.ANEXOS.map(
        (a) =>
          `<li style="font-size:13px;margin:4px 0;"><a href="${a.StoragePath}" style="color:#0EA5E9;text-decoration:none;">${a.Name}</a></li>`,
      ).join('')
    : "<li style='font-size:13px;color:#6B7280'>Sem anexos</li>";

  const clientInfoHtml = employee.CLIENT
    ? `
      <div style="margin-top:16px;padding:16px;background:#F0F9FF;border-radius:6px;border-left:4px solid #0EA5E9;">
        <h4 style="margin:0 0 8px 0;font-size:14px;color:#111;">Contato do Cliente</h4>
        <p style="margin:4px 0;font-size:13px;color:#374151;">
          <strong>Nome:</strong> ${safe(employee.CLIENT.Name)}<br>
          <strong>Email:</strong> ${safe(employee.CLIENT.Email)}<br>
          <strong>Telefone:</strong> ${safe(employee.CLIENT.Phone)}
        </p>
      </div>
    `
    : '';

  const mainBadgeColor = badgeColor(opinion.opinionType ?? '');

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Parecer Médico</title>
  </head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:30px 0;">
      <tr>
        <td align="center">
          <table width="680" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
            
            <!-- Header -->
            <tr>
              <td style="padding:24px 28px;background:#FFFFFF;border-bottom:1px solid #F1F5F9;">
                <table width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <h2 style="margin:0;font-size:18px;color:#0F172A;font-weight:700;">${safe(employee.NOME)}</h2>
                      <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;line-height:1.4;">
                        CPF: ${formatCPF(safe(employee.CPFFUNCIONARIO))}<br />
                        Empresa: <strong>${safe(employee.NOMEEMPRESA)}</strong> (${safe(employee.CODIGOEMPRESA)})<br />
                        CNPJ: ${formatCNPJ(safe(employee.CNPJEMPRESA))}<br />
                      </p>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <img src="${logoUrl}" alt="CMSO 360" width="130" style="display:block;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Informações do Funcionário -->
            <tr>
              <td style="padding:16px 28px;background:#FFFFFF;border-bottom:1px solid #F1F5F9;">
                <table width="100%" style="font-size:13px;color:#334155;">
                  <tr>
                    <td style="padding:4px 0;">
                      <strong>Unidade:</strong> ${safe(employee.NOMEUNIDADE)}
                    </td>
                    <td style="padding:4px 0;">
                      <strong>Setor:</strong> ${safe(employee.NOMESETOR)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <strong>Cargo:</strong> ${safe(employee.NOMECARGO)}
                    </td>
                    <td style="padding:4px 0;">
                      <strong>Tipo de Exame:</strong> ${tipoExameLabels[employee.TIPOEXAME] || safe(employee.TIPOEXAMENOME)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <strong>Atendimento:</strong> ${safe(employee.DATAAGENDAMENTO)} - ${safe(employee.UNIDADEATENDIMENTO)}
                    </td>
                    <td style="padding:4px 0;">
                      <strong>Horário:</strong> ${tipoExameLabels[employee.HORARIO] || safe(employee.HORARIO)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Observações e Anotações -->
            ${
              employee.OBSERVACOES || employee.ANOTACOES
                ? `
            <tr>
              <td style="padding:16px 28px;background:#FFFBF0;border-bottom:1px solid #E5E7EB;">
                <h4 style="margin:0 0 8px 0;font-size:14px;color:#111;">Observações e Anotações</h4>
                ${
                  employee.OBSERVACOES
                    ? `
                <div style="margin-bottom:12px;">
                  <strong style="font-size:13px;color:#374151;">Observações:</strong>
                  <div style="padding:8px 12px;background:#FFFBEB;border-radius:4px;margin-top:4px;">
                    <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">${safe(employee.OBSERVACOES)}</p>
                  </div>
                </div>
                `
                    : ''
                }
                ${
                  employee.ANOTACOES
                    ? `
                <div>
                  <strong style="font-size:13px;color:#374151;">Anotações:</strong>
                  <div style="padding:8px 12px;background:#FFFBEB;border-radius:4px;margin-top:4px;">
                    <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">${safe(employee.ANOTACOES)}</p>
                  </div>
                </div>
                `
                    : ''
                }
              </td>
            </tr>
            `
                : ''
            }

            <!-- Parecer Médico com Destaque -->
            <tr>
              <td style="padding:28px;background:#FFFFFF;">
                <div style="text-align:center;margin-bottom:18px;">
                  <h3 style="margin:0;font-size:18px;color:#0F172A;font-weight:700;">PARECER MÉDICO</h3>
                  <p style="margin:4px 0 0 0;font-size:13px;color:#64748B;">Resultado da avaliação ocupacional</p>
                </div>

                <div style="background:white;border-radius:10px;padding:22px;border:2px solid ${mainBadgeColor};box-shadow:0 4px 12px rgba(245,158,11,0.08);">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                    <tr>
                      <td style="font-size:14px;color:#334155;font-weight:600;vertical-align:middle;">Resultado:</td>
                      <td align="right" style="vertical-align:middle;">
                        <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                          <tr>
                            <td style="padding:10px 22px;border-radius:8px;background:${mainBadgeColor};color:white;font-weight:700;font-size:14px;letter-spacing:0.5px;white-space:nowrap;">
                              ${opinionLabels[opinion.opinionType!] || 'SEM PARECER'}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <div style="margin-top:16px;">
                    <h4 style="margin:0 0 8px 0;font-size:13px;color:#0F172A;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Observações e Recomendações:</h4>
                    <div style="padding:14px;background:#FFFBEB;border-radius:8px;border-left:4px solid ${mainBadgeColor};">
                      <p style="margin:0;font-size:13px;color:#78350F;line-height:1.6;font-weight:500;">
                        ${safe(opinion.details) || 'Nenhuma observação adicional registrada.'}
                      </p>
                    </div>
                  </div>

                  ${
                    opinion.laudoRestricao
                      ? `
                  <div style="margin-top:16px;padding:16px;background:#FFFBEB;border-radius:6px;border:1px solid #FCD34D;">
                    <h4 style="margin:0 0 10px 0;font-size:14px;color:#92400E;font-weight:700;">⚠ Restrição Temporária Emitida</h4>
                    <table width="100%" style="font-size:13px;color:#374151;border-collapse:collapse;">
                      <tr>
                        <td style="padding:4px 0;width:40%;"><strong>CID:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.cid)} — ${safe(opinion.laudoRestricao.descricaoCid)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;"><strong>Período:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.periodoDias)} dias</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;"><strong>Início:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.dataInicio)}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;"><strong>Fim:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.dataFim)}</td>
                      </tr>
                      ${
                        opinion.laudoRestricao.restricoes
                          ? `<tr>
                        <td style="padding:4px 0;vertical-align:top;"><strong>Restrições:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.restricoes)}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        opinion.laudoRestricao.recomendacoes
                          ? `<tr>
                        <td style="padding:4px 0;vertical-align:top;"><strong>Recomendações:</strong></td>
                        <td style="padding:4px 0;">${safe(opinion.laudoRestricao.recomendacoes)}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </div>
                  `
                      : ''
                  }

                  ${
                    asoFileUrl
                      ? `
                  <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #CBD5E1;text-align:center;">
                    <a href="${escapeHtml(asoFileUrl)}" target="_blank" rel="noopener noreferrer" style="background-color:${primaryColor};color:#ffffff;padding:12px 26px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;box-shadow:0 3px 8px rgba(30,173,96,0.25);">📄 Visualizar / Baixar ASO</a>
                  </div>
                  `
                      : ''
                  }

                   <div style="margin-top:16px;font-size:12px;color:#6B7280;border-top:1px solid #E5E7EB;padding-top:12px;">
                     Emitido por: ${safe(issuedBy?.nome) || safe(employee.MEDICO) || '—'} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                   </div>
                 </div>
                 ${clientInfoHtml}
               </td>
             </tr>


            <!-- Riscos -->
            <tr>
              <td style="padding:0 28px 20px 28px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;color:#111;">Riscos Ocupacionais</h4>
                <ul style="margin:0;padding-left:18px;color:#374151;">${riscosHtml}</ul>
              </td>
            </tr>

            <!-- Exames -->
            <tr>
              <td style="padding:0 28px 20px 28px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;color:#111;">Exames Realizados</h4>
                ${examsHtml}
              </td>
            </tr>

            <!-- Anexos -->
            <tr>
              <td style="padding:0 28px 24px 28px;">
                <h4 style="margin:0 0 8px 0;font-size:14px;color:#111;">Anexos</h4>
                <ul style="padding-left:18px;margin:0;color:#374151;">${anexosHtml}</ul>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;">
                <p style="font-size:12px;color:#6B7280;margin:0;">
                  Este é um comunicado interno automático gerado pelo sistema CMSO 360. Em caso de dúvidas, entre em contato com o setor responsável.
                </p>
                <p style="margin-top:8px;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} CMSO 360. Todos os direitos reservados.</p>
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
