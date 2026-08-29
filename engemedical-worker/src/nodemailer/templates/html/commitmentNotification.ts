const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const logoUrl = "https://cmsocupacional.com.br/images/logo.png";

export const commitmentNotificationHtml = (input: {
  title: string;
  type: string;
  company?: string | null;
  company_contact?: string | null;
  participants: string[];
  vehicle?: string | null;
  start_time: string;
  end_time: string;
  isToday?: boolean;
  isTomorrow?: boolean;
}) => {
  const typeBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      EXAME: "#16a34a",
      TREINAMENTO: "#ca8a04",
      VISITA_TECNICA: "#2563eb",
      PERICIA: "#dc2626",
    };
    return map[type] || "#6b7280";
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      EXAME: "Realização de Exames",
      TREINAMENTO: "Treinamento",
      VISITA_TECNICA: "Visita Técnica",
      PERICIA: "Perícia",
    };
    return map[type] || "Outro";
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const startDate = formatDate(input.start_time);
  const startTime = formatTime(input.start_time);
  const endTime = formatTime(input.end_time);

  const vehicleLabel = (v?: string | null) => {
    if (!v) return null;
    const map: Record<string, string> = {
      UNIDADE_MOVEL: "Unidade Móvel",
      UNIDADE_RAIO_X: "Unidade Raio-X",
      DOBLO_I: "Doblô I",
      DOBLO_II: "Doblô II",
      UP: "Up",
      PICKUP: "Pickup",
      MOBI: "Mobi",
      MOBI_COMERCIAL: "Mobi Comercial",
    };
    return map[v] || v.replace(/_/g, " ");
  };

  const participantsText = input.participants?.length
    ? input.participants.join(", ")
    : "—";

  const rows: string[] = [];

  rows.push(kvRow("Data", startDate));
  rows.push(kvRow("Horário", `${startTime} — ${endTime}`));

  if (input.company) {
    rows.push(kvRow("Empresa", escapeHtml(input.company)));
  }

  if (input.company_contact) {
    rows.push(kvRow("Contato", escapeHtml(input.company_contact)));
  }

  rows.push(kvRow("Participantes", participantsText));

  const vLabel = vehicleLabel(input.vehicle);
  if (vLabel) {
    rows.push(kvRow("Veículo", vLabel, false, true));
  } else {
    rows.push(kvRow("Veículo", "Nenhum", false, true));
  }

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compromisso — ${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f2;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#213329;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f2;">
    <tr>
      <td align="center" style="padding:24px 10px;">
        <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #d8e1d6;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:24px 28px 20px 28px;border-bottom:1px solid #e8ede6;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#66776d;margin-bottom:4px;">CMSO 360</div>
                    <div style="font-size:20px;font-weight:700;color:#114f36;">Notificação de Compromisso</div>
                  </td>
                  <td width="100" style="text-align:right;vertical-align:middle;">
                    <img src="${logoUrl}" alt="CMSO 360" width="90" style="display:block;margin-left:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Badge + Urgency -->
          <tr>
            <td style="padding:20px 28px 0 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${typeBadgeColor(input.type)};color:#fff;font-size:12px;font-weight:700;letter-spacing:0.3px;">
                      ${typeLabel(input.type)}
                    </span>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    ${input.isToday ? '<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:#166534;color:#fff;font-size:12px;font-weight:700;letter-spacing:0.3px;">HOJE</span>' : ""}
                    ${input.isTomorrow ? '<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:#1e40af;color:#fff;font-size:12px;font-weight:700;letter-spacing:0.3px;">AMANHÃ</span>' : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:14px 28px 0 28px;">
              <h1 style="margin:0;font-size:22px;color:#114f36;font-weight:700;line-height:1.2;">${escapeHtml(input.title)}</h1>
            </td>
          </tr>

          <!-- Details Card -->
          <tr>
            <td style="padding:18px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d8e1d6;border-radius:16px;background:#fafcfa;">
                <tr>
                  <td style="padding:4px 18px 4px 18px;">
                    ${rows.join("")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px;background:#f4f6f2;border-top:1px solid #d8e1d6;text-align:center;">
              <p style="margin:0;font-size:12px;color:#66776d;line-height:1.5;">
                Este é um comunicado automático gerado pelo sistema <strong>CMSO 360</strong>.<br />
                Em caso de dúvidas, entre em contato com o setor responsável.
              </p>
              <p style="margin:8px 0 0 0;font-size:11px;color:#94a69b;">&copy; ${new Date().getFullYear()} CMSO 360. Todos os direitos reservados.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const kvRow = (label: string, value: string, allowHtml = false, isLast = false) => {
  const rendered = allowHtml ? value : escapeHtml(value);
  const border = isLast ? "0" : "1px dashed #e3e9e1";
  const pb = isLast ? "0" : "6px";
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:${border};margin:0;">
      <tr>
        <td width="110" style="padding:8px 8px ${pb} 0;vertical-align:top;font-size:11px;font-weight:700;color:#2d6e52;text-transform:uppercase;letter-spacing:0.05em;">${label}</td>
        <td style="padding:8px 0 ${pb} 0;vertical-align:top;font-size:14px;line-height:1.35;color:#213329;">${rendered}</td>
      </tr>
    </table>`;
};
