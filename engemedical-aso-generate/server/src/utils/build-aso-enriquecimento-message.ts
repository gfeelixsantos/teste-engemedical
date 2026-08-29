import {
  AsoEnriquecimentoMessage,
  AsoProcessingMessage,
} from '../web/types';

export function buildAsoEnriquecimentoMessage(params: {
  item: AsoProcessingMessage;
  blobUrl: string;
  createdAt?: string;
}): AsoEnriquecimentoMessage {
  const { item, blobUrl, createdAt } = params;

  return {
    commandId: item.commandId,
    schedulingId: item.schedulingId,
    url: blobUrl,
    nomeFuncionario: item.nomeFuncionario,
    nomeEmpresa: item.nomeEmpresa,
    tipoExame: item.tipoExameNome,
    codEmpresa: item.codEmpresa,
    medico: item.medico,
    observacoesParecer: item.observacoesParecer,
    profissional: item.profissional,
    credentials: item.credentials,
    createdAt: createdAt || new Date().toISOString(),
  };
}
