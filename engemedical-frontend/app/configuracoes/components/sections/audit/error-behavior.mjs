export function resolveAuditLogsErrorBehavior(status, message) {
  if (status === 401) {
    return { redirectTo: "/" };
  }

  if (status === 403) {
    return { redirectTo: "/configuracoes" };
  }

  if (typeof status === "number" && status >= 500) {
    return { message: "Erro ao carregar logs de auditoria." };
  }

  return {
    message: message || "Erro ao carregar logs de auditoria.",
  };
}
