export interface UserActivityLogEntry {
  user?: {
    codigo?: string;
    nome?: string;
    perfil?: string;
  };
  acao: string;
  recursoId?: string;
  recursoTipo?: string;
  pacienteCodigo?: string;
  pacienteNome?: string;
  unidade?: string;
  detalhes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}
