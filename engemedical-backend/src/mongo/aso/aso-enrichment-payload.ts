import { AsoEnriquecimentoMessage } from '../../azure/types/azure.types';

export function buildAsoEnrichmentPayloadFromScheduling(
  doc: any,
): AsoEnriquecimentoMessage | null {
  const schedulingId = String(doc?._id || '').trim();
  const url = String(doc?.ASOINFO?.url || '').trim();

  if (!schedulingId || !url) return null;

  return {
    schedulingId,
    url,
    nomeFuncionario: String(doc?.NOME || '').trim(),
    nomeEmpresa: String(doc?.NOMEEMPRESA || '').trim(),
    tipoExame: String(doc?.TIPOEXAMENOME || doc?.TIPOEXAME || '').trim(),
    medico: doc?.MEDICO || doc?.MEDICOCOORDENADOR || undefined,
    codEmpresa: String(doc?.CODIGOEMPRESA || '').trim(),
    createdAt: new Date(),
  };
}
