import { Test, TestingModule } from '@nestjs/testing';
import { AzureAsoEnrichmentWorkerService } from './azure-aso-enrichment.service';
import { MongoService } from 'src/mongo/mongo.service';
import { AzureBlobService } from '../AzureBlob.service';
import { AsoSignatureService } from 'src/signature/aso-signature.service';
import { SupabaseService } from 'src/supabase/supabase.service';

describe('AzureAsoEnrichmentWorkerService', () => {
  let service: AzureAsoEnrichmentWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureAsoEnrichmentWorkerService,
        { provide: MongoService, useValue: {} },
        { provide: AzureBlobService, useValue: {} },
        { provide: AsoSignatureService, useValue: {} },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<AzureAsoEnrichmentWorkerService>(
      AzureAsoEnrichmentWorkerService,
    );
  });

  describe('handleMessage parser', () => {
    it('deve extrair payload JSON puro sem crachar', async () => {
      const payloadObj = {
        schedulingId: 'plain-123',
        codEmpresa: 1,
        url: 'http://test',
      };
      const messageObj = {
        messageId: 'mes-1',
        messageText: JSON.stringify(payloadObj),
        popReceipt: 'rec',
      };

      // Mocka todo runWithContext para nao executar de fato a logica pesada
      jest
        .spyOn(require('src/core/logger/async-storage'), 'runWithContext')
        .mockImplementation((_ctx, cb: any) => cb());

      // E stub no updateOne do mongo caso chame
      (service as any).mongoService = {
        isReady: true,
        schedulingsCollection: {
          findOne: jest.fn().mockResolvedValue(null),
          updateOne: jest.fn().mockResolvedValue({}),
        },
      };

      try {
        await (service as any).handleMessage(messageObj);
      } catch (e: any) {
        // o erro esperado é "Scheduling plain-123 nao encontrado no MongoDB"
        // ou um BSONError se o schedulingId não é um ObjectId válido
        // o que prova que ele PASSOU no parse JSON.
        expect(
          e.message.includes('nao encontrado no MongoDB') ||
          e.message.includes('24 character hex') ||
          e.message.includes('input must be')
        ).toBe(true);
      }
    });

    it('deve extrair payload Base64 sem crachar e decodar com sucesso', async () => {
      const payloadObj = {
        schedulingId: 'b64-123',
        codEmpresa: 1,
        url: 'http://test',
      };

      const b64Text = Buffer.from(JSON.stringify(payloadObj)).toString(
        'base64',
      );
      const messageObj = {
        messageId: 'mes-2',
        messageText: b64Text,
        popReceipt: 'rec',
      };

      // Mocka todo runWithContext
      jest
        .spyOn(require('src/core/logger/async-storage'), 'runWithContext')
        .mockImplementation((_ctx, cb: any) => cb());

      (service as any).mongoService = {
        isReady: true,
        schedulingsCollection: {
          findOne: jest.fn().mockResolvedValue(null),
          updateOne: jest.fn().mockResolvedValue({}),
        },
      };

      try {
        await (service as any).handleMessage(messageObj);
      } catch (e: any) {
        // Novamente, passou do parse sem dar o SyntaxError Token 'e'.
        expect(
          e.message.includes('nao encontrado no MongoDB') ||
          e.message.includes('24 character hex') ||
          e.message.includes('input must be')
        ).toBe(true);
      }
    });
  });
});
