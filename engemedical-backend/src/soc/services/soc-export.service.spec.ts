import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SocExportService } from './soc-export.service';
import { StructuredLogger } from 'src/utils/logger';

describe('SocExportService', () => {
  let service: SocExportService;

  const mockConfigService = {
    get: jest.fn(() => null),
  };

  const mockLogger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocExportService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<SocExportService>(SocExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser instanciado', () => {
    expect(service).toBeDefined();
  });
});
