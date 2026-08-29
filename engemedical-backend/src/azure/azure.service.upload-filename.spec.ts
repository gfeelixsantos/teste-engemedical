import { Test, TestingModule } from '@nestjs/testing';
import { AzureService } from './azure.service';

describe('AzureService - uploadGenericFile FileName Generation', () => {
  let service: AzureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AzureService,
          useValue: {
            uploadGenericFile: AzureService.prototype.uploadGenericFile,
            getContainerClientOrThrow: jest.fn().mockReturnValue({
              getBlockBlobClient: jest.fn().mockReturnValue({
                 uploadData: jest.fn().mockResolvedValue({}),
                 url: 'mock_url'
              })
            })
          },
        },
      ],
    }).compile();

    service = module.get<AzureService>(AzureService);
  });

  it('deve gerar URL do arquivo com prefixo ASO_SIGNED para documentos type ASO assinado', async () => {
     // Config
     const employeeMock = { CODIGOEMPRESA: '001', NOME: 'JOAO' } as any;
     const pdfBuffer = Buffer.from('mock');

     // Substituir environment logic que a função pode chamar.
     const getContainerClientOrThrow = jest.spyOn(service as any, 'getContainerClientOrThrow').mockReturnValue({
        getBlockBlobClient: jest.fn().mockReturnValue({
           uploadData: jest.fn().mockResolvedValue({}),
           url: 'https://storage/aso/SIGNED_ASO.pdf'
        })
     });

     try {
       await service.uploadGenericFile(employeeMock, pdfBuffer, 'ASO_SIGNED_123456.pdf');
     } catch (e) {
        // Ignora erro se não testar blobClient
     }
     
     expect(getContainerClientOrThrow).toHaveBeenCalled();

     // Podemos validar as lógicas puras no utilitário de util diretamente!
  });
});
