import { ConfigService } from '@nestjs/config';
import { AbsenteismoService } from './absenteismo.service';

describe('AbsenteismoService', () => {
  it('envia o intervalo padrão do ano corrente ao consultar licenças sem filtros', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-13T12:00:00-03:00'));

    const config = {
      get: jest.fn((key: string) => ({
        SOC_ED_LICENCA_MEDICA_CODIGO: '216645',
        SOC_ED_LICENCA_MEDICA_CHAVE: 'secret',
        SOC_WEBSERVICE_EMPRESA_PRINCIPAL: '1153506',
        SOC_EXPORT_DATA_BASE_URL: 'https://soc.test/exportadados',
      })[key]),
    } as unknown as ConfigService;
    const logger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };
    const service = new AbsenteismoService(config, logger as any);
    const response = {
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('[]').buffer,
    } as Response;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(response);

    await service.fetchLicencas(undefined, undefined);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    const params = JSON.parse(requestUrl.searchParams.get('parametro') || '{}');

    expect(params.dataInicio).toBe('01/01/2026');
    expect(params.dataFim).toBe('13/09/2026');
    expect(params.dataInicio).not.toBe('');
    expect(params.dataFim).not.toBe('');

    fetchMock.mockRestore();
    jest.useRealTimers();
  });
});
