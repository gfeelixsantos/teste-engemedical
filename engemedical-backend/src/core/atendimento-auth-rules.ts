import { SchedulingDocument } from '../mongo/types/scheduling';

/**
 * Verifica se a origem do agendamento é SOC.
 * Documentos legados (sem o campo AUTENTICACAOATENDIMENTO) são tratados como SOC.
 */
export function isSocOrigin(scheduling: SchedulingDocument): boolean {
  // Se não tem o campo, é legado = SOC
  if (!scheduling.AUTENTICACAOATENDIMENTO) return true;
  
  return scheduling.AUTENTICACAOATENDIMENTO.metodo === 'SOC';
}

/**
 * Verifica se a origem é BIOMETRIA ou FACIAL (não-SOC).
 */
export function isDigitalAuthOrigin(scheduling: SchedulingDocument): boolean {
  return !isSocOrigin(scheduling);
}
