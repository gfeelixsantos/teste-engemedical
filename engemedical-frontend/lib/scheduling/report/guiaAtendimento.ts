import QRCode from "qrcode";

import { Scheduling } from "../interface/scheduling";
import { IPrestador } from "@/lib/prestadores/services/prestadores.service";

const primaryColor = "#114F36";
const secondaryColor = "#AFCA07";
const agendaBaseUrl = "https://agenda.cmsocupacional.com.br";
const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function escapeHtml(value?: string | number | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeGuidePayload(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function formatCPF(cpf?: string): string {
  const raw = String(cpf ?? "").replace(/\D/g, "");
  return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function normalizeText(value?: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeMatchText(value?: string): string {
  return normalizeText(value).replace(/[^A-Z0-9]/g, "");
}

function getPrestadorGroups(prestador: IPrestador): string[] {
  return (prestador.grupos || [])
    .map((grupo) => String(grupo ?? "").trim())
    .filter(Boolean);
}

function getExamGroup(exame: any): string {
  return String(
    exame?.grupo ??
      exame?.GRUPO ??
      exame?.Grupo ??
      exame?.nomeGrupo ??
      exame?.NOMEGRUPO ??
      exame?.grupoExame ??
      "",
  ).trim();
}

function getExamName(exame: any): string {
  return String(
    exame?.nomeExame ??
      exame?.NOMEEXAME ??
      exame?.NomeExame ??
      exame?.nome ??
      exame?.NOME ??
      "",
  ).trim();
}

function filtrarExamesDoFuncionarioPorPrestador(
  employee: Scheduling,
  prestador: IPrestador,
) {
  const gruposPrestador = getPrestadorGroups(prestador).map(normalizeMatchText);
  const examesFuncionario = Array.isArray(employee.EXAMES) ? employee.EXAMES : [];

  return examesFuncionario.filter((exame) => {
    const grupoExame = getExamGroup(exame);

    return gruposPrestador.includes(normalizeMatchText(grupoExame));
  });
}

function formatBrazilTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function resolveInternalGuideHorario(
  employee: Scheduling,
): string {
  const horarioAgendamento = String(employee.HORARIO ?? "").trim();

  return horarioAgendamento || formatBrazilTime();
}

function resolveOperatorUnit(
  employee: Scheduling,
  operatorUnit?: string,
): string {
  return String(
    operatorUnit || employee.NOMEUNIDADE || employee.UNIDADEATENDIMENTO || "",
  ).trim();
}

function getUnitInfo(unit: string) {
  const key = normalizeText(unit);
  const cases: Record<
    string,
    {
      displayName: string;
      addressHtml: string;
      addressText: string;
      functioningHtml: string;
      contactHtml: string;
      qrCodeUrl: string;
    }
  > = {
    ARARAS: {
      displayName: "Araras",
      addressHtml: "Rua Coronel Justiniano, 509 - Centro - Araras/SP<br>CEP: 13600-700",
      addressText: "Rua Coronel Justiniano, 509 - Centro - Araras/SP, CEP 13600-700",
      functioningHtml: "Segunda a sexta: 07:30 às 12:00",
      contactHtml: "agendamento.araras@cmsocupacional.com.br<br>WhatsApp (19) 98218-2200",
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/araras`,
    },
    "CORDEIRÓPOLIS": {
      displayName: "Cordeirópolis",
      addressHtml: "Rua Guilherme Krauter, 507 - Centro - Cordeirópolis/SP<br>CEP: 13490-000",
      addressText: "Rua Guilherme Krauter, 507 - Centro - Cordeirópolis/SP, CEP 13490-000",
      functioningHtml:
        "Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00",
      contactHtml: "agendamento.cordeiro@cmsocupacional.com.br<br>WhatsApp (19) 99175-0727",
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/cordeiropolis`,
    },
    "RIO CLARO": {
      displayName: "Rio Claro",
      addressHtml: "Avenida Onze, 254 - Saúde - Rio Claro/SP<br>CEP: 13500-312",
      addressText: "Avenida Onze, 254 - Saúde - Rio Claro/SP, CEP 13500-312",
      functioningHtml:
        "Segunda a quinta: 07:30 às 12:00 - 13:30 às 18:00<br>Sexta: 07:30 às 12:00 - 13:30 às 17:00<br>Sábado: 07:30 às 12:00",
      contactHtml: "agendamento@cmsocupacional.com.br<br>WhatsApp (19) 99136-3590",
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/rioclaro`,
    },
  };

  return (
    cases[key] ?? {
      displayName: unit || "Unidade",
      addressHtml: "Endereço não informado",
      addressText: unit || "",
      functioningHtml: "Funcionamento não informado",
      contactHtml: "Contato não informado",
      qrCodeUrl: `${agendaBaseUrl}/api/qrcode/araras`,
    }
  );
}

async function buildQrCode(address?: string): Promise<string | null> {
  const endereco = String(address ?? "").trim();
  if (!endereco) return null;

  try {
    return await QRCode.toDataURL(
      `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`,
      {
        width: 160,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      },
    );
  } catch (error) {
    console.error("Erro ao gerar QR code:", error);
    return null;
  }
}

async function buildInternalGuideHtml(
  employee: Scheduling,
  operatorContext?: {
    operadorNome?: string;
    unidade?: string;
  },
): Promise<string> {
  const isAdendo = normalizeText(employee.CODIGOCARGO).includes("ADENDO-WEB");
  const adendoInfo = (employee as any).adendoInfo || null;
  const horarioFuncionario = resolveInternalGuideHorario(employee);
  const unidadeOperador = resolveOperatorUnit(employee, operatorContext?.unidade);
  const atendente = String(operatorContext?.operadorNome ?? "").trim();
  const horarioImpressao = formatBrazilTime();

  const examsSolicitados = (employee.EXAMES || [])
    .filter((exame) => !normalizeText(exame.nomeExame).includes("ESOCIAL"))
    .map(
      (exame) => `
        <span style="color:white;background-color:${secondaryColor};border-radius:50px;padding:5px 10px;margin:5px;white-space:nowrap;display:inline-block;">${escapeHtml(exame.nomeExame)}</span>`,
    )
    .join(" ");

  const allExams = [
    "ACUIDADE VISUAL",
    "AUDIOMETRIA",
    "AVALIAÇÃO PSICOSSOCIAL",
    "CLÍNICO",
    "PRESSÃO ARTERIAL",
    "ECG",
    "EEG",
    "ESPIROMETRIA",
    "LABORATÓRIO",
    "RAIO-X",
    "TOXICOLÓGICO",
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
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agendamento - Centro Médico de Saúde Ocupacional</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      .print-page {
        width: 210mm !important;
        min-height: 297mm !important;
        padding: 15mm !important;
        box-shadow: none !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;color:#2c3e50;background-color:white;">
  <div class="no-print" style="width:100%;max-width:210mm;margin:15px auto 0;padding:0 15mm;box-sizing:border-box;display:flex;justify-content:flex-end;">
    <button onclick="window.print()" style="padding:8px 16px;background-color:#114F36;color:white;border:none;border-radius:6px;font-family:inherit;font-weight:600;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(17,79,54,0.15);transition:all 0.2s;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
      Imprimir Guia
    </button>
  </div>
  <div class="print-page" style="width:100%;max-width:210mm;min-height:297mm;margin:0 auto;background-color:white;box-shadow:0 0 20px rgba(0,0,0,0.1);padding:15mm;box-sizing:border-box;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:25px;border-bottom:2px solid ${primaryColor};padding-bottom:15px;">
      ${isAdendo
        ? `<tr>
            <td colspan="2" style="background-color:#fff3cd;color:#856404;padding:12px;border:1px solid #ffeeba;border-radius:8px;margin-bottom:15px;font-weight:bold;font-size:14px;">
              <div style="font-size:16px;margin-bottom:5px;text-align:center;">ATENÇÃO: NOVA FUNÇÃO (ADENDO-WEB)</div>
              ${adendoInfo
                ? `<div style="font-size:12px;font-weight:normal;border-top:1px solid #ffeeba;padding-top:8px;margin-top:5px;">
                    <strong>Referência de Atividade Similar:</strong><br>
                    • Unidade: ${escapeHtml(adendoInfo.nomeUnidadeSimilar || "N/A")}<br>
                    • Setor: ${escapeHtml(adendoInfo.nomeSetorSimilar || "N/A")}<br>
                    • Cargo: ${escapeHtml(adendoInfo.nomeCargoSimilar || "N/A")}
                  </div>`
                : ""}
            </td>
          </tr>`
        : ""}
      <tr>
        <td valign="top">
          <div style="font-size:24px;font-weight:bold;color:${primaryColor};letter-spacing:1px;">${escapeHtml(employee.NOME).toUpperCase()}</div>
          ${employee.CPFFUNCIONARIO
            ? `<div style="font-size:14px;color:#2c3e50;margin-top:5px;">CPF: ${formatCPF(employee.CPFFUNCIONARIO)}</div>`
            : ""}
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;color:#2c3e50;margin-top:5px;">
            <tr>
              <td width="80%">EMPRESA: ${escapeHtml(employee.NOMEEMPRESA).toUpperCase()} - ${escapeHtml(employee.CODIGOEMPRESA)}</td>
              <td width="20%" align="left">${escapeHtml(employee.TIPOEXAMENOME).toUpperCase()}</td>
            </tr>
          </table>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:14px;color:#2c3e50;margin-top:5px;table-layout:fixed;">
            <tr>
              <td width="33%">DATA: ${escapeHtml(employee.DATAAGENDAMENTO)}</td>
              <td width="34%" align="center">HORA: ${escapeHtml(horarioFuncionario)}</td>
              <td width="33%" align="left">UNIDADE: ${escapeHtml(unidadeOperador)}</td>
            </tr>
          </table>
        </td>
        <td valign="top" align="right">
          <div style="background-color:${primaryColor};color:white;padding:8px;border-radius:8px;text-align:center;margin-bottom:30px;">
            <div style="font-size:14px;margin-bottom:5px;">CÓDIGO SOC</div>
            <div style="font-size:24px;font-weight:bold;">${escapeHtml(employee.CODIGO)}</div>
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
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(employee.NOMECARGO).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(employee.NOMESETOR).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(employee.NOMEUNIDADE).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Solicitante</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">E-mail</td>
        <td style="padding:10px;border:1px solid #b2b2b2;background-color:#b2b2b2;font-weight:bold;">Contato</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #b2b2b2;font-size:14px;">${escapeHtml(employee.CLIENT?.Name).toUpperCase()}</td>
        <td style="padding:10px;border:1px solid #b2b2b2;">
          <a href="mailto:${escapeHtml(employee.CLIENT?.Email)}">${escapeHtml(employee.CLIENT?.Email)}</a>
        </td>
        <td style="padding:10px;border:1px solid #b2b2b2;">${escapeHtml(employee.CLIENT?.Phone)}</td>
      </tr>
      ${employee.OBSERVACOES
        ? `<tr>
            <td colspan="3" style="padding:10px;border:1px solid #b2b2b2;">
              <span style="font-weight:bold;">Observações: </span>
              <span style="color:red;">${escapeHtml(employee.OBSERVACOES)}</span>
            </td>
          </tr>`
        : ""}
      ${examsSolicitados
        ? `<tr>
            <td colspan="3" style="padding:10px;border:1px solid #b2b2b2;font-size:10px;">
              <span style="font-weight:bold;">Exames solicitados:</span>
              ${examsSolicitados}
            </td>
          </tr>`
        : ""}
    </table>

    <table style="width:100%;border-collapse:collapse;border:1px solid #b2b2b2;">
      <thead>
        <tr>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Atendente</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Biometria</th>
          <th style="padding:12px;border:1px solid #b2b2b2;color:black;background-color:#b2b2b2;font-weight:bolder;font-size:14px;">Horário</th>
        </tr>
        <tr>
          <td style="padding:20px;border:1px solid #b2b2b2;">${escapeHtml(atendente)}</td>
          <td style="padding:20px;border:1px solid #b2b2b2;"></td>
          <td style="padding:20px;border:1px solid #b2b2b2;">${escapeHtml(horarioImpressao)}</td>
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
}

async function buildPrestadorGuideHtmlV2(
  employee: Scheduling,
  prestador: IPrestador,
  codigoToGrupoMap?: Record<string, string>,
  examesPreparacaoMap?: Record<string, string>,
  operatorContext?: {
    operadorNome?: string;
    unidade?: string;
  },
): Promise<string> {
  const qrDataUrl = await buildQrCode(prestador.endereco || undefined);
  const matchedExams = filtrarExamesDoFuncionarioPorPrestador(employee, prestador).map(
    (exame: any) => {
      const codigoExame = String(exame.codigoExame ?? exame.CODIGOEXAME ?? "").trim();
      return {
        ...exame,
        codigoExame,
        preparacao: String(
          exame.preparacao ??
            exame.PREPARACAO ??
            examesPreparacaoMap?.[codigoExame] ??
            "",
        ).trim(),
        grupo: String(
          exame.grupo ??
            exame.GRUPO ??
            codigoToGrupoMap?.[codigoExame] ??
            "",
        ).trim(),
      };
    },
  );

  const payloadJson = serializeGuidePayload({
    employee,
    prestador,
    matchedExams,
    meta: {
      hasCodigoToGrupoMap: Boolean(codigoToGrupoMap && Object.keys(codigoToGrupoMap).length > 0),
      hasExamesPreparacaoMap: Boolean(
        examesPreparacaoMap && Object.keys(examesPreparacaoMap).length > 0,
      ),
    },
    qrDataUrl,
    generatedAt: new Date().toISOString(),
    operatorContext,
  });

  const employeeData = [
    ["Funcionário", employee.NOME],
    ["CPF", formatCPF(employee.CPFFUNCIONARIO)],
    ["Empresa", [employee.NOMEEMPRESA, employee.CODIGOEMPRESA].filter(Boolean).join(" - ")],
    ["Tipo de Exame", employee.TIPOEXAMENOME],
    ["Data", employee.DATAAGENDAMENTO],
    ["Cargo", employee.NOMECARGO],
    ["Setor", employee.NOMESETOR],
    ["Unidade", employee.NOMEUNIDADE || employee.UNIDADEATENDIMENTO],
  ];

  const employeeDataHtml = employeeData
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #d7e6dc;background:${index % 2 === 0 ? "#fcfdfc" : "#fff"};font-size:11px;font-weight:700;color:#35594a;width:118px;line-height:1.2;">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border:1px solid #d7e6dc;background:${index % 2 === 0 ? "#fcfdfc" : "#fff"};font-size:12px;color:#0f172a;line-height:1.2;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
  const examRowsHtml = matchedExams.length
    ? matchedExams
        .map(
          (exame, index) => `
            <tr>
              <td style="padding:9px 10px;border:1px solid #d7e6dc;font-size:12px;color:#0f172a;">${index + 1}. ${escapeHtml(
                getExamName(exame),
              )}</td>
              <td style="padding:9px 10px;border:1px solid #d7e6dc;font-size:11px;color:#334155;">${exame.preparacao ? escapeHtml(exame.preparacao) : "-"}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:14px;border:1px solid #d7e6dc;color:#64748b;font-size:12px;">Nenhum exame encontrado para o grupo deste prestador.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guia do Prestador - Centro Médico de Saúde Ocupacional</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #f4f7f4;
      color: #0f172a;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #guide-root {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 15mm;
      box-sizing: border-box;
    }
    .no-print {
      width: 100%;
      max-width: 210mm;
      margin: 15px auto 0;
      padding: 0 15mm;
      box-sizing: border-box;
    }
    @media print {
      body {
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #guide-root {
        width: 210mm;
        min-height: 297mm;
        padding: 0;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display: flex; justify-content: flex-end;">
    <button onclick="window.print()" style="padding: 8px 16px; background-color: #114F36; color: white; border: none; border-radius: 6px; font-family: inherit; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(17,79,54,0.15); transition: all 0.2s;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
      Imprimir Guia
    </button>
  </div>
  <div id="guide-root"></div>
  <script id="guide-data" type="application/json">${payloadJson}</script>
  <script>
    (function () {
      const root = document.getElementById("guide-root");
      const dataEl = document.getElementById("guide-data");
      if (!root || !dataEl) return;

      const payload = JSON.parse(dataEl.textContent || "{}");
      const employee = payload.employee || {};
      const prestador = payload.prestador || {};
      const qrDataUrl = payload.qrDataUrl || "";
      const matchedExams = Array.isArray(payload.matchedExams) ? payload.matchedExams : [];

      const escapeHtml = (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      const getExamName = (exame) => String(
        exame?.nomeExame ??
        exame?.NOMEEXAME ??
        exame?.NomeExame ??
        exame?.nome ??
        exame?.NOME ??
        ""
      ).trim();

      const formatCPF = (cpf) => {
        const raw = String(cpf ?? "").replace(/\D/g, "");
        return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      };

      const employeeDataHtml = ${JSON.stringify(employeeDataHtml)};

      const examRowsHtml = matchedExams.length
        ? matchedExams.map((exame, index) => '<tr>' +
            '<td style="padding:9px 10px;border:1px solid #d7e6dc;font-size:12px;color:#0f172a;">' + (index + 1) + '. ' + escapeHtml(getExamName(exame)) + '</td>' +
            '<td style="padding:9px 10px;border:1px solid #d7e6dc;font-size:11px;color:#334155;">' + (String(exame.preparacao ?? "").trim() ? escapeHtml(String(exame.preparacao ?? "").trim()) : "-") + '</td>' +
          '</tr>').join('')
        : '<tr><td colspan="2" style="padding:14px;border:1px solid #d7e6dc;color:#64748b;font-size:12px;">Nenhum exame encontrado para o grupo deste prestador.</td></tr>';

      const reference = String(prestador.referencia ?? "").trim();
      const address = String(prestador.endereco ?? "").trim();
      const schedule = String(prestador.horario ?? "").trim();
      const operatorName = payload.operatorContext?.operadorNome || "-";
      const operatorUnit = payload.operatorContext?.unidade || "-";

      const genDate = new Date(payload.generatedAt);
      const emissionDate = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(genDate);

      const emissionTime = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(genDate);

      root.innerHTML =
        '<div style="border:1px solid #d7e6dc;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(17,79,54,0.08);background:#fff;">' +
          '<div style="padding:18px 20px;border-bottom:2px solid #114F36;background:linear-gradient(135deg,#ffffff 0%,#fbfdfb 100%);">' +
            '<div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;">' +
              '<div style="min-width:0;flex:1;">' +
                '<div style="margin-bottom:12px;"><img src="/images/cmso_logo.png" alt="Logo" style="height:35px;object-fit:contain;" /></div>' +
                '<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Guia do Prestador</div>' +
                '<div style="font-size:22px;font-weight:800;line-height:1.15;margin-top:6px;color:#114F36;">' + escapeHtml(prestador.nome || "") + '</div>' +
                '<div style="margin-top:8px;font-size:13px;line-height:1.45;color:#334155;">' +
                  (address ? '<strong>Endereço:</strong> ' + escapeHtml(address) + '<br />' : '') +
                  (schedule ? '<strong>Horário:</strong> ' + escapeHtml(schedule) + '<br />' : '') +
                  (reference ? '<strong>Referência:</strong> ' + escapeHtml(reference) : '') +
                '</div>' +
              '</div>' +
              '<div style="flex:0 0 110px;text-align:right;">' +
                (qrDataUrl ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><img src="' + qrDataUrl + '" alt="QR Code" style="width:96px;height:96px;border-radius:12px;border:1px solid #d7e6dc;" /><div style="font-size:10px;line-height:1.35;color:#64748b;text-align:center;max-width:110px;">Escaneie para abrir o Maps</div></div>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="padding:16px 20px 18px;">' +
            '<div style="margin-bottom:10px;font-size:12px;font-weight:800;color:#114f36;text-transform:uppercase;letter-spacing:.05em;">Dados do Funcionário</div>' +
            '<table style="width:100%;border-collapse:collapse;margin-bottom:12px;"><tbody>' + employeeDataHtml + '</tbody></table>' +
            '<div style="margin-bottom:10px;font-size:12px;font-weight:800;color:#114f36;text-transform:uppercase;letter-spacing:.05em;">Exames Solicitados</div>' +
            '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="padding:11px 10px;border:1px solid #d7e6dc;background:#f3f7f3;color:#35594a;font-size:12px;text-align:left;">Exame</th><th style="padding:11px 10px;border:1px solid #d7e6dc;background:#f3f7f3;color:#35594a;font-size:12px;text-align:left;">Preparação</th></tr></thead><tbody>' + examRowsHtml + '</tbody></table>' +
          '</div>' +
          '<div style="padding:10px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#64748b;">' +
            '<div>Operador: ' + escapeHtml(operatorName || "-") + ' | Unidade: ' + escapeHtml(operatorUnit || "-") + '</div>' +
            '<div>Emissão: ' + escapeHtml(emissionDate) + ' às ' + escapeHtml(emissionTime) + '</div>' +
          '</div>' +
        '</div>';

      window.__GUIDE_PRESTADOR__ = payload;
    })();
  </script>
</body>
</html>`;
}

export async function guiaAtendimento(
  employee: Scheduling,
  prestador?: IPrestador,
  codigoToGrupoMap?: Record<string, string>,
  examesPreparacaoMap?: Record<string, string>,
  operatorContext?: {
    operadorNome?: string;
    unidade?: string;
  },
): Promise<string> {
  if (prestador) {
    return buildPrestadorGuideHtmlV2(
      employee,
      prestador,
      codigoToGrupoMap,
      examesPreparacaoMap,
      operatorContext,
    );
  }

  return buildInternalGuideHtml(employee, operatorContext);
}
