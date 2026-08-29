import { ObjectId } from 'mongodb';
import { AtendimentoAuthService } from './atendimento-auth.service';

describe('AtendimentoAuthService', () => {
  it('deve resolver a identidade usando a data de nascimento do funcionario', async () => {
    const findOne = jest.fn().mockResolvedValue({
      CPFFUNCIONARIO: '950.646.621-80',
      DATANASCIMENTO: '19/06/2026',
      DATAAGENDAMENTO: '20/06/2026',
      DATAAGENDAMENTO_DATE: new Date('2026-06-20T00:00:00.000Z'),
    });

    const mongoService = {
      db: {
        collection: jest.fn().mockReturnValue({
          findOne,
        }),
      },
    } as any;

    const service = new AtendimentoAuthService(mongoService);
    const schedulingId = new ObjectId().toHexString();

    const result = await service.resolveIdentityFromScheduling(schedulingId);

    expect(findOne).toHaveBeenCalledWith(
      { _id: new ObjectId(schedulingId) },
      { projection: { CPFFUNCIONARIO: 1, DATANASCIMENTO: 1 } },
    );
    expect(result).toEqual({
      cpf: '95064662180',
      dataNascimento: '2026-06-19',
    });
  });
});
