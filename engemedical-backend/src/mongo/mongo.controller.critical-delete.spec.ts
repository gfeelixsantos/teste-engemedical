import { BadRequestException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MongoController } from './mongo.controller';

describe('MongoController critical deletes', () => {
  const makeController = () => {
    const mongoService = {
      schedulingsCollection: {
        findOne: jest.fn(),
      },
      handleSchedulingDeleteNotification: jest.fn(),
      saveDeletionSnapshot: jest.fn(),
      updateFullDocument: jest.fn(),
      removeAnexo: jest.fn(),
    };

    const controller = new MongoController(
      mongoService as any,
      {} as any,
      {} as any,
      { verifyPcdStatus: jest.fn() } as any,
    );

    return { controller, mongoService };
  };

  const authHeader = JSON.stringify({
    codigo: 'USR-001',
    nome: 'Felix',
    perfil: 'MASTER',
    cpf: '12345678909',
    conselho: '',
    ufconselho: '',
  });

  const schedulingDoc: any = {
    _id: '682e0d6f53d5c153584c0d11',
    CODIGO: 'PAC-001',
    NOME: 'Paciente Teste',
    UNIDADEATENDIMENTO: 'RIO CLARO',
    ATENDIMENTOSTATUS: 'EM_ATENDIMENTO',
    EXAMES: [
      {
        codigoExame: 'EX-001',
        grupo: 'Laboratorial',
        nomeExame: 'Hemograma',
        status: 'FINALIZADO',
        url: 'https://blob/hemograma.pdf',
      },
    ],
    ANEXOS: [
      {
        Name: 'documento.pdf',
        Type: 'application/pdf',
        StoragePath: 'blob/documento.pdf',
      },
    ],
  };

  it('exige reautenticacao e motivo para excluir atendimento', async () => {
    const { controller } = makeController();

    await expect(
      controller.deleteScheduleRequest(
        {
          schedulingId: '682e0d6f53d5c153584c0d11',
          motivo: '',
        },
        { headers: {} } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.deleteScheduleRequest(
        {
          schedulingId: '682e0d6f53d5c153584c0d11',
          motivo: 'duplicado',
        },
        { headers: { 'x-auth-user': authHeader } } as any,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('cria snapshot antes de excluir atendimento e retorna requestId', async () => {
    const { controller, mongoService } = makeController();
    mongoService.schedulingsCollection.findOne.mockResolvedValue(schedulingDoc);
    mongoService.saveDeletionSnapshot.mockResolvedValue(undefined);
    mongoService.handleSchedulingDeleteNotification.mockResolvedValue(true);

    const req: any = {
      headers: {
        'x-auth-user': authHeader,
        'x-reauthenticated': 'true',
        'x-request-id': 'cmso360_123_abc1234',
      },
    };

    const result = await controller.deleteScheduleRequest(
      {
        schedulingId: '682e0d6f53d5c153584c0d11',
        motivo: 'cadastro duplicado',
      },
      req,
    );

    expect(mongoService.saveDeletionSnapshot).toHaveBeenCalled();
    expect(mongoService.handleSchedulingDeleteNotification).toHaveBeenCalled();
    expect(
      mongoService.saveDeletionSnapshot.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mongoService.handleSchedulingDeleteNotification.mock.invocationCallOrder[0],
    );
    expect(req.auditLogContext).toEqual(
      expect.objectContaining({
        requestId: 'cmso360_123_abc1234',
        detalhes: expect.objectContaining({
          motivo: 'cadastro duplicado',
          reautenticado: true,
          snapshotId: expect.stringMatching(/^snapshot_\d+_[a-z0-9]{7}$/),
          snapshotHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        requestId: 'cmso360_123_abc1234',
      }),
    );
  });

  it('remove resultado de exame com snapshot e sem registrar senha', async () => {
    const { controller, mongoService } = makeController();
    mongoService.schedulingsCollection.findOne.mockResolvedValue(schedulingDoc);
    mongoService.saveDeletionSnapshot.mockResolvedValue(undefined);
    mongoService.updateFullDocument.mockResolvedValue({
      ...schedulingDoc,
      EXAMES: [{ ...schedulingDoc.EXAMES[0], url: '', status: 'AGUARDANDO_RESULTADO' }],
    });

    const req: any = {
      headers: {
        'x-auth-user': authHeader,
        'x-reauthenticated': 'true',
        'x-request-id': 'cmso360_456_abc1234',
      },
    };

    const result = await controller.deleteExamResultUpload(
      {
        schedulingId: '682e0d6f53d5c153584c0d11',
        codigoExame: 'EX-001',
        grupo: 'Laboratorial',
        motivo: 'arquivo incorreto',
      },
      req,
    );

    const savedSnapshot = mongoService.saveDeletionSnapshot.mock.calls[0][0];
    expect(JSON.stringify(savedSnapshot)).not.toContain('password');
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        requestId: 'cmso360_456_abc1234',
      }),
    );
  });

  it('continua removendo anexo com snapshot sanitizado', async () => {
    const { controller, mongoService } = makeController();
    mongoService.schedulingsCollection.findOne.mockResolvedValue(schedulingDoc);
    mongoService.saveDeletionSnapshot.mockResolvedValue(undefined);
    mongoService.removeAnexo.mockResolvedValue({
      ...schedulingDoc,
      ANEXOS: [],
    });

    const req: any = {
      headers: {
        'x-auth-user': authHeader,
        'x-reauthenticated': 'true',
        'x-request-id': 'cmso360_789_abc1234',
      },
    };

    const result = await controller.removeAnexoController(
      {
        schedulingId: '682e0d6f53d5c153584c0d11',
        fileName: 'documento.pdf',
        motivo: 'anexo duplicado',
      },
      req,
    );

    expect(result).toEqual(
      expect.objectContaining({
        requestId: 'cmso360_789_abc1234',
        snapshotId: expect.stringMatching(/^snapshot_\d+_[a-z0-9]{7}$/),
      }),
    );
  });

  it('propaga falha operacional como erro na exclusao de atendimento', async () => {
    const { controller, mongoService } = makeController();
    mongoService.schedulingsCollection.findOne.mockResolvedValue(schedulingDoc);
    mongoService.saveDeletionSnapshot.mockResolvedValue(undefined);
    mongoService.handleSchedulingDeleteNotification.mockResolvedValue(false);

    await expect(
      controller.deleteScheduleRequest(
        {
          schedulingId: '682e0d6f53d5c153584c0d11',
          motivo: 'cadastro duplicado',
        },
        {
          headers: {
            'x-auth-user': authHeader,
            'x-reauthenticated': 'true',
          },
        } as any,
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('falha com not found quando anexo nao existe', async () => {
    const { controller, mongoService } = makeController();
    mongoService.schedulingsCollection.findOne.mockResolvedValue({
      ...schedulingDoc,
      ANEXOS: [],
    });

    await expect(
      controller.removeAnexoController(
        {
          schedulingId: '682e0d6f53d5c153584c0d11',
          fileName: 'documento.pdf',
          motivo: 'anexo duplicado',
        },
        {
          headers: {
            'x-auth-user': authHeader,
            'x-reauthenticated': 'true',
          },
        } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
