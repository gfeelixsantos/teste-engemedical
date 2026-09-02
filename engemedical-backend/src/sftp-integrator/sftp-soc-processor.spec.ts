import { SftpSocProcessor } from './sftp-soc-processor';
import { GrupoToraSocPayload } from './sftp-soc-payload.mapper';

function payload(rowNumber: number, cpf: string, situationToSend = 'ATIVO') {
  return {
    rowNumber,
    lookupKey: 'CPF',
    situationToSend,
    employee: {
      NOME: `Pessoa ${rowNumber}`,
      CPF: cpf,
      CODIGOEMPRESA: '115',
    },
  } as GrupoToraSocPayload;
}

function lookupFromPayload() {
  return {
    findByCpf: jest.fn(async (cpf: string) => [
      {
        source: { DATACADASTRO: '2026-01-01' },
        employee: payload(1, cpf).employee,
      },
    ]),
  };
}

describe('SftpSocProcessor', () => {
  it('processes payloads sequentially respecting limit and CPF lookup', async () => {
    const calls: string[] = [];
    const soap = jest.fn(async (employee, options) => {
      calls.push(employee.CPF);
      return {
        status: 200,
        responseText: '<ok />',
        xml: '<xml />',
        options,
      };
    });
    const delay = jest.fn(async () => undefined);
    const processor = new SftpSocProcessor(
      soap as any,
      delay,
      lookupFromPayload() as any,
    );

    const result = await processor.process(
      [payload(2, '11111111111', 'FERIAS'), payload(3, '22222222222')],
      { limit: 1, delayMs: 2500 },
    );

    expect(calls).toEqual(['11111111111']);
    expect(soap).toHaveBeenCalledWith(
      expect.objectContaining({ CPF: '11111111111' }),
      expect.objectContaining({
        lookupKey: 'CPF',
        overwriteSituacao: 'FERIAS',
      }),
    );
    expect(delay).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      totalSelected: 1,
      success: 1,
      failed: 0,
      skippedByLimit: 1,
    });
  });

  it('continues processing after a SOAP error and records the failed row', async () => {
    const soap = jest
      .fn()
      .mockRejectedValueOnce(new Error('SOC rejeitou funcionario'))
      .mockResolvedValueOnce({
        status: 200,
        responseText: '<ok />',
        xml: '<xml />',
      });
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      lookupFromPayload() as any,
    );

    const result = await processor.process(
      [payload(2, '11111111111'), payload(3, '22222222222')],
      { limit: 2, delayMs: 0 },
    );

    expect(soap).toHaveBeenCalledTimes(2);
    expect(result.summary).toMatchObject({
      totalSelected: 2,
      success: 1,
      failed: 1,
      skippedByLimit: 0,
    });
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      success: false,
      error: 'SOC rejeitou funcionario',
    });
  });

  it('treats HTTP 200 with data.encontrouErro as a failed SOC row', async () => {
    const soap = jest.fn(async () => ({
      status: 200,
      responseText: '<FuncionarioRetorno><encontrouErro>true</encontrouErro></FuncionarioRetorno>',
      xml: '<xml />',
      data: {
        success: false,
        encontrouErro: true,
        descricaoErro: 'Funcionario nao cadastrado',
      },
    }));
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      lookupFromPayload() as any,
    );

    const result = await processor.process([payload(2, '11111111111')], {
      limit: 1,
      delayMs: 0,
    });

    expect(result.summary).toMatchObject({
      success: 0,
      failed: 1,
    });
    expect(result.rows[0]).toMatchObject({
      success: false,
      error: 'Funcionario nao cadastrado',
      httpStatus: 200,
    });
  });

  it('uses the latest SOC employee lookup record as SOAP base and preserves the spreadsheet situation', async () => {
    const soap = jest.fn(async () => ({
      status: 200,
      responseText:
        '<FuncionarioRetorno><encontrouErro>false</encontrouErro></FuncionarioRetorno>',
      xml: '<xml />',
      data: { success: true, encontrouErro: false },
    }));
    const employeeLookup = {
      findByCpf: jest.fn(async () => [
        {
          source: { DATACADASTRO: '2023-09-06' },
          employee: {
            CODIGOEMPRESA: '2182291',
            CODIGO: '6716',
            NOME: 'CARLOS ANDRE ALVES NETO',
            CODIGOUNIDADE: '73',
            CODIGOSETOR: '867',
            CODIGOCARGO: '704',
            MATRICULAFUNCIONARIO: '140189011920230915153717',
            MATRICULARH: '890119',
            CPF: '01645799581',
            SITUACAO: 'Ferias',
          },
        },
      ]),
    };
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      employeeLookup as any,
    );

    const result = await processor.process(
      [payload(2, '01645799581', 'FERIAS')],
      { limit: 1, delayMs: 0, lookupCompanyCode: '2182291' },
    );

    expect(employeeLookup.findByCpf).toHaveBeenCalledWith('01645799581', {
      companyCode: '2182291',
    });
    expect(soap).toHaveBeenCalledWith(
      expect.objectContaining({
        CODIGOEMPRESA: '2182291',
        CODIGO: '6716',
        CPF: '01645799581',
        SITUACAO: 'Ferias',
      }),
      expect.objectContaining({
        lookupKey: 'CPF',
        overwriteSituacao: 'FERIAS',
      }),
    );
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      success: true,
      codigoFuncionario: '6716',
      codigoEmpresaSoc: '2182291',
    });
  });

  it('does not call SOAP when Cadastro de Funcionario por CPF returns no record', async () => {
    const soap = jest.fn();
    const employeeLookup = {
      findByCpf: jest.fn(async () => []),
    };
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      employeeLookup as any,
    );

    const result = await processor.process([payload(2, '00000000000')], {
      limit: 1,
      delayMs: 0,
    });

    expect(soap).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      success: 0,
      failed: 1,
    });
    expect(result.rows[0]).toMatchObject({
      success: false,
      error: 'Cadastro SOC nao encontrado para o CPF',
    });
  });
});
