import { BadRequestException } from '@nestjs/common';
import * as unzipper from 'unzipper';
import type { HistoryAnalysis, HistoryDocument, HistoryEmployee, HistoryFile } from './history-import.types';

export function validateHistoryImportFile(file: Express.Multer.File) {
  const extension = String(file?.originalname ?? '').toLowerCase().split('.').pop();
  if (!['zip', 'rar'].includes(extension ?? '')) throw new BadRequestException('Envie um pacote RAR ou ZIP');
  if (!file?.size) throw new BadRequestException('Arquivo vazio');
  return extension;
}

const digits = (value: string) => value.replace(/\D/g, '');
export function normalizeHistoryFilename(value: string): string {
  const filename = String(value ?? '');
  if (!/[ÃÂâ]/.test(filename)) return filename;
  const repaired = filename.replace(/Ã‡/g, 'Ç').replace(/Ãƒ/g, 'Ã').replace(/Ã‰/g, 'É').replace(/Ãš/g, 'Ú').replace(/Ã“/g, 'Ó').replace(/Ã€/g, 'À').replace(/Ã‚/g, 'Â');
  if (!repaired.includes('�')) return repaired;
  const latin1 = Buffer.from(filename, 'latin1').toString('utf8');
  return latin1.includes('�') ? filename : latin1;
}
const cpfFromName = (name: string) => name.match(/\d{11}/)?.[0] ?? '';
const normalizeHeader = (value: unknown) => String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const rowValue = (row: Record<string, unknown>, aliases: string[]) => {
  const indexed = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()]));
  for (const alias of aliases) { const value = indexed.get(normalizeHeader(alias)); if (value) return value; }
  return '';
};
export function classifyHistoryFile(name: string): HistoryFile['type'] {
  const value = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (value.includes('ASO')) return 'ASO';
  if (value.includes('PRONT') || value.includes('HISTOR')) return 'PRONTUARIO';
  if (value.endsWith('.PDF')) return 'EXAME';
  return 'OUTRO';
}

export async function readHistoryZipEntries(source: Buffer | string) {
  const directory = Buffer.isBuffer(source) ? await unzipper.Open.buffer(source) : await unzipper.Open.file(source);
  return directory.files.filter((entry) => !entry.type || entry.type === 'File').map((entry) => ({ id: entry.path, name: entry.path, type: classifyHistoryFile(entry.path), date: null }));
}

export function parseHistoryCatalogRows(rows: unknown[][]) {
  const headerIndex = rows.findIndex((row) => {
    const headers = new Set((row ?? []).map(normalizeHeader));
    return headers.has(normalizeHeader('Nome do funcionário')) && headers.has(normalizeHeader('CPF do funcionário'));
  });
  if (headerIndex < 0) return { employees: [], files: [] as HistoryFile[] };
  const headers = rows[headerIndex];
  const body = rows.slice(headerIndex + 1);
  const employees = new Map<string, HistoryEmployee>();
  const files: HistoryFile[] = [];
  for (const values of body) {
    const row = Object.fromEntries(headers.map((header, index) => [String(header ?? ''), values?.[index]]));
    const name = rowValue(row, ['Nome do funcionário', 'Nome do funcionario', 'Funcionário', 'Funcionario']);
    const cpf = digits(rowValue(row, ['CPF do funcionário', 'CPF do funcionario', 'CPF']));
    const unit = rowValue(row, ['Nome da Unidade', 'Unidade', 'Nomenclatura consolidada']);
    const fileName = rowValue(row, ['Nome do arquivo', 'Arquivo', 'Documento']);
    const type = classifyHistoryFile(`${rowValue(row, ['Tipo de SOCGED', 'Tipo SOCGED'])} ${fileName}`);
    if (name || cpf) {
      const id = cpf || normalizeHeader(name);
      if (!employees.has(id)) employees.set(id, { id, name, cpf, unit });
      if (fileName) files.push({
        id: fileName,
        name: fileName,
        type,
        date: rowValue(row, ['Data da ficha', 'Data Ficha']) || null,
        employeeId: id,
        codigoEmpresa: rowValue(row, ['Código da empresa', 'Codigo da empresa', 'Codigo Empresa', 'Empresa']),
        codigoFuncionario: rowValue(row, ['Código do funcionário', 'Codigo do funcionario', 'Código funcionário', 'Codigo funcionario']),
        codigoGed: rowValue(row, ['Código GED', 'Codigo GED', 'CD GED', 'CODIGOGED']),
        sequencialFicha: rowValue(row, ['Código sequencial ficha', 'Codigo sequencial ficha', 'Sequencial ficha', 'SEQUENCIAFICHA']),
      });
    }
  }
  return { employees: [...employees.values()], files };
}

export function analyzeHistoryImport(input: { employees: HistoryEmployee[]; files: HistoryFile[] }): Omit<HistoryAnalysis, 'id' | 'fileName' | 'size' | 'createdAt' | 'status'> {
  const documents: HistoryDocument[] = input.files.map((file) => {
    const cpf = cpfFromName(file.name);
    const employee = input.employees.find((item) => file.employeeId === item.id || (cpf && digits(item.cpf) === cpf));
    return { ...file, status: employee ? 'MATCHED' : 'PENDING', employee, employeeId: employee?.id };
  });
  return { employees: input.employees, documents, summary: { files: documents.length, employees: input.employees.length, pending: documents.filter((item) => item.status === 'PENDING').length } };
}
