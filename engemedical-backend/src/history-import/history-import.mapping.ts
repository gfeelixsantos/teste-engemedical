export type CurrentHistoryEmployee = {
  id: string;
  cpf: string;
  name: string;
  codEmpresa: string;
  codFuncionario: string;
  sequencialFicha: string;
};

export type ImportedHistoryEmployee = {
  cpf: string;
  name: string;
  unit: string;
};

export function normalizeHistoryCpf(value: string | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function resolveHistoryEmployeeForUpload(
  imported: ImportedHistoryEmployee,
  currentEmployees: CurrentHistoryEmployee[],
): { found: true; employee: CurrentHistoryEmployee } | { found: false; employee: null } {
  const cpf = normalizeHistoryCpf(imported.cpf);
  if (!cpf) return { found: false, employee: null };

  const employee = currentEmployees.find(
    (candidate) => normalizeHistoryCpf(candidate.cpf) === cpf,
  );

  return employee ? { found: true, employee } : { found: false, employee: null };
}

export function resolveHistoryUploadMetadata(
  type: 'ASO' | 'EXAME' | 'PRONTUARIO' | 'OUTRO',
  fileName: string,
): { codigoTipoGed: string; classificacao: string } {
  const normalizedName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (type === 'ASO' || normalizedName.startsWith('ASO')) {
    return { codigoTipoGed: '34', classificacao: 'ASO' };
  }

  return { codigoTipoGed: '20', classificacao: 'RESULTADO_EXAME' };
}
