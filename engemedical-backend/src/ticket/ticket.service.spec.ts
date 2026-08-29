import { TicketService } from './ticket.service';
import { TicketStatus } from './enum/ticket.enum';

type QueryMock = {
  select: jest.Mock;
  eq: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
};

function createQueryMock(): QueryMock {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  } as QueryMock;

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  return query;
}

describe('TicketService - compatibility with new Supabase preparation schema', () => {
  const supabase = {
    supabaseClient: {
      from: jest.fn(),
    },
  };

  const ttsService = {
    deleteAudio: jest.fn(),
  };

  const wsGateway = {
    server: {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    },
  };

  const mongoService = {
    updateTicketScheduling: jest.fn(),
  };

  let service: TicketService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TicketService(
      supabase as any,
      ttsService as any,
      wsGateway as any,
      mongoService as any,
    );
  });

  it('maps preparation rows from lowercase Supabase columns back to camelCase for the frontend contract', async () => {
    const ticketsQuery = createQueryMock();
    ticketsQuery.order.mockResolvedValue({
      data: [{ id: 140, unidade: 'RIO CLARO', status: TicketStatus.AGUARDANDO }],
      error: null,
    });

    const preparationQuery = createQueryMock();
    preparationQuery.eq
      .mockReturnValueOnce(preparationQuery)
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            ticketId: 140,
            dataNascimento: '01/02/2000',
            tipoExame: 'Admissional',
            empresa: 'Empresa Teste',
            nome: 'Paciente Teste',
            cpf: '00000000000',
            informacoes: 'Sem observacoes',
            unidade: 'RIO CLARO',
            sala: '1',
            atendente: 'Recepcao',
            tickets: {
              id: 140,
              unidade: 'RIO CLARO',
            },
          },
        ],
        error: null,
      });

    supabase.supabaseClient.from
      .mockImplementationOnce(() => ticketsQuery)
      .mockImplementationOnce(() => preparationQuery);

    const result = await service.findByUnidade('rio claro');

    expect(result.tickets).toHaveLength(1);
    expect(result.preparationRequests).toEqual([
      expect.objectContaining({
        id: 1,
        ticketId: 140,
        dataNascimento: '01/02/2000',
        tipoExame: 'Admissional',
        empresa: 'Empresa Teste',
        nome: 'Paciente Teste',
      }),
    ]);
  });

  it('writes preparation records using the lowercase schema expected by the new Supabase account', async () => {
    const existingQuery = createQueryMock();
    existingQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const insertQuery = createQueryMock();
    insertQuery.single.mockResolvedValue({
      data: { id: 9 },
      error: null,
    });

    const mergedQuery = createQueryMock();
    mergedQuery.single.mockResolvedValue({
      data: {
        id: 9,
        ticketId: 321,
        dataNascimento: '28/04/2026',
        tipoExame: 'Periodico',
        empresa: 'CM',
        nome: 'Fulano',
        cpf: '123',
        informacoes: 'Observacoes',
        unidade: 'RIO CLARO',
        sala: '2',
        atendente: 'Felix',
        tickets: {
          id: 321,
          unidade: 'RIO CLARO',
          status: TicketStatus.EM_PREPRACAO,
        },
      },
      error: null,
    });

    supabase.supabaseClient.from
      .mockImplementationOnce(() => existingQuery)
      .mockImplementationOnce(() => insertQuery)
      .mockImplementationOnce(() => mergedQuery);

    const executeActionSpy = jest
      .spyOn(service, 'executeAction')
      .mockResolvedValue({ id: 321, status: TicketStatus.EM_PREPRACAO } as any);

    const result = await service.createPreparation({
      ticketId: 321,
      empresa: 'CM',
      nome: 'Fulano',
      dataNascimento: '28/04/2026',
      cpf: '123',
      tipoExame: 'Periodico',
      informacoes: 'Observacoes',
      unidade: 'rio claro',
      sala: '2',
      atendente: 'Felix',
    });

    expect(insertQuery.insert).toHaveBeenCalledWith({
      ticketId: 321,
      empresa: 'CM',
      nome: 'Fulano',
      dataNascimento: '28/04/2026',
      cpf: '123',
      tipoExame: 'Periodico',
      informacoes: 'Observacoes',
      unidade: 'RIO CLARO',
      sala: '2',
      atendente: 'Felix',
    });
    expect(executeActionSpy).toHaveBeenCalledWith({
      action: 'EM PREPARAÇÃO',
      sala: '2',
      ticketId: 321,
      unidade: 'RIO CLARO',
      user: 'Felix',
    });
    expect(result).toEqual(
      expect.objectContaining({
        ticketId: 321,
        dataNascimento: '28/04/2026',
        tipoExame: 'Periodico',
      }),
    );
  });

  it('deletes preparation records by ticketId in the Supabase schema', async () => {
    const deleteQuery = createQueryMock();
    deleteQuery.eq.mockResolvedValue({
      data: [{ id: 12 }],
      error: null,
    });

    supabase.supabaseClient.from.mockImplementationOnce(() => deleteQuery);

    await service.deletePreparationRequest({ ticketId: 555 } as any);

    expect(deleteQuery.eq).toHaveBeenCalledWith('ticketId', 555);
  });
});
