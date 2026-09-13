import { BadRequestException } from '@nestjs/common';
import { analyzeHistoryImport, classifyHistoryFile, normalizeHistoryFilename, parseHistoryCatalogRows, readHistoryZipEntries, validateHistoryImportFile } from './history-import.analyzer';

describe('history import analyzer', () => {
  it('rejects unsupported or empty packages', () => {
    expect(() => validateHistoryImportFile({ originalname: 'historico.exe', size: 10 } as Express.Multer.File)).toThrow(BadRequestException);
    expect(() => validateHistoryImportFile({ originalname: 'historico.zip', size: 0 } as Express.Multer.File)).toThrow('Arquivo vazio');
  });

  it('groups documents and flags unmatched records', () => {
    const result = analyzeHistoryImport({
      employees: [{ id: 'e1', name: 'Ana Lima', cpf: '123.456.789-00', unit: 'Matriz' }],
      files: [
        { id: 'f1', name: 'ASO_12345678900_2024.pdf', type: 'ASO', date: '2024-01-10' },
        { id: 'f2', name: 'exame-sem-cpf.pdf', type: 'EXAME', date: null },
      ],
    });
    expect(result.summary).toEqual({ files: 2, employees: 1, pending: 1 });
    expect(result.documents[0].status).toBe('MATCHED');
    expect(result.documents[1].status).toBe('PENDING');
  });

  it('classifies SOC document names', () => {
    expect(classifyHistoryFile('unidade/ASO_123.pdf')).toBe('ASO');
    expect(classifyHistoryFile('prontuario/resultado.pdf')).toBe('PRONTUARIO');
    expect(classifyHistoryFile('exames/hemograma.pdf')).toBe('EXAME');
  });

  it('reads a ZIP received through Multer memory storage', async () => {
    const emptyZip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
    await expect(readHistoryZipEntries(emptyZip)).resolves.toEqual([]);
  });

  it('maps the PHP catalog aliases and accented headers', () => {
    const result = parseHistoryCatalogRows([
      ['Nome do funcionário', 'CPF do funcionário', 'Nome da Unidade', 'Nome do arquivo', 'Tipo de SOCGED'],
      ['João da Silva', '123.456.789-00', 'Matriz', 'ASO_joao.pdf', 'ASO'],
    ]);
    expect(result.employees).toEqual([{ id: '12345678900', name: 'João da Silva', cpf: '12345678900', unit: 'Matriz' }]);
    expect(result.files[0]).toMatchObject({ name: 'ASO_joao.pdf', type: 'ASO', employeeId: '12345678900' });
  });

  it('finds the header row after the report title and generation metadata', () => {
    const result = parseHistoryCatalogRows([
      ['Catálogo do Arquivo Vivo'],
      ['Empresa: 1442910', null, null, 'Data de geração: 07/05/2026'],
      ['Nome do funcionário', 'CPF do funcionário', 'Nome da Unidade', 'Nome do arquivo', 'Tipo de SOCGED'],
      ['Maria de Souza', '111.222.333-44', 'ORPLAC', 'ASO_MARIA_2026.pdf', 'ASO'],
    ]);
    expect(result.employees).toHaveLength(1);
    expect(result.employees[0].name).toBe('Maria de Souza');
    expect(result.files[0].employeeId).toBe('11122233344');
  });

  it('repairs filenames decoded as latin1 at the upload boundary', () => {
    expect(normalizeHistoryFilename('01. ARQUIVOS MIGRAÃ‡ÃƒO ORPLAC.zip')).toBe('01. ARQUIVOS MIGRAÇÃO ORPLAC.zip');
    expect(normalizeHistoryFilename('01. ARQUIVOS MIGRAÇÃO ORPLAC.zip')).toBe('01. ARQUIVOS MIGRAÇÃO ORPLAC.zip');
  });
});
