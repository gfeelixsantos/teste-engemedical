import { setExamesData, invalidateCache, getExamesList, getExameByCodigo, getTemplate } from './exames.provider';
import { EXAMES_LIST as HARDCODED } from 'src/soc/exames';

describe('ExamesProvider', () => {
  const mockData: Record<string, any[]> = {
    GrupoA: [
      { codigos: ['A1', 'A2'], nome: 'Exame A1', statusFinalizacao: 'FINALIZADO', enviarParaAzure: true, requerAssinaturaDigital: false },
      { codigos: ['A3'], nome: 'Exame A2', statusFinalizacao: 'AGUARDANDO_RESULTADO', enviarParaAzure: false, requerAssinaturaDigital: false },
    ],
    GrupoB: [
      { codigos: ['B1'], nome: 'Exame B', statusFinalizacao: 'FINALIZADO', requerAssinaturaDigital: true },
    ],
  };

  beforeEach(() => {
    invalidateCache();
  });

  describe('getExamesList', () => {
    it('deve retornar dados cacheados quando disponíveis', () => {
      setExamesData(mockData);
      const result = getExamesList();
      expect(result).toBe(mockData);
      expect(Object.keys(result)).toEqual(['GrupoA', 'GrupoB']);
    });

    it('deve fazer fallback para HARDCODED quando cache vazio', () => {
      const result = getExamesList();
      expect(result).toBe(HARDCODED);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it('deve invalidar cache quando chamado invalidateCache', () => {
      setExamesData(mockData);
      expect(getExamesList()).toBe(mockData);
      invalidateCache();
      expect(getExamesList()).toBe(HARDCODED);
    });
  });

  describe('getExameByCodigo', () => {
    it('deve encontrar exame por código no cache', () => {
      setExamesData(mockData);
      const exame = getExameByCodigo('A1');
      expect(exame).not.toBeNull();
      expect(exame!.nome).toBe('Exame A1');
    });

    it('deve encontrar exame por código no fallback', () => {
      const exame = getExameByCodigo('clinico');
      expect(exame).not.toBeNull();
      expect(exame!.nome).toBe('Exame Clínico');
    });

    it('deve retornar null para código inexistente', () => {
      setExamesData(mockData);
      const exame = getExameByCodigo('NADA');
      expect(exame).toBeNull();
    });
  });

  describe('getTemplate', () => {
    it('deve retornar undefined para null/undefined', () => {
      expect(getTemplate(null)).toBeUndefined();
      expect(getTemplate(undefined)).toBeUndefined();
    });

    it('deve retornar undefined para chave inexistente', () => {
      expect(getTemplate('nao_existe')).toBeUndefined();
    });

    it('deve retornar função para chave válida', () => {
      const fn = getTemplate('audiometria');
      expect(fn).toBeDefined();
      expect(typeof fn).toBe('function');
    });
  });
});
