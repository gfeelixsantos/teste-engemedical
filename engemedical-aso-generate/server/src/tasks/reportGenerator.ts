import axios from "axios";
import type { Browser } from "puppeteer";
import { AsoProcessingMessage } from "../web/types";
import { savePdfFromHtml } from "./savePdf";
import { generateReportDocumentName } from "../utils/fileNameGenerator";
import { formatCPF } from "../utils/util";
import { resolveBackendBaseUrl } from "../utils/runtimeMode";

type ReportRisk = {
  risco?: string | null;
};

type ReportExam = {
  nomeExame?: string;
  sala?: string;
  profissional?: string;
  dataExame?: string;
  status?: string;
};

type ReportScheduling = {
  _id?: string;
  CODIGO?: string;
  CPFFUNCIONARIO?: string;
  MATRICULAFUNCIONARIO?: string;
  NOME?: string;
  NOMEEMPRESA?: string;
  CNPJEMPRESA?: string;
  CPFEMPRESA?: string;
  NOMECARGO?: string;
  NOMESETOR?: string;
  NOMEUNIDADE?: string;
  UNIDADEATENDIMENTO?: string;
  DATAAGENDAMENTO?: string;
  HORARIO?: string;
  TIPOEXAMENOME?: string;
  RECOMENDACAOMEDICA?: string | null;
  OBSERVACOES?: string | null;
  RISCOSASO?: ReportRisk[] | null;
  EXAMES?: ReportExam[];
  TICKET?: {
    prefixo?: string;
    numero?: string | number;
  };
};

function parseDateTime(dateStr?: string): Date | null {
  if (!dateStr) {
    return null;
  }

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatExamDate(dateStr?: string): string {
  const date = parseDateTime(dateStr);
  if (!date) {
    return "Pendente";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value?: string | null): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReportHtml(employee: ReportScheduling): string {
  const dataAgendamento = employee.DATAAGENDAMENTO || "N/A";
  const horaAgendamento = employee.HORARIO || "N/A";
  const empresaDocumento = employee.CNPJEMPRESA || (employee.CPFEMPRESA ? formatCPF(employee.CPFEMPRESA) : "N/A");
  const recomendacaoMedica = employee.RECOMENDACAOMEDICA || "";
  const observacoes = employee.OBSERVACOES || "";

  const examsTable = (employee.EXAMES || [])
    .filter((exam) => exam.sala?.trim())
    .map((exam) => {
      const examDate = formatExamDate(exam.dataExame);

      return `
        <tr>
          <td class="td">${escapeHtml(exam.nomeExame || "N/A")}</td>
          <td class="td">${escapeHtml(exam.sala || "-")}</td>
          <td class="td">${escapeHtml(examDate)}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatorio - ${escapeHtml(employee.NOME || "Funcionario")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; background: #f3f4f6; color: #111827; padding: 20px; }
    .container { position: relative; width: 210mm; min-height: 297mm; margin: auto; background: white; padding: 16mm 16mm 25mm 16mm; box-shadow: 0 4px 18px rgba(0,0,0,0.08); border-top: 4px solid #1f5f46; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; }
    .employee-name { font-size: 18px; font-weight: 600; color: #1f5f46; }
    .employee-meta { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .logo { height: 36px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #1f5f46; margin-bottom: 6px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .meta-table, table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .meta-table tr { border-bottom: 1px solid #e5e7eb; }
    .meta-table td { padding: 4px 6px; }
    .meta-label { width: 140px; color: #6b7280; font-weight: 500; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; padding: 6px; border-bottom: 2px solid #1f5f46; }
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
        <div class="employee-meta">CPF: ${escapeHtml(employee.CPFFUNCIONARIO ? formatCPF(employee.CPFFUNCIONARIO) : "N/A")} | Matricula: ${escapeHtml(employee.MATRICULAFUNCIONARIO || "N/A")}</div>
        <div class="employee-meta"><span>Empresa: </span><span>${escapeHtml(employee.NOMEEMPRESA || "N/A")}</span></div>
      </div>
      <img src="https://cmsocupacional.com.br/images/logo.png" class="logo" />
    </div>

    <div class="section">
      <div class="section-title">Informacoes Gerais</div>
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
            <tr><td class="meta-label">Data e hora</td><td>${escapeHtml(dataAgendamento)} as ${escapeHtml(horaAgendamento)}</td></tr>
            <tr><td class="meta-label">Unidade atendimento</td><td>${escapeHtml(employee.UNIDADEATENDIMENTO || "N/A")}</td></tr>
            <tr><td class="meta-label">Tipo Exame</td><td>${escapeHtml(employee.TIPOEXAMENOME || "N/A")}</td></tr>
            <tr><td class="meta-label">Senha</td><td style="font-weight:600">${escapeHtml(`${employee.TICKET?.prefixo || ""}${employee.TICKET?.numero || employee.CODIGO || ""}`)}</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${recomendacaoMedica ? `<div class="section"><div class="section-title">Recomendacao Medica</div><div class="observations">${escapeHtml(recomendacaoMedica)}</div></div>` : ""}
    ${observacoes ? `<div class="section"><div class="section-title">Observacoes</div><div class="observations">${escapeHtml(observacoes).replace(/\\n/g, "<br>")}</div></div>` : ""}

    <div class="section">
      <div class="section-title">Exames Realizados</div>
      ${
        examsTable
          ? `<table><thead><tr><th>Exame</th><th>Sala</th><th>Data/Hora</th></tr></thead><tbody>${examsTable}</tbody></table>`
          : `<div class="observations" style="text-align:center">Nenhum exame com sala designada</div>`
      }
    </div>

    <div class="footer">
      Relatorio gerado em ${new Date().toLocaleString("pt-BR")} <br />
      Documento confidencial
    </div>
  </div>
</body>
</html>`;
}

async function fetchReportScheduling(schedulingId: string): Promise<ReportScheduling> {
  const { baseURL: baseUrl } = resolveBackendBaseUrl();
  const url = `${baseUrl}/schedulings/report/${schedulingId}`;

  console.log(`[REPORT] Buscando dados do relatorio em ${url}`);

  const response = await axios.get<ReportScheduling>(url, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

export async function generateReportPdf(browser: Browser, item: AsoProcessingMessage): Promise<string> {
  const reportData = await fetchReportScheduling(item.schedulingId);
  const html = buildReportHtml(reportData);
  const documentName = generateReportDocumentName(item);

  return await savePdfFromHtml(browser, html, documentName);
}
