export function getAsoProcessingEligibilityError(input: {
  schedulingId?: string;
  sequencial?: string;
  codEmpresa?: string;
  codFuncionario?: string;
  medico?: string;
}): string | null {
  const requiredFields = [
    'schedulingId',
    'sequencial',
    'codEmpresa',
    'codFuncionario',
    'medico',
  ] as const;

  for (const field of requiredFields) {
    if (!String(input?.[field] || '').trim()) {
      return `Payload invalido para processamento tecnico do ASO: campo obrigatorio ausente: ${field}`;
    }
  }

  if (!/^\d+$/.test(String(input?.medico || '').trim())) {
    return 'Payload invalido para processamento tecnico do ASO: medico deve ser um codigo numerico';
  }

  return null;
}
