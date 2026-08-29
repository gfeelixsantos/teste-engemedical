export const AUDIT_PRIMARY_COLUMNS = [
  "Data/Hora",
  "Usuário",
  "Ação",
  "Funcionário",
  "Resultado/Detalhes",
];

export function buildAuditExpandedDetails(record) {
  return {
    perfil: record.user_perfil ?? null,
    unidade: record.unidade ?? null,
    paciente_nome: record.paciente_nome ?? null,
    paciente_codigo: record.paciente_codigo ?? null,
    recurso_tipo: record.recurso_tipo ?? null,
    recurso_id: record.recurso_id ?? null,
    ip: record.ip ?? null,
    user_agent: record.user_agent ?? null,
    request_id: record.request_id ?? null,
    detalhes: record.detalhes ?? null,
  };
}

export function hasExpandedAuditDetails(record) {
  const details = buildAuditExpandedDetails(record);
  return Object.values(details).some((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return String(value).trim().length > 0;
  });
}
