import { normalizeHeader, parseGrupoToraRows } from './sftp-spreadsheet-parser';

describe('sftp spreadsheet parser', () => {
  it('normalizes headers ignoring accents, spaces and punctuation', () => {
    expect(normalizeHeader(' código Unidade (FT) ')).toBe('codigounidadeft');
    expect(normalizeHeader('categoriaEsocial')).toBe('categoriaesocial');
  });

  it('maps Grupo Tora rows to canonical employees and validates required fields', () => {
    const rows = [
      [
        'codigoEmpresaProtheus',
        'codigoUnidadeProtheus',
        'nomeUnidadeProtheus',
        'codigoUnidade (FT)',
        'codigoSetor',
        'nomeSetor',
        'codigoCargo',
        'nomeCargo',
        'cbo',
        'codigoCentroCusto',
        'matriculaEsocial',
        'nomeFuncionario',
        'situacao',
        'cpf',
        'matriculaRH',
        'categoriaEsocial',
      ],
      [
        '03',
        '02',
        'MATRIZ',
        '03-02',
        '03-02-139',
        'SEGUROS',
        '03-0873',
        'ANALISTA',
        '2521-05',
        'CC-001',
        '0303009134',
        'Pessoa Teste',
        'ATIVO',
        '129.485.326-04',
        '009134',
        '101',
      ],
      [
        '03',
        '02',
        'MATRIZ',
        '03-02',
        '03-02-139',
        'SEGUROS',
        '03-0873',
        'ANALISTA',
        '',
        '',
        '',
        '',
        'ATIVO',
        '',
        '',
        '101',
      ],
    ];

    const result = parseGrupoToraRows(rows);

    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      situationCounts: { ATIVO: 2 },
    });
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      valid: true,
      employee: {
        codigoEmpresaProtheus: '03',
        codigoUnidadeProtheus: '02',
        codigoUnidadeFt: '03-02',
        codigoSetor: '03-02-139',
        codigoCargo: '03-0873',
        cbo: '2521-05',
        codigoCentroCusto: 'CC-001',
        matriculaEsocial: '0303009134',
        matriculaRh: '009134',
        nomeFuncionario: 'Pessoa Teste',
        situacao: 'ATIVO',
        cpf: '12948532604',
        categoriaEsocial: '101',
      },
      errors: [],
    });
    expect(result.rows[1]).toMatchObject({
      rowNumber: 3,
      valid: false,
      errors: [
        'CPF ausente',
        'Nome do funcionario ausente',
        'Matricula RH ausente',
      ],
    });
  });
});
