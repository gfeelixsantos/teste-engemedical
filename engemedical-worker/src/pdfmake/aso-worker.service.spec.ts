import { Test, TestingModule } from '@nestjs/testing';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { AzureBlobService } from 'src/azure/AzureBlob.service';
import { WorkerAsoInput } from './aso-worker.types';
import { AsoWorkerService } from './aso-worker.service';

jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn().mockReturnValue({
    getBuffer: jest.fn((callback) => callback(Buffer.from('pdf-content'))),
  }),
}));

describe('AsoWorkerService', () => {
  let service: AsoWorkerService;
  let blobService: AzureBlobService;

  const mockBlobService = {
    upload: jest.fn().mockResolvedValue('https://blob.url/aso.pdf'),
    download: jest.fn().mockResolvedValue(Buffer.from('image-content')),
  };

  const mockInput: WorkerAsoInput = {
    origem: 'BIOMETRIA',
    requestId: 'req-123',
    funcionario: {
      nome: 'TESTE FUNCIONARIO',
      codigo: 'F001',
      cpfMascarado: '123.***.***-00',
    },
    empresa: {
      codigo: 'E001',
      nome: 'TESTE EMPRESA',
      cnpj: '00.000.000/0001-00',
    },
    unidade: { nome: 'UNIDADE TESTE' },
    atendimento: {
      schedulingId: 'S001',
      tipoExameNome: 'ADMISSIONAL',
      dataAgendamento: '28/05/2026',
    },
    medicoCoordenador: {
      nome: 'DR. COORDENADOR',
      crm: '123456',
      uf: 'SP',
    },
    autenticacaoAtendimento: {
      metodo: 'BIOMETRIA',
      biometria: {
        digitalDocumentalBlobPath: 'path/to/image.png',
      },
    },
    exames: [],
    riscos: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoWorkerService,
        { provide: AzureBlobService, useValue: mockBlobService },
      ],
    }).compile();

    service = module.get<AsoWorkerService>(AsoWorkerService);
    blobService = module.get<AzureBlobService>(AzureBlobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve baixar a imagem biométrica se houver path e a origem for BIOMETRIA', async () => {
    await service.gerar(mockInput);

    expect(blobService.download).toHaveBeenCalledWith(
      expect.any(String),
      'path/to/image.png',
    );
    expect(
      mockInput.autenticacaoAtendimento.biometria?.imageBase64,
    ).toContain('data:image/png;base64,');
  });

  it('deve gerar o PDF e fazer upload para o blob storage', async () => {
    const result = await service.gerar(mockInput);

    expect(pdfMake.createPdf).toHaveBeenCalled();
    expect(blobService.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('aso/'),
      expect.any(Buffer),
    );
    expect(result).toMatchObject({
      url: 'https://blob.url/aso.pdf',
      documentHash: expect.any(String),
      filename: expect.stringContaining('ASO_TESTE_FUNCIONARIO_ADMISSIONAL'),
    });
  });

  it('deve processar a origem FACIAL sem erro para o template com QR Code', async () => {
    const facialInput: WorkerAsoInput = {
      ...mockInput,
      origem: 'FACIAL',
      autenticacaoAtendimento: {
        metodo: 'FACIAL',
        evidencias: {
          relatorioEvidenciasUrl: 'https://evidencia.url',
        },
      },
    };

    await service.gerar(facialInput);

    // O teste estrutural do QR Code fica na spec do template.
    expect(pdfMake.createPdf).toHaveBeenCalled();
  });
});
