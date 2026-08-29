import {
  matchesAllowedGroups,
  normalizeScraperGroup,
} from './group-normalization.util';

describe('group-normalization.util', () => {
  it('normaliza grupo com e sem acento para a forma canônica', () => {
    expect(normalizeScraperGroup(' Laboratório ')).toBe('LABORATORIO');
    expect(normalizeScraperGroup('laboratorio')).toBe('LABORATORIO');
  });

  it('trata variacoes de raio-x na mesma chave canônica', () => {
    expect(normalizeScraperGroup('Raio-X')).toBe('RAIOX');
    expect(normalizeScraperGroup('RX')).toBe('RAIOX');
  });

  it('compara grupos permitidos usando normalizacao canônica', () => {
    expect(matchesAllowedGroups('Laboratório', ['LABORATORIO'])).toBe(true);
    expect(matchesAllowedGroups('laboratorio', ['Laboratório'])).toBe(true);
  });
});
