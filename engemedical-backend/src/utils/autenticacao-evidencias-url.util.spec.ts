import {
  buildPublicEvidenceUrl,
  resolveRelatorioEvidenciasUrl,
} from './autenticacao-evidencias-url.util';

describe('autenticacao-evidencias-url.util', () => {
  it('buildPublicEvidenceUrl monta URL canonica do relatorio', () => {
    const prontuario = '950646-49-1-25062026';
    expect(buildPublicEvidenceUrl(prontuario)).toBe(
      `https://cmsodocs.blob.core.windows.net/public/autenticacao/${prontuario}/relatorio-evidencias.pdf`,
    );
  });

  it('resolveRelatorioEvidenciasUrl prefere URL canonica', () => {
    const prontuario = '950646-49-1-25062026';
    const canonical = buildPublicEvidenceUrl(prontuario);
    expect(
      resolveRelatorioEvidenciasUrl(
        prontuario,
        'https://evidencia.url/antiga',
      ),
    ).toBe(canonical);
  });

  it('resolveRelatorioEvidenciasUrl usa valor legado sem prontuario', () => {
    expect(
      resolveRelatorioEvidenciasUrl(null, 'https://evidencia.url/legado'),
    ).toBe('https://evidencia.url/legado');
  });
});
