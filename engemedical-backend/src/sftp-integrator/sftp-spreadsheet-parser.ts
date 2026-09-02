import { BadRequestException, Injectable } from '@nestjs/common';
import { readSheet } from 'read-excel-file/node';

export type GrupoToraEmployeeRow = {
  codigoEmpresaProtheus: string;
  codigoUnidadeProtheus: string;
  nomeUnidadeProtheus: string;
  codigoUnidadeFt: string;
  codigoSetor: string;
  nomeSetor: string;
  codigoCargo: string;
  nomeCargo: string;
  matriculaEsocial: string;
  matriculaRh: string;
  nomeFuncionario: string;
  situacao: string;
  cpf: string;
  categoriaEsocial: string;
};

export type GrupoToraParsedRow = {
  rowNumber: number;
  valid: boolean;
  employee: GrupoToraEmployeeRow;
  errors: string[];
};

export type GrupoToraParseSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  situationCounts: Record<string, number>;
};

export type GrupoToraParseResult = {
  rows: GrupoToraParsedRow[];
  summary: GrupoToraParseSummary;
};

type CellValue = string | number | boolean | Date | null | undefined;

export function normalizeHeader(value: CellValue): string {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function text(value: CellValue): string {
  return String(value ?? '').trim();
}

function digits(value: CellValue): string {
  return text(value).replace(/\D/g, '');
}

function getByHeader(
  row: CellValue[],
  indexes: Map<string, number>,
  header: string,
): string {
  const index = indexes.get(normalizeHeader(header));
  return index === undefined ? '' : text(row[index]);
}

export function parseGrupoToraRows(rows: CellValue[][]): GrupoToraParseResult {
  const [headers, ...bodyRows] = rows;
  if (!headers?.length) {
    throw new BadRequestException('Planilha sem cabecalho');
  }

  const indexes = new Map<string, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized) {
      indexes.set(normalized, index);
    }
  });

  const parsedRows = bodyRows
    .map((row, index) => {
      const employee: GrupoToraEmployeeRow = {
        codigoEmpresaProtheus: getByHeader(row, indexes, 'codigoEmpresaProtheus'),
        codigoUnidadeProtheus: getByHeader(row, indexes, 'codigoUnidadeProtheus'),
        nomeUnidadeProtheus: getByHeader(row, indexes, 'nomeUnidadeProtheus'),
        codigoUnidadeFt: getByHeader(row, indexes, 'codigoUnidade (FT)'),
        codigoSetor: getByHeader(row, indexes, 'codigoSetor'),
        nomeSetor: getByHeader(row, indexes, 'nomeSetor'),
        codigoCargo: getByHeader(row, indexes, 'codigoCargo'),
        nomeCargo: getByHeader(row, indexes, 'nomeCargo'),
        matriculaEsocial: getByHeader(row, indexes, 'matriculaEsocial'),
        matriculaRh: getByHeader(row, indexes, 'matriculaRH'),
        nomeFuncionario: getByHeader(row, indexes, 'nomeFuncionario'),
        situacao: getByHeader(row, indexes, 'situacao').toUpperCase(),
        cpf: digits(getByHeader(row, indexes, 'cpf')),
        categoriaEsocial: getByHeader(row, indexes, 'categoriaEsocial'),
      };

      const errors: string[] = [];
      if (!employee.cpf) errors.push('CPF ausente');
      if (!employee.nomeFuncionario) errors.push('Nome do funcionario ausente');
      if (!employee.matriculaRh) errors.push('Matricula RH ausente');

      return {
        rowNumber: index + 2,
        valid: errors.length === 0,
        employee,
        errors,
      };
    })
    .filter((row) =>
      Object.values(row.employee).some((value) => String(value).trim() !== ''),
    );

  const situationCounts: Record<string, number> = {};
  for (const row of parsedRows) {
    const situacao = row.employee.situacao || 'NAO_INFORMADA';
    situationCounts[situacao] = (situationCounts[situacao] || 0) + 1;
  }

  return {
    rows: parsedRows,
    summary: {
      totalRows: parsedRows.length,
      validRows: parsedRows.filter((row) => row.valid).length,
      invalidRows: parsedRows.filter((row) => !row.valid).length,
      situationCounts,
    },
  };
}

@Injectable()
export class SftpSpreadsheetParser {
  async parseGrupoToraFile(filePath: string): Promise<GrupoToraParseResult> {
    try {
      const rows = (await readSheet(filePath)) as CellValue[][];
      return parseGrupoToraRows(rows);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Nao foi possivel ler a planilha XLSX: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }
  }
}
