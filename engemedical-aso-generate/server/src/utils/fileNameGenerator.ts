import { AsoProcessingMessage } from "../web/types";

/**
 * Gera nome de arquivo PDF padronizado para toda a aplicacao.
 * Formato: {schedulingId}.pdf
 */
export function generateDocumentName(message: AsoProcessingMessage): string {
  const { schedulingId } = message;

  if (!schedulingId) {
    throw new Error("schedulingId e obrigatorio para gerar o nome do documento");
  }

  return `${schedulingId}.pdf`;
}

/**
 * Gera nome de arquivo PDF a partir do schedulingId.
 */
export function generateDocumentNameFromPayload(schedulingId: string): string {
  if (!schedulingId) {
    throw new Error("schedulingId e obrigatorio para gerar o nome do documento");
  }

  return `${schedulingId}.pdf`;
}

/**
 * Gera nome do PDF do relatorio de atendimento.
 * Formato: {schedulingId}-relatorio.pdf
 */
export function generateReportDocumentName(message: AsoProcessingMessage): string {
  const { schedulingId } = message;

  if (!schedulingId) {
    throw new Error("schedulingId e obrigatorio para gerar o nome do relatorio");
  }

  return `${schedulingId}-relatorio.pdf`;
}
