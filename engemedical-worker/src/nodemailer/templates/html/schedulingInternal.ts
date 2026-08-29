import { SchedulingDocument } from 'src/mongo/types/scheduling';

const primaryColor = '#114F36';
const secondaryColor = '#AFCA07';

const escapeHtml = (value?: string | number | null) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCPF = (cpf?: string) => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const schedulingInternalHtml = (
  funcionario: SchedulingDocument,
): string => {
  const isAdendo = (funcionario.CODIGOCARGO || '').toUpperCase().includes('ADENDO-WEB');
  const adendoInfo = (funcionario as any).adendoInfo || null;

  const allExams = [
    'ACUIDADE VISUAL',
    'AUDIOMETRIA',
    'AVALIAÇÃO PSICOSSOCIAL',
    'CLÍNICO',
    'PRESSÃO ARTERIAL',
    'ECG',
    'EEG',
    'ESPIROMETRIA',
    'LABORATÓRIO',
    'RAIO-X',
    'TOXICOLÓGICO',
  ];

  const examsTable = allExams
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border:1px solid #ddd;">
        <input type="checkbox" style="transform:scale(2);margin-right:15px;" />
        <span>${item}</span>
      </td>
      <td style="padding:12px;border:1px solid #ddd;"></td>
      <td style="padding:12px;border:1px solid #ddd;"></td>
    </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agendamento - Centro Médico de Saúde Ocupacional</title>
</head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;color:#2c3e50;background-color:white;">
  <div style="width:210mm;min-height:297mm;margin:0 auto;background-color:white;box-shadow:0 0 20px rgba(0,0,0,0.1);padding:15mm;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:25px;border-bottom:2px solid ${primaryColor};padding-bottom:15px;">
      ${isAdendo
        ? `<tr>
            <td colspan="2" style="background-color:#fff3cd;color:#856404;padding:12px;border:1px solid #ffeeba;border-radius:8px;margin-bottom:15px;font-weight:bold;font-size:14px;">
              <div style="font-size:16px;margin-bottom:5px;text-align:center;">⚠️ ATENÇÃO: NOVA FUNÇÃO (ADENDO-WEB)</div>
              ${adendoInfo
                ? `<div style="font-size:12px;font-weight:normal;border-top:1px solid #ffeeba;padding-top:8px;margin-top:5px;">
                    <strong>Referência de Atividade Similar:</strong><br>
                    • Unidade: ${escapeHtml(adendoInfo.nomeUnidadeSimilar || 'N/A')}<br>
                    • Setor: ${escapeHtml(adendoInfo.nomeSetorSimilar || 'N/A')}<br>
                    • Cargo: ${escapeHtml(adendoInfo.nomeCargoSimilar || 'N/A')}
                  </div>`
                : ''}
            </td>
          </tr>`
        : ''}
      <tr>
        <td valign="top">
          <div style="font-size:24px;font-weight:bold;color:${primaryColor};letter-spacing:1px;">${escapeHtml(funcionario.NOME).toUpperCase()}</div>
          ${funcionario.CPFFUNCIONARIO
            ? `<div style="font-size:14px;color:#2c3e50;margin-top:5px;">CPF: ${formatCPF(funcionario.CPFFUNCIONARIO)}</div>`
            : ''}
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;color:#2c3e50;margin-top:5px;">
            <tr>
              <td width="80%">EMPRESA: ${escapeHtml(funcionario.NOMEEMPRESA).toUpperCase()} - ${escapeHtml(funcionario.CODIGOEMPRESA)}</td>
              <td width="20%" align="left">${escapeHtml(funcionario.TIPOEXAMENOME).toUpperCase()}</td>
            </tr>
          </table>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;color:#2c3e50;margin-top:5px;table-layout:fixed;">
            <tr>
              <td width="33%">DATA: ${escapeHtml(funcionario.DATAAGENDAMENTO)}</td>
              <td width="34%" align="center">HORA: ${escapeHtml(funcionario.HORARIO)}</td>
              <td width="33%" align="left">UNIDADE: ${escapeHtml(funcionario.UNIDADEATENDIMENTO)}</td>
            </tr>
          </table>
        </td>
        <td valign="top" align="right">
          <div style="background-color:${primaryColor};color:white;padding:8px;border-radius:8px;text-align:center;margin-bottom:30px;">
            <div style="font-size:14px;margin-bottom:5px;">CÓDIGO SOC</div>
            <div style="font-size:24px;font-weight:bold;">${escapeHtml(funcionario.CODIGO)}</div>
          </div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Cargo</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Setor</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Unidade</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(funcionario.NOMECARGO).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(funcionario.NOMESETOR).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(funcionario.NOMEUNIDADE).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Solicitante</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">E-mail</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Contato</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(funcionario.CLIENT?.Name).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;">
          <a href="mailto:${escapeHtml(funcionario.CLIENT?.Email)}">${escapeHtml(funcionario.CLIENT?.Email)}</a>
        </td>
        <td style="padding:10px;border:1px solid #b2b2b2;">${escapeHtml(funcionario.CLIENT?.Phone)}</td>
      </tr>
      ${funcionario.OBSERVACOES
        ? `<tr>
            <td colspan="3" style="padding:10px;border:1px solid #b2b2b2;">
              <span style="font-weight:bold;">Observações: </span>
              <span style="color:red;">${escapeHtml(funcionario.OBSERVACOES)}</span>
            </td>
          </tr>`
        : ''}
      ${funcionario.EXAMES?.length > 0 && funcionario.EXAMES.some(exame => !exame.nomeExame?.includes('eSocial'))
        ? `<tr>
            <td colspan="3" style="padding:10px;border:1px solid #b2b2b2;font-size:10px;">
              <span style="font-weight:bold;">Exames solicitados:</span>
              ${funcionario.EXAMES
                .filter(exame => !exame.nomeExame?.includes('eSocial'))
                .map(exame => `<span style="color:white;background-color:${secondaryColor};border-radius:50px;padding:5px 10px;margin:5px;white-space:nowrap;display:inline-block;">${escapeHtml(exame.nomeExame)}</span>`)
                .join(' ')}
            </td>
          </tr>`
        : ''}
    </table>

    <table style="width:100%;border-collapse:collapse;border:1px solid #b2b2b2;">
      <thead>
        <tr>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Atendente</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Biometria</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Horário</th>
        </tr>
        <tr>
          <td style="padding:20px;border:1px solid #b2b2b2;"></td>
          <td style="padding:20px;border:1px solid #b2b2b2;"></td>
          <td style="padding:20px;border:1px solid #b2b2b2;"></td>
        </tr>
        <tr>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Etiqueta</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Visto</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Horário</th>
        </tr>
      </thead>
      <tbody>
        ${examsTable}
      </tbody>
      <tfoot>
        <tr>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;" colspan="3">Finalização</th>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #b2b2b2;">Assinatura:</td>
          <td style="padding:12px;border:1px solid #b2b2b2;">Horário:</td>
          <td style="padding:12px;border:1px solid #b2b2b2;">Telefone:</td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>`;
};
