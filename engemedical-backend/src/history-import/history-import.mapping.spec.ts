import {
  resolveHistoryEmployeeForUpload,
  resolveHistoryUploadMetadata,
} from './history-import.mapping';

describe('history import upload mapping', () => {
  it('uses current employee data when the imported CPF is found', () => {
    const result = resolveHistoryEmployeeForUpload(
      { cpf: '428.840.830-06', name: 'Nome antigo', unit: 'Unidade antiga' },
      [
        {
          id: 'current-1',
          cpf: '42884083006',
          name: 'GABRIEL FELIX ATUALIZADO',
          codEmpresa: '1153506',
          codFuncionario: '867',
          sequencialFicha: '998877',
        },
      ],
    );

    expect(result).toEqual({
      found: true,
      employee: {
        id: 'current-1',
        cpf: '42884083006',
        name: 'GABRIEL FELIX ATUALIZADO',
        codEmpresa: '1153506',
        codFuncionario: '867',
        sequencialFicha: '998877',
      },
    });
  });

  it('returns generic metadata when the imported CPF is not found', () => {
    expect(
      resolveHistoryEmployeeForUpload(
        { cpf: '11122233344', name: 'Histórico sem cadastro', unit: 'Unidade' },
        [],
      ),
    ).toEqual({ found: false, employee: null });
  });

  it('uses GED type 34 for ASO and 20 for result/prontuary', () => {
    expect(resolveHistoryUploadMetadata('ASO', 'ASO_001.pdf')).toEqual({
      codigoTipoGed: '34',
      classificacao: 'ASO',
    });
    expect(resolveHistoryUploadMetadata('PRONTUARIO', 'historico_001.pdf')).toEqual({
      codigoTipoGed: '20',
      classificacao: 'RESULTADO_EXAME',
    });
  });
});
