const REQUIRED_HEADERS = ['Nome Completo', 'CPF'] as const;

export type EmployeeSheetValidation = { valid: boolean; rowCount: number; missingHeaders: string[] };

export function validateEmployeeSheet(filename: string, buffer: Buffer): EmployeeSheetValidation {
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension || !['csv', 'xlsx', 'xls'].includes(extension) || buffer.length === 0) {
    return { valid: false, rowCount: 0, missingHeaders: [...REQUIRED_HEADERS] };
  }
  if (extension !== 'csv') return { valid: true, rowCount: 0, missingHeaders: [] };
  const lines = buffer.toString('utf8').split(/\r?\n/).filter((line) => line.trim());
  const headers = lines[0].split(',').map((header) => header.trim().replace(/^"|"$/g, ''));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  return { valid: missingHeaders.length === 0, rowCount: Math.max(0, lines.length - 1), missingHeaders: [...missingHeaders] };
}
