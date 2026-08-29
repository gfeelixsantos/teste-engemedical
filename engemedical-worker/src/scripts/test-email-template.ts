import * as fs from 'fs';
import * as path from 'path';

// Mock data based on ScrapeReport interface
const report = {
  timestamp: new Date(),
  processedCount: 1,
  successCount: 1,
  matchedExamsTotal: 1,
  details: [
    {
      patient: 'SAULO RIBEIRO DA SILVA',
      company: 'AUTOPORT TRANSPORTES E LOGISTICA LTDA.',
      cpf: '123.456.789-00',
      provider: 'Medical',
      examType: 'PERIODICO',
      appointmentDate: '09/02/2026',
      matchedExams: [{ name: 'EXAME CLINICO', group: 'Geral' }],
      status: 'SUCCESS' as const,
    },
  ],
};

const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    SUCCESS:
      '<span style="color: #27ae60; font-weight: bold;">Concluído</span>',
    NO_MATCH:
      '<span style="color: #f39c12; font-weight: bold;">Pendente</span>',
    FAILED: '<span style="color: #c0392b; font-weight: bold;">Erro</span>',
  };
  return map[status] || status;
};

const formatExams = (exams: Array<{ name: string; group: string }>) => {
  if (!exams.length) return '-';
  const groups: Record<string, string[]> = {};
  for (const ex of exams) {
    if (!groups[ex.group]) groups[ex.group] = [];
    groups[ex.group].push(ex.name);
  }
  return Object.entries(groups)
    .map(
      ([group, list]) =>
        `<div style="margin-bottom: 4px;"><strong>${group}:</strong> ${list.join(', ')}</div>`,
    )
    .join('');
};

const groupedByCompany: Record<string, any[]> = {};
for (const detail of report.details) {
  if (!groupedByCompany[detail.company]) {
    groupedByCompany[detail.company] = [];
  }
  groupedByCompany[detail.company].push(detail);
}

let companySections = '';

for (const [company, details] of Object.entries(groupedByCompany)) {
  const rows = details
    .map(
      (d) => `
          <tr>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px;">${d.patient}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px;">${d.cpf}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px;">${d.examType}<br><small style="color: #64748b;">${d.appointmentDate}</small></td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px;">${d.provider}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px; text-align: center;">${translateStatus(d.status)}</td>
          <td style="border: 1px solid #e2e8f0; padding: 10px; font-size: 13px;">${formatExams(d.matchedExams)}${d.error ? `<div style="color: #c0392b; margin-top: 4px;">${d.error}</div>` : ''}</td>
        </tr>`,
    )
    .join('');

  companySections += `
    <div style="margin-bottom: 30px;">
      <h3 style="background-color: #f8fafc; padding: 10px; border-left: 4px solid #1EAD60; margin: 0 0 10px 0; color: #2c3e50;">
        Empresa: <strong>${company}</strong>
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; background-color: #fff;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase;">
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Paciente</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left; width: 110px;">CPF</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left; width: 150px;">Tipo / Data</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left; width: 80px;">Portal</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: center; width: 90px;">Status</th>
            <th style="border: 1px solid #e2e8f0; padding: 10px; text-align: left;">Exames Localizados</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

const html = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; color: #334155;">
    <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">Relatório de Coleta de Exames</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.8;">CMSO 360 - Automático</p>
    </div>
    
    <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; background-color: #fff;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; background: #fdfdfd; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1;">
        <div>
          <strong>Data/Hora:</strong> ${report.timestamp.toLocaleString('pt-BR')}
        </div>
        <div>
          <strong>Prontuários:</strong> ${report.processedCount} | 
          <strong>Sucessos:</strong> ${report.successCount} | 
          <strong>Exames:</strong> ${report.matchedExamsTotal}
        </div>
      </div>

      ${companySections}

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; text-align: center;">
        Este é um e-mail automático gerado pelo CMSO 360 Worker.<br>
        Não responda a este e-mail.
      </div>
    </div>
  </div>
`;

const outputPath = path.join(__dirname, 'test-report-email.html');
fs.writeFileSync(outputPath, html);
console.log('Template de e-mail gerado em:', outputPath);
