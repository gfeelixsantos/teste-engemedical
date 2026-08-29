import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

const createClientMock = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import { AuditLogQueryService } from './audit-log-query.service';

describe('AuditLogQueryService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_KEY: 'service-role-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createThenableQuery(result: {
    data: any[];
    error: any;
    count: number;
  }) {
    const builder: any = {
      select: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      order: jest.fn(() => builder),
      range: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };

    return builder;
  }

  const responseWhitelist = [
    'id',
    'user_codigo',
    'user_nome',
    'user_perfil',
    'acao',
    'recurso_id',
    'recurso_tipo',
    'paciente_codigo',
    'paciente_nome',
    'unidade',
    'detalhes',
    'ip',
    'user_agent',
    'request_id',
    'created_at',
  ];

  it('aplica o periodo padrao de 7 dias quando dataInicio e dataFim nao sao informados', async () => {
    const queryBuilder = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    createClientMock.mockReturnValue({
      from: jest.fn(() => queryBuilder),
    });

    const service = new AuditLogQueryService();
    const before = Date.now();
    const response = await service.findAll({ page: 1, limit: 50 });
    const after = Date.now();

    expect(response.filters.dataInicio).toBeDefined();
    expect(response.filters.dataFim).toBeDefined();

    const start = new Date(response.filters.dataInicio).getTime();
    const end = new Date(response.filters.dataFim).getTime();

    expect(end).toBeGreaterThanOrEqual(before);
    expect(end).toBeLessThanOrEqual(after + 1000);
    expect(end - start).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 5000);
    expect(end - start).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 5000);
  });

  it('aplica clamp de limit para 100 e calcula o offset de paginacao corretamente', async () => {
    const queryBuilder = createThenableQuery({
      data: [],
      error: null,
      count: 250,
    });

    createClientMock.mockReturnValue({
      from: jest.fn(() => queryBuilder),
    });

    const service = new AuditLogQueryService();
    const response = await service.findAll({ page: 2, limit: 999 });

    expect(queryBuilder.range).toHaveBeenCalledWith(100, 199);
    expect(response.pagination.limit).toBe(100);
    expect(response.pagination.totalPages).toBe(3);
  });

  it('retorna 400 quando apenas uma das datas e informada', async () => {
    createClientMock.mockReturnValue({
      from: jest.fn(),
    });

    const service = new AuditLogQueryService();

    await expect(
      service.findAll({ page: 1, limit: 50, dataInicio: '2026-05-01T00:00:00.000Z' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('retorna 400 quando dataInicio e posterior a dataFim', async () => {
    createClientMock.mockReturnValue({
      from: jest.fn(),
    });

    const service = new AuditLogQueryService();

    await expect(
      service.findAll({
        page: 1,
        limit: 50,
        dataInicio: '2026-05-27T00:00:00.000Z',
        dataFim: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('retorna 400 quando o intervalo informado excede 90 dias', async () => {
    createClientMock.mockReturnValue({
      from: jest.fn(),
    });

    const service = new AuditLogQueryService();

    await expect(
      service.findAll({
        page: 1,
        limit: 50,
        dataInicio: '2026-01-01T00:00:00.000Z',
        dataFim: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('aplica todos os filtros exatos informados com operador AND', async () => {
    const queryBuilder = createThenableQuery({
      data: [],
      error: null,
      count: 0,
    });

    createClientMock.mockReturnValue({
      from: jest.fn(() => queryBuilder),
    });

    const service = new AuditLogQueryService();

    await service.findAll({
      page: 1,
      limit: 20,
      dataInicio: '2026-05-01T00:00:00.000Z',
      dataFim: '2026-05-27T23:59:59.000Z',
      userCodigo: '123',
      userPerfil: 'MASTER',
      acao: 'CONFIGURACAO_ALTERAR',
      recursoTipo: 'config',
      recursoId: 'abc',
      pacienteCodigo: '999',
      unidade: 'RIO CLARO',
      requestId: 'req-1',
    });

    expect(queryBuilder.gte).toHaveBeenCalledWith(
      'created_at',
      '2026-05-01T00:00:00.000Z',
    );
    expect(queryBuilder.lte).toHaveBeenCalledWith(
      'created_at',
      '2026-05-27T23:59:59.999Z',
    );
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_codigo', '123');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_perfil', 'MASTER');
    expect(queryBuilder.eq).toHaveBeenCalledWith('acao', 'CONFIGURACAO_ALTERAR');
    expect(queryBuilder.eq).toHaveBeenCalledWith('recurso_tipo', 'config');
    expect(queryBuilder.eq).toHaveBeenCalledWith('recurso_id', 'abc');
    expect(queryBuilder.eq).toHaveBeenCalledWith('paciente_codigo', '999');
    expect(queryBuilder.eq).toHaveBeenCalledWith('unidade', 'RIO CLARO');
    expect(queryBuilder.eq).toHaveBeenCalledWith('request_id', 'req-1');
  });

  it('sanitiza detalhes e retorna erro generico quando necessario', async () => {
    const queryBuilder = createThenableQuery({
      data: [
        {
          id: '1',
          user_codigo: '123',
          user_nome: 'Master Teste',
          user_perfil: 'MASTER',
          acao: 'CONFIGURACAO_ALTERAR',
          recurso_id: 'abc',
          recurso_tipo: 'config',
          paciente_codigo: '999',
          paciente_nome: 'Paciente Teste',
          unidade: 'RIO CLARO',
          detalhes: {
            permitido: true,
            cpf: '12345678900',
            rg: '11',
            templateEncrypted: 'blob',
            templateEncryption: 'aes',
            score: 99,
            threshold: 75,
            templateHash: 'hash',
            digitalDocumentalHash: 'doc-hash',
            laudo: 'pdf bruto',
            payload: { cru: true },
            base64: 'abcd',
            pdf: 'raw-pdf',
            nested: {
              senha: 'segredo',
              livre: 'ok',
            },
          },
          ip: '127.0.0.1',
          user_agent: 'jest',
          request_id: 'req-1',
          created_at: '2026-05-27T12:00:00.000Z',
          cpf: 'nao deve sair',
          score: 88,
          payload: { nao: 'deve sair' },
        },
      ],
      error: null,
      count: 1,
    });

    createClientMock.mockReturnValue({
      from: jest.fn(() => queryBuilder),
    });

    const service = new AuditLogQueryService();
    const response = await service.findAll({ page: 1, limit: 50 });

    expect(Object.keys(response.data[0]).sort()).toEqual(responseWhitelist.sort());
    expect(response.data[0].detalhes).toEqual({
      permitido: true,
      nested: {
        livre: 'ok',
      },
    });
    expect(JSON.stringify(response.data[0])).not.toContain('cpf');
    expect(JSON.stringify(response.data[0])).not.toContain('templateEncrypted');
    expect(JSON.stringify(response.data[0])).not.toContain('templateEncryption');
    expect(JSON.stringify(response.data[0])).not.toContain('score');
    expect(JSON.stringify(response.data[0])).not.toContain('threshold');
    expect(JSON.stringify(response.data[0])).not.toContain('templateHash');
    expect(JSON.stringify(response.data[0])).not.toContain('digitalDocumentalHash');
    expect(JSON.stringify(response.data[0])).not.toContain('laudo');
    expect(JSON.stringify(response.data[0])).not.toContain('payload');
    expect(JSON.stringify(response.data[0])).not.toContain('base64');
    expect(JSON.stringify(response.data[0])).not.toContain('pdf');
    expect(response.pagination.total).toBe(1);
  });

  it('retorna InternalServerErrorException com mensagem generica quando o Supabase falha', async () => {
    const queryBuilder = createThenableQuery({
      data: [],
      error: { message: 'supabase exploded' },
      count: 0,
    });

    createClientMock.mockReturnValue({
      from: jest.fn(() => queryBuilder),
    });

    const service = new AuditLogQueryService();

    await expect(service.findAll({ page: 1, limit: 50 })).rejects.toThrow(
      new InternalServerErrorException(
        'Erro interno ao consultar logs de auditoria',
      ),
    );
  });
});
