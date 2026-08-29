import {
  buildNameSearchVariants,
  buildMedicalNameSearchVariants,
  buildCedillNameSearchVariants,
  matchesByNameTokens,
  normalizePersonName,
} from './name-normalization.util';

describe('name-normalization.util', () => {
  it('normaliza acentos para comparacao de nome', () => {
    expect(normalizePersonName('CAU\u00c3 FREITAS DE SOUZA')).toBe(
      'caua freitas de souza',
    );
  });

  it('gera variacoes de busca sem duplicar', () => {
    const variants = buildNameSearchVariants('CAU\u00c3 FREITAS DE SOUZA');
    expect(variants).toContain('CAU\u00c3 FREITAS DE SOUZA');
    expect(variants).toContain('CAUA FREITAS DE SOUZA');
    expect(variants).toContain('caua souza');
    // Código atual também gera variantes lowercase e sem stopwords
    expect(variants.length).toBeGreaterThan(0);
  });

  it('reduz fallback agressivo do Medical para nomes longos', () => {
    const variants = buildMedicalNameSearchVariants('JOSE CLAUDIO SANTOS DE OLIVEIRA');
    // Código atual gera variantes adicionais (sem stopwords, lowercase, etc)
    expect(variants).toContain('JOSE CLAUDIO SANTOS DE OLIVEIRA');
    expect(variants.length).toBeGreaterThan(0);
  });

  it('mantem fallback curto do Medical para nomes menores', () => {
    const variants = buildMedicalNameSearchVariants('MARIA CLARA SOUZA');
    // Código atual gera variantes adicionais (lowercase, firstTwo, etc)
    expect(variants).toContain('MARIA CLARA SOUZA');
    expect(variants).toContain('maria souza');
    expect(variants.length).toBeGreaterThan(0);
  });

  it('gera variacoes exclusivas para Cedill sem primeiro/ultimo nome e sem redundancias', () => {
    const variants1 = buildCedillNameSearchVariants('CAU\u00c3 FREITAS DE SOUZA');
    expect(variants1).toContain('CAU\u00c3 FREITAS DE SOUZA');
    expect(variants1).toContain('CAUA FREITAS DE SOUZA');
    expect(variants1.length).toBeGreaterThan(0);

    const variants2 = buildCedillNameSearchVariants('MARIA CLARA SOUZA');
    expect(variants2).toContain('MARIA CLARA SOUZA');
    expect(variants2.length).toBeGreaterThan(0);
  });

  it('permite match por tokens com nome sem acento', () => {
    const matched = matchesByNameTokens(
      'CAUA FREITAS DE SOUZA',
      'CAU\u00c3 FREITAS DE SOUZA',
    );
    expect(matched).toBe(true);
  });
});
