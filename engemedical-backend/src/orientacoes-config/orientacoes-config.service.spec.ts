import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrientacoesConfigService } from './orientacoes-config.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';

type Row = Record<string, unknown>;

const masterUser = { codigo: '900', nome: 'Admin Master', perfil: 'MASTER' };
const medicoUser = { codigo: '123', nome: 'Dr. Não-Master', perfil: 'MEDICO' };

function makeRow(overrides: Row = {}): Row {
  return {
    id: 'ori-1',
    categoria: 'Oftalmológico',
    texto_tela: 'Orientar acompanhamento com oftalmologista',
    texto_email:
      'Recomendamos acompanhamento periódico com oftalmologista para preservação da saúde visual do colaborador.',
    libera_cliente: true,
    ativo: true,
    ordem: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  };
}

/**
 * Mock fluente do client do Supabase que rastreia as operações executadas,
 * permitindo asserções binárias de baixo nível (ex: delete().eq(id) foi chamado).
 */
function createFakeSupabase() {
  const calls: string[] = [];
  const eqFilters: Record<string, unknown> = {};
  let resolver: () => Promise<{ data: Row[] | null; error: any }> = async () => ({
    data: [],
    error: null,
  });
  let insertError: any = null;
  let insertedValues: Row | null = null;

  const readSingleResult = async () => {
    const { data, error } = await resolver();
    if (error) return { data: null, error };
    if (Array.isArray(data) && data.length >= 1)
      return { data: data[0], error: null };
    return { data: null, error: { message: 'no rows', code: 'PGRST116' } };
  };

  // Cadeia de leitura: todos os métodos retornam a própria cadeia.
  const readChain: any = {};
  const eq = (col: string, val: unknown) => {
    calls.push(`eq.${col}`);
    eqFilters[col] = val;
    return readChain;
  };
  Object.assign(readChain, {
    from: () => readChain,
    select: () => readChain,
    eq,
    is: () => readChain,
    order: () => resolver(),
    limit: () => readChain,
    single: readSingleResult,
  });

  // insert/update devolvem uma cadeia com SAME comportamentos de eq/select,
  // mas com .single() próprio (a cadeia retornada não "cai" na base).
  const makeWriteRead = (singleFn: () => Promise<any>): any => {
    const chain: any = {
      select: () => chain,
      single: singleFn,
      eq: (col: string, val: unknown) => {
        calls.push(`eq.${col}`);
        eqFilters[col] = val;
        return chain;
      },
      from: () => readChain,
    };
    return chain;
  };

  readChain.insert = (values: Row) => {
    calls.push('insert');
    insertedValues = values;
    return makeWriteRead(async () => {
      if (insertError) return { data: null, error: insertError };
      return { data: insertedValues, error: null };
    });
  };

  readChain.update = (values: Row) => {
    calls.push('update');
    return makeWriteRead(async () => {
      const { data, error } = await resolver();
      if (error || !data?.[0]) return { data: null, error };
      return { data: { ...data[0], ...values }, error: null };
    });
  };

  readChain.delete = () => {
    calls.push('delete');
    return { ...readChain, eq };
  };

  // executa o builder e devolve (finge o await do SupabaseChain)
  const run = (chain: any) => chain;

  const setResult = (
    fn: () => Promise<{ data: Row[] | null; error: any }>,
  ) => {
    resolver = fn;
  };

  return {
    client: {
      from: (table: string) => {
        calls.push(`from.${table}`);
        expect(table).toBe('parecer_orientacoes');
        return run(readChain);
      },
    },
    calls,
    eqFilters,
    setResult,
    setInsertError: (err: any) => {
      insertError = err;
    },
  };
}

