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
      CODIGOUNIDADE: '03-02',
      NOMEUNIDADE: 'MATRIZ',
      CODIGOSETOR: '03-02-139',
      NOMESETOR: 'OPERACAO',
      CODIGOCARGO: '03-0873',
      NOMECARGO: 'MOTORISTA',
      CBOCARGO: '782510',
      CCUSTO: 'CC-123',
      MATRICULAFUNCIONARIO: 'RH123',
      MATRICULARH: 'RH123',
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
  it('uses a random delay between 100 and 1500 milliseconds between SOC calls', async () => {
    const soap = jest.fn(async () => ({ status: 200, responseText: '<ok />', xml: '<xml />', data: { success: true } }));
    const delay = jest.fn(async () => undefined);
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9999);
    const processor = new SftpSocProcessor(soap as any, delay, lookupFromPayload() as any);

    await processor.process([payload(2, '11111111111'), payload(3, '22222222222'), payload(4, '33333333333')], { limit: 3, delayMs: 2500 });

    expect(delay).toHaveBeenNthCalledWith(1, 100);
    expect(delay).toHaveBeenNthCalledWith(2, 1500);
    jest.restoreAllMocks();
  });
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
        hierarchyUpdate: {
          criarSetor: false,
          criarCargo: false,
        },
        auditObservation: expect.stringMatching(
          /^Integrado Engemedical Connect em \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/,
        ),
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

  it('stops processing after a SOAP error and records the failed row', async () => {
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

    expect(soap).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({
      totalSelected: 2,
      success: 0,
      failed: 1,
      skippedByLimit: 0,
      stoppedOnError: true,
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
      responseText:
        '<FuncionarioRetorno><encontrouErro>true</encontrouErro></FuncionarioRetorno>',
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

  it('uses SOC lookup as SOAP base and overlays spreadsheet hierarchy mapping', async () => {
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
        CODIGOUNIDADE: '73',
        CODIGOSETOR: '867',
        CODIGOCARGO: '704',
        MATRICULAFUNCIONARIO: '140189011920230915153717',
        MATRICULARH: '890119',
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
      failed: 0,
    });
    expect(result.rows[0]).toMatchObject({
      success: false,
      error: 'Cadastro SOC nao encontrado para o CPF',
    });
  });

  it('continues the full batch after an employee is not found in SOC', async () => {
    const soap = jest.fn(async () => ({
      status: 200,
      responseText: '<ok />',
      xml: '<xml />',
      data: { success: true },
    }));
    const employeeLookup = {
      findByCpf: jest.fn(async (cpf: string) =>
        cpf === '00000000000'
          ? []
          : [{ employee: payload(2, cpf).employee }],
      ),
    };
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      employeeLookup as any,
    );

    const result = await processor.process(
      [payload(2, '00000000000'), payload(3, '11111111111')],
      { limit: 2, delayMs: 0 },
    );

    expect(soap).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({
      totalSelected: 2,
      success: 1,
      notInBase: 1,
      cancelled: false,
      stoppedOnError: false,
    });
  });

  it('stops before sending the next employee after cancellation', async () => {
    const soap = jest.fn(async () => ({
      status: 200,
      responseText: '<ok />',
      xml: '<xml />',
      data: { success: true },
    }));
    let cancelled = false;
    const processor = new SftpSocProcessor(
      soap as any,
      async () => {
        cancelled = true;
      },
      lookupFromPayload() as any,
    );

    const result = await processor.process(
      [payload(2, '11111111111'), payload(3, '22222222222')],
      { limit: 2, delayMs: 0, shouldCancel: () => cancelled },
    );

    expect(soap).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({ cancelled: true, success: 1 });
  });

  it('stops processing subsequent employees after a SOAP error', async () => {
    const soap = jest.fn().mockRejectedValue(new Error('SOC indisponível'));
    const processor = new SftpSocProcessor(
      soap as any,
      async () => undefined,
      lookupFromPayload() as any,
    );

    const result = await processor.process(
      [payload(2, '11111111111'), payload(3, '22222222222')],
      { limit: 2, delayMs: 0 },
    );

    expect(soap).toHaveBeenCalledTimes(1);
    expect(result.summary).toMatchObject({ stoppedOnError: true, failed: 1 });
  });
});
