import { Test } from '@nestjs/testing';
import { MongoService } from './mongo.service';
import { AzureService } from 'src/azure/azure.service';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from 'src/websocket/websocket-connection';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import { StructuredLogger } from 'src/utils/logger';
import { ExamsScheduled, SchedulingDocument } from './types/scheduling';
import { OrientacoesConfigService } from 'src/orientacoes-config/orientacoes-config.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from 'src/units/units.service';
import { ObjectId } from 'mongodb';
import { TemplateNames } from 'src/azure/types/azure.types';

function makeAptoScheduling(overrides?: Partial<SchedulingDocument>): SchedulingDocument {
  return {
    _id: new ObjectId().toHexString(),
    ATENDIMENTOSTATUS: 'FINALIZADO',
    ASOSTATUS: 'LIBERADO',
    ASOINFO: {
      status: 'LIBERADO',
      url: 'https://blob.core.windows.net/arquivos/ASO/ASO_123.pdf',
      professional: {
        codigo: '1698',
        nome: 'DRA. BEATRIZ',
        cpf: '12345678900',
        conselho: 'CRM',
        ufconselho: 'SP',
      },
      observacoesParecer: ['Recomendamos acompanhamento periódico.'],
      parecerEquipeEmailSent: false,
    } as any,
    SCHEDULINGCODE: 'S-1',
    CODIGOPRONTUARIO: '123',
    RISCOSASO: [],
    CODIGOEMPRESA: '101010',
    SUBGRUPOEMPRESA: '',
    CODIGOINTERNOEMPRESA: '',
    CNPJEMPRESA: '',
    CPFEMPRESA: '',
    NOMEEMPRESA: 'EMPRESA TESTE',
    CODIGO: '1',
    NOME: 'MARIA SILVA',
    CODIGOUNIDADE: '',
    NOMEUNIDADE: '',
    CODIGOSETOR: '',
    NOMESETOR: '',
    CODIGOCARGO: '',
    NOMECARGO: 'OPERADOR',
    MATRICULAFUNCIONARIO: '',
    CPFFUNCIONARIO: '42514186897',
    SITUACAO: '',
    DATANASCIMENTO: '01/01/1990',
    DATAAGENDAMENTO: '29/05/2026',
    DATAAGENDAMENTO_DATE: new Date(),
    HORARIO: '09:00',
    UNIDADEATENDIMENTO: '',
    SEQUENCIAFICHA: '1',
    TIPOEXAME: '1',
    TIPOEXAMENOME: 'ADMISSIONAL',
    OBSERVACOES: null,
    ANOTACOES: null,
    PARECERMEDICO: 'APTO',
    RECOMENDACAOMEDICA: null,
    MEDICO: null,
    ANEXOS: [],
    TERM: false,
    CLIENT: null,
    CREATED: new Date().toISOString(),
    EXAMES: [] as ExamsScheduled[],
    TICKET: null,
    ...overrides,
  } as SchedulingDocument;
}

