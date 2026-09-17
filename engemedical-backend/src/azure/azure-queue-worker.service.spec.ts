import { AzureQueueWorkerService } from './azure-queue-worker.service';

describe('AzureQueueWorkerService', () => {
  const mockAzureService = {
    isEnabled: jest.fn(),
  } as any;

  const mockSocService = {} as any;

  let service: AzureQueueWorkerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAzureService.isEnabled.mockReturnValue(true);
    service = new AzureQueueWorkerService(
      mockAzureService,
      mockSocService,
    );
  });

  it('deve iniciar apenas as filas suportadas no backend, sem listener de aso-enriquecimento', () => {
    const pollResultadoExameSocSpy = jest
      .spyOn(service as any, 'pollResultadoExameSoc')
      .mockImplementation(() => Promise.resolve());
    const pollSocgedSpy = jest
      .spyOn(service as any, 'pollSocged')
      .mockImplementation(() => Promise.resolve());
    service.onModuleInit();

    expect(pollResultadoExameSocSpy).toHaveBeenCalled();
    expect(pollSocgedSpy).toHaveBeenCalled();
    expect('pollExamResults' in (service as any)).toBe(false);
    expect('pollAsoEnriquecimento' in (service as any)).toBe(false);
  });
});
