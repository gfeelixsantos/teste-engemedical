export interface AuditLogRecord {
  id: string;
  user_codigo: string | null;
  user_nome: string | null;
  user_perfil: string | null;
  acao: string;
  recurso_id: string | null;
  recurso_tipo: string | null;
  paciente_codigo: string | null;
  paciente_nome: string | null;
  unidade: string | null;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AuditPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  data: AuditLogRecord[];
  pagination: AuditPaginationMeta;
  filters: { dataInicio: string; dataFim: string };
}

export interface AuditFilterParams {
  page: number;
  limit: number;
  dataInicio?: string;
  dataFim?: string;
  userCodigo?: string;
  acao?: string;
  unidade?: string;
  pacienteCodigo?: string;
  recursoId?: string;
  requestId?: string;
}
