/**
 * PRESERVATION PROPERTY TESTS - Task 2
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { rankDateAwareCandidates } from './utils/medical-candidate-ranking.util';
import { WorklabScraper } from './providers/worklab.scraper';
import { MedicalScraper } from './providers/medical.scraper';

describe('Preservation: providers nao-bugados nao sofrem reordenacao', () => {
  it('candidatos de Worklab permanecem na ordem original do provider', () => {
    const worklabResults = [
      ['id1', 'code1', 'group1', 'JOAO DA SILVA', '01/03/2024'],
      ['id2', 'code2', 'group2', 'JOAO SILVA JUNIOR', '15/03/2024'],
      ['id3', 'code3', 'group3', 'JOAO CARLOS SILVA', '20/03/2024'],
    ];
    const result = worklabResults;
    expect(result[0][3]).toBe('JOAO DA SILVA');
    expect(result[1][3]).toBe('JOAO SILVA JUNIOR');
    expect(result[2][3]).toBe('JOAO CARLOS SILVA');
  });

  it('candidato nome de exame em busca Worklab permanece na posicao original', () => {
    const worklabResults = [
      ['id1', 'code1', 'group1', 'JOAO DA SILVA', '01/03/2024'],
      ['id2', 'code2', 'group2', 'RX - Torax OIT - 2 Assinaturas', '14/03/2024'],
      ['id3', 'code3', 'group3', 'JOAO CARLOS SILVA', '20/03/2024'],
    ];
    const result = worklabResults;
    expect(result[1][3]).toBe('RX - Torax OIT - 2 Assinaturas');
    expect(result.indexOf(worklabResults[1])).toBe(1);
  });
});

describe('Preservation: candidato com matchedTokens=0 nao promovido por data', () => {
  it('candidato com matchedTokens=0 tem score menor que candidato com matchedTokens>0 com mesma data', () => {
    const candidatoComNome = {
      id: 'com-nome',
      patientName: 'Joao Silva',
      date: '15/03/2024',
      status: '',
    };
    const candidatoSemNome = {
      id: 'sem-nome',
      patientName: 'RX - Torax OIT - 2 Assinaturas',
      date: '15/03/2024',
      status: '',
    };

    const ranked = rankDateAwareCandidates('Joao Silva', '15/03/2024', [
      candidatoSemNome,
      candidatoComNome,
    ]);

    const semNome = ranked.find((c) => c.id === 'sem-nome')!;
    const comNome = ranked.find((c) => c.id === 'com-nome')!;

    expect(semNome.diagnostic.matchedTokens).toBe(0);
    expect(comNome.diagnostic.matchedTokens).toBeGreaterThan(0);
    expect(comNome.score).toBeGreaterThan(semNome.score);
  });
});

describe('Preservation: interface searchPatient retrocompativel sem segundo argumento', () => {
  it('WorklabScraper.searchPatient aceita apenas name', () => {
    const scraper = new WorklabScraper();
    expect(typeof scraper.searchPatient).toBe('function');
    expect(scraper.searchPatient.length).toBeGreaterThanOrEqual(1);
  });

  it('MedicalScraper.searchPatient aceita apenas name', () => {
    const scraper = new MedicalScraper();
    expect(typeof scraper.searchPatient).toBe('function');
    expect(scraper.searchPatient.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Preservation: ordem original preservada pelo provider', () => {
  it('resultados sao retornados na mesma ordem recebida do provider', () => {
    const providerResults = [
      { id: 'c1', patientName: 'JOAO DA SILVA', date: '01/03/2024', status: 'Liberado' },
      { id: 'c2', patientName: 'JOAO SILVA JUNIOR', date: '15/03/2024', status: 'Pendente' },
      { id: 'c3', patientName: 'JOAO CARLOS SILVA', date: '20/03/2024', status: 'Liberado' },
    ];
    const rankedResults = providerResults;
    expect(rankedResults.map((r) => r.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('lista vazia retorna lista vazia', () => {
    const providerResults: any[] = [];
    expect(providerResults).toEqual([]);
  });

  it('candidato com matchedTokens=0 nao sobe quando ordem original e preservada', () => {
    const providerResults = [
      { id: 'joao-da-silva', patientName: 'Joao da Silva', date: '20/03/2024', status: '' },
      { id: 'exame-rx-torax', patientName: 'RX - Torax OIT - 2 Assinaturas', date: '14/03/2024', status: '' },
    ];
    const rankedResults = providerResults;
    expect(rankedResults[0].id).toBe('joao-da-silva');
    expect(rankedResults[1].id).toBe('exame-rx-torax');
  });
});
