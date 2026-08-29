import { AsoStatus } from '../enum/scheduling.enum';
import { mapToLegacyAsoStatus } from './legacy-aso-status.contract';

describe('legacy ASO status contract', () => {
  it('maps pending ASOs without url to NAO_GERADO', () => {
    expect(
      mapToLegacyAsoStatus({
        nextStatus: 'PENDENTE',
        nextUrl: '',
      }),
    ).toBe(AsoStatus.NAO_GERADO);
  });

  it('maps pending ASOs with url to GERADO', () => {
    expect(
      mapToLegacyAsoStatus({
        nextStatus: 'PENDENTE',
        nextUrl: 'https://storage.local/aso.pdf',
      }),
    ).toBe(AsoStatus.GERADO);
  });

  it('maps digitalized and released ASOs to GERADO', () => {
    expect(
      mapToLegacyAsoStatus({
        nextStatus: 'DIGITALIZADA',
        nextUrl: 'https://storage.local/aso.pdf',
      }),
    ).toBe(AsoStatus.GERADO);

    expect(
      mapToLegacyAsoStatus({
        nextStatus: 'LIBERADO',
        nextUrl: 'https://storage.local/aso.pdf',
      }),
    ).toBe(AsoStatus.GERADO);
  });

  it('maps failed ASOs to ERRO', () => {
    expect(
      mapToLegacyAsoStatus({
        nextStatus: 'FALHA',
      }),
    ).toBe('ERRO');
  });

  it('preserves KIT_CREDENCIADA when already set', () => {
    expect(
      mapToLegacyAsoStatus({
        currentLegacyStatus: AsoStatus.KIT_CREDENCIADA,
        nextStatus: 'PENDENTE',
      }),
    ).toBe(AsoStatus.KIT_CREDENCIADA);
  });
});
