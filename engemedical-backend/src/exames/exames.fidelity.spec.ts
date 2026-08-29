import { Test, TestingModule } from '@nestjs/testing';
import { ExamesService } from './exames.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';

function makeChain(result: any): any {
  let orderCalls = 0;
  let data = result.data;
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn((col, val) => {
    if (col === 'ativo' && val === true) {
      data = (data || []).filter((r: any) => r.ativo !== false);
    }
    return chain;
  });
  chain.order = jest.fn(() => {
    orderCalls++;
    if (orderCalls >= 2) return Promise.resolve({ data, error: result.error });
    return chain;
  });
  chain.single = jest.fn(() => Promise.resolve(result));
  return chain;
}

function buildSupabaseMock(result: any) {
  const from = jest.fn(() => makeChain(result));
  return { getClient: jest.fn(() => ({ from })) };
}

describe('ExamesService — buildGroupedMap (fidelidade)', () => {
  let service: ExamesService;

  const seedData = [
    { id: '1', grupo: 'Exame Clínico', nome: 'Exame Clínico', codigos: ['clinico', '11'], status_finalizacao: 'FINALIZADO', enviar_para_azure: true, requer_assinatura: true, template_key: 'exameClinico', estimativa_minutos: 25, ativo: true },
    { id: '2', grupo: 'Exame Clínico', nome: 'Teste de Romberg', codigos: ['002211'], status_finalizacao: 'FINALIZADO', enviar_para_azure: false, requer_assinatura: false, template_key: null, estimativa_minutos: null, ativo: true },
    { id: '3', grupo: 'Audiometria', nome: 'Audiometria', codigos: ['51.01.004-6', '50c', '10014'], status_finalizacao: 'FINALIZADO', enviar_para_azure: true, requer_assinatura: true, template_key: 'audiometria', estimativa_minutos: 18, ativo: true },
    { id: '4', grupo: 'ECG', nome: 'ECG', codigos: ['20.01.001-0'], status_finalizacao: 'AGUARDANDO_RESULTADO', enviar_para_azure: false, requer_assinatura: false, template_key: null, estimativa_minutos: 25, ativo: true },
    { id: '5', grupo: 'Laboratório', nome: 'Glicemia', codigos: ['28.01.097-3'], status_finalizacao: 'AGUARDANDO_RESULTADO', enviar_para_azure: false, requer_assinatura: false, template_key: null, estimativa_minutos: 22, ativo: true },
    { id: '6', grupo: 'Laboratório', nome: 'Colesterol total', codigos: ['28010507'], status_finalizacao: 'AGUARDANDO_RESULTADO', enviar_para_azure: false, requer_assinatura: false, template_key: null, estimativa_minutos: 22, ativo: true },
    { id: '7', grupo: 'Exame Clínico', nome: 'Exame Desativado', codigos: ['OLD'], status_finalizacao: 'FINALIZADO', enviar_para_azure: false, requer_assinatura: false, template_key: null, estimativa_minutos: null, ativo: false },
  ];

  beforeEach(async () => {
    const supabaseMock = buildSupabaseMock({ data: seedData, error: null });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamesService,
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: AuditLogService, useValue: { logUserAction: jest.fn() } },
      ],
    }).compile();

    service = module.get<ExamesService>(ExamesService);
    service.invalidateCache();
  });

  describe('buildGroupedMap', () => {
    it('deve agrupar exames por grupo', async () => {
      const map = await service.buildGroupedMap();
      expect(Object.keys(map)).toContain('Exame Clínico');
      expect(Object.keys(map)).toContain('Audiometria');
      expect(Object.keys(map)).toContain('ECG');
      expect(Object.keys(map)).toContain('Laboratório');
    });

    it('deve excluir exames inativos', async () => {
      const map = await service.buildGroupedMap();
      const clinicoNomes = map['Exame Clínico'].map((e) => e.nome);
      expect(clinicoNomes).toContain('Exame Clínico');
      expect(clinicoNomes).toContain('Teste de Romberg');
      expect(clinicoNomes).not.toContain('Exame Desativado');
    });

    it('deve mapear template_key para função de template', async () => {
      const map = await service.buildGroupedMap();
      const audiometria = map['Audiometria'][0];
      expect(audiometria.template).toBeDefined();
      expect(typeof audiometria.template).toBe('function');
    });

    it('deve preservar codigos, nome e status de finalizacao', async () => {
      const map = await service.buildGroupedMap();
      const exameClinico = map['Exame Clínico'][0];
      expect(exameClinico.nome).toBe('Exame Clínico');
      expect(exameClinico.codigos).toEqual(['clinico', '11']);
      expect(exameClinico.statusFinalizacao).toBe('FINALIZADO');
      expect(exameClinico.enviarParaAzure).toBe(true);
      expect(exameClinico.requerAssinaturaDigital).toBe(true);
    });

    it('deve retornar objeto vazio quando não há exames ativos', async () => {
      const supabaseMock = buildSupabaseMock({ data: [], error: null });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExamesService,
          { provide: SupabaseService, useValue: supabaseMock },
          { provide: AuditLogService, useValue: { logUserAction: jest.fn() } },
        ],
      }).compile();
      const emptyService = module.get<ExamesService>(ExamesService);
      const map = await emptyService.buildGroupedMap();
      expect(map).toEqual({});
    });

    it('deve propagar erro do Supabase', async () => {
      const supabaseMock = buildSupabaseMock({ data: null, error: new Error('DB error') });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ExamesService,
          { provide: SupabaseService, useValue: supabaseMock },
          { provide: AuditLogService, useValue: { logUserAction: jest.fn() } },
        ],
      }).compile();
      const errService = module.get<ExamesService>(ExamesService);
      await expect(errService.buildGroupedMap()).rejects.toThrow();
    });
  });

  describe('findActiveByCodigo', () => {
    it('deve encontrar exame por código SOC', async () => {
      const exame = await service.findActiveByCodigo('51.01.004-6');
      expect(exame).not.toBeNull();
      expect(exame!.nome).toBe('Audiometria');
    });

    it('deve retornar null para código inexistente', async () => {
      const exame = await service.findActiveByCodigo('CODIGO_INEXISTENTE');
      expect(exame).toBeNull();
    });

    it('não deve retornar exame inativo', async () => {
      const exame = await service.findActiveByCodigo('OLD');
      expect(exame).toBeNull();
    });
  });
});
