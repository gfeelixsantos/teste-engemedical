export function buildAuditFilterParams(state) {
  const params = {};

  if (state.dataInicio) params.dataInicio = state.dataInicio;
  if (state.dataFim) params.dataFim = state.dataFim;
  if (state.userCodigo) params.userCodigo = state.userCodigo;
  if (state.acao) params.acao = state.acao;
  if (state.unidade) params.unidade = state.unidade;
  if (state.pacienteCodigo) params.pacienteCodigo = state.pacienteCodigo;
  if (state.requestId) params.requestId = state.requestId;

  return params;
}
