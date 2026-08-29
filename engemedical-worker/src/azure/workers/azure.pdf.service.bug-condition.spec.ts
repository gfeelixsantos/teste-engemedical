/**
 * Teste exploratório da condição de bug — Restrição Temporária Merge PDF
 *
 * Este teste codifica o comportamento ESPERADO (após correção).
 * No código NÃO corrigido, este teste DEVE FALHAR — isso confirma que o bug existe.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { AzurePdfWorkerService } from './azure.pdf.service';
import { PdfmakeService } from 'src/pdfmake/pdfmake.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BryClientService } from 'src/signature/bry-client.service';

// Impede que o worker inicie o polling ao ser instanciado no módulo de teste
jest.mock('src/core/logger/async-storage', () => ({
  runWithContext: jest.fn((_ctx: any, cb: any) => cb()),
}));

// Mock do Azure Storage Queue para evitar conexão real no onModuleInit
jest.mock('@azure/storage-queue', () => ({
  QueueServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getQueueClient: jest.fn().mockReturnValue({
        receiveMessages: jest.fn().mockResolvedValue({ receivedMessageItems: [] }),
        deleteMessage: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

// Mock do resolveBackendBaseUrl para evitar chamadas de rede
jest.mock('src/core/runtime-mode', () => ({
  resolveBackendBaseUrl: jest.fn().mockReturnValue(null),
}));

// Mock do buildUnifiedExamSignature
jest.mock('src/mongo/utils/exam-signature.contract', () => ({
  buildUnifiedExamSignature: jest.fn().mockReturnValue(null),
}));



// Mock do generateBlobFileName e generateBlobPath
jest.mock('src/utils/util', () => ({
  generateBlobFileName: jest.fn().mockReturnValue('test-file.pdf'),
  generateBlobPath: jest.fn().mockReturnValue('exames/001/PRON001/test-file.pdf'),
  BlobFileType: {},
}));

// Mock do determineExamSignatureEligibility
jest.mock('src/signature/exam-signature-eligibility', () => ({
  determineExamSignatureEligibility: jest.fn().mockReturnValue({ shouldSign: false }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createMinimalPdfBuffer(pageCount = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage();
  return Buffer.from(await doc.save());
}

// ---------------------------------------------------------------------------
// Mock do BlobServiceClient
// ---------------------------------------------------------------------------

jest.mock('@azure/storage-blob', () => {
  const mockBlockBlobClient = {
    uploadData: jest.fn().mockResolvedValue({}),
    url: 'https://mock-storage.blob.core.windows.net/documents/test.pdf',
  };
  const mockContainerClient = {
    createIfNotExists: jest.fn().mockResolvedValue({}),
    getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient),
  };
  const mockBlobServiceClientInstance = {
    getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
  };
  return {
    BlobServiceClient: {
      fromConnectionString: jest.fn().mockReturnValue(mockBlobServiceClientInstance),
    },
  };
});

// ---------------------------------------------------------------------------
// Mock do AppRules
// ---------------------------------------------------------------------------

jest.mock('src/core/AppRules', () => ({
  AppRules: {
    shouldSendResultSoc: jest.fn().mockReturnValue({ shouldSend: false, examIndex: -1 }),
  },
}));

// ---------------------------------------------------------------------------
// Mock do notifyBackendExamUpdated (axios interno)
// ---------------------------------------------------------------------------

jest.mock('axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
    isAxiosError: jest.fn().mockReturnValue(false),
  },
  isAxiosError: jest.fn().mockReturnValue(false),
  post: jest.fn().mockResolvedValue({ data: {} }),
}));

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

const funcionarioComRestricao: any = {
  _id: 'test-id-123',
  NOME: 'João Silva',
  CODIGOEMPRESA: '001',
  CODIGOPRONTUARIO: 'PRON001',
  ANEXOS: [],
  EXAMES: [
    {
      codigoExame: 'EC001',
      grupo: 'Exame Clínico',
      nomeExame: 'Exame Clínico',
      status: 'PENDENTE',
      formulario: {
        duracaoRestricaoDias: '30',
        dataInicioRestricao: '2024-01-01',
        restricoes: { evitarCarregarPeso: true },
        observacoesMedicas: 'Restrição de carga',
        medico: 'Dr. Teste',
      },
    },
  ],
};

const mockMessage: any = {
  messageId: 'msg-001',
  messageText: JSON.stringify({
    funcionario: funcionarioComRestricao,
    profissional: { codigo: 'MED001', nome: 'Dr. Teste' },
    grupo: 'Exame Clínico',
  }),
  popReceipt: 'receipt-001',
  dequeueCount: 1,
  expiresOn: new Date(),
  insertedOn: new Date(),
  nextVisibleOn: new Date(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AzurePdfWorkerService — Bug Condition: Exame Clínico com restrição', () => {
  let service: AzurePdfWorkerService;
  let pdfMakeService: jest.Mocked<PdfmakeService>;
  let mongoService: jest.Mocked<MongoService>;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetar o funcionário para estado limpo antes de cada teste
    funcionarioComRestricao.ANEXOS = [];
    funcionarioComRestricao.EXAMES[0].url = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzurePdfWorkerService,
        {
          provide: PdfmakeService,
          useValue: {
            createPdf: jest.fn(),
          },
        },
        {
          provide: MongoService,
          useValue: {
            updateExamGroupDocument: jest.fn().mockResolvedValue(undefined),
            updateAnexo: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            getUserSettingsWithPin: jest.fn().mockResolvedValue(null),
            getValidPscSession: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: BryClientService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AzurePdfWorkerService>(AzurePdfWorkerService);
    pdfMakeService = module.get(PdfmakeService);
    mongoService = module.get(MongoService);
    supabaseService = module.get(SupabaseService);
  });

  /**
   * Teste 1: Após a correção, `updateAnexo` NÃO deve ser chamado.
   *
   * No código bugado, `emitirLaudoRestricao` chama `updateAnexo`.
   * Este teste FALHA no código não corrigido (confirma o bug).
   *
   * Validates: Requirements 2.2
   */
  it('deve NÃO chamar updateAnexo quando Exame Clínico tem duracaoRestricaoDias preenchido', async () => {
    // Arrange: PDF do exame clínico com 1 página, PDF de restrição com 1 página
    const clinicoPdfBuffer = await createMinimalPdfBuffer(1);
    const restricaoPdfBuffer = await createMinimalPdfBuffer(1);

    (pdfMakeService.createPdf as jest.Mock)
      .mockResolvedValueOnce(clinicoPdfBuffer)   // primeira chamada: exame clínico
      .mockResolvedValueOnce(restricaoPdfBuffer); // segunda chamada: restrição (após correção)

    // Act
    await (service as any).handleMessage(mockMessage);

    // Assert: updateAnexo NÃO deve ser chamado após a correção
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
  });

  /**
   * Teste 2: Após a correção, `updateExamGroupDocument` DEVE ser chamado.
   *
   * Validates: Requirements 2.1
   */
  it('deve chamar updateExamGroupDocument com a URL do PDF merged', async () => {
    // Arrange
    const clinicoPdfBuffer = await createMinimalPdfBuffer(1);
    const restricaoPdfBuffer = await createMinimalPdfBuffer(1);

    (pdfMakeService.createPdf as jest.Mock)
      .mockResolvedValueOnce(clinicoPdfBuffer)
      .mockResolvedValueOnce(restricaoPdfBuffer);

    // Act
    await (service as any).handleMessage(mockMessage);

    // Assert: updateExamGroupDocument deve ser chamado com a URL
    expect(mongoService.updateExamGroupDocument).toHaveBeenCalledTimes(1);
    expect(mongoService.updateExamGroupDocument).toHaveBeenCalledWith(
      expect.objectContaining({ NOME: 'João Silva' }),
      'Exame Clínico',
      expect.stringContaining('https://'),
      expect.any(Object),
    );
  });

  /**
   * Teste 3: Após a correção, `createPdf` deve ser chamado duas vezes:
   * uma para o exame clínico e outra para o laudo de restrição.
   *
   * Validates: Requirements 2.1
   */
  it('deve chamar createPdf duas vezes: uma para exame clínico e outra para restrição', async () => {
    // Arrange
    const clinicoPdfBuffer = await createMinimalPdfBuffer(1);
    const restricaoPdfBuffer = await createMinimalPdfBuffer(1);

    (pdfMakeService.createPdf as jest.Mock)
      .mockResolvedValueOnce(clinicoPdfBuffer)
      .mockResolvedValueOnce(restricaoPdfBuffer);

    // Act
    await (service as any).handleMessage(mockMessage);

    // Assert: createPdf chamado 2 vezes — exame clínico + restrição
    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(2);

    // Primeira chamada: exame clínico
    expect(pdfMakeService.createPdf).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ NOME: 'João Silva' }),
      expect.objectContaining({ codigo: 'MED001' }),
      'Exame Clínico',
      expect.any(Boolean),
    );

    // Segunda chamada: restrição (após correção)
    expect(pdfMakeService.createPdf).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ NOME: 'João Silva' }),
      expect.objectContaining({ codigo: 'MED001' }),
      'restricao',
    );
  });

  /**
   * Teste 4: Após a correção, ANEXOS não deve receber nova entrada com Origin: 'exame-clinico'.
   *
   * No código bugado, `emitirLaudoRestricao` adiciona entrada em ANEXOS.
   * Este teste FALHA no código não corrigido (confirma o bug).
   *
   * Validates: Requirements 2.2
   */
  it('deve NÃO adicionar entrada em ANEXOS com Origin exame-clinico', async () => {
    // Arrange
    const clinicoPdfBuffer = await createMinimalPdfBuffer(1);
    const restricaoPdfBuffer = await createMinimalPdfBuffer(1);

    (pdfMakeService.createPdf as jest.Mock)
      .mockResolvedValueOnce(clinicoPdfBuffer)
      .mockResolvedValueOnce(restricaoPdfBuffer);

    const anexosAntes = funcionarioComRestricao.ANEXOS.length;

    // Act
    await (service as any).handleMessage(mockMessage);

    // Assert: ANEXOS não deve crescer com entrada de restrição
    // (o funcionário é mutado in-place pelo handleMessage)
    const payload = JSON.parse(mockMessage.messageText);
    // Verificamos via mock que updateAnexo não foi chamado
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
  });
});