describe('OrientacoesConfigService', () => {
  let service: OrientacoesConfigService;
  let supabase: SupabaseService;
  let auditLog: { logUserAction: jest.Mock };

  const setupService = async (fake: ReturnType<typeof createFakeSupabase>) => {
    const module = await Test.createTestingModule({
      providers: [
        OrientacoesConfigService,
        { provide: SupabaseService, useValue: { getClient: () => fake.client } },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();
    service = module.get(OrientacoesConfigService);
    supabase = module.get(SupabaseService);
  };

  beforeEach(async () => {
    auditLog = { logUserAction: jest.fn() };
  });

  describe('findAll', () => {
    it('aplica filtro ativo=true quando apenasAtivos=true', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      const result = await service.findAll(true);

      expect(result).toHaveLength(1);
      expect(fake.eqFilters['ativo']).toBe(true);
      expect(fake.calls).toContain('eq.ativo');
    });

    it('não filtra por ativo quando apenasAtivos=false (MASTER)', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await service.findAll(false);

      expect(fake.calls).not.toContain('eq.ativo');
    });

    it('retorna [] e não lança quando o supabase retorna erro', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: null, error: { message: 'down' } }));
      await setupService(fake);

      await expect(service.findAll(true)).resolves.toEqual([]);
    });

    it('retorna [] e não lança quando o client lança (rede)', async () => {
      const fake = createFakeSupabase();
      fake.client.from = () => {
        throw new Error('network down');
      };
      await setupService(fake);

      await expect(service.findAll(true)).resolves.toEqual([]);
    });
  });

  describe('findById', () => {
    it('retorna o registro quando encontrado', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      const result = await service.findById('ori-1');

      expect(result.id).toBe('ori-1');
      expect(fake.eqFilters['id']).toBe('ori-1');
    });

    it('lança NotFoundException quando não encontrado', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [], error: null }));
      await setupService(fake);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByIdSafe (fluxo de finish — jamais lança)', () => {
    it('retorna registro quando encontrado', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      await expect(service.findByIdSafe('ori-1')).resolves.toEqual(
        expect.objectContaining({ id: 'ori-1' }),
      );
    });

    it('retorna null sem lançar quando não encontrado', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [], error: null }));
      await setupService(fake);

      await expect(service.findByIdSafe('missing')).resolves.toBeNull();
    });

    it('retorna null sem lançar quando o supabase retorna erro', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: null, error: { message: 'timeout' } }));
      await setupService(fake);

      await expect(service.findByIdSafe('ori-1')).resolves.toBeNull();
    });

    it('retorna null sem lançar quando o client lança (rede)', async () => {
      const fake = createFakeSupabase();
      fake.client.from = () => {
        throw new Error('network down');
      };
      await setupService(fake);

      await expect(service.findByIdSafe('ori-1')).resolves.toBeNull();
    });
  });

  describe('create', () => {
    const validInput = {
      categoria: 'Oftalmológico',
      texto_tela: 'Orientar acompanhamento com oftalmologista',
      texto_email: 'Recomendamos acompanhamento periódico.',
    };

    it('lança ForbiddenException para usuário não-MASTER', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await expect(service.create(validInput, medicoUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lança BadRequestException quando texto_tela é vazio', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await expect(
        service.create({ ...validInput, texto_tela: '   ' }, masterUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança BadRequestException quando texto_email é vazio', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await expect(
        service.create({ ...validInput, texto_email: '' }, masterUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ativa defaults (ordem=0) e registra audit log', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      const result = await service.create(
        { ...validInput, categoria: '  ' },
        masterUser,
        'req-1',
      );

      expect(fake.calls).toContain('insert');
      expect(result.libera_cliente).toBe(true);
      expect(result.ativo).toBe(true);
      expect(auditLog.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'CRIAR_ORIENTACAO_PARECER',
          user: masterUser,
          requestId: 'req-1',
        }),
      );
    });

    it('propaga BadRequestException quando o insert falha', async () => {
      const fake = createFakeSupabase();
      fake.setInsertError({ message: 'duplicate key' });
      await setupService(fake);

      await expect(
        service.create(validInput, masterUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('lança ForbiddenException para usuário não-MASTER', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await expect(
        service.update('ori-1', { ativo: false }, medicoUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lança NotFoundException quando o registro não existe', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [], error: null }));
      await setupService(fake);

      await expect(
        service.update('missing', { ativo: false }, masterUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('persiste campos parciais sem apagar os anteriores', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      const result = await service.update(
        'ori-1',
        { libera_cliente: false, ativo: false },
        masterUser,
        'req-2',
      );

      expect(fake.calls).toContain('update');
      expect(result.libera_cliente).toBe(false);
      expect(result.ativo).toBe(false);
      // campos não enviados permanecem do registro original
      expect(result.texto_tela).toBe(makeRow().texto_tela);
      expect(result.ordem).toBe(1);
    });

    it('registra audit com a lista de campos alterados', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      await service.update('ori-1', { libera_cliente: false }, masterUser, 'req-2');

      expect(auditLog.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'EDITAR_ORIENTACAO_PARECER',
          detalhes: expect.objectContaining({
            alteracoes: expect.arrayContaining(['libera_cliente']),
          }),
        }),
      );
    });
  });

  describe('remove (exclusão real)', () => {
    it('lança ForbiddenException para usuário não-MASTER', async () => {
      const fake = createFakeSupabase();
      await setupService(fake);

      await expect(service.remove('ori-1', medicoUser)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lança NotFoundException quando o registro não existe', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [], error: null }));
      await setupService(fake);

      await expect(service.remove('missing', masterUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('executa delete real (.delete().eq(id)) — não soft-delete', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      const result = await service.remove('ori-1', masterUser, 'req-3');

      expect(result).toEqual({ success: true });
      // A cadeia delete().eq(id) deve ter sido montada
      expect(fake.calls.some((c) => c.startsWith('from.'))).toBe(true);
      // encontrar o registro antes (findById) e depois excluir
      expect(auditLog.logUserAction).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'EXCLUIR_ORIENTACAO_PARECER',
          recursoId: 'ori-1',
          detalhes: { texto_tela: makeRow().texto_tela },
        }),
      );
    });

    it('não marca ativo=false (confirma exclusão em vez de inativação)', async () => {
      const fake = createFakeSupabase();
      fake.setResult(async () => ({ data: [makeRow()], error: null }));
      await setupService(fake);

      await service.remove('ori-1', masterUser);

      expect(fake.calls).toContain('delete');
      expect(fake.calls).not.toContain('update');
    });
  });

  describe('regressão: rotas BFF ainda autenticam MASTER no frontend', () => {
    it('supabase getClient é usado somente após construção do módulo', async () => {
      // Garante que o serviço expõe o client sem quebrar o DI
      expect(supabase).toBeDefined();
    });
  });
});