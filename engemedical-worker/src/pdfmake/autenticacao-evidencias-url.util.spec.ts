import {
  buildPublicEvidenceUrl,
  resolveRelatorioEvidenciasUrl,
} from './autenticacao-evidencias-url.util';

describe('autenticacao-evidencias-url.util', () => {
  it('buildPublicEvidenceUrl monta a mesma URL do termo de aceite', () => {
    const prontuario = '950646-49-1-25062026';
    expect(buildPublicEvidenceUrl(prontuario)).toBe(
      `https://cmsodocs.blob.core.windows.net/public/autenticacao/${prontuario}/relatorio-evidencias.pdf`,
    );
  });

  it('resolveRelatorioEvidenciasUrl prefere URL canonica sobre valor legado', () => {
    const prontuario = '950646-49-1-25062026';
    const canonical = buildPublicEvidenceUrl(prontuario);
    const resolved = resolveRelatorioEvidenciasUrl(
      prontuario,
      'https://evidencia.url/antiga',
    );

    expect(resolved).toBe(canonical);
  });

  it('resolveRelatorioEvidenciasUrl usa valor atual quando prontuario ausente', () => {
    expect(
      resolveRelatorioEvidenciasUrl(null, 'https://evidencia.url/legado'),
    ).toBe('https://evidencia.url/legado');
  });
});
