/**
 * Testes de preservação — Restrição Temporária Merge PDF
 *
 * Estes testes devem PASSAR tanto ANTES quanto DEPOIS da correção.
 * Garantem que o comportamento existente não é quebrado pela correção.
 *
 * Property 2: Preservation — Exame Clínico sem restrição e outros grupos inalterados
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { AzurePdfWorkerService } from './azure.pdf.service';
import { PdfmakeService } from 'src/pdfmake/pdfmake.service';
import { MongoService } from 'src/mongo/mongo.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BryClientService } from 'src/signature/bry-client.service';

// ---------------------------------------------------------------------------
// Mocks de infraestrutura
// ---------------------------------------------------------------------------

jest.mock('src/core/logger/async-storage', () => ({
  runWithContext: jest.fn((_ctx: any, cb: any) => cb()),
}));

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

jest.mock('src/core/runtime-mode', () => ({
  resolveBackendBaseUrl: jest.fn().mockReturnValue(null),
}));

jest.mock('src/mongo/utils/exam-signature.contract', () => ({
  buildUnifiedExamSignature: jest.fn().mockReturnValue(null),
}));

jest.mock('src/utils/util', () => ({
  generateBlobFileName: jest.fn().mockReturnValue('test-file.pdf'),
  generateBlobPath: jest.fn().mockReturnValue('exames/001/PRON001/test-file.pdf'),
  BlobFileType: {},
}));

jest.mock('src/signature/exam-signature-eligibility', () => ({
  determineExamSignatureEligibility: jest.fn().mockReturnValue({ shouldSign: false }),
}));

jest.mock('@azure/storage-blob', () => {
  const mockBlockBlobClient = {
    uploadData: jest.fn().mockResolvedValue({}),
    url: 'https://mock-storage.blob.core.windows.net/documents/test.pdf',
  };
  const mockContainerClient = {
    createIfNotExists: jest.fn().mockResolvedValue({}),
    getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient),
  };
  return {
    BlobServiceClient: {
      fromConnectionString: jest.fn().mockReturnValue({
        getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
      }),
    },
  };
});

jest.mock('src/core/AppRules', () => ({
  AppRules: {
    shouldSendResultSoc: jest.fn().mockReturnValue({ shouldSend: false, examIndex: -1 }),
  },
}));

jest.mock('axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
    isAxiosError: jest.fn().mockReturnValue(false),
  },
  isAxiosError: jest.fn().mockReturnValue(false),
  post: jest.fn().mockResolvedValue({ data: {} }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createMinimalPdfBuffer(pageCount = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage();
  return Buffer.from(await doc.save());
}

function buildMessage(funcionario: any, grupo: string): any {
  return {
    messageId: 'msg-pres-001',
    messageText: JSON.stringify({
      funcionario,
      profissional: { codigo: 'MED001', nome: 'Dr. Teste' },
      grupo,
    }),
    popReceipt: 'receipt-001',
    dequeueCount: 1,
    expiresOn: new Date(),
    insertedOn: new Date(),
    nextVisibleOn: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

function makeFuncionarioClinico(duracaoRestricaoDias: string | null | undefined): any {
  return {
    _id: 'test-pres-id',
    NOME: 'Maria Souza',
    CODIGOEMPRESA: '001',
    CODIGOPRONTUARIO: 'PRON002',
    ANEXOS: [],
    EXAMES: [
      {
        codigoExame: 'EC001',
        grupo: 'Exame Clínico',
        nomeExame: 'Exame Clínico',
        status: 'PENDENTE',
        formulario: {
          duracaoRestricaoDias,
          dataInicioRestricao: duracaoRestricaoDias ? '2024-01-01' : undefined,
          restricoes: {},
          observacoesMedicas: '',
          medico: 'Dr. Teste',
        },
      },
    ],
  };
}

function makeFuncionarioOutroGrupo(grupo: string): any {
  return {
    _id: 'test-pres-id-2',
    NOME: 'Carlos Lima',
    CODIGOEMPRESA: '001',
    CODIGOPRONTUARIO: 'PRON003',
    ANEXOS: [],
    EXAMES: [
      {
        codigoExame: 'AUD001',
        grupo,
        nomeExame: grupo,
        status: 'PENDENTE',
        formulario: {},
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('AzurePdfWorkerService — Preservation: comportamentos inalterados', () => {
  let service: AzurePdfWorkerService;
  let pdfMakeService: jest.Mocked<PdfmakeService>;
  let mongoService: jest.Mocked<MongoService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzurePdfWorkerService,
        {
          provide: PdfmakeService,
          useValue: { createPdf: jest.fn() },
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
  });

  /**
   * Preservation 1: Exame Clínico com duracaoRestricaoDias vazio ('')
   * → createPdf chamado apenas 1 vez, updateAnexo não chamado
   * Validates: Requirement 3.1
   */
  it('Exame Clínico com duracaoRestricaoDias vazio: createPdf chamado 1 vez, sem updateAnexo', async () => {
    const funcionario = makeFuncionarioClinico('');
    const pdfBuffer = await createMinimalPdfBuffer(1);
    (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

    await (service as any).handleMessage(buildMessage(funcionario, 'Exame Clínico'));

    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(1);
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
    expect(mongoService.updateExamGroupDocument).toHaveBeenCalledTimes(1);
  });

  /**
   * Preservation 2: Exame Clínico com duracaoRestricaoDias null
   * → createPdf chamado apenas 1 vez, updateAnexo não chamado
   * Validates: Requirement 3.1
   */
  it('Exame Clínico com duracaoRestricaoDias null: createPdf chamado 1 vez, sem updateAnexo', async () => {
    const funcionario = makeFuncionarioClinico(null);
    const pdfBuffer = await createMinimalPdfBuffer(1);
    (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

    await (service as any).handleMessage(buildMessage(funcionario, 'Exame Clínico'));

    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(1);
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
  });

  /**
   * Preservation 3: Exame Clínico com duracaoRestricaoDias undefined
   * → createPdf chamado apenas 1 vez, updateAnexo não chamado
   * Validates: Requirement 3.1
   */
  it('Exame Clínico com duracaoRestricaoDias undefined: createPdf chamado 1 vez, sem updateAnexo', async () => {
    const funcionario = makeFuncionarioClinico(undefined);
    const pdfBuffer = await createMinimalPdfBuffer(1);
    (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

    await (service as any).handleMessage(buildMessage(funcionario, 'Exame Clínico'));

    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(1);
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
  });

  /**
   * Preservation 4: Grupo Audiometria
   * → createPdf chamado 1 vez, updateAnexo não chamado
   * Validates: Requirement 3.2
   */
  it('Grupo Audiometria: createPdf chamado 1 vez, sem merge, sem updateAnexo', async () => {
    const funcionario = makeFuncionarioOutroGrupo('Audiometria');
    const pdfBuffer = await createMinimalPdfBuffer(1);
    (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

    await (service as any).handleMessage(buildMessage(funcionario, 'Audiometria'));

    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(1);
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
    expect(mongoService.updateExamGroupDocument).toHaveBeenCalledTimes(1);
  });

  /**
   * Preservation 5: Grupo Acuidade Visual
   * → createPdf chamado 1 vez, updateAnexo não chamado
   * Validates: Requirement 3.2
   */
  it('Grupo Acuidade Visual: createPdf chamado 1 vez, sem merge, sem updateAnexo', async () => {
    const funcionario = makeFuncionarioOutroGrupo('Acuidade Visual');
    const pdfBuffer = await createMinimalPdfBuffer(1);
    (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

    await (service as any).handleMessage(buildMessage(funcionario, 'Acuidade Visual'));

    expect(pdfMakeService.createPdf).toHaveBeenCalledTimes(1);
    expect(mongoService.updateAnexo).not.toHaveBeenCalled();
  });

  /**
   * Preservation 6: updateExamGroupDocument sempre chamado para qualquer grupo
   * Validates: Requirement 3.2, 3.3
   */
  it('updateExamGroupDocument é sempre chamado independente do grupo', async () => {
    const grupos = ['Audiometria', 'Acuidade Visual', 'Espirometria'];

    for (const grupo of grupos) {
      jest.clearAllMocks();
      const funcionario = makeFuncionarioOutroGrupo(grupo);
      const pdfBuffer = await createMinimalPdfBuffer(1);
      (pdfMakeService.createPdf as jest.Mock).mockResolvedValueOnce(pdfBuffer);

      await (service as any).handleMessage(buildMessage(funcionario, grupo));

      expect(mongoService.updateExamGroupDocument).toHaveBeenCalledTimes(1);
      expect(mongoService.updateAnexo).not.toHaveBeenCalled();
    }
  });
});
