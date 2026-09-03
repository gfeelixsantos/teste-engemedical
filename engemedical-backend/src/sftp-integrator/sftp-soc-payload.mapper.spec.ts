import { buildGrupoToraSocPayload } from './sftp-soc-payload.mapper';
import { GrupoToraParsedRow } from './sftp-spreadsheet-parser';

describe('buildGrupoToraSocPayload', () => {
  it('uses CPF as FuncionarioModelo2 lookup key and preserves FERIAS situation', () => {
    const row: GrupoToraParsedRow = {
      rowNumber: 2,
      valid: true,
      errors: [],
      employee: {
        codigoEmpresaProtheus: '04',
        codigoUnidadeProtheus: '001',
        nomeUnidadeProtheus: 'Unidade Teste',
        codigoUnidadeFt: '701',
        codigoSetor: '22',
        nomeSetor: 'Operacao',
        codigoCargo: '33',
        nomeCargo: 'Motorista',
        cbo: '782510',
        codigoCentroCusto: 'CC-123',
        matriculaEsocial: 'E123',
        matriculaRh: 'RH456',
        nomeFuncionario: 'Pessoa Teste',
        situacao: 'FERIAS',
        cpf: '12345678901',
        categoriaEsocial: '101',
      },
    };

    const payload = buildGrupoToraSocPayload(row);

    expect(payload.lookupKey).toBe('CPF');
    expect(payload.situationToSend).toBe('FERIAS');
    expect(payload.employee).toMatchObject({
      CODIGO: '',
      CODIGOEMPRESA: '04',
      CODIGOUNIDADE: '001',
      CODIGOSETOR: '22',
      CODIGOCARGO: '33',
      CBOCARGO: '782510',
      CCUSTO: 'CC-123',
      NOME: 'Pessoa Teste',
      CPF: '12345678901',
      MATRICULAFUNCIONARIO: 'RH456',
      MATRICULARH: 'RH456',
      SITUACAO: 'FERIAS',
    });
  });
});
