import { Scheduling } from "../interface/scheduling";

import { formatCPF } from "@/lib/utils";

const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const primaryColor = "#1f5f46";

export function reportInternal(employee: Scheduling): string {
  const dataAgendamento = employee.DATAAGENDAMENTO || "N/A";
  const horaAgendamento = employee.HORARIO || "N/A";

  function parseDateTime(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  function formatExamDate(dataExame?: string): string {
    if (!dataExame) return "Pendente";
    const date = parseDateTime(dataExame);

    if (!date) return "Pendente";

    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const examsTable = (employee.EXAMES || [])
    .filter((exame) => exame.sala?.trim())
    .map((exame) => {
      const examDate = formatExamDate(exame.dataExame);
      return `
        <tr>
          <td class="td">${escapeHtml(exame.nomeExame || "N/A")}</td>
          <td class="td">${escapeHtml(exame.sala || "-")}</td>
          <td class="td">${escapeHtml(examDate)}</td>
        </tr>
      `;
    })
    .join("");

  const recomendacaoMedica = employee.RECOMENDACAOMEDICA || "";
  const observacoes = employee.OBSERVACOES || "";

  const empresaDocumento = employee.CNPJEMPRESA || (employee.CPFEMPRESA ? formatCPF(employee.CPFEMPRESA) : "N/A");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório - ${escapeHtml(employee.NOME || "Funcionario")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; background: #f3f4f6; color: #111827; padding: 20px; }
    .container { position: relative; width: 210mm; min-height: 297mm; margin: auto; background: white; padding: 16mm 16mm 25mm 16mm; box-shadow: 0 4px 18px rgba(0,0,0,0.08); border-top: 4px solid ${primaryColor}; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; }
    .employee-name { font-size: 18px; font-weight: 600; color: ${primaryColor}; }
    .employee-meta { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .logo { height: 36px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: ${primaryColor}; margin-bottom: 6px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .meta-table, table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .meta-table tr { border-bottom: 1px solid #e5e7eb; }
    .meta-table td { padding: 4px 6px; }
    .meta-label { width: 140px; color: #6b7280; font-weight: 500; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; padding: 6px; border-bottom: 2px solid ${primaryColor}; }
    .td { padding: 6px; border-bottom: 1px solid #e5e7eb; }
    .observations { border: 1px solid #e5e7eb; padding: 8px; font-size: 11px; white-space: pre-line; }
    .footer { position: absolute; bottom: 16mm; left: 16mm; right: 16mm; border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 9px; color: #6b7280; text-align: center; }
    @media print { body { background: none; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="employee-name">${escapeHtml(employee.NOME || "Funcionario")}</div>
        <div class="employee-meta">CPF: ${escapeHtml(employee.CPFFUNCIONARIO ? formatCPF(employee.CPFFUNCIONARIO) : "N/A")} | Matrícula: ${escapeHtml(employee.MATRICULAFUNCIONARIO || "N/A")}</div>
        <div class="employee-meta"><span>Empresa: </span><span>${escapeHtml(employee.NOMEEMPRESA || "N/A")}</span></div>
      </div>
      <img src="https://cmsocupacional.com.br/images/logo.png" class="logo" />
    </div>

    <div class="section">
      <div class="section-title">Informações Gerais</div>
      <div class="info-grid">
        <div>
          <table class="meta-table">
            <tr><td class="meta-label">CNPJ</td><td>${escapeHtml(empresaDocumento)}</td></tr>
            <tr><td class="meta-label">Cargo</td><td>${escapeHtml(employee.NOMECARGO || "N/A")}</td></tr>
            <tr><td class="meta-label">Setor</td><td>${escapeHtml(employee.NOMESETOR || "N/A")}</td></tr>
            <tr><td class="meta-label">Unidade</td><td>${escapeHtml(employee.NOMEUNIDADE || "N/A")}</td></tr>
          </table>
        </div>
        <div>
          <table class="meta-table">
            <tr><td class="meta-label">Data e hora</td><td>${escapeHtml(dataAgendamento)} às ${escapeHtml(horaAgendamento)}</td></tr>
            <tr><td class="meta-label">Unidade atendimento</td><td>${escapeHtml(employee.UNIDADEATENDIMENTO || "N/A")}</td></tr>
            <tr><td class="meta-label">Tipo Exame</td><td>${escapeHtml(employee.TIPOEXAMENOME || "N/A")}</td></tr>
            <tr><td class="meta-label">Senha</td><td style="font-weight:600">${escapeHtml(`${employee.TICKET?.prefixo || ""}${employee.TICKET?.numero || employee.CODIGO || ""}`)}</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${recomendacaoMedica ? `<div class="section"><div class="section-title">Recomendação Médica</div><div class="observations">${escapeHtml(recomendacaoMedica)}</div></div>` : ""}
    ${observacoes ? `<div class="section"><div class="section-title">Observações</div><div class="observations">${escapeHtml(observacoes).replace(/\\n/g, "<br>")}</div></div>` : ""}

    <div class="section">
      <div class="section-title">Exames Realizados</div>
      ${
        examsTable
          ? `<table><thead><tr><th>Exame</th><th>Sala</th><th>Data/Hora</th></tr></thead><tbody>${examsTable}</tbody></table>`
          : `<div class="observations" style="text-align:center">Nenhum exame com sala designada</div>`
      }
    </div>

    <div class="footer">
      Relatório gerado em ${new Date().toLocaleString("pt-BR")} <br />
      Documento confidencial
    </div>
  </div>
</body>
</html>`;
}