describe('MongoService - applyAsoSignedAfterDelivery (callback ASO assinado)', () => {
  let service: MongoService;
  let mockSchedulingsCollection: any;
  let mockAzureService: any;
  let mockSocService: any;
  let mockLogger: any;
  let mockConfig: any;

  // ID de agendamento válido (hex de 24 chars) — o método usa new ObjectId(id).
  const schedulingId = '6a7d13c1722ba9a1779544dd';

  beforeEach(async () => {
    mockSchedulingsCollection = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockAzureService = {
      filaEnvioDeEmail: jest.fn().mockResolvedValue(undefined),
      generateSasUrlFromUrl: jest
        .fn()
        .mockReturnValue('https://sas/readonly/aso.pdf'),
      filaAsoProcessing: jest.fn().mockResolvedValue(undefined),
    };

    mockSocService = {
      getCompanyContacts: jest.fn().mockResolvedValue(['contato@empresa.com.br']),
      generateDigitalAso: jest.fn(),
    };

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'PARECER_MEDICO_EMAIL_TO') return 'equipe@cmsocupacional.com.br';
        if (key === 'PARECER_MEDICO_EMAIL_CC') return 'cc@cmsocupacional.com.br';
        return undefined;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        MongoService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: AzureService, useValue: mockAzureService },
        {
          provide: WebsocketGateway,
          useValue: {
            server: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
          },
        },
        {
          provide: SignatureService,
          useValue: {
            hasValidSignatureSession: jest.fn().mockResolvedValue(false),
          },
        },
        { provide: SocService, useValue: mockSocService },
        {
          provide: OrientacoesConfigService,
          useValue: { findByIdSafe: jest.fn().mockResolvedValue(null) },
        },
        { provide: EmpresaCacheService, useValue: {} },
        { provide: UnitsService, useValue: {} },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<MongoService>(MongoService);
    (service as any).schedulingsCollection = mockSchedulingsCollection;
  });

  describe('applyAsoSignedAfterDelivery', () => {
    // URL no padrão canônico exigido por assertCanonicalAsoReleaseUrl
    const signedUrl = 'https://blob.core.windows.net/arquivos/ASO/ASO_123.pdf';

    it('lança erro quando URL ausente', async () => {
      await expect(
        service.applyAsoSignedAfterDelivery({
          schedulingId,
          url: '',
        }),
      ).rejects.toThrow(/URL do ASO ausente/);
    });

    it('atualiza ASOINFO.url e status LIBERADO via aggregation pipeline', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());
      mockSchedulingsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      const [, updatePayload] = mockSchedulingsCollection.updateOne.mock.calls[0];
      // Espera aggregation pipeline ($set ASOINFO via $ifNull) para tolerar ASOINFO null
      expect(Array.isArray(updatePayload)).toBe(true);
      expect(updatePayload[0]).toEqual(
        expect.objectContaining({
          $set: { ASOINFO: { $ifNull: ['$ASOINFO', {}] } },
        }),
      );
      expect(updatePayload[1]).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({
            'ASOINFO.url': signedUrl,
            'ASOINFO.status': 'LIBERADO',
          }),
        }),
      );
    });

    it('enfileira ASO_RELEASE para o cliente com o link de leitura', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      expect(mockAzureService.generateSasUrlFromUrl).toHaveBeenCalledWith(
        signedUrl,
        expect.any(Number),
      );

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      expect(emails).toHaveLength(2);

      const asoRelease = emails.find((e) => e.templatename === TemplateNames.ASO_RELEASE);
      expect(asoRelease).toBeDefined();
      expect(asoRelease.subject).toContain('[ATUALIZADO]');
      expect(asoRelease.data.asoInfo.asoFileUrl).toBe('https://sas/readonly/aso.pdf');
      expect(asoRelease.data.asoInfo.observacoesParecer).toEqual([
        'Recomendamos acompanhamento periódico.',
      ]);
    });

    it('não envia email quando parecer não é APTO', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(
        makeAptoScheduling({ PARECERMEDICO: 'INAPTO' }),
      );

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      expect(mockAzureService.filaEnvioDeEmail).not.toHaveBeenCalled();
      expect(mockSchedulingsCollection.updateOne).toHaveBeenCalledTimes(1); // só o update de URL
    });

    it('não envia email quando agendamento não encontrado', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(null);

      await service.applyAsoSignedAfterDelivery({
        schedulingId: '6a7d13c1722ba9a1779544de',
        url: signedUrl,
      });

      expect(mockAzureService.filaEnvioDeEmail).not.toHaveBeenCalled();
    });
  });

  describe('PARECER médico para a equipe (callback ASO-SIGNED)', () => {
    const signedUrl = 'https://blob.core.windows.net/arquivos/ASO/ASO_123.pdf';

    it('enfileira PARECER_MEDICO para a equipe com link ASO e observacoes', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      const parecerEquipe = emails.find(
        (e) => e.templatename === TemplateNames.PARECER_MEDICO,
      );

      expect(parecerEquipe).toBeDefined();
      expect(parecerEquipe.to).toBe('equipe@cmsocupacional.com.br');
      expect(parecerEquipe.cc).toBe('cc@cmsocupacional.com.br');
      expect(parecerEquipe.data.medicalOpinion.opinionType).toBe('APTO');
      expect(parecerEquipe.data.asoInfo.asoFileUrl).toBe('https://sas/readonly/aso.pdf');
      expect(parecerEquipe.data.asoInfo.observacoesParecer).toEqual([
        'Recomendamos acompanhamento periódico.',
      ]);
      expect(parecerEquipe.data.issuedBy).toEqual(
        expect.objectContaining({ codigo: '1698', nome: 'DRA. BEATRIZ' }),
      );
    });

    it('marca parecerEquipeEmailSent=true para garantir idempotência', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      const idempotencyCall = mockSchedulingsCollection.updateOne.mock.calls.find(
        ([, payload]) =>
          Array.isArray(payload) === false &&
          payload?.$set?.['ASOINFO.parecerEquipeEmailSent'] === true,
      );

      expect(idempotencyCall).toBeDefined();
    });

    it('não re-envia o PARECER quando parecerEquipeEmailSent já é true', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(
        makeAptoScheduling({
          ASOINFO: {
            status: 'LIBERADO',
            url: signedUrl,
            professional: { codigo: '1698', nome: 'DRA' },
            observacoesParecer: ['obs'],
            parecerEquipeEmailSent: true,
          } as any,
        }),
      );

      await service.applyAsoSignedAfterDelivery({
        schedulingId,
        url: signedUrl,
      });

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      const parecerEquipe = emails.find(
        (e) => e.templatename === TemplateNames.PARECER_MEDICO,
      );
      expect(parecerEquipe).toBeUndefined();
      // Ainda envia o ASO_RELEASE pro cliente
      expect(emails).toHaveLength(1);
    });

    it('não bloqueia o fluxo quando o envio do PARECER falha (log de erro)', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());
      mockAzureService.filaEnvioDeEmail
        .mockResolvedValueOnce(undefined) // ASO_RELEASE ok
        .mockRejectedValueOnce(new Error('queue down')); // PARECER falha

      await expect(
        service.applyAsoSignedAfterDelivery({ schedulingId, url: signedUrl }),
      ).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PARECER médico para a equipe'),
      );
    });
  });

  describe('applyAsoResultFromWorker (callback ASO liberado -> PARECER equipe com link)', () => {
    const signedUrl = 'https://blob.core.windows.net/arquivos/ASO/ASO_456.pdf';

    it('dispara PARECER_MEDICO para a equipe com link quando ASO liberado e envio postergado no finish', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(
        makeAptoScheduling({
          ASOINFO: {
            status: 'PENDENTE',
            url: signedUrl,
            professional: { codigo: '1698', nome: 'DRA. BEATRIZ' },
            observacoesParecer: ['Recomendamos acompanhamento periódico.'],
            parecerEquipePending: true,
            parecerEquipeEmailSent: false,
          } as any,
        }),
      );

      await service.applyAsoResultFromWorker({
        schedulingId,
        commandId: 'cmd-1',
        status: 'LIBERADO',
        url: signedUrl,
        signature: {
          provider: 'PSC',
          status: 'LIBERADO',
          requiresSignature: true,
        } as any,
      });

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      const parecerEquipe = emails.find(
        (e) => e.templatename === TemplateNames.PARECER_MEDICO,
      );

      expect(parecerEquipe).toBeDefined();
      expect(parecerEquipe.to).toBe('equipe@cmsocupacional.com.br');
      expect(parecerEquipe.subject).toBe('PARECER: MARIA SILVA - ADMISSIONAL');
      expect(parecerEquipe.data.asoInfo.asoFileUrl).toBe('https://sas/readonly/aso.pdf');
      expect(parecerEquipe.data.asoInfo.observacoesParecer).toEqual([
        'Recomendamos acompanhamento periódico.',
      ]);
      expect(parecerEquipe.data.issuedBy).toEqual(
        expect.objectContaining({ codigo: '1698', nome: 'DRA. BEATRIZ' }),
      );

      const idempotencyCall = mockSchedulingsCollection.updateOne.mock.calls.find(
        ([, payload]) =>
          Array.isArray(payload) === false &&
          payload?.$set?.['ASOINFO.parecerEquipeEmailSent'] === true,
      );
      expect(idempotencyCall).toBeDefined();
    });

    it('não envia PARECER quando o envio não foi postergado no finish', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(makeAptoScheduling());

      await service.applyAsoResultFromWorker({
        schedulingId,
        commandId: 'cmd-1',
        status: 'LIBERADO',
        url: signedUrl,
        signature: {
          provider: 'PSC',
          status: 'LIBERADO',
          requiresSignature: true,
        } as any,
      });

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      const parecerEquipe = emails.find(
        (e) => e.templatename === TemplateNames.PARECER_MEDICO,
      );
      expect(parecerEquipe).toBeUndefined();
      expect(emails).toHaveLength(1); // somente ASO_RELEASE
    });

    it('dispara PARECER_MEDICO para a equipe com link no caso DIGITALIZADA PENDENTE', async () => {
      mockSchedulingsCollection.findOne.mockResolvedValue(
        makeAptoScheduling({
          ASOINFO: {
            status: 'PENDENTE',
            url: signedUrl,
            professional: { codigo: '1698', nome: 'DRA. BEATRIZ' },
            observacoesParecer: ['obs'],
            parecerEquipePending: true,
            parecerEquipeEmailSent: false,
          } as any,
        }),
      );

      await service.applyAsoResultFromWorker({
        schedulingId,
        commandId: 'cmd-2',
        status: 'PENDENTE',
        url: signedUrl,
        signature: {
          provider: 'DIGITALIZADA',
          status: 'PENDENTE',
          requiresSignature: true,
        } as any,
      });

      const emails = mockAzureService.filaEnvioDeEmail.mock.calls.map(([e]) => e);
      const parecerEquipe = emails.find(
        (e) => e.templatename === TemplateNames.PARECER_MEDICO,
      );
      expect(parecerEquipe).toBeDefined();
      expect(parecerEquipe.data.asoInfo.asoFileUrl).toBe('https://sas/readonly/aso.pdf');
      expect(emails).toHaveLength(2); // ASO_RELEASE + PARECER
    });
  });
});