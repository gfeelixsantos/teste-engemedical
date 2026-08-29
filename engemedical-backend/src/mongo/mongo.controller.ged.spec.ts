import { BadRequestException } from '@nestjs/common';

import { MongoController } from './mongo.controller';

describe('MongoController GED routes', () => {
  const makeController = () => {
    const mongoService = {
      listGedEmpresas: jest.fn(),
      listGedPeriodos: jest.fn(),
      listGedProntuarios: jest.fn(),
      listGedArquivos: jest.fn(),
    };

    const controller = new MongoController(
      mongoService as any,
      {} as any,
      {} as any,
      { verifyPcdStatus: jest.fn() } as any,
    );

    return { controller, mongoService };
  };

  it('returns GED empresas from mongo service', async () => {
    const { controller, mongoService } = makeController();
    mongoService.listGedEmpresas.mockResolvedValue([
      {
        codigoEmpresa: '1733915',
        nomeEmpresa: 'Empresa Teste',
        totalProntuarios: 2,
        totalArquivos: 4,
      },
    ]);

    const result = await controller.listGedEmpresas();

    expect(mongoService.listGedEmpresas).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        codigoEmpresa: '1733915',
        nomeEmpresa: 'Empresa Teste',
        totalProntuarios: 2,
        totalArquivos: 4,
      },
    ]);
  });

  it('requires codigoEmpresa to return GED periodos', async () => {
    const { controller } = makeController();

    await expect(controller.listGedPeriodos('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns GED periodos for one empresa', async () => {
    const { controller, mongoService } = makeController();
    mongoService.listGedPeriodos.mockResolvedValue([
      {
        ano: '2026',
        mes: '05',
        totalProntuarios: 3,
        totalArquivos: 5,
      },
    ]);

    const result = await controller.listGedPeriodos('1733915');

    expect(mongoService.listGedPeriodos).toHaveBeenCalledWith('1733915');
    expect(result).toEqual([
      {
        ano: '2026',
        mes: '05',
        totalProntuarios: 3,
        totalArquivos: 5,
      },
    ]);
  });

  it('requires codigoEmpresa, ano e mes to return GED prontuarios', async () => {
    const { controller } = makeController();

    await expect(
      controller.listGedProntuarios('', '2026', '05'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.listGedProntuarios('1733915', '', '05'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.listGedProntuarios('1733915', '2026', ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns GED prontuarios for empresa and periodo', async () => {
    const { controller, mongoService } = makeController();
    mongoService.listGedProntuarios.mockResolvedValue([
      {
        codigoProntuario: '1733915-143-3-29042026',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        totalArquivos: 3,
      },
    ]);

    const result = await controller.listGedProntuarios(
      '1733915',
      '2026',
      '05',
    );

    expect(mongoService.listGedProntuarios).toHaveBeenCalledWith({
      codigoEmpresa: '1733915',
      ano: '2026',
      mes: '05',
    });
    expect(result).toEqual([
      {
        codigoProntuario: '1733915-143-3-29042026',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        totalArquivos: 3,
      },
    ]);
  });

  it('requires codigoEmpresa, ano, mes e codigoProntuario to return GED arquivos', async () => {
    const { controller } = makeController();

    await expect(
      controller.listGedArquivos('', '2026', '05', 'PRONT001'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.listGedArquivos('1733915', '', '05', 'PRONT001'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.listGedArquivos('1733915', '2026', '', 'PRONT001'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.listGedArquivos('1733915', '2026', '05', ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns GED arquivos for one prontuario folder', async () => {
    const { controller, mongoService } = makeController();
    mongoService.listGedArquivos.mockResolvedValue([
      {
        blobName: 'aso/2026/05/1733915/PRONT001/ASO.pdf',
        fileName: 'ASO.pdf',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        origem: 'aso',
      },
    ]);

    const result = await controller.listGedArquivos(
      '1733915',
      '2026',
      '05',
      'PRONT001',
    );

    expect(mongoService.listGedArquivos).toHaveBeenCalledWith({
      codigoEmpresa: '1733915',
      ano: '2026',
      mes: '05',
      codigoProntuario: 'PRONT001',
    });
    expect(result).toEqual([
      {
        blobName: 'aso/2026/05/1733915/PRONT001/ASO.pdf',
        fileName: 'ASO.pdf',
        nomeFuncionario: 'JOAO TESTE',
        tipoExame: 'ADMISSIONAL',
        dataAgendamento: '2026-05-10',
        origem: 'aso',
      },
    ]);
  });
});
