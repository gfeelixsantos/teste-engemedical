import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { StructuredLogger } from 'src/utils/logger';
import {
  MongoClient,
  Db,
  Collection,
  ServerApiVersion,
  ObjectId,
  ChangeStream,
} from 'mongodb';
import { formatInTimeZone } from 'date-fns-tz';

import { ConfigService } from '@nestjs/config';
import {
  AtendimentoStatus,
  AsoStatus,
  ExamStatus,
   MongoOperationTypes,
   ParecerMedico,
   ParecerTrabalhoAltura,
   ParecerEspaçoConfinado,
 } from './enum/scheduling.enum';
import type { WebsocketGateway } from 'src/websocket/websocket-connection';
import { mergeUnifiedAtendimentoAuthInfo } from 'src/atendimento-auth/atendimento-auth-normalizer';
import {
  AsoInfo,
  AtendimentoAuthInfo,
  DocumentSignatureInfo,
  DocumentType,
  ExamsScheduled,
  ExamUpdateDto,
  FilterParams,
  GedArquivoNode,
  GedDiaNode,
  GedEmpresaNode,
  GedPeriodoNode,
  GedProntuarioNode,
  MedicalOpinionData,
  MedicoCoordenadorSnapshot,
  PaginatedReportData,
  PendingDocument,
  ReportFilterParameters,
  SchedulingDocument,
} from './types/scheduling';
import { IUserInfo } from 'src/user/interfaces/user.interface';
import { getExamesList, ExamToogle } from 'src/exames/exames.provider';
import {
  hasPsychosocialFormData,
  shouldPersistConcludedPayloadForAuxiliaryExam,
  ensurePsicossocialConclusao,
} from './utils/psychosocial-form.util';
import { AzureService } from 'src/azure/azure.service';
import {
  CODIGOS_TIPO_SOCGED,
  EmailType,
  resultadosExamesQueue,
  TemplateNames,
  UploadSocged,
} from 'src/azure/types/azure.types';
import { buildAsoEnrichmentPayloadFromScheduling } from './aso/aso-enrichment-payload';
import {
  applyWorkerAsoToLocalDoc,
  buildWorkerAsoUpdate,
} from './aso/aso-worker-persistence';
import { FuncionarioEntity } from './model/FuncionarioEntity';
import { ExamRules } from '../core/ExamRules';
import { isSocOrigin } from '../core/atendimento-auth-rules';
import { RiscosConfigService } from '../riscos-config/riscos-config.service';
import { OrientacoesConfigService } from '../orientacoes-config/orientacoes-config.service';
import { EmpresaCacheService } from './empresa-cache.service';
import { UnitsService } from '../units/units.service';
import { MedicalOpinionRules } from '../core/MedicalOptionsRules';
import {
  calcularRangePipeline,
  collectExamBuffers,
  encontrarGrupoPorCodigo,
  getExamGroupAndItemByCodigo,
  mergePdfs,
  parseDDMMYYYYtoDateBR,
  standardizeFileName,
  formatDocumentFileName,
} from 'src/utils/util';
import {
  buildMissingExamFormMessage,
  hasMeaningfulExamFormData,
  shouldRequireMeaningfulExamForm,
} from 'src/core/exam-form.validation';
import { ActionRequestAtendimento } from 'src/websocket/interfaces/actions';
import {
  TicketActionType,
  TicketGroups,
  TicketStatus,
} from 'src/ticket/enum/ticket.enum';
import { Ticket } from 'src/ticket/interfaces/ticket';
import { PROJECTIONS } from './projections';
import { AsoProcessingMessage } from '../azure/types/azure.types';
import { mapStatusToPtBr } from 'src/worker/status.helper';
import { SignatureService } from 'src/signature/signature.service';
import { SocService } from 'src/soc/soc.service';
import {
  mapLegacyExamSignatureStatus as mapLegacyExamSignatureStatusContract,
  normalizeLegacyExamSignature as normalizeLegacyExamSignatureContract,
} from './utils/exam-signature.contract';
import {
  getExamDownstreamStateLabel,
  isExamReadyForDownstream,
} from './utils/exam-downstream-readiness.contract';
import { mapToLegacyAsoStatus } from './utils/legacy-aso-status.contract';
import {
  assertProfessionalIdentityAvailable,
  assertProfessionalMismatch,
  hasMinimumProfessionalIdentity,
  isAsoProfessionalIdentityBlockEnabled,
  isAuthUserMismatchBlockEnabled,
  isExamProfessionalIdentityBlockEnabled,
  requiresStrictProfessionalIdentityForGroup,
} from 'src/core/identity.validation';
import {
  hasProfessionalMismatch,
  resolveAsoFinishProfessionalIdentity,
  resolveProfessionalIdentity,
  snapshotToUserInfo,
} from 'src/core/professional-identity.resolver';
import { EmpresaDocument } from './types/empresa';
import { ExamFormSnapshotDocument } from './types/exam-form-snapshot';
import { EmpresaDocumento } from './types/empresa-documento';

// Lazy getter para evitar ReferenceError causado por import estático circular com SWC
const getWebsocketGateway = () => require('../websocket/websocket-connection').WebsocketGateway;

export type BacklogMaintenanceOptions = {
  beforeDate?: Date;
  dryRun?: boolean;
};

export type BacklogMaintenanceSummary = {
  beforeDate: string;
  dryRun: boolean;
  queriedSchedulings: number;
  updatedSchedulings: number;
  pendingExamRows: number;
  movedToAguardandoResultado: number;
  reissued: number;
  unchanged: number;
  asoReenqueued?: number;
};

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly BRAZIL_TIMEZONE = 'America/Sao_Paulo';
  // GED_START_DATE removido — explorador agora lista todo o histórico
  private readonly ACTIVE_TICKET_STATUSES = [
    TicketStatus.EM_CHAMADA,
    TicketStatus.EM_ATENDIMENTO,
  ] as const;

  private normalizeExamDataExameForPersistence(
    value: string | Date | null | undefined,
  ): string | Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? value : new Date(value);
    }

    const trimmedValue = String(value).trim();
    if (!trimmedValue) {
      return null;
    }

    const parsedBrDate = parseDDMMYYYYtoDateBR(trimmedValue);
    if (parsedBrDate && !Number.isNaN(parsedBrDate.getTime())) {
      return parsedBrDate;
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    return trimmedValue;
  }

  private resolveExamDataExameForPersistence(params: {
    incomingDataExame?: string | Date | null;
    existingDataExame?: string | Date | null;
    isEditing?: boolean;
  }): string | Date | null {
    const { incomingDataExame, existingDataExame, isEditing } = params;
    const hasIncomingDataExame =
      incomingDataExame !== undefined &&
      incomingDataExame !== null &&
      incomingDataExame !== '';

    const rawValue = hasIncomingDataExame
      ? incomingDataExame
      : isEditing
        ? (existingDataExame ?? null)
        : new Date();

    return this.normalizeExamDataExameForPersistence(rawValue);
  }

  /**
   * Responsabilidades principais:
   * - Gerenciar conexão, keep-alive e ChangeStream de agendamentos
   * - Expor consultas e relatórios (dashboard, filtros, CSV)
   * - Orquestrar regras de negócio de agendamentos/exames e integrações (Azure, WebSocket, SOCGED)
   */
  private client: MongoClient;
  public db: Db;
  public schedulingsCollection: Collection;
  public examFormSnapshotsCollection: Collection<ExamFormSnapshotDocument> | null =
    null;
  public empresasCollection: Collection<EmpresaDocument> | null = null;
  public empresaDocumentosCollection: Collection<EmpresaDocumento> | null = null;

  /** Promise que resolve assim que a conexão MongoDB estiver pronta. */
  private _readyResolve: () => void;
  private _readyReject: (err: unknown) => void;
  private readonly _readyPromise: Promise<void> = new Promise((resolve, reject) => {
    this._readyResolve = resolve;
    this._readyReject = reject;
  });

  /** Aguarda o MongoDB estar conectado e a coleção disponível. */
  public whenReady(): Promise<void> {
    return this._readyPromise;
  }

  private urlConnection: string;
  private dbName: string;
  private collectionName: string;

  // Métricas do ChangeStream
  private changeStreamMetrics = {
    eventsProcessed: 0,
    eventsFailed: 0,
    lastEventTime: Date.now(),
    averageLatency: 0,
    eventsPerMinute: 0,
  };

  // Controle de reconexão do stream
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private changeStreamActive = false;
  private isListening = false;
  private isRestarting = false;
  private changeStream: ChangeStream | null = null;
  private changeStreamToken: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly EMAIL_LINK_SAS_EXPIRATION_MINUTES = 5 * 24 * 60;
  /** Atualizado a cada evento real do ChangeStream */
  private lastChangeStreamEvent: number = Date.now();

  /** Documento sintético legado do heartbeat removido — ignorar eventos e apagar no startup */
  private readonly legacyHeartbeatId = new ObjectId(
    '000000000000000000000000',
  );

  // Cache para dashboard (30s TTL)
  private dashboardCache: { data: any; expires: number } | null = null;
  private readonly DASHBOARD_CACHE_TTL = 30000;

  // Cache para today (15s TTL)


  constructor(
    private readonly configService: ConfigService,
    private readonly azureService: AzureService,
    @Inject(forwardRef(getWebsocketGateway))
    private readonly webSocket: WebsocketGateway,
    @Inject(forwardRef(() => SignatureService))
    private readonly signatureService: SignatureService,
    @Inject(forwardRef(() => SocService))
    private readonly socService: SocService,
    @Inject(forwardRef(() => EmpresaCacheService))
    private readonly empresaCacheService: EmpresaCacheService,
    private readonly unitsService: UnitsService,
    private readonly orientacoesConfigService: OrientacoesConfigService,
    private readonly logger: StructuredLogger,
  ) {
    this.logger.setContext(MongoService.name);
    const MONGO_URL = this.configService.get<string>('MONGO_URL');
    const MONGO_DATABASE = this.configService.get<string>('MONGO_DATABASE');
    const MONGO_COLLECTION = this.configService.get<string>('MONGO_COLLECTION');

    this.urlConnection = MONGO_URL ?? 'Sem url mongo em arquivo .env';
    this.dbName = MONGO_DATABASE ?? 'Sem database mongo em .env';
    this.collectionName = MONGO_COLLECTION ?? 'Sem collection mongo em .env';
  }

  async onModuleInit() {
    await this.initializeMongo();
  }

  private async initializeMongo() {
    try {
      this.client = new MongoClient(this.urlConnection, {
        serverApi: ServerApiVersion.v1,
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 60000,
        socketTimeoutMS: 120000,
        connectTimeoutMS: 10000,
        readPreference: 'primary',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
      });

      await this.client.connect();

      this.db = this.client.db(this.dbName);
      this.schedulingsCollection = this.db.collection(this.collectionName);
      this.examFormSnapshotsCollection =
        this.db.collection<ExamFormSnapshotDocument>('exam_form_snapshots');
      this.empresasCollection = this.db.collection<EmpresaDocument>('empresas');
      this.empresaDocumentosCollection = this.db.collection<EmpresaDocumento>('empresa_documentos');

      this.empresasCollection.dropIndex('idx_empresas_codigo_unique')
        .catch(() => {})
        .finally(() => {
          this.empresasCollection
            .createIndex({ CODIGO: 1 }, { name: 'idx_empresas_codigo_unique', unique: true })
            .catch((error) =>
              this.logger.warn(`[EMPRESAS][INDEX] Falha ao criar indice unico CODIGO: ${error.message}`)
            );
        });

      this.empresasCollection.dropIndex('idx_empresas_cnpj_unique')
        .catch(() => {})
        .finally(() => {
          this.empresasCollection
            .createIndex({ CNPJ: 1 }, { name: 'idx_empresas_cnpj_unique', unique: true, sparse: true })
            .catch((error) =>
              this.logger.warn(`[EMPRESAS][INDEX] Falha ao criar indice unico CNPJ: ${error.message}`)
            );
        });
      this.examFormSnapshotsCollection
        .createIndex({ schedulingId: 1, createdAt: -1 })
        .catch((error) =>
          this.logger.warn(
            `[EXAM_FORM_SNAPSHOT][INDEX] Falha ao criar indice: ${error instanceof Error ? error.message : String(error)
            }`,
          ),
        );

      this.db.collection('biometrias')
        .createIndex({ funcionarioId: 1, dedo: 1, status: 1 }, { name: 'idx_biometrias_func_dedo_status' })
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS][INDEX] Falha ao criar indice: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('biometrias')
        .createIndex(
          { cpfHash: 1, dataNascimentoHash: 1, dedo: 1, status: 1 },
          { name: 'idx_biometrias_identity_dedo_status' }
        )
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS][INDEX] Falha ao criar indice identity: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('biometrias')
        .createIndex(
          { cpfHash: 1, dataNascimentoHash: 1, dedo: 1, status: 1 },
          {
            name: 'idx_biometrias_identity_unique',
            unique: true,
            partialFilterExpression: { status: 'ATIVO' },
          }
        )
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS][INDEX] Falha ao criar indice unico parcial: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('biometrias')
        .createIndex(
          { 'funcionarioRefs.funcionarioId': 1 },
          { name: 'idx_biometrias_funcionario_refs' }
        )
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS][INDEX] Falha ao criar indice refs: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('biometrias_audit')
        .createIndex({ tipo: 1, funcionarioId: 1, criadoEm: -1 }, { name: 'idx_biometrias_audit' })
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS_AUDIT][INDEX] Falha ao criar indice: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('biometrias_audit')
        .createIndex({ cpfHash: 1, criadoEm: -1 }, { name: 'idx_biometrias_audit_cpfHash' })
        .catch((error) =>
          this.logger.warn(`[BIOMETRIAS_AUDIT][INDEX] Falha ao criar indice cpfHash: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('deletion_snapshots')
        .createIndex({ snapshotId: 1 }, { name: 'idx_deletion_snapshots_snapshotId', unique: true })
        .catch((error) =>
          this.logger.warn(`[DELETION_SNAPSHOTS][INDEX] Falha ao criar indice snapshotId: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.db.collection('deletion_snapshots')
        .createIndex({ requestId: 1, criadoEm: -1 }, { name: 'idx_deletion_snapshots_requestId' })
        .catch((error) =>
          this.logger.warn(`[DELETION_SNAPSHOTS][INDEX] Falha ao criar indice requestId: ${error instanceof Error ? error.message : String(error)}`)
        );

      this.schedulingsCollection
        .createIndex({
          DATAAGENDAMENTO: 1,
          UNIDADEATENDIMENTO: 1,
          ATENDIMENTOSTATUS: 1,
        }, {
          name: 'idx_schedulings_day_unit_status',
        })
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice composto: ${error instanceof Error ? error.message : String(error)
            }`,
          ),
        );

      // Índice para cobrir sort por NOME no getSchedulingsToday
      this.schedulingsCollection
        .createIndex({
          DATAAGENDAMENTO: 1,
          NOME: 1,
          UNIDADEATENDIMENTO: 1,
        }, {
          name: 'idx_schedulings_day_name_unit',
        })
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice day_name_unit: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

      this.schedulingsCollection
        .createIndex(
          {
            DATAAGENDAMENTO: 1,
            UNIDADEATENDIMENTO: 1,
            NOME: 1,
          },
          {
            name: 'idx_schedulings_day_unit_name',
          },
        )
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice day_unit_name: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

      // Índice para filtros por status + data (reports, dashboard)
      this.schedulingsCollection
        .createIndex({
          ATENDIMENTOSTATUS: 1,
          DATAAGENDAMENTO_DATE: -1,
        }, {
          name: 'idx_schedulings_status_date',
        })
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice status_date: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

      // Índices adicionais para otimização do módulo GED
      this.schedulingsCollection
        .createIndex({
          CODIGOEMPRESA: 1,
          DATAAGENDAMENTO_DATE: -1,
        }, {
          name: 'idx_schedulings_ged_empresa_date',
        })
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice ged_empresa_date: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

      this.schedulingsCollection
        .createIndex({
          CODIGOEMPRESA: 1,
          CODIGOPRONTUARIO: 1,
          DATAAGENDAMENTO_DATE: -1,
        }, {
          name: 'idx_schedulings_ged_prontuario_date',
        })
        .catch((error) =>
          this.logger.warn(
            `[SCHEDULINGS][INDEX] Falha ao criar indice ged_prontuario_date: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

      try {
        const deleted = await this.schedulingsCollection.deleteOne({
          _id: this.legacyHeartbeatId,
        });
        if (deleted.deletedCount > 0) {
          this.logger.log(
            '[MONGO] Documento legado de heartbeat removido da collection de agendamentos.',
          );
        }
      } catch (error) {
        this.logger.warn(
          `[MONGO] Falha ao remover documento legado de heartbeat: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Inicia listeners do banco
      this.listenForSchedulingChanges();
      this.listenForMuralChanges();

      void this.reconcileInconsistentActiveTickets('startup').catch((error) =>
        this.logger.error(
          '[MONGO][STARTUP_RECONCILE] Erro ao reconciliar tickets ativos no startup:',
          error,
        ),
      );

      this.logger.log('✅ MongoService inicializado com sucesso.');
      this._readyResolve();
    } catch (error) {
      this.logger.error('❌ Erro ao conectar no MongoDB:', error);
      this._readyReject(error);
    }
  }

  private ensureInitialized(method: string): void {
    if (!this.schedulingsCollection) {
      throw new Error(
        `MongoService não inicializado em ${method}: conexão com MongoDB falhou.`,
      );
    }
  }

  async getSchedulingById(id: string): Promise<any | null> {
    try {
      const query = { _id: id.length === 24 ? new ObjectId(id) : id };
      return await this.schedulingsCollection.findOne(query as any);
    } catch (err) {
      return null;
    }
  }

  async findEmpresaByCode(codigo: string): Promise<EmpresaDocument | null> {
    if (!this.empresasCollection) return null;
    try {
      return await this.empresasCollection.findOne({ CODIGO: codigo });
    } catch (err) {
      this.logger.error(`Erro ao buscar empresa por código ${codigo}:`, err);
      return null;
    }
  }

  async upsertEmpresa(empresa: Partial<EmpresaDocument>): Promise<any> {
    const cod = empresa.CODIGO;
    if (!this.empresasCollection || !cod) return null;
    try {
      const updateData = { ...empresa };
      delete updateData._id;
      delete (updateData as any).CRIADOEM;
      updateData.CODIGO = cod;

      if (!updateData.CNPJ || String(updateData.CNPJ).trim() === '') {
        delete updateData.CNPJ;
      } else {
        updateData.CNPJ = String(updateData.CNPJ).trim();
      }

      return await this.empresasCollection.updateOne(
        { CODIGO: cod },
        { 
          $set: { ...updateData, ATUALIZADOEM: new Date() },
          $setOnInsert: { CRIADOEM: new Date() }
        },
        { upsert: true }
      );
    } catch (err) {
      this.logger.error(`Erro ao fazer upsert na empresa ${cod}:`, err);
      throw err;
    }
  }

  async findAllEmpresas(): Promise<EmpresaDocument[]> {
    if (!this.empresasCollection) return [];
    try {
      return await this.empresasCollection.find({}).toArray();
    } catch (err) {
      this.logger.error('Erro ao listar todas as empresas:', err);
      return [];
    }
  }

  async saveDeletionSnapshot(snapshot: Record<string, unknown>): Promise<void> {
    await this.db.collection('deletion_snapshots').insertOne(snapshot);
  }

  private mapLegacyExamSignatureStatus(
    status?: string,
  ): DocumentSignatureInfo['status'] {
    return mapLegacyExamSignatureStatusContract(status);
  }

  private normalizeLegacyExamSignature(
    legacySignatureInfo: any,
    url?: string,
  ): DocumentSignatureInfo | undefined {
    return normalizeLegacyExamSignatureContract(legacySignatureInfo, url);
  }

  async onModuleDestroy() {
    this.changeStreamActive = false;
    this.isListening = false;
    this.isRestarting = false;

    if (this.changeStream) {
      try {
        await this.changeStream.close();
      } catch (error) {
        this.logger.warn('Erro ao fechar ChangeStream:', error);
      }
    }

    await this.client?.close();
    this.logger.log('🔒 Conexão com MongoDB finalizada.');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ======================== FUNÇÕES OTIMIZADAS COM ÍNDICES ======================== //
  async getDashboardStats() {
    this.ensureInitialized('getDashboardStats');

    if (this.dashboardCache && this.dashboardCache.expires > Date.now()) {
      return this.dashboardCache.data;
    }

    const hojeBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());

    const statusPermitidos = [
      AtendimentoStatus.AGENDADO,
      AtendimentoStatus.EM_ATENDIMENTO,
      AtendimentoStatus.AGUARDANDO_RESULTADOS,
      AtendimentoStatus.AVALIACAO_MEDICA,
    ];
    const dataInicio = new Date('2025-08-01T00:00:00.000Z');

    const pipeline = [
      {
        $match: {
          ATENDIMENTOSTATUS: { $in: statusPermitidos },
          DATAAGENDAMENTO_DATE: {
            $gte: dataInicio,
          },
        },
      },
      {
        $group: {
          _id: {
            status: '$ATENDIMENTOSTATUS',
            tipoExame: '$TIPOEXAME',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          totalGeral: { $sum: '$count' },
          agendados: {
            $sum: {
              $cond: [
                { $eq: ['$_id.status', AtendimentoStatus.AGENDADO] },
                '$count',
                0,
              ],
            },
          },
          atendimento: {
            $sum: {
              $cond: [
                { $eq: ['$_id.status', AtendimentoStatus.EM_ATENDIMENTO] },
                '$count',
                0,
              ],
            },
          },
          aguardandoResultados: {
            $sum: {
              $cond: [
                {
                  $eq: ['$_id.status', AtendimentoStatus.AGUARDANDO_RESULTADOS],
                },
                '$count',
                0,
              ],
            },
          },
          aguardandoAvaliacaoMedica: {
            $sum: {
              $cond: [
                {
                  $eq: ['$_id.status', AtendimentoStatus.AVALIACAO_MEDICA],
                },
                '$count',
                0,
              ],
            },
          },
          totalAdmissionais: {
            $sum: { $cond: [{ $eq: ['$_id.tipoExame', '1'] }, '$count', 0] },
          },
          totalPeriodicos: {
            $sum: { $cond: [{ $eq: ['$_id.tipoExame', '2'] }, '$count', 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalGeral: 1,
          agendados: 1,
          atendimento: 1,
          aguardandoResultados: 1,
          aguardandoAvaliacaoMedica: 1,
          totalAdmissionais: 1,
          totalPeriodicos: 1,
        },
      },
    ];

    const statsResult = await this.schedulingsCollection
      .aggregate(pipeline)
      .toArray();

    const result = statsResult.length > 0 ? statsResult[0] : {};

    this.dashboardCache = {
      data: result,
      expires: Date.now() + this.DASHBOARD_CACHE_TTL,
    };

    return result;
  }

  private resolveGedBlobPath(urlOrPath?: string | null): string {
    const raw = String(urlOrPath || '').trim();

    if (!raw) {
      return '';
    }

    if (raw.includes('/documents/')) {
      const [, blobPath = ''] = raw.split('/documents/');

      return decodeURIComponent(blobPath.split('?')[0] || '').trim();
    }

    return decodeURIComponent(raw.split('?')[0] || '').trim();
  }

  private extractGedFileName(blobPath: string, fallback?: string): string {
    const fileName = String(blobPath.split('/').pop() || '').trim();

    return fileName || String(fallback || '').trim();
  }

  private buildGedFileCountExpression() {
    return {
      $add: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$EXAMES', []] },
              as: 'exam',
              cond: {
                $ne: [
                  {
                    $trim: {
                      input: { $ifNull: ['$$exam.url', ''] },
                    },
                  },
                  '',
                ],
              },
            },
          },
        },
        {
          $size: {
            $filter: {
              input: { $ifNull: ['$ANEXOS', []] },
              as: 'anexo',
              cond: {
                $ne: [
                  {
                    $trim: {
                      input: { $ifNull: ['$$anexo.StoragePath', ''] },
                    },
                  },
                  '',
                ],
              },
            },
          },
        },
        {
          $cond: [
            {
              $ne: [
                {
                  $trim: {
                    input: { $ifNull: ['$ASOINFO.url', ''] },
                  },
                },
                '',
              ],
            },
            1,
            0,
          ],
        },
      ],
    };
  }

  private buildGedMonthRange(ano: string, mes: string) {
    const start = new Date(`${ano}-${mes}-01T00:00:00.000Z`);
    const end = new Date(start);

    end.setUTCMonth(end.getUTCMonth() + 1);

    return { start, end };
  }

  async listGedEmpresas(): Promise<GedEmpresaNode[]> {
    this.ensureInitialized('listGedEmpresas');

    const pipeline = [
      {
        $match: {
          CODIGOEMPRESA: { $exists: true, $ne: '' },
        },
      },
      {
        $addFields: {
          gedFileCount: this.buildGedFileCountExpression(),
        },
      },
      {
        $group: {
          _id: '$CODIGOEMPRESA',
          nomeEmpresa: { $first: '$NOMEEMPRESA' },
          prontuarios: { $addToSet: '$CODIGOPRONTUARIO' },
          totalArquivos: { $sum: '$gedFileCount' },
        },
      },
      {
        $project: {
          _id: 0,
          codigoEmpresa: '$_id',
          nomeEmpresa: {
            $ifNull: ['$nomeEmpresa', '$_id'],
          },
          totalProntuarios: { $size: '$prontuarios' },
          totalArquivos: 1,
        },
      },
      {
        $sort: {
          nomeEmpresa: 1,
        },
      },
    ];

    return this.schedulingsCollection
      .aggregate<GedEmpresaNode>(pipeline)
      .toArray();
  }

  async listGedPeriodos(codigoEmpresa: string): Promise<GedPeriodoNode[]> {
    this.ensureInitialized('listGedPeriodos');

    const pipeline = [
      {
        $match: {
          CODIGOEMPRESA: codigoEmpresa,
        },
      },
      {
        $addFields: {
          gedFileCount: this.buildGedFileCountExpression(),
          gedAno: {
            $dateToString: { format: '%Y', date: '$DATAAGENDAMENTO_DATE' },
          },
          gedMes: {
            $dateToString: { format: '%m', date: '$DATAAGENDAMENTO_DATE' },
          },
        },
      },
      {
        $group: {
          _id: {
            ano: '$gedAno',
            mes: '$gedMes',
          },
          prontuarios: { $addToSet: '$CODIGOPRONTUARIO' },
          totalArquivos: { $sum: '$gedFileCount' },
        },
      },
      {
        $project: {
          _id: 0,
          ano: '$_id.ano',
          mes: '$_id.mes',
          totalProntuarios: { $size: '$prontuarios' },
          totalArquivos: 1,
        },
      },
      {
        $sort: {
          ano: -1,
          mes: -1,
        },
      },
    ];

    return this.schedulingsCollection
      .aggregate<GedPeriodoNode>(pipeline)
      .toArray();
  }

  async listGedDias(params: {
    codigoEmpresa: string;
    ano: string;
    mes: string;
  }): Promise<GedDiaNode[]> {
    this.ensureInitialized('listGedDias');

    const { codigoEmpresa, ano, mes } = params;
    const monthRange = this.buildGedMonthRange(ano, mes);

    const pipeline = [
      {
        $match: {
          CODIGOEMPRESA: codigoEmpresa,
          DATAAGENDAMENTO_DATE: {
            $gte: monthRange.start,
            $lt: monthRange.end,
          },
        },
      },
      {
        $addFields: {
          gedFileCount: this.buildGedFileCountExpression(),
          gedDia: {
            $dateToString: { format: '%d', date: '$DATAAGENDAMENTO_DATE' },
          },
        },
      },
      {
        $group: {
          _id: '$gedDia',
          prontuarios: { $addToSet: '$CODIGOPRONTUARIO' },
          totalArquivos: { $sum: '$gedFileCount' },
        },
      },
      {
        $project: {
          _id: 0,
          dia: '$_id',
          totalProntuarios: { $size: '$prontuarios' },
          totalArquivos: 1,
        },
      },
      {
        $sort: {
          dia: -1,
        },
      },
    ];

    return this.schedulingsCollection
      .aggregate<GedDiaNode>(pipeline)
      .toArray();
  }

  async listGedProntuarios(params: {
    codigoEmpresa: string;
    ano: string;
    mes: string;
    dia?: string;
  }): Promise<GedProntuarioNode[]> {
    this.ensureInitialized('listGedProntuarios');

    const { codigoEmpresa, ano, mes, dia } = params;
    const monthRange = this.buildGedMonthRange(ano, mes);
    const dateFilter = dia
      ? {
          $gte: new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`),
          $lt: new Date(`${ano}-${mes}-${dia}T23:59:59.999Z`),
        }
      : {
          $gte: monthRange.start,
          $lt: monthRange.end,
        };

    const pipeline = [
      {
        $match: {
          CODIGOEMPRESA: codigoEmpresa,
          DATAAGENDAMENTO_DATE: dateFilter,
        },
      },
      {
        $addFields: {
          gedFileCount: this.buildGedFileCountExpression(),
        },
      },
      {
        $group: {
          _id: '$CODIGOPRONTUARIO',
          nomeFuncionario: { $first: '$NOME' },
          tipoExame: { $first: '$TIPOEXAMENOME' },
          dataAgendamento: { $first: '$DATAAGENDAMENTO' },
          dataAgendamentoDate: { $first: '$DATAAGENDAMENTO_DATE' },
          totalArquivos: { $sum: '$gedFileCount' },
        },
      },
      {
        $project: {
          _id: 0,
          codigoProntuario: '$_id',
          nomeFuncionario: 1,
          tipoExame: 1,
          dataAgendamento: 1,
          dataAgendamentoDate: 1,
          totalArquivos: 1,
        },
      },
      {
        $sort: {
          dataAgendamentoDate: -1,
          nomeFuncionario: 1,
        },
      },
    ];

    const result = await this.schedulingsCollection
      .aggregate<
        GedProntuarioNode & {
          dataAgendamentoDate?: Date;
        }
      >(pipeline)
      .toArray();

    return result.map(({ dataAgendamentoDate: _ignored, ...item }) => item);
  }

  async listGedBatchProntuarios(params: {
    codigoEmpresa: string;
    periodo?: {
      ano?: string;
      mes?: string;
    };
  }): Promise<{ codigoProntuario: string; nome: string; dataAgendamento?: string; tipoExame?: string }[]> {
    this.ensureInitialized('listGedBatchProntuarios');

    if (params.periodo?.ano && params.periodo?.mes) {
      const prontuarios = await this.listGedProntuarios({
        codigoEmpresa: params.codigoEmpresa,
        ano: params.periodo.ano,
        mes: params.periodo.mes,
      });

      return prontuarios.map((item) => ({
        codigoProntuario: item.codigoProntuario,
        nome: item.nomeFuncionario,
        dataAgendamento: item.dataAgendamento,
        tipoExame: item.tipoExame,
      }));
    }

    const pipeline = [
      {
        $match: {
          CODIGOEMPRESA: params.codigoEmpresa,
        },
      },
      {
        $addFields: {
          gedFileCount: this.buildGedFileCountExpression(),
        },
      },
      {
        $sort: {
          DATAAGENDAMENTO_DATE: -1,
          _id: -1,
        },
      },
      {
        $group: {
          _id: '$CODIGOPRONTUARIO',
          nomeFuncionario: { $first: '$NOME' },
          tipoExame: { $first: '$TIPOEXAMENOME' },
          dataAgendamento: { $first: '$DATAAGENDAMENTO' },
          totalArquivos: { $sum: '$gedFileCount' },
        },
      },
      {
        $project: {
          _id: 0,
          codigoProntuario: '$_id',
          nome: {
            $ifNull: ['$nomeFuncionario', '$_id'],
          },
          tipoExame: 1,
          dataAgendamento: 1,
          totalArquivos: 1,
        },
      },
      {
        $sort: {
          nome: 1,
        },
      },
    ];

    return this.schedulingsCollection
      .aggregate<{
        codigoProntuario: string;
        nome: string;
        tipoExame?: string;
        dataAgendamento?: string;
        totalArquivos: number;
      }>(pipeline)
      .toArray()
      .then((items) =>
        items.map(({ codigoProntuario, nome, tipoExame, dataAgendamento }) => ({
          codigoProntuario,
          nome,
          tipoExame,
          dataAgendamento,
        })),
      );
  }

  async listGedArquivos(params: {
    codigoEmpresa: string;
    ano: string;
    mes: string;
    codigoProntuario: string;
  }): Promise<GedArquivoNode[]> {
    this.ensureInitialized('listGedArquivos');

    const { codigoEmpresa, ano, mes, codigoProntuario } = params;

    // Busca scheduling apenas para metadados (nome, tipoExame, data)
    const scheduling = await this.schedulingsCollection.findOne(
      { CODIGOPRONTUARIO: codigoProntuario } as any,
      {
        projection: {
          NOME: 1,
          TIPOEXAMENOME: 1,
          DATAAGENDAMENTO: 1,
        },
      } as any,
    );

    const nomeFuncionario = String(scheduling?.NOME || '').trim();
    const tipoExame = String(scheduling?.TIPOEXAMENOME || '').trim();
    const dataAgendamento = String(scheduling?.DATAAGENDAMENTO || '').trim();

    // Lista blobs do container documents por prefixo
    // Path canônico: {fileType}/{ano}/{mes}/{codEmpresa}/{codigoProntuario}/{fileName}
    const container = this.azureService.getDocumentsContainerClient();
    const prefixos = [
      `aso/${ano}/${mes}/${codigoEmpresa}/${codigoProntuario}/`,
      `exames/${ano}/${mes}/${codigoEmpresa}/${codigoProntuario}/`,
      `anexos/${ano}/${mes}/${codigoEmpresa}/${codigoProntuario}/`,
    ];

    const files = new Map<string, GedArquivoNode>();

    for (const prefix of prefixos) {
      const blobs = await this.azureService.listBlobsByPrefix(prefix, container);

      for (const blob of blobs) {
        if (files.has(blob.name)) continue;

        const fileName = blob.name.split('/').pop() || '';
        if (!fileName) continue;

        const origem = blob.name.startsWith('aso/') ? 'aso'
          : blob.name.startsWith('exames/') ? 'exame'
          : blob.name.startsWith('anexos/') ? 'anexo'
          : 'exame';

        files.set(blob.name, {
          blobName: blob.name,
          fileName,
          nomeFuncionario,
          tipoExame: tipoExame || undefined,
          dataAgendamento: dataAgendamento || undefined,
          origem,
        });
      }
    }

    return Array.from(files.values()).sort((a, b) =>
      a.fileName.localeCompare(b.fileName, 'pt-BR', {
        sensitivity: 'base',
      }),
    );
  }

  async getRecordParams() {
    const doctorsPipeline = [
      { $unwind: '$EXAMES' },
      { $match: { 'EXAMES.grupo': 'Exame Clínico' } },
      { $group: { _id: '$EXAMES.profissional' } },
      { $match: { _id: { $ne: null } } },
      { $match: { _id: { $ne: '' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id' } },
    ];

    const companiesPipeline = [
      { $group: { _id: '$NOMEEMPRESA' } },
      { $match: { _id: { $ne: null } } },
      { $match: { _id: { $ne: '' } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, name: '$_id' } },
    ];

    const [doctorsResult, companiesResult] = await Promise.all([
      this.schedulingsCollection.aggregate(doctorsPipeline).toArray(),
      this.schedulingsCollection.aggregate(companiesPipeline).toArray(),
    ]);

    const statusOptions = Object.keys(AtendimentoStatus).map((key) => ({
      name: key.replace(/_/g, ' ').toUpperCase(),
      code: AtendimentoStatus[key],
    }));

    return {
      medicos: doctorsResult,
      empresas: companiesResult,
      status: statusOptions,
    };
  }

  async findSchedulingsWithFilters(
    status: string,
    page: number,
    limit: number,
    empresasFiltro?: string,
    medicosFiltro?: string,
  ) {
    const matchQuery: any = {};
    let medicosArray: string[] = [];

    if (status) matchQuery.ATENDIMENTOSTATUS = status;

    if (empresasFiltro) {
      const empresasArray = empresasFiltro
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);
      if (empresasArray.length > 0)
        matchQuery.NOMEEMPRESA = { $in: empresasArray };
    }

    if (medicosFiltro) {
      medicosArray = medicosFiltro
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m);
    }

    const basePipeline: any[] = [];
    basePipeline.push({ $match: matchQuery });

    if (medicosArray.length > 0) {
      basePipeline.push({
        $match: {
          EXAMES: {
            $elemMatch: {
              grupo: 'Exame Clínico',
              profissional: { $in: medicosArray },
            },
          },
        },
      });
      basePipeline.push({
        $group: { _id: '$_id', originalDoc: { $first: '$$ROOT' } },
      });
      basePipeline.push({ $replaceRoot: { newRoot: '$originalDoc' } });
    }

    const collation = { locale: 'pt', strength: 1 };

    const countPipeline = [...basePipeline];
    countPipeline.push({ $count: 'totalRecords' });

    const countResult = await this.schedulingsCollection
      .aggregate(countPipeline)
      .toArray();
    const totalRecords =
      countResult.length > 0 ? countResult[0].totalRecords : 0;

    if (totalRecords === 0) {
      return {
        data: [],
        total: 0,
        manha: 0,
        tarde: 0,
        indefinido: 0,
        page: page,
        limit: limit,
        totalPages: 0,
      };
    }

    // ===================================================
    // PASSO 3: Calcular PERÍODO (MANHÃ/TARDE)
    // ===================================================
    const periodPipeline = [...basePipeline];
    periodPipeline.push({
      $group: {
        _id: null,
        totalManha: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$HORARIO', '06:00:00'] },
                  { $lt: ['$HORARIO', '12:00:00'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalTarde: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ['$HORARIO', '12:00:00'] },
                  { $lt: ['$HORARIO', '18:00:00'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalSemHorario: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$HORARIO', ''] },
                  { $eq: ['$HORARIO', null] },
                  { $not: ['$HORARIO'] },
                  { $lt: ['$HORARIO', '06:00:00'] },
                  { $gte: ['$HORARIO', '18:00:00'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    });

    const [periodResult] = await this.schedulingsCollection
      .aggregate(periodPipeline, { collation }) // Aplicado aqui
      .toArray();

    const totalManha = periodResult?.totalManha ?? 0;
    const totalTarde = periodResult?.totalTarde ?? 0;
    const totalSemHorario = periodResult?.totalSemHorario ?? 0;

    // ===================================================
    // PASSO 4: Buscar dados PAGINADOS
    // ===================================================
    const dataPipeline = [...basePipeline];
    dataPipeline.push({ $project: PROJECTIONS.SCHEDULINGS_WITH_FILTERS });
    dataPipeline.push({ $sort: { NOME: 1, DATAAGENDAMENTO_DATE: -1 } });

    const skip = (page - 1) * limit;
    dataPipeline.push({ $skip: skip });
    dataPipeline.push({ $limit: limit });

    const atendimentos = await this.schedulingsCollection
      .aggregate(dataPipeline, { collation }) // O SEGREDO ESTÁ AQUI
      .toArray();

    // ===================================================
    // PASSO 5: Retornar resultado
    // ===================================================
    return {
      data: atendimentos,
      total: totalRecords,
      manha: totalManha,
      tarde: totalTarde,
      indefinido: totalSemHorario,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalRecords / limit),
    };
  }

  async getReportDataForCsv(filters: FilterParams): Promise<any[]> {
    const {
      dataInicio,
      dataFim,
      empresa,
      grupoExame,
      tipoExame,
      status,
      search,
      profissional,
      sala,
      unidadeAtendimento,
      atendente,
    } = filters;

    const basePipeline: any[] = [];
    const matchQuery: any = {};

    const processFilter = (value?: string): string[] =>
      value
        ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
        : [];

    // ----------------------------
    // Filtros principais
    // ----------------------------
    if (dataInicio && dataFim) {
      // Offset UTC-3 (Brasília): os documentos são salvos com new Date() em UTC,
      // correspondendo à meia-noite de Brasília = 03:00 UTC.
      const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;
      const start = new Date(new Date(dataInicio).getTime() + BRAZIL_OFFSET_MS);
      const end = new Date(new Date(dataFim).getTime() + BRAZIL_OFFSET_MS);
      end.setUTCDate(end.getUTCDate() + 1);

      matchQuery.DATAAGENDAMENTO_DATE = {
        $gte: start,
        $lt: end,
      };
    }

    this.applyNameSearchFilter(matchQuery, search);

    const statusArray = processFilter(status);
    if (statusArray.length) matchQuery.ATENDIMENTOSTATUS = { $in: statusArray };

    const empresaArray = processFilter(empresa);
    if (empresaArray.length) matchQuery.NOMEEMPRESA = { $in: empresaArray };

    const tipoExameArray = processFilter(tipoExame);
    if (tipoExameArray.length)
      matchQuery.TIPOEXAMENOME = { $in: tipoExameArray };

    const unidadeArray = processFilter(unidadeAtendimento);
    if (unidadeArray.length)
      matchQuery.UNIDADEATENDIMENTO = { $in: unidadeArray };

    const atendenteArray = processFilter(atendente);
    if (atendenteArray.length)
      matchQuery['TICKET.atendente'] = { $in: atendenteArray };

    if (Object.keys(matchQuery).length) {
      basePipeline.push({ $match: matchQuery });
    }

    // ----------------------------
    // Filtros dentro de EXAMES
    // ----------------------------
    const nestedMatch: any = {};
    const profissionalArray = processFilter(profissional);
    const salaArray = processFilter(sala);
    const grupoExameArray = processFilter(grupoExame);

    if (profissionalArray.length)
      nestedMatch.profissional = { $in: profissionalArray };
    if (salaArray.length) nestedMatch.sala = { $in: salaArray };
    if (grupoExameArray.length) nestedMatch.grupo = { $in: grupoExameArray };

    if (Object.keys(nestedMatch).length) {
      basePipeline.push({
        $match: {
          EXAMES: { $elemMatch: nestedMatch },
        },
      });
    }

    // ----------------------------
    // Ordenação - projeção removida para geração de relatório
    // ----------------------------
    basePipeline.push(
      // { $project: PROJECTIONS.GET_REPORT_DATA },
      { $sort: { NOME: 1, DATAAGENDAMENTO_DATE: -1 } },
    );

    // ----------------------------
    // Proteção contra export massivo
    // ----------------------------
    const MAX_EXPORT = 10000;
    basePipeline.push({ $limit: MAX_EXPORT });

    return this.schedulingsCollection
      .aggregate(basePipeline, { allowDiskUse: true })
      .toArray();
  }

  async getReportFilterParameters(): Promise<ReportFilterParameters> {
    this.ensureInitialized('getReportFilterParameters');

    const clean = (values: unknown[]) =>
      values
        .map((value) => String(value || '').trim())
        .filter((value) => Boolean(value))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const [
      empresas,
      status,
      tiposExame,
      unidadesAtendimento,
      grupos,
      salas,
      profissionais,
      atendentes,
    ] = await Promise.all([
      this.schedulingsCollection.distinct('NOMEEMPRESA', {}),
      this.schedulingsCollection.distinct('ATENDIMENTOSTATUS', {}),
      this.schedulingsCollection.distinct('TIPOEXAMENOME', {}),
      this.schedulingsCollection.distinct('UNIDADEATENDIMENTO', {}),
      this.schedulingsCollection.distinct('EXAMES.grupo', {}),
      this.schedulingsCollection.distinct('EXAMES.sala', {}),
      this.schedulingsCollection.distinct('MEDICO', {}),
      this.schedulingsCollection.distinct('TICKET.atendente', {}),
    ]);

    const toOptionList = (values: unknown[]) =>
      clean(values).map((name) => ({ code: name, name }));

    return {
      empresas: toOptionList(empresas),
      status: toOptionList(status),
      tiposExame: toOptionList(tiposExame),
      unidadesAtendimento: toOptionList(unidadesAtendimento),
      grupo: toOptionList(grupos),
      salas: toOptionList(salas),
      profissionais: toOptionList(profissionais),
      atendentes: toOptionList(atendentes),
    };
  }

  async getReportData(filters: FilterParams): Promise<PaginatedReportData> {
    this.ensureInitialized('getReportData');

    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.max(Number(filters.limit) || 50, 1);
    const allData = await this.getReportDataForCsv({
      ...filters,
      page: 1,
      limit: 10000,
    });

    const countByHorario = (predicate: (horario: string) => boolean) =>
      allData.filter((item) => predicate(String(item.HORARIO || ''))).length;

    const total = allData.length;
    const manha = countByHorario(
      (horario) => horario >= '06:00:00' && horario < '12:00:00',
    );
    const tarde = countByHorario(
      (horario) => horario >= '12:00:00' && horario < '18:00:00',
    );
    const indefinido = total - manha - tarde;

    const start = (page - 1) * limit;
    const data = allData.slice(start, start + limit);

    return {
      data,
      total,
      manha,
      tarde,
      indefinido,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getAllSchedulings() {
    this.ensureInitialized('getAllSchedulings');

    return this.schedulingsCollection
      .find({}, { projection: PROJECTIONS.SCHEDULINGS_WITH_FILTERS })
      .sort({ DATAAGENDAMENTO_DATE: -1, NOME: 1 })
      .toArray();
  }

  public isReady(): boolean {
    return !!this.schedulingsCollection;
  }

  async getSchedulingForModal(id: string): Promise<SchedulingDocument> {
    if (!this.isReady()) {
      throw new Error(
        'MongoService não inicializado (schedulingsCollection indefinida).',
      );
    }
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'ID de agendamento inválido.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const scheduling =
      await this.schedulingsCollection.findOne<SchedulingDocument>(
        { _id: objectId },
        { projection: PROJECTIONS.MODAL_PROJECTION },
      );

    if (!scheduling) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Agendamento com ID ${id} não encontrado.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    scheduling.EXAMES = (scheduling.EXAMES || []).map((exame: any) => {
      if (exame?.signature || !exame?.signatureInfo) {
        return exame;
      }

      return {
        ...exame,
        signature: this.normalizeLegacyExamSignature(
          exame.signatureInfo,
          exame.url,
        ),
      };
    });

    return scheduling;
  }

  async createUrlViewFullMedicalRecord(id: string, includeAttachments = false) {
    const doc = await this.schedulingsCollection.findOne<SchedulingDocument>({
      _id: new ObjectId(id),
    });

    if (!doc) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'Funcionário não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const examesComUrl = (doc.EXAMES || []).filter(
      (e) => typeof e.url === 'string' && e.url.trim() !== '',
    ).length;
    this.logger.log(
      `[PRONTUARIO_DEBUG] schedulingId=${id} ATENDIMENTOSTATUS=${doc.ATENDIMENTOSTATUS} totalExames=${(doc.EXAMES || []).length} examesComUrl=${examesComUrl} includeAttachments=${includeAttachments}`,
    );

    const buffers = await collectExamBuffers(
      doc,
      includeAttachments,
      this.azureService.downloadBlob.bind(this.azureService),
    );

    if (buffers.length === 0) {
      this.logger.warn(
        `[PRONTUARIO_DEBUG] buffers vazio schedulingId=${id} ATENDIMENTOSTATUS=${doc.ATENDIMENTOSTATUS} totalExames=${(doc.EXAMES || []).length} examesComUrl=${examesComUrl}`,
      );
      throw new HttpException(
        'Nenhum resultado de exame disponível para gerar PDF.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const mergedPdfBuffer = await mergePdfs(buffers);

    const fileName = `${doc.NOME}_PRONTUARIO.pdf`;
    return {
      buffer: mergedPdfBuffer,
      fileName,
    };
  }

  async getSchedulingsToday(
    unidadeFiltro?: string,
  ): Promise<SchedulingDocument[]> {
    const todayBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());

    return await this.schedulingsCollection
      .find<SchedulingDocument>(
        {
          DATAAGENDAMENTO: todayBR,
          ...(unidadeFiltro
            ? {
              UNIDADEATENDIMENTO: {
                $in: [
                  unidadeFiltro,
                  unidadeFiltro.toUpperCase(),
                  unidadeFiltro.toLowerCase(),
                  '',
                  null,
                ],
              },
            }
            : {}),
        },
        {
          projection: PROJECTIONS.SCHEDULINGS_TODAY,
        },
      )
      .sort({ NOME: 1 })
      .toArray();
  }

  async findAttachmentByStoragePath(storagePath: string): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType?: string;
  } | null> {
    const normalizedPath = String(storagePath || '').trim();
    if (!normalizedPath) {
      return null;
    }

    const fileName = normalizedPath.split('/').pop()?.split('?')[0] || '';
    const document = await this.schedulingsCollection.findOne(
      {
        'ANEXOS.StoragePath': normalizedPath,
      } as any,
      {
        projection: {
          ANEXOS: 1,
        },
      },
    );

    const attachment = (document?.ANEXOS || []).find((anexo: any) => {
      const path = String(anexo?.StoragePath || '').trim();
      const name = String(anexo?.Name || '').trim();
      return path === normalizedPath || (fileName && name === fileName);
    });

    if (!attachment || !attachment.Content || attachment.Content === 'uploaded') {
      return null;
    }

    const rawContent = attachment.Content;
    const buffer = Buffer.isBuffer(rawContent)
      ? rawContent
      : typeof rawContent === 'string'
        ? Buffer.from(rawContent, 'base64')
        : Buffer.from(rawContent as ArrayBuffer);

    return {
      buffer,
      fileName: String(attachment.Name || fileName || 'documento.pdf'),
      contentType: String(attachment.Type || '').trim() || undefined,
    };
  }

  private isTicketInActiveCall(ticket?: Ticket | null): boolean {
    return this.ACTIVE_TICKET_STATUSES.includes(
      (ticket?.status as (typeof this.ACTIVE_TICKET_STATUSES)[number]) ??
      TicketStatus.AGUARDANDO,
    );
  }

  private buildPainelCallFromScheduling(
    scheduling: Pick<
      SchedulingDocument,
      '_id' | 'NOME' | 'UNIDADEATENDIMENTO' | 'TICKET'
    >,
    ticket: Ticket,
  ) {
    return {
      id: Number(ticket.id),
      name: scheduling.NOME || '',
      ticket: `${ticket.prefixo || ''}${ticket.numero || ''}`,
      sala: ticket.sala || '',
      exame: ticket.exame || 'ATENDIMENTO',
      unidade: ticket.unidade || scheduling.UNIDADEATENDIMENTO || '',
    };
  }

  private buildReleasedActiveTicket(
    ticket: Ticket,
    nextStatus: TicketStatus = TicketStatus.AGUARDANDO,
  ): Ticket {
    return {
      ...ticket,
      status: nextStatus,
      sala: '',
      profissional: '',
      // Preserva o atendente para que o relatório por atendente continue funcionando após finalização
      atendente: ticket.atendente ?? '',
      updatedAt: new Date(),
    };
  }

  private normalizeOperationalContextValue(value?: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private getTicketOperationalOwner(ticket?: Ticket | null): string {
    return this.normalizeOperationalContextValue(
      ticket?.profissional || ticket?.atendente,
    );
  }

  private hasPendingExamMatchingTicket(
    scheduling: Pick<SchedulingDocument, 'EXAMES' | 'TICKET'>,
  ): boolean {
    const currentTicket = scheduling.TICKET as Ticket | null;
    if (!currentTicket) {
      return true;
    }

    const normalizedTicketExam = this.normalizeGroupName(currentTicket.exame);
    if (
      !normalizedTicketExam ||
      normalizedTicketExam === this.normalizeGroupName('ATENDIMENTO')
    ) {
      return true;
    }

    const pendingExams = (scheduling.EXAMES || []).filter(
      (exam) => exam.status === ExamStatus.PENDENTE,
    );

    if (pendingExams.length === 0) {
      return false;
    }

    return pendingExams.some((exam) => {
      const normalizedExamGroup = this.normalizeGroupName(
        exam.grupo || exam.nomeExame || exam.codigoExame,
      );

      if (normalizedExamGroup === normalizedTicketExam) {
        return true;
      }

      const mappedGroup = getExamGroupAndItemByCodigo(exam.codigoExame)?.grupo;
      return this.normalizeGroupName(mappedGroup) === normalizedTicketExam;
    });
  }

  private getRoomOwnershipKey(
    scheduling: Pick<SchedulingDocument, 'UNIDADEATENDIMENTO' | 'TICKET'>,
  ): string | null {
    const ticket = scheduling.TICKET as Ticket | null;
    if (!ticket || !this.isTicketInActiveCall(ticket)) {
      return null;
    }

    const unidade = String(
      ticket.unidade || scheduling.UNIDADEATENDIMENTO || '',
    ).trim();
    const sala = String(ticket.sala || '').trim();

    if (!unidade || !sala) {
      return null;
    }

    const owner = this.getTicketOperationalOwner(ticket) || '__sem_owner__';

    return `${unidade.toUpperCase()}|${sala.toUpperCase()}|${owner}`;
  }

  private getActiveTicketPriority(ticket?: Ticket | null): number {
    if (ticket?.status === TicketStatus.EM_ATENDIMENTO) {
      return 2;
    }

    if (ticket?.status === TicketStatus.EM_CHAMADA) {
      return 1;
    }

    return 0;
  }

  private getTicketTimestamp(ticket?: Ticket | null): number {
    const rawDate = ticket?.updatedAt || ticket?.emissao;
    const parsed = rawDate ? new Date(rawDate).getTime() : 0;

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private shouldReplaceRoomOwner(
    candidate: Pick<SchedulingDocument, '_id' | 'TICKET'>,
    currentOwner: Pick<SchedulingDocument, '_id' | 'TICKET'>,
  ): boolean {
    const priorityDelta =
      this.getActiveTicketPriority(candidate.TICKET as Ticket) -
      this.getActiveTicketPriority(currentOwner.TICKET as Ticket);

    if (priorityDelta !== 0) {
      return priorityDelta > 0;
    }

    return (
      this.getTicketTimestamp(candidate.TICKET as Ticket) >
      this.getTicketTimestamp(currentOwner.TICKET as Ticket)
    );
  }

  private async findConflictingActiveRoomOccupants(params: {
    schedulingId: ObjectId;
    ticketId: number;
    unidade?: string;
    dataAgendamento?: string;
    sala: string;
  }): Promise<
    Array<
      Pick<
        SchedulingDocument,
        | '_id'
        | 'NOME'
        | 'UNIDADEATENDIMENTO'
        | 'ATENDIMENTOSTATUS'
        | 'DATAAGENDAMENTO'
        | 'EXAMES'
        | 'TICKET'
      >
    >
  > {
    const unidadeNormalizada = String(params.unidade || '')
      .trim()
      .toUpperCase();

    return this.schedulingsCollection
      .find<
        Pick<
          SchedulingDocument,
          | '_id'
          | 'NOME'
          | 'UNIDADEATENDIMENTO'
          | 'ATENDIMENTOSTATUS'
          | 'DATAAGENDAMENTO'
          | 'EXAMES'
          | 'TICKET'
        >
      >(
        {
          _id: { $ne: params.schedulingId },
          ...(params.dataAgendamento
            ? { DATAAGENDAMENTO: params.dataAgendamento }
            : {}),
          'TICKET.id': { $ne: params.ticketId },
          'TICKET.status': { $in: [...this.ACTIVE_TICKET_STATUSES] },
          'TICKET.sala': params.sala,
          ...(unidadeNormalizada
            ? {
              $or: [
                { UNIDADEATENDIMENTO: unidadeNormalizada },
                { 'TICKET.unidade': unidadeNormalizada },
              ],
            }
            : {}),
        },
        {
          projection: {
            NOME: 1,
            UNIDADEATENDIMENTO: 1,
            ATENDIMENTOSTATUS: 1,
            DATAAGENDAMENTO: 1,
            EXAMES: 1,
            TICKET: 1,
          },
        },
      )
      .toArray();
  }

  private buildTicketReconciliation(
    scheduling: Pick<
      SchedulingDocument,
      '_id' | 'ATENDIMENTOSTATUS' | 'DATAAGENDAMENTO' | 'EXAMES' | 'TICKET'
    >,
    todayBR: string,
  ): { reason: string; nextTicket: Ticket } | null {
    const currentTicket = scheduling.TICKET as Ticket | null;

    if (!currentTicket || !this.isTicketInActiveCall(currentTicket)) {
      return null;
    }

    if (
      scheduling.ATENDIMENTOSTATUS === AtendimentoStatus.FINALIZADO ||
      scheduling.ATENDIMENTOSTATUS === AtendimentoStatus.AGUARDANDO_RESULTADOS ||
      scheduling.ATENDIMENTOSTATUS === AtendimentoStatus.AVALIACAO_MEDICA
    ) {
      return {
        reason: 'finished_or_completed_phase_active_ticket',
        nextTicket: this.buildReleasedActiveTicket(
          currentTicket,
          scheduling.ATENDIMENTOSTATUS === AtendimentoStatus.FINALIZADO
            ? TicketStatus.FINALIZADO
            : TicketStatus.AGUARDANDO,
        ),
      };
    }

    if (
      scheduling.DATAAGENDAMENTO &&
      String(scheduling.DATAAGENDAMENTO).trim() !== todayBR
    ) {
      return {
        reason: 'historical_active_ticket',
        nextTicket: this.buildReleasedActiveTicket(currentTicket),
      };
    }

    if (
      currentTicket.grupo === TicketGroups.EXAME &&
      !this.hasPendingExamMatchingTicket(scheduling)
    ) {
      return {
        reason: 'ticket_exam_not_pending',
        nextTicket: this.buildReleasedActiveTicket(currentTicket),
      };
    }

    return null;
  }

  public async reconcileInconsistentActiveTickets(source = 'runtime') {
    try {
      this.ensureInitialized('reconcileInconsistentActiveTickets');
    } catch (e) {
      this.logger.error(
        `[RECONCILE] Mongo nao disponivel (source=${source}): ${(e as Error).message}`,
      );
      return { source, evaluated: 0, reconciled: 0 };
    }
    const todayBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());

    const candidates = await this.schedulingsCollection
      .find<
        Pick<
          SchedulingDocument,
          | '_id'
          | 'ATENDIMENTOSTATUS'
          | 'DATAAGENDAMENTO'
          | 'NOME'
          | 'UNIDADEATENDIMENTO'
          | 'EXAMES'
          | 'TICKET'
        >
      >(
        {
          'TICKET.status': { $in: [...this.ACTIVE_TICKET_STATUSES] },
        },
        {
          projection: {
            ATENDIMENTOSTATUS: 1,
            DATAAGENDAMENTO: 1,
            NOME: 1,
            UNIDADEATENDIMENTO: 1,
            EXAMES: 1,
            TICKET: 1,
          },
        },
      )
      .toArray();

    if (candidates.length === 0) {
      return { source, evaluated: 0, reconciled: 0 };
    }

    let reconciled = 0;
    const reconciliations = new Map<
      string,
      { reason: string; nextTicket: Ticket }
    >();
    const roomOwners = new Map<
      string,
      Pick<
        SchedulingDocument,
        | '_id'
        | 'ATENDIMENTOSTATUS'
        | 'DATAAGENDAMENTO'
        | 'NOME'
        | 'UNIDADEATENDIMENTO'
        | 'EXAMES'
        | 'TICKET'
      >
    >();

    for (const scheduling of candidates) {
      const schedulingId = String(scheduling._id);
      const reconciliation = this.buildTicketReconciliation(
        scheduling,
        todayBR,
      );

      if (!reconciliation) {
        const roomKey = this.getRoomOwnershipKey(scheduling);

        if (!roomKey) {
          continue;
        }

        const currentOwner = roomOwners.get(roomKey);
        if (!currentOwner) {
          roomOwners.set(roomKey, scheduling);
          continue;
        }

        const currentOwnerName = this.getTicketOperationalOwner(
          currentOwner.TICKET as Ticket,
        );
        const schedulingOwnerName = this.getTicketOperationalOwner(
          scheduling.TICKET as Ticket,
        );

        if (
          currentOwnerName !== '' &&
          currentOwnerName === schedulingOwnerName
        ) {
          if (this.shouldReplaceRoomOwner(scheduling, currentOwner)) {
            roomOwners.set(roomKey, scheduling);
          }
          continue;
        }

        continue;
      }

      reconciliations.set(schedulingId, reconciliation);
    }

    for (const scheduling of candidates) {
      const reconciliation = reconciliations.get(String(scheduling._id));
      if (!reconciliation) {
        continue;
      }

      await this.schedulingsCollection.updateOne(
        { _id: new ObjectId(scheduling._id) },
        {
          $set: {
            TICKET: reconciliation.nextTicket,
          },
        },
      );

      reconciled += 1;

      this.logger.log(
        `[TICKET_RECONCILE] source=${source} schedulingId=${String(
          scheduling._id,
        )} reason=${reconciliation.reason} previousStatus=${scheduling.TICKET?.status || 'n/a'
        } nextStatus=${reconciliation.nextTicket.status || 'n/a'}`,
      );

      const painelCall = this.buildPainelCallFromScheduling(
        scheduling,
        reconciliation.nextTicket,
      );
      const painelRoom = `${painelCall.unidade}:PAINEL`;

      if (this.webSocket?.server && painelCall.unidade) {
        this.webSocket.server
          .to(painelRoom)
          .emit('atendimento finalizado', painelCall);

        if (reconciliation.nextTicket.status === TicketStatus.AGUARDANDO) {
          this.webSocket.server
            .to(painelRoom)
            .emit('atendimento retornado', painelCall);
        }
      }
    }

    return {
      source,
      evaluated: candidates.length,
      reconciled,
    };
  }

  async getSchedulingCache(
    codempresa: string,
    codfuncionario: string,
  ): Promise<SchedulingDocument | null> {
    const todayBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());
    return this.schedulingsCollection.findOne<SchedulingDocument>(
      {
        CODIGOEMPRESA: codempresa,
        CODIGO: codfuncionario,
        DATAAGENDAMENTO: todayBR,
      },
      {
        projection: PROJECTIONS.SCHEDULINGS_TODAY,
      },
    );
  }

  /**
   * Atualiza um ou mais exames de um funcionário.
   *
   * Fluxo principal:
   * - Carrega o documento de agendamento e o encapsula em FuncionarioEntity
   * - Aplica regras de negócio (ExamRules) que podem alterar vários exames e status
   * - Decide se algum exame deve ser enviado para processamento na Azure
   * - Atualiza o documento no Mongo e, se o funcionário estiver apto, finaliza o atendimento
   */
  async updateExam(payload: ExamUpdateDto, authUser?: IUserInfo | null) {
    const {
      funcionarioId,
      codigoExame,
      formulario,
      profissional,
      sala,
      credentials,
      isEditing,
    } = payload;

    if (!funcionarioId || !codigoExame?.length || !formulario) {
      throw new HttpException(
        'Dados obrigatórios não enviados',
        HttpStatus.BAD_REQUEST,
      );
    }

    const funcionarioDoc =
      await this.schedulingsCollection.findOne<SchedulingDocument>({
        _id: new ObjectId(funcionarioId),
      });

    if (!funcionarioDoc) {
      throw new HttpException(
        'Funcionário não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.persistExamFormSnapshot({
      funcionarioDoc,
      payload,
      authUser,
    });

    const codigosParaAtualizar = [...payload.codigoExame];
    const funcionario = new FuncionarioEntity(funcionarioDoc);
    const previousStatus = funcionario.getRaw()
      .ATENDIMENTOSTATUS as AtendimentoStatus;
    let shouldPersistAutoReleaseCredentials = false;

    if (hasProfessionalMismatch(authUser, profissional)) {
      this.logger.warn(
        `[IDENTITY_AUTH_BODY_MISMATCH] route=EXAME_UPDATE funcionarioId=${funcionarioId} auth=${authUser?.codigo || 'n/a'} body=${profissional?.codigo || 'n/a'}`,
      );
    }

    assertProfessionalMismatch({
      route: 'schedulings/exame/update',
      authUser,
      bodyProfessional: profissional,
      enforced: isAuthUserMismatchBlockEnabled(),
    });

    ExamRules.aplicarRegrasTriagemEClinico(
      codigosParaAtualizar,
      funcionario,
      formulario,
    );

    ExamRules.aplicarRegraEegEcgPsico(
      codigosParaAtualizar,
      funcionario,
      formulario,
    );
    ExamRules.aplicarRegraConsultaOftalmologica(
      codigosParaAtualizar,
      funcionario,
    );

    const examsQueueInfo: any[] = [];

    for (const codigo of [...new Set(codigosParaAtualizar)]) {
      const exameIndex = funcionario.findExameIndex(codigo);
      if (exameIndex === -1) continue;

      const exameOrig = funcionario.getRaw().EXAMES[exameIndex];
      let grupo = exameOrig.grupo || '';

      if (!grupo || grupo.trim() === '') {
        const resolvedGrupo = encontrarGrupoPorCodigo(codigo);
        if (resolvedGrupo) {
          grupo = resolvedGrupo;
          // Atualiza o grupo no documento para persistência futura
          funcionario.updateExameAtIndex(exameIndex, { grupo });
        }
      }

      const examMatchByCodigo = getExamGroupAndItemByCodigo(codigo);

      // A tabela de exames é a fonte de verdade do próximo status: resolve pelo código.
      if (examMatchByCodigo?.grupo && examMatchByCodigo.grupo !== grupo) {
        grupo = examMatchByCodigo.grupo;
        funcionario.updateExameAtIndex(exameIndex, { grupo });
      }

      // Fallback robusto: normaliza o grupo atual contra as chaves de EXAMES_LIST
      // para evitar falhas de enqueue por variação de acento/caixa/espaço.
      if (grupo) {
        const normalizedGrupo = this.normalizeGroupName(grupo);
        const normalizedMatch = Object.keys(getExamesList()).find(
          (key) => this.normalizeGroupName(key) === normalizedGrupo,
        );
        if (normalizedMatch && normalizedMatch !== grupo) {
          grupo = normalizedMatch;
          funcionario.updateExameAtIndex(exameIndex, { grupo });
        }
      }

      // Fallback adicional por nome do exame quando o código não casa com EXAMES_LIST.
      if ((!grupo || !getExamesList()[grupo]) && exameOrig?.nomeExame) {
        const nomeExameNormalizado = this.normalizeGroupName(
          exameOrig.nomeExame,
        );
        const byNome = Object.entries(getExamesList()).find(([, exames]) =>
          exames.some(
            (item) =>
              this.normalizeGroupName(item.nome) === nomeExameNormalizado,
          ),
        );
        if (byNome?.[0]) {
          grupo = byNome[0];
          funcionario.updateExameAtIndex(exameIndex, { grupo });
        }
      }

      const exameInfoBase =
        examMatchByCodigo?.exame ??
        getExamesList()[grupo]?.[0] ??
        ({
          codigos: [codigo],
          nome: exameOrig.nomeExame || 'Exame',
          statusFinalizacao: ExamStatus.AGUARDANDO_RESULTADO,
          enviarParaAzure: false,
          requerAssinaturaDigital: false,
        } as ExamToogle);

      const exameInfo = ExamRules.aplicarValidacaoExameInfo(
        {
          ...exameInfoBase,
          codigos: [...exameInfoBase.codigos],
        },
        funcionario,
      );

      const isCurrentExamPsico =
        grupo === 'Psicossocial' || exameOrig.grupo === 'Psicossocial';
      const isIncomingFormPsico = hasPsychosocialFormData(formulario);
      const shouldRoutePsychosocialPayloadToAuxiliaryExam =
        shouldPersistConcludedPayloadForAuxiliaryExam({
          grupo,
          codigo,
          formulario,
        }) &&
        !isCurrentExamPsico;
      const requiresMeaningfulForm = shouldRequireMeaningfulExamForm(exameInfo);

      let incomingFormToValidate = formulario;
      if (shouldRoutePsychosocialPayloadToAuxiliaryExam) {
        incomingFormToValidate = { status: 'concluded' };
      }

      if (isCurrentExamPsico && !isIncomingFormPsico) {
        const existingPsychosocialForm =
          hasPsychosocialFormData(exameOrig.formulario) &&
          typeof exameOrig.formulario === 'object'
            ? exameOrig.formulario
            : null;

        if (existingPsychosocialForm) {
          // Quando o psicossocial é reenfileirado por outro exame, preservamos
          // o formulário já salvo ao invés de substituí-lo por um payload vazio.
          incomingFormToValidate = existingPsychosocialForm;
        } else {
          incomingFormToValidate = {};
        }
      }

      let effectiveFormulario = incomingFormToValidate;
      if (requiresMeaningfulForm && !hasMeaningfulExamFormData(incomingFormToValidate)) {
        const snapshotFallback = await this.findLatestMatchingExamFormSnapshot({
          schedulingId: funcionarioId,
          codigoExame: codigo,
          grupo: exameOrig.grupo || grupo,
        });
        if (hasMeaningfulExamFormData(snapshotFallback?.formulario)) {
          this.logger.warn(
            `[EXAM_FORM_SNAPSHOT_RECOVERY] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} codigo=${codigo} snapshotId=${String((snapshotFallback as any)?._id || 'n/a')} — usando formulario do snapshot`,
          );
          effectiveFormulario = snapshotFallback!.formulario;
        } else if (!payload.codigoExame.includes(codigo)) {
          // Para atualizações implícitas (regras automáticas como EEG/ECG -> Psicossocial),
          // se não houver snapshot, permitimos um formulário padrão concluído para não travar o fluxo.
          this.logger.log(
            `[EXAM_FORM_IMPLICIT_FALLBACK] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} codigo=${codigo} — usando fallback concluído`,
          );
          effectiveFormulario = { status: 'concluded' };
        }
      }

      if (requiresMeaningfulForm && !hasMeaningfulExamFormData(effectiveFormulario)) {
        this.logger.warn(
          `[EXAM_FORM_INVALID] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} codigo=${codigo} reason=EMPTY_OR_MEANINGLESS_FORM`,
        );
        throw new HttpException(
          buildMissingExamFormMessage(grupo || exameOrig?.nomeExame),
          HttpStatus.BAD_REQUEST,
        );
      }

      let statusToApply =
        exameInfo.statusFinalizacao ?? ExamStatus.FINALIZADO;

      if (Array.isArray(formulario?.examesRealizados)) {
        const itemRealizado = formulario.examesRealizados.find(
          (item: any) =>
            String(item.sequencialResultadoExame || '') === String(exameOrig.sequencialResultadoExame || ''),
        );
        if (itemRealizado && itemRealizado.realizado === false) {
          statusToApply = ExamStatus.NAO_REALIZADO;
        }
      }

      const shouldSendToQueue =
        !funcionario.isCredenciada() &&
        !!exameInfo.enviarParaAzure &&
        statusToApply !== ExamStatus.NAO_REALIZADO &&
        [ExamStatus.FINALIZADO, ExamStatus.AGUARDANDO_RESULTADO].includes(
          exameInfo.statusFinalizacao,
        );

      const professionalSnapshot = resolveProfessionalIdentity({
        authUser,
        bodyProfessional: profissional,
        existingExam: exameOrig,
        route: 'EXAME_UPDATE',
      });
      const resolvedProfessional =
        snapshotToUserInfo(professionalSnapshot) || profissional || null;
      const requiresStrictIdentity =
        !!exameInfo.enviarParaAzure &&
        requiresStrictProfessionalIdentityForGroup(grupo);

      if (
        requiresStrictIdentity &&
        !hasMinimumProfessionalIdentity(professionalSnapshot)
      ) {
        this.logger.warn(
          `[IDENTITY_PDF_GENERATION_BLOCKABLE] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} existingCodigo=${exameOrig.codigoProfissional || 'n/a'}`,
        );
      }

      assertProfessionalIdentityAvailable({
        route: 'schedulings/exame/update',
        grupo,
        professional: professionalSnapshot,
        required: requiresStrictIdentity,
        enforced: isExamProfessionalIdentityBlockEnabled(),
      });

      if (professionalSnapshot?.codigo) {
        this.logger.log(
          `[IDENTITY_OK] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} codigo=${professionalSnapshot.codigo}`,
        );
      } else {
        this.logger.warn(
          `[IDENTITY_BODY_MISSING] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} existingCodigo=${exameOrig.codigoProfissional || 'n/a'}`,
        );
      }

      const assinaturaDigitalObrigatoria =
        !!exameInfo.enviarParaAzure &&
        !!exameInfo.requerAssinaturaDigital &&
        !!String(
          professionalSnapshot?.codigo || exameOrig.codigoProfissional || '',
        ).trim() &&
        (await this.signatureService.hasValidSignatureSession(
          String(
            professionalSnapshot?.codigo || exameOrig.codigoProfissional || '',
          ),
        ));

      if (shouldSendToQueue) {
        if (
          credentials?.pin &&
          this.normalizeGroupName(grupo) ===
          this.normalizeGroupName('Exame Clínico')
        ) {
          shouldPersistAutoReleaseCredentials = true;
        }
      }

      const dataExameToPersistRaw = this.resolveExamDataExameForPersistence({
        incomingDataExame: payload.dataExame,
        existingDataExame: exameOrig.dataExame ?? null,
        isEditing,
      });

      if (isCurrentExamPsico || hasPsychosocialFormData(effectiveFormulario)) {
        effectiveFormulario = ensurePsicossocialConclusao(effectiveFormulario);
      }

      let motivoNaoRealizado: string | undefined;
      if (statusToApply === ExamStatus.NAO_REALIZADO) {
        if (Array.isArray(formulario?.examesRealizados)) {
          const itemRealizado = formulario.examesRealizados.find(
            (item: any) =>
              String(item.sequencialResultadoExame || '') === String(exameOrig.sequencialResultadoExame || ''),
          );
          if (itemRealizado && itemRealizado.motivoNaoRealizado) {
            motivoNaoRealizado = itemRealizado.motivoNaoRealizado;
          }
        }
        if (!motivoNaoRealizado && formulario?.motivoNaoRealizado) {
          motivoNaoRealizado = formulario.motivoNaoRealizado;
        }
      }

      const shouldSendNaoRealizadoToQueue =
        !funcionario.isCredenciada() &&
        statusToApply === ExamStatus.NAO_REALIZADO &&
        !!exameOrig?.sequencialResultadoExame &&
        !!exameOrig?.grupo;

      const updated: Partial<ExamsScheduled> = {
        dataExame: dataExameToPersistRaw,
        profissional:
          professionalSnapshot?.nome ||
          exameOrig.profissional ||
          payload.profissional?.nome,
        codigoProfissional:
          professionalSnapshot?.codigo ||
          exameOrig.codigoProfissional ||
          payload.profissional?.codigo,
        sala: payload.sala,
        status: statusToApply,
        url: exameOrig.url,
        formulario: { ...effectiveFormulario },
        signature: exameOrig.signature,
        motivoNaoRealizado,
      };

      if (shouldSendNaoRealizadoToQueue) {
        examsQueueInfo.push({
          grupo,
          codigo,
          shouldSendToQueue: false, // Não envia para processar PDF/ASO
          assinaturaDigitalObrigatoria: false,
          enviarParaAzure: false,
          resolvedProfessional,
        });

        // Enfileira diretamente no SOC com o motivo
        await this.azureService.filaResultadoExameSoc({
          schedulingId: String(funcionarioId),
          grupo,
          examIndex: exameIndex,
          requestedAt: new Date().toISOString(),
          codigoExame: codigo,
          sequencialResultadoExame: exameOrig.sequencialResultadoExame,
          sequencialFicha: funcionario.getRaw().SEQUENCIAFICHA,
          naoRealizado: true,
        });
      }

      if (isEditing && shouldSendToQueue) {
        updated.status = ExamStatus.AGUARDANDO_RESULTADO;
        updated.url = '';
        updated.signature = {
          documentType: 'EXAME',
          documentId: exameOrig.signature?.documentId,
          documentName:
            exameOrig.signature?.documentName ||
            grupo ||
            exameOrig.nomeExame ||
            'Exame',
          requiresSignature: !!exameInfo.requerAssinaturaDigital,
          status: 'PENDENTE',
          provider: exameOrig.signature?.provider,
          signedUrl: '',
          signedAt: undefined,
          error: undefined,
          retry: {
            pending: false,
            count: 0,
          },
        };

        const currentAsoInfo = funcionario.getRaw().ASOINFO;
        const currentAsoSignature = currentAsoInfo?.signature;

        const invalidatedAsoInfo: AsoInfo = {
          ...(currentAsoInfo || {}),
          status: 'PENDENTE',
          url: '',
          processingQueuedAt: undefined,
          validacao: undefined,
          emailSent: false,
          updatedAt: new Date(),
          signature: currentAsoSignature
            ? {
              ...currentAsoSignature,
              status: 'PENDENTE',
              signedUrl: '',
              signedAt: undefined,
              validacao: undefined,
              emailSent: false,
              error: undefined,
              retry: {
                pending: false,
                count: 0,
              },
              lastCommandId: undefined,
            }
            : {
              documentType: 'ASO' as DocumentType,
              documentId: 'ASO',
              documentName: 'ASO',
              requiresSignature: true,
              status: 'PENDENTE',
              retry: {
                pending: false,
                count: 0,
              },
              emailSent: false,
            },
        };

        funcionario.getRaw().ASOINFO = invalidatedAsoInfo;
        funcionario.getRaw().ASOSTATUS = AsoStatus.NAO_GERADO;

        this.logger.log(
          `[REISSUE][ASO_INVALIDATED] funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} statusExame=${updated.status} asoStatus=${invalidatedAsoInfo.status}`,
        );
      }

      const isGrupoClinico =
        this.normalizeGroupName(grupo) ===
        this.normalizeGroupName('Exame Clínico');
      if (isGrupoClinico && professionalSnapshot) {
        updated.formulario = {
          ...updated.formulario,
          codigoMedico:
            updated.formulario?.codigoMedico || professionalSnapshot.codigo,
          medico: updated.formulario?.medico || professionalSnapshot.nome,
        };
      }

      examsQueueInfo.push({
        grupo,
        codigo,
        shouldSendToQueue,
        assinaturaDigitalObrigatoria,
        enviarParaAzure: !!exameInfo.enviarParaAzure,
        resolvedProfessional,
      });

      funcionario.updateExameAtIndex(exameIndex, updated);

      if (professionalSnapshot?.codigo) {
        this.logger.log(
          `[IDENTITY_RESOLVED] route=EXAME_UPDATE funcionarioId=${funcionarioId} grupo=${grupo || 'n/a'} codigo=${professionalSnapshot.codigo}`,
        );
      }
    }
    funcionario.updateAtendimentoStatus(previousStatus);

    await this.ensureRequiredResultsBeforeMedicalEvaluation({
      funcionario,
      previousStatus,
      authUser,
      fallbackProfessional: profissional,
      credentials,
      examsQueueInfo,
    });

    const { _id, AUTENTICACAOATENDIMENTO, ...updateData } = funcionario.getRaw();

    const result = await this.schedulingsCollection.findOneAndUpdate(
      { _id: new ObjectId(funcionarioId) },
      { $set: updateData },
      { returnDocument: 'after' },
    );
    const finalDoc = result?.value || result;

    // Salvaguarda: se tinha AUTENTICACAOATENDIMENTO antes do update e perdeu depois,
    // loga warning para diagnóstico de roteamento incorreto de ASO.
    if (AUTENTICACAOATENDIMENTO && finalDoc && !finalDoc.AUTENTICACAOATENDIMENTO) {
      this.logger.warn(
        `[AUTH][PERDA] AUTENTICACAOATENDIMENTO perdido apos update scheduling=${funcionarioId} metodo=${AUTENTICACAOATENDIMENTO.metodo}`,
      );
    }

    for (const info of examsQueueInfo) {
      if (info.shouldSendToQueue) {
        const queueResp = await this.azureService.filaResultadosExamesProcessar(
          {
            schedulingId: String(finalDoc?._id || funcionarioId),
            grupo: info.grupo,
            funcionario: finalDoc,
            profissional: info.resolvedProfessional || profissional,
            assinaturaDigitalObrigatoria: info.assinaturaDigitalObrigatoria,
            updateAt: new Date(),
            credentials,
          },
        );

        this.logger.log(
          '[QUEUE][RESULTADOS] Enfileirado exame ' +
          info.codigo +
          ' (' +
          info.grupo +
          ') para prontuario ' +
          funcionario.getRaw().CODIGOPRONTUARIO +
          '. messageId=' +
          (queueResp?.messageId || 'n/d'),
        );
      } else {
        this.logger.log(
          `[SKIP][QUEUE] Exame ${info.codigo} | grupo="${info.grupo}" | credenciada=${funcionario.isCredenciada()} | enviarParaAzure=${info.enviarParaAzure}`,
        );
      }
    }

    // NOTA: Quando o Exame Clínico tem conclusão "Apto com restrições", o agendamento
    // permanece em AVALIACAO_MEDICA para avaliação médica. O email de parecer é enviado
    // apenas após o médico finalizar via finishScheduling.

    const podeLiberar =
      funcionario.isAptoSomenteClinico() ||
      funcionario.isAptoClinicoAudiometria() ||
      funcionario.isAptoClinicoAcuidade() ||
      funcionario.isAptoClinicoAudiometriaAcuidade();

    if (podeLiberar) {
      const clinicalSnapshot = snapshotToUserInfo(
        funcionario.getMedicoClinico() as any,
      );
      const userFinished = clinicalSnapshot || authUser || payload.profissional;
      const opinion: MedicalOpinionData = { opinionType: ParecerMedico.APTO };

      if (!userFinished) {
        this.logger.warn(
          `[IDENTITY_EXAM_MISSING] route=EXAME_UPDATE funcionarioId=${funcionarioId} flow=AUTO_FINISH_APTO`,
        );
      } else {
        await this.finishScheduling(
          funcionario.getRaw()._id,
          userFinished,
          opinion,
          credentials,
          authUser,
        );
      }
    } else if (
      isEditing &&
      funcionario.allExamesFinalizados() &&
      funcionario.getRaw().PARECERMEDICO
    ) {
      // Se for uma reemissão (isEditing) e já tiver um parecer (ex: INAPTO),
      // força a regeneração do ASO chamando finishScheduling com os dados atuais.
      this.logger.log(
        `[REISSUE] Forçando regeneração de ASO para ${funcionarioId} (Parecer: ${funcionario.getRaw().PARECERMEDICO})`,
      );

      const clinicalSnapshot = snapshotToUserInfo(
        funcionario.getMedicoClinico() as any,
      );
      const userFinished = clinicalSnapshot || authUser || payload.profissional;
      const currentOpinion: MedicalOpinionData = {
        opinionType: funcionario.getRaw().PARECERMEDICO as ParecerMedico,
        details: funcionario.getRaw().RECOMENDACAOMEDICA,
      };

      if (!userFinished) {
        this.logger.warn(
          `[IDENTITY_EXAM_MISSING] route=EXAME_UPDATE funcionarioId=${funcionarioId} flow=REGENERATE_ASO`,
        );
      } else {
        await this.finishScheduling(
          funcionario.getRaw()._id,
          userFinished,
          currentOpinion,
          credentials,
          authUser,
        );
      }
    }

    await this.maybeTriggerSocgedUpload(funcionario);

    return result;
  }

  /**
   * Finaliza o agendamento aplicando o parecer médico.
   *
   * Efeitos colaterais importantes:
   * - Atualiza status de atendimento (incluindo casos de repetição)
   * - Define parecer, recomendação e médico responsável
   * - Gera ASO e envia para fila de certificados, quando aplicável
   * - Enfileira e-mail de parecer e upload de prontuário no SOCGED (Azure)
   * - Atualiza apenas campos relevantes do documento no MongoDB
   */
  async finishScheduling(
    scheduledId: string,
    user: IUserInfo,
    options: MedicalOpinionData,
    credentials?: { pin?: string },
    authUser?: IUserInfo | null,
  ) {
    const filter = { _id: new ObjectId(scheduledId) };
    const scheduledDoc =
      await this.schedulingsCollection.findOne<SchedulingDocument>(filter);

    if (!scheduledDoc)
      throw new Error(`Agendamento com ID ${scheduledId} não encontrado.`);
    if (!user)
      throw new Error(`Usuário não informado para finalizar o agendamento.`);

    if (hasProfessionalMismatch(authUser, user)) {
      this.logger.warn(
        `[IDENTITY_AUTH_BODY_MISMATCH] route=FINISH_SCHEDULING schedulingId=${scheduledId} auth=${authUser?.codigo || 'n/a'} body=${user?.codigo || 'n/a'}`,
      );
    }

    assertProfessionalMismatch({
      route: 'schedulings/finish',
      grupo: 'ASO',
      authUser,
      bodyProfessional: user,
      enforced: isAuthUserMismatchBlockEnabled(),
    });

    const funcionario = new FuncionarioEntity(scheduledDoc);
    const clinicalExam = funcionario
      .getRaw()
      .EXAMES.find(
        (exam) =>
          this.normalizeGroupName(exam.grupo || '') ===
          this.normalizeGroupName('Exame Clínico'),
      );
    const clinicalProfessionalSnapshot =
      snapshotToUserInfo(funcionario.getMedicoClinico() as any) ||
      snapshotToUserInfo({
        codigo: clinicalExam?.codigoProfissional,
        nome: clinicalExam?.profissional,
      });
    const asoProfessionalSnapshot = resolveAsoFinishProfessionalIdentity({
      authUser,
      bodyProfessional: user,
      clinicalProfessional: clinicalProfessionalSnapshot,
    });
    const resolvedAsoProfessional =
      snapshotToUserInfo(asoProfessionalSnapshot) || user;
    const effectiveAsoProfessional = resolvedAsoProfessional || user;
    const effectiveOpinionIssuer = authUser || user;

    if (!hasMinimumProfessionalIdentity(asoProfessionalSnapshot)) {
      this.logger.warn(
        `[IDENTITY_PDF_GENERATION_BLOCKABLE] route=FINISH_SCHEDULING schedulingId=${scheduledId} grupo=ASO clinicalCodigo=${clinicalExam?.codigoProfissional || 'n/a'}`,
      );
    }

    assertProfessionalIdentityAvailable({
      route: 'schedulings/finish',
      grupo: 'ASO',
      professional: asoProfessionalSnapshot,
      required: true,
      enforced: isAsoProfessionalIdentityBlockEnabled(),
    });

    if (funcionario.anyPendentes()) {
      throw new HttpException(
        'Não é possível finalizar o atendimento: existem exames com status PENDENTE que ainda não foram realizados.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (scheduledDoc.ATENDIMENTOSTATUS !== AtendimentoStatus.AVALIACAO_MEDICA) {
      throw new HttpException(
        `O atendimento só pode ser finalizado quando está aguardando avaliação médica. Status atual: ${scheduledDoc.ATENDIMENTOSTATUS}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const invalidOpinionReason =
      MedicalOpinionRules.getInvalidOpinionReason(options);
    if (invalidOpinionReason) {
      throw new HttpException(invalidOpinionReason, HttpStatus.BAD_REQUEST);
    }

    // Mapeamento de laudoRestricao → formulario do Exame Clínico
    // Quando o médico emite Restrição Temporária via prontuário, os campos são
    // injetados no formulario do Exame Clínico para que o worker detecte
    // duracaoRestricaoDias e faça o merge do PDF automaticamente.
    if (options.laudoRestricao) {
      const laudoError = MedicalOpinionRules.validateLaudoRestricao(options.laudoRestricao);
      if (laudoError) {
        throw new HttpException(laudoError, HttpStatus.BAD_REQUEST);
      }
      const temExameClinico = funcionario.getRaw().EXAMES.some(e => e.grupo === 'Exame Clínico');
      if (!temExameClinico) {
        throw new HttpException(
          'Não é possível emitir Restrição Temporária: atendimento não possui Exame Clínico.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      funcionario.injetarRestricaoNoExameClinico(options.laudoRestricao);

      // Re-enfileira o exame clínico para re-gerar o PDF com as restrições
      const clinicoIdx = funcionario.getRaw().EXAMES.findIndex(
        (e) => e.grupo === 'Exame Clínico',
      );
      if (clinicoIdx !== -1) {
        funcionario.getRaw().EXAMES[clinicoIdx].url = '';
        funcionario.getRaw().EXAMES[clinicoIdx].status = 'AGUARDANDO_RESULTADO';
        await this.azureService.filaResultadoExameSoc({
          schedulingId: scheduledId,
          grupo: 'Exame Clínico',
          examIndex: clinicoIdx,
          requestedAt: new Date().toISOString(),
          codigoExame: funcionario.getRaw().EXAMES[clinicoIdx].codigoExame,
          sequencialResultadoExame: funcionario.getRaw().EXAMES[clinicoIdx].sequencialResultadoExame,
          sequencialFicha: funcionario.getRaw().SEQUENCIAFICHA,
        });
        this.logger.log(
          `[RESTRICAO][RE-ENQUEUE] Exame clínico re-enfileirado para re-geração do PDF. schedulingId=${scheduledId}`,
        );
      }
    }

    const novoStatus = AtendimentoStatus.FINALIZADO;

    let observacoesParecer =
      MedicalOpinionRules.buildAsoObservacoesParecer(options);

    // Orientação programada: resolve o texto profissional (texto_email) do catálogo
    // e o congela em ASOINFO.observacoesParecer — edições futuras no catálogo
    // não alteram o conteúdo já aprovado/enviado.
    if (options.orientacaoId) {
      let textoEmail: string | null = null;
      try {
        const catalogItem =
          await this.orientacoesConfigService.findByIdSafe(options.orientacaoId);
        textoEmail = catalogItem?.texto_email || null;
      } catch (e) {
        this.logger.warn(
          `[FINISH] Falha ao resolver orientação de parecer ${options.orientacaoId}:`,
          (e as Error)?.message,
        );
      }

      const resolvedText = textoEmail || options.details || null;
      if (resolvedText) {
        const base = MedicalOpinionRules.buildAsoObservacoesParecer(options);
        observacoesParecer = Array.from(
          new Set([resolvedText, ...base].filter(Boolean)),
        );
      }
    }

    const codigoProfissionalAso = String(
      asoProfessionalSnapshot?.codigo ||
      funcionario.getCodigoMedicoClinico() ||
      resolvedAsoProfessional?.codigo ||
      '',
    ).trim();
    const asoProfessionalPayload = {
      codigo: asoProfessionalSnapshot?.codigo || codigoProfissionalAso,
      nome:
        asoProfessionalSnapshot?.nome || resolvedAsoProfessional?.nome || '',
      cpf: asoProfessionalSnapshot?.cpf || resolvedAsoProfessional?.cpf || '',
      conselho:
        asoProfessionalSnapshot?.conselho ||
        resolvedAsoProfessional?.conselho ||
        '',
      ufconselho:
        asoProfessionalSnapshot?.ufconselho ||
        resolvedAsoProfessional?.ufconselho ||
        '',
    };

    funcionario.setAtendimentoStatus(novoStatus);
    funcionario.setParecer(options.opinionType as string);
    funcionario.setMedico({
      nome: resolvedAsoProfessional?.nome || user?.nome || '',
      codigo: codigoProfissionalAso,
    });

    // Para APTO_COM_RESTRICAO, persiste nota automática em RECOMENDACAOMEDICA
    // indicando que foi emitida restrição temporária, além de qualquer detalhe do médico
    if (options.opinionType === ParecerMedico.APTO_COM_RESTRICAO && options.laudoRestricao) {
      const restricaoNota = [
        `[RESTRIÇÃO TEMPORÁRIA EMITIDA]`,
        options.laudoRestricao.cid ? `CID: ${options.laudoRestricao.cid}` : null,
        options.laudoRestricao.descricaoCid ? options.laudoRestricao.descricaoCid : null,
        `Período: ${options.laudoRestricao.periodoDias} dias`,
        `Início: ${options.laudoRestricao.dataInicio}`,
      ]
        .filter(Boolean)
        .join(" | ");
      funcionario.setRecomendacao(restricaoNota);
    } else {
      funcionario.setRecomendacao(options.details ?? null);
    }
    funcionario.setAsoInfo({
      status: 'PENDENTE',
      updatedAt: new Date(),
      observacoesParecer,
      codigoProfissional: codigoProfissionalAso,
      professional: asoProfessionalPayload,
      credentials,
    });

    let asoInfoToPersist = funcionario.getRaw().ASOINFO ?? null;
    let asooProcessingPayload: AsoProcessingMessage | null = null;
    let examQueueMessages: resultadosExamesQueue[] = [];
    const asoCommandId = new ObjectId().toHexString();

    if (MedicalOpinionRules.shouldCreateAso(options, funcionario.getRaw())) {
      examQueueMessages = await this.checkUpdateExamesAssinaturaDigital(
        funcionario.getRaw(),
        effectiveAsoProfessional,
      );

      asoInfoToPersist = {
        status: 'PENDENTE',
        updatedAt: new Date(),
        observacoesParecer,
        codigoProfissional: codigoProfissionalAso,
        professional: asoProfessionalPayload,
        signature: {
          documentType: 'ASO',
          documentId: 'ASO',
          documentName: 'ASO',
          requiresSignature: true,
          status: 'PENDENTE',
          retry: {
            pending: false,
            count: 0,
          },
          codigoProfissional: codigoProfissionalAso,
          observacoesParecer,
          credentials,
        },
        credentials,
        liberacaoTipo:
          options.opinionType === ParecerMedico.APTO
            ? 'APTO'
            : options.opinionType === ParecerMedico.APTO_COM_ORIENTACAO &&
              options.isProgrammed
            ? 'ORIENTACAO_PROGRAMADA'
            : null,
        orientacoes:
          (options.opinionType === ParecerMedico.APTO ||
            options.opinionType === ParecerMedico.APTO_COM_ORIENTACAO) &&
          options.isProgrammed &&
          options.details
            ? [options.details]
            : null,
      } as AsoInfo;

      // Validação prévia dos campos obrigatórios
      const requiredFieldsFinish = [
        { name: 'schedulingId', value: scheduledId },
        { name: 'sequencial', value: scheduledDoc.SEQUENCIAFICHA },
        { name: 'codEmpresa', value: scheduledDoc.CODIGOEMPRESA },
        { name: 'codFuncionario', value: scheduledDoc.CODIGO },
        { name: 'medico', value: codigoProfissionalAso },
      ];

      const missingFieldsFinish = requiredFieldsFinish
        .filter((field) => !String(field.value || '').trim())
        .map((field) => field.name);

      if (missingFieldsFinish.length > 0) {
        this.logger.warn(
          `[FINISH][ASO] Campos obrigatórios ausentes para schedulingId=${scheduledId}: ${missingFieldsFinish.join(', ')}`,
        );
        this.logger.debug(
          `[FINISH][ASO] Dados do documento para schedulingId=${scheduledId}: ` +
          JSON.stringify({
            schedulingId: scheduledId,
            sequencial: scheduledDoc.SEQUENCIAFICHA,
            codEmpresa: scheduledDoc.CODIGOEMPRESA,
            codFuncionario: scheduledDoc.CODIGO,
            medico: codigoProfissionalAso,
          }),
        );
        asooProcessingPayload = null;
      } else {
        asooProcessingPayload = {
          commandId: asoCommandId,
          schedulingId: scheduledId,
          sequencial: scheduledDoc.SEQUENCIAFICHA,
          nomeFuncionario: scheduledDoc.NOME,
          nomeEmpresa: scheduledDoc.NOMEEMPRESA,
          tipoExame: scheduledDoc.TIPOEXAME,
          tipoExameNome: scheduledDoc.TIPOEXAMENOME,
          dataFicha: scheduledDoc.DATAAGENDAMENTO,
          codEmpresa: scheduledDoc.CODIGOEMPRESA,
          codFuncionario: scheduledDoc.CODIGO,
          cpfFuncionario: scheduledDoc.CPFFUNCIONARIO,
          parecer: String(options.opinionType),
          alturaParecer: options.altura?.toString(),
          confinadoParecer: options.confinado?.toString(),
          observacoesParecer,
          action: 'PROCESSAR',
          createdAt: new Date(),
          medico: codigoProfissionalAso,
          prontuario: scheduledDoc.CODIGOPRONTUARIO,
          socgedCode: '',
          profissional: asoProfessionalPayload,
          credentials,
        } as AsoProcessingMessage;
      }
    }

    const shouldReleaseTicketOnFinish =
      novoStatus === AtendimentoStatus.FINALIZADO;
    const currentTicket = funcionario.getRaw().TICKET;
    const releasedTicket = shouldReleaseTicketOnFinish
      ? {
        ...currentTicket,
        status: TicketStatus.FINALIZADO,
        sala: '',
        profissional: '',
        // Preserva o atendente para que o relatório por atendente continue funcionando após finalização
        atendente: (currentTicket as any)?.atendente ?? '',
        updatedAt: new Date(),
      }
      : null;

    const toPersist = {
      ATENDIMENTOSTATUS: funcionario.getRaw().ATENDIMENTOSTATUS,
      PARECERMEDICO: funcionario.getRaw().PARECERMEDICO,
      MEDICO: funcionario.getRaw().MEDICO,
      RECOMENDACAOMEDICA: funcionario.getRaw().RECOMENDACAOMEDICA,
      ALTURA_PARECER: options.altura || null,
      CONFINADO_PARECER: options.confinado || null,
      ASOINFO: asoInfoToPersist,
      EXAMES: funcionario.getRaw().EXAMES,
      ...(releasedTicket ? { TICKET: releasedTicket } : {}),
    } as Partial<SchedulingDocument>;

    if (!isSocOrigin(scheduledDoc)) {
      try {
        const snapshot = await this.enriquecerMedicoCoordenador(
          scheduledDoc.CODIGOEMPRESA,
          scheduledDoc.UNIDADEATENDIMENTO,
        );
        if (snapshot) {
          (toPersist as any).MEDICOCOORDENADOR = snapshot;
          this.logger.log(
            `[FINISH][ENRIQUECER_MEDICO_COORDENADOR] schedulingId=${scheduledId} medicoCoordenador=${snapshot.nome}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `[FINISH][ENRIQUECER_MEDICO_COORDENADOR_ERRO] schedulingId=${scheduledId} ${err.message}`,
        );
      }
    }

    if (releasedTicket) {
      this.logger.log(
        `[FINISH][TICKET_RELEASE] Scheduling ${scheduledId} liberado de sala/profissional no encerramento clinico.`,
      );
    }

    const updated = await this.schedulingsCollection.findOneAndUpdate(
      {
        _id: new ObjectId(scheduledId),
        ATENDIMENTOSTATUS: AtendimentoStatus.AVALIACAO_MEDICA,
      },
      { $set: toPersist },
      { returnDocument: 'after' },
    );
    const finalDoc = (updated?.value || updated) as SchedulingDocument;

    if (!finalDoc) {
      this.logger.warn(
        `[FINISH][RACE_BLOCKED] schedulingId=${scheduledId} ja foi finalizado por outra requisicao antes do enqueue do ASO.`,
      );
      throw new HttpException(
        {
          status: HttpStatus.CONFLICT,
          message:
            `Agendamento já finalizado por outra requisição antes do enqueue do ASO.`,
        },
        HttpStatus.CONFLICT,
      );
    }

    // --- GERAÇÃO DE ASO DIGITAL (BIOMETRIA/FACIAL) ---
    if (asooProcessingPayload && !isSocOrigin(finalDoc)) {
      try {
        this.logger.log(
          `[ASO_WORKER][START] Gerando ASO digital para schedulingId=${scheduledId} origem=${finalDoc.AUTENTICACAOATENDIMENTO?.metodo}`,
        );

        const workerResult = await this.socService.generateDigitalAso(
          finalDoc,
          options,
          effectiveOpinionIssuer,
        );

        if (workerResult && workerResult.url) {
          const workerUpdatedAt = new Date();
          const updateObj = buildWorkerAsoUpdate(workerResult, workerUpdatedAt);

          await this.schedulingsCollection.updateOne(
            { _id: new ObjectId(scheduledId) },
            updateObj,
          );

          this.logger.log(
            `[ASO_WORKER][SUCCESS] ASO digital gerado e persistido para schedulingId=${scheduledId}`,
          );

          // Atualiza o doc local para os próximos passos (e-mail, etc) sem destruir metadados
          applyWorkerAsoToLocalDoc(finalDoc, workerResult, workerUpdatedAt);

          const enrichmentPayload =
            buildAsoEnrichmentPayloadFromScheduling(finalDoc);
          if (enrichmentPayload) {
            await this.azureService.filaAsoEnriquecimento(enrichmentPayload);
            this.logger.log(
              `[ASO_WORKER][ENRICHMENT] ASO digital enfileirado para assinatura schedulingId=${scheduledId} medico=${enrichmentPayload.medico}`,
            );
          } else {
            this.logger.warn(
              `[ASO_WORKER][ENRICHMENT_SKIP] Payload incompleto para assinatura schedulingId=${scheduledId}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `[ASO_WORKER][ERROR] Falha ao gerar ASO digital para schedulingId=${scheduledId}: ${error.message}`,
        );

        // BIO/FACIAL: salva payload para retry pelo cron unificado
        if (!isSocOrigin(finalDoc)) {
          try {
            const retryPayload = await this.socService.buildWorkerPayload(
              finalDoc, options, effectiveOpinionIssuer,
            );
            if (retryPayload) {
              const now = new Date();
              await this.schedulingsCollection.updateOne(
                { _id: new ObjectId(scheduledId) },
                {
                  $set: {
                    'ASOINFO.status': 'FALHA',
                    'ASOINFO.error': error.message,
                    'ASOINFO.workerRetryPayload': retryPayload,
                    'ASOINFO.generalRetry': {
                      pending: true,
                      count: 0,
                      nextRetryAt: new Date(now.getTime() + 5 * 60 * 1000),
                      lastAttempt: now,
                    },
                  },
                },
              );
              this.logger.log(
                `[ASO_WORKER][RETRY_SCHEDULED] Retry agendado para schedulingId=${scheduledId}`,
              );
            }
          } catch (payloadError) {
            this.logger.error(
              `[ASO_WORKER][RETRY_FAIL] Erro ao preparar retry payload schedulingId=${scheduledId}: ${payloadError.message}`,
            );
          }
        }
      }
    }

    // --- ENFILEIRAMENTO APÓS PERSISTÊNCIA ---

    if (asooProcessingPayload) {
      if (!isSocOrigin(finalDoc)) {
        this.logger.log(
          `[ASO_SKIP_ORIGEM] schedulingId=${scheduledId} origem=${finalDoc.AUTENTICACAOATENDIMENTO?.metodo} — não enviado para cmso360-aso-generate`,
        );
      } else {
        await this.azureService.filaAsoProcessing(asooProcessingPayload);

        // Marca processingQueuedAt para evitar que enqueuePendingAsoProcessingForOperationalRelease
        // re-enfileire o mesmo ASO via CAS.
        await this.schedulingsCollection.updateOne(
          { _id: new ObjectId(scheduledId) },
          { $set: { 'ASOINFO.processingQueuedAt': new Date() } },
        );

        this.logger.log(
          `[ASO_ENQUEUE] schedulingId=${scheduledId} enfileirado para geracao no cmso360-aso-generate`,
        );
      }
    }

    for (const msg of examQueueMessages) {
      msg.funcionario = finalDoc;
      await this.azureService.filaResultadosExamesProcessar(msg);
      this.logger.log(
        `[QUEUE][RESULTADOS][FINISH] Reprocessamento disparado para grupo ${msg.grupo} no prontuario ${finalDoc.CODIGOPRONTUARIO}`,
      );
    }

    if (MedicalOpinionRules.shouldSendEmail(options)) {
      // Quando um ASO será gerado (SOC via fila ou BIOMETRIA/FACIAL inline), o
      // PARECER da equipe deve sair com o link de visualização — disparado pelo
      // callback de liberação (/internal/aso/result) — e não sem link no finish.
      const willGenerateAsoLive = asooProcessingPayload !== null;
      if (willGenerateAsoLive) {
        try {
          await this.schedulingsCollection.updateOne(
            { _id: new ObjectId(scheduledId) },
            {
              $set: {
                'ASOINFO.parecerEquipePending': true,
                ...(effectiveOpinionIssuer?.codigo || effectiveOpinionIssuer?.nome
                  ? { 'ASOINFO.parecerEquipeIssuer': effectiveOpinionIssuer }
                  : {}),
              },
            },
          );
          this.logger.log(
            `[PARECER_MEDICO][EMAIL][DEFERIDO] schedulingId=${scheduledId} — PARECER equipe aguardando ASO para envio com link.`,
          );
        } catch (error) {
          this.logger.error(
            `[PARECER_MEDICO][EMAIL][DEFERIDO_FAIL] Falha ao marcar parecerEquipePending schedulingId=${scheduledId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
      try {
        // Converte restricoes de objeto para texto legível antes de enviar o email
        if (options.opinionType === ParecerMedico.APTO_COM_RESTRICAO && options.laudoRestricao?.restricoes) {
          const restricoesRaw = options.laudoRestricao.restricoes;
          if (typeof restricoesRaw === 'object' && restricoesRaw !== null) {
            options = {
              ...options,
              laudoRestricao: {
                ...options.laudoRestricao,
                restricoes: this.formatarRestricoesParaTexto(restricoesRaw),
              },
            };
          }
        }

        // Se laudoRestricao não veio no payload, constrói a partir do exame clínico
        if (!options.laudoRestricao) {
          const exameClinico = (finalDoc.EXAMES || []).find(
            (e: any) => e.grupo === 'Exame Clínico',
          );
          const form = exameClinico?.formulario;
          if (
            form?.duracaoRestricaoDias &&
            String(form.duracaoRestricaoDias).trim() !== '' &&
            form?.restricoes &&
            typeof form.restricoes === 'object'
          ) {
            const periodoDias = parseInt(form.duracaoRestricaoDias, 10) || 30;
            const dataInicio =
              form.dataInicioRestricao ||
              new Date().toISOString().slice(0, 10);
            const dataInicioDate = new Date(dataInicio + 'T00:00:00');
            dataInicioDate.setDate(dataInicioDate.getDate() + periodoDias);
            const dataFim = dataInicioDate.toISOString().slice(0, 10);

            options = {
              ...options,
              laudoRestricao: {
                cid: '',
                descricaoCid: '',
                restricoes: this.formatarRestricoesParaTexto(
                  form.restricoes,
                ),
                periodoDias,
                dataInicio,
                dataFim,
                recomendacoes: form.recomendacoesRestricao || '',
              },
            };
          }
        }

        const securedFuncionarioForEmail =
          this.buildMedicalOpinionEmailScheduling(
            finalDoc as SchedulingDocument,
          );
        const emailTo = this.configService.get<string>('PARECER_MEDICO_EMAIL_TO')?.trim() || 'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,incompany@cmsocupacional.com.br';
        const emailCc = this.configService.get<string>('PARECER_MEDICO_EMAIL_CC')?.trim() || 'enfermagem@cmsocupacional.com.br,draandrea@cmsocupacional.com.br';

        const email: EmailType = {
          attachment: [],
          cc: emailCc,
          subject: `PARECER: ${funcionario.getRaw().NOME} - ${funcionario.getRaw().TIPOEXAMENOME}`,
          template: '',
          templatename: TemplateNames.PARECER_MEDICO,
          to: emailTo,
          data: {
            funcionario: securedFuncionarioForEmail as any,
            medicalOpinion: options,
            issuedBy: effectiveOpinionIssuer,
          },
        };

        await this.azureService.filaEnvioDeEmail(email);
      } catch (error) {
        this.logger.error(
          `[PARECER_MEDICO][EMAIL] Falha ao preparar/enfileirar e-mail seguro para schedulingId=${scheduledId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      }
    }

    if (funcionario.isCredenciada()) {
      this.logger.log(
        `[SOCGED][SKIP] Atendimento KIT CREDENCIADA: abortando trigger de upload em finishScheduling para schedulingId=${scheduledId}`,
      );
      return updated;
    }

    const socgedPayload = this.buildSocgedPayload(
      new FuncionarioEntity(finalDoc),
    );
    this.logger.log(
      `[SOCGED] finishScheduling disparando upload seq=${socgedPayload.sequencialFicha}`,
    );
    await this.azureService.filaUploadSocged(socgedPayload);

    // Redundância de segurança: enfileira SOC para exames FINALIZADO com URL
    // que porventura não tenham sido enfileirados pelo callback do worker.
    const exams = finalDoc?.EXAMES || [];
    for (let i = 0; i < exams.length; i++) {
      const ex = exams[i];
      if (ex.status === ExamStatus.FINALIZADO && ex.url && ex.grupo) {
        await this.azureService.filaResultadoExameSoc({
          schedulingId: scheduledId,
          grupo: ex.grupo,
          examIndex: i,
          requestedAt: new Date().toISOString(),
          codigoExame: ex.codigoExame,
          sequencialResultadoExame: ex.sequencialResultadoExame,
          sequencialFicha: finalDoc?.SEQUENCIAFICHA,
        });
      }
    }

    return updated;
  }
  /**
   * Callback interno do worker: aplica resultado de processamento de ASO no agendamento.
   * Backend e a fonte de verdade para transicoes de estado.
   */
  async applyAsoResultFromWorker(payload: {
    schedulingId: string;
    commandId?: string;
    status: import('./types/scheduling').SignatureStatus;
    signature?: import('./types/scheduling').DocumentSignatureInfo;
    url?: string;
    validacao?: string;
    error?: string;
    signatureError?: string;
    retry?: { pending?: boolean; count?: number; nextRetryAt?: Date | string };
    updatedAt?: Date | string;
    emailSent?: boolean;
  }) {
    const startedAt = Date.now();
    const { schedulingId } = payload;
    const now = new Date();

    const updatedAt =
      payload.updatedAt instanceof Date
        ? payload.updatedAt
        : payload.updatedAt
          ? new Date(payload.updatedAt)
          : now;

    const scheduling = await this.schedulingsCollection.findOne(
      { _id: new ObjectId(schedulingId) },
      { projection: { ASOINFO: 1, ASOSTATUS: 1, ALTURA_PARECER: 1, CONFINADO_PARECER: 1 } },
    );
    if (!scheduling) {
      throw new Error(`Agendamento ${schedulingId} nao encontrado.`);
    }

    const currentAsoInfo: any = (scheduling as any).ASOINFO ?? null;
    this.logger.log(
      `[OBS][ASO][APPLY][IN] schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'} fromStatus=${currentAsoInfo?.status ?? 'n/a'} toStatus=${payload.status}`,
    );

    const isDuplicateCommand =
      payload.commandId && currentAsoInfo?.lastCommandId === payload.commandId;
    const shouldRecoverReleaseEmail =
      isDuplicateCommand &&
      payload.status === 'LIBERADO' &&
      !currentAsoInfo?.emailSent;

    if (isDuplicateCommand && !shouldRecoverReleaseEmail) {
      this.logger.log(
        `[CALLBACK] Ignorando callback duplicado de ASO para id ${schedulingId} (commandId: ${payload.commandId})`,
      );
      return;
    }

    if (shouldRecoverReleaseEmail) {
      this.logger.warn(
        `[CALLBACK] Callback duplicado detectado para ${schedulingId}, mas e-mail de liberacao ainda nao enviado. Reprocessando envio.`,
      );
    }

    const shouldPreserveReleasedStatus =
      currentAsoInfo?.status === 'LIBERADO' && payload.status !== 'LIBERADO';

    if (shouldPreserveReleasedStatus) {
      this.logger.warn(
        `[CALLBACK] Preservando status LIBERADO para ${schedulingId} e atualizando metadados de assinatura. recebido=${payload.status}`,
      );
    }

    const persistedAsoStatus = shouldPreserveReleasedStatus
      ? ('LIBERADO' as const)
      : payload.status;

    const setDoc: any = {
      'ASOINFO.status': persistedAsoStatus,
      'ASOINFO.updatedAt': updatedAt,
      'ASOINFO.url': payload.url ?? currentAsoInfo?.url ?? null,
      'ASOINFO.validacao':
        payload.validacao ?? currentAsoInfo?.validacao ?? null,
      'ASOINFO.lastCommandId': payload.commandId,
      ASOSTATUS: mapToLegacyAsoStatus({
        currentLegacyStatus: (scheduling as any).ASOSTATUS,
        currentUrl: currentAsoInfo?.url,
        nextStatus: persistedAsoStatus,
        nextUrl: payload.url ?? currentAsoInfo?.url ?? null,
      }),
    };

    if (persistedAsoStatus === 'LIBERADO' || payload.url) {
      setDoc['ASOINFO.error'] = null;
    }

    if (payload.signature) {
      setDoc['ASOINFO.signature'] = { ...payload.signature, error: payload.signature.error ?? null };
    } else {
      if (payload.status === 'FALHA' || payload.error) {
        setDoc['ASOINFO.signature.status'] = 'FALHA';
        setDoc['ASOINFO.signature.error'] =
          payload.error || payload.signatureError;
      }

      if (payload.retry) {
        setDoc['ASOINFO.signature.retry'] = {
          count: payload.retry.count,
          pending: payload.retry.pending,
          nextRetryAt: payload.retry.nextRetryAt
            ? new Date(payload.retry.nextRetryAt)
            : null,
        };
      }
    }

    if (payload.emailSent === true) {
      setDoc['ASOINFO.emailSent'] = true;
    }

    // Usa aggregation pipeline para converter ASOINFO: null em {} antes de aplicar os campos,
    // evitando MongoServerError: "Cannot create field 'lastCommandId' in element {ASOINFO: null}"
    await this.schedulingsCollection.updateOne(
      { _id: new ObjectId(schedulingId) },
      [
        { $set: { ASOINFO: { $ifNull: ['$ASOINFO', {}] } } },
        { $set: setDoc },
      ],
    );

    if (
      persistedAsoStatus === 'LIBERADO' &&
      payload.emailSent !== true &&
      !currentAsoInfo?.emailSent
    ) {
      const schedulingAny = scheduling as any;
      const isInaptoAltura = schedulingAny.ALTURA_PARECER === 'INAPTO PARA TRABALHO EM ALTURA';
      const isInaptoConfinado = schedulingAny.CONFINADO_PARECER === 'INAPTO PARA ESPAÇO CONFINADO';
      if (isInaptoAltura || isInaptoConfinado) {
        this.logger.log(
          `[ASO_EMAIL][CALLBACK] ASO liberado mas inaptidao altura/confinado — email ASO_RELEASE suprimido para schedulingId=${schedulingId}`,
        );
      } else {
        try {
          await this.enqueueAsoReleaseEmailFromCallback(
            schedulingId,
            payload.url ?? currentAsoInfo?.url,
          );
        } catch (error) {
          this.logger.error(
            `[ASO_EMAIL][CALLBACK] Falha ao preparar/enfileirar e-mail seguro para schedulingId=${schedulingId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // Para FACIAL/BIOMETRIA: quando o provider é DIGITALIZADA (PSC indisponível ou
    // sem assinatura digital habilitada), o status fica PENDENTE mas o PDF já foi gerado.
    // Nesse caso, enviamos o email imediatamente sem aguardar assinatura digital.
    const signatureProvider = payload.signature?.provider ?? currentAsoInfo?.signature?.provider;
    const isDigitalizadaProvider = signatureProvider === 'DIGITALIZADA';
    const asoUrl = payload.url ?? currentAsoInfo?.url;
    const emailJaEnviado = payload.emailSent === true || currentAsoInfo?.emailSent === true;

    if (
      persistedAsoStatus === 'PENDENTE' &&
      isDigitalizadaProvider &&
      asoUrl &&
      !emailJaEnviado
    ) {
      this.logger.log(
        `[ASO_EMAIL][CALLBACK] ASO com provider DIGITALIZADA e status PENDENTE — enfileirando email para schedulingId=${schedulingId}`,
      );
      const schedulingAny = scheduling as any;
      const isInaptoAltura = schedulingAny.ALTURA_PARECER === 'INAPTO PARA TRABALHO EM ALTURA';
      const isInaptoConfinado = schedulingAny.CONFINADO_PARECER === 'INAPTO PARA ESPAÇO CONFINADO';
      if (isInaptoAltura || isInaptoConfinado) {
        this.logger.log(
          `[ASO_EMAIL][CALLBACK] DIGITALIZADA mas inaptidao altura/confinado — email suprimido para schedulingId=${schedulingId}`,
        );
      } else {
        try {
          await this.enqueueAsoReleaseEmailFromCallback(schedulingId, asoUrl);
        } catch (error) {
          this.logger.error(
            `[ASO_EMAIL][CALLBACK] Falha ao enfileirar email DIGITALIZADA para schedulingId=${schedulingId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    // PARECER médico para a equipe com link do ASO: quando o envio foi postergado
    // no finish (ASOINFO.parecerEquipePending) e o ASO já tem URL (LIBERADO ou
    // PENDENTE com provider DIGITALIZADA), enfileira o PARECER com o link agora.
    const parecerTeamDue =
      currentAsoInfo?.parecerEquipePending === true &&
      currentAsoInfo?.parecerEquipeEmailSent !== true;
    const parecerTeamHasAsoUrl = Boolean(asoUrl);

    if (parecerTeamDue && parecerTeamHasAsoUrl) {
      try {
        const parecerFileUrl = this.generateReadOnlyEmailLink(
          asoUrl,
          `[PARECER_EQUIPE_EMAIL] schedulingId=${schedulingId}`,
        );
        await this.enqueueParecerMedicoToTeam(schedulingId, {
          asoFileUrl: parecerFileUrl,
        });
      } catch (error) {
        this.logger.error(
          `[PARECER_EQUIPE_EMAIL] Falha ao enfileirar PARECER médico para a equipe (schedulingId=${schedulingId}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `[OBS][ASO][APPLY][OUT] schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'} status=${payload.status} durationMs=${Date.now() - startedAt}`,
    );
  }

  /**
   * Chamado pelo worker quando um ASO é assinado digitalmente APÓS já ter sido
   * entregue ao cliente como DIGITALIZADA (sem assinatura).
   * Atualiza a URL do ASO com o PDF assinado e reenvia o e-mail ao cliente
   * com subject "[ATUALIZADO] ASO Assinado Digitalmente".
   */
  async applyAsoSignedAfterDelivery(payload: {
    schedulingId: string;
    url: string;
    commandId?: string;
  }) {
    const { schedulingId, url } = payload;
    this.logger.log(
      `[ASO_SIGNED_LATE][IN] schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'}`,
    );

    if (!url) {
      throw new Error(
        `[ASO_SIGNED_LATE] URL do ASO ausente para schedulingId=${schedulingId}.`,
      );
    }

    // Atualiza URL e marca como assinado-após-entrega no Mongo
    // Usa aggregation pipeline para converter ASOINFO: null em {} antes de aplicar os campos,
    // evitando MongoServerError: "Cannot create field 'url' in element {ASOINFO: null}"
    const setDoc = {
      'ASOINFO.url': url,
      'ASOINFO.status': 'LIBERADO',
      'ASOINFO.signedAfterDelivery': true,
      'ASOINFO.signedAfterDeliveryAt': new Date(),
      'ASOINFO.signature.status': 'ASSINADO',
      'ASOINFO.signature.signedAt': new Date(),
      'ASOINFO.signature.liberadoComoDigitalizada': false,
    };
    await this.schedulingsCollection.updateOne(
      { _id: new ObjectId(schedulingId) },
      [
        { $set: { ASOINFO: { $ifNull: ['$ASOINFO', {}] } } },
        { $set: setDoc },
      ],
    );

    // Re-envia o email com o ASO assinado digitalmente
    try {
      await this.enqueueAsoUpdatedEmailAfterSignature(schedulingId, url);
    } catch (error) {
      this.logger.error(
        `[ASO_SIGNED_LATE] Falha ao enfileirar email atualizado para schedulingId=${schedulingId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(
      `[ASO_SIGNED_LATE][OUT] schedulingId=${schedulingId} — URL atualizada e email re-enfileirado.`,
    );
  }

  /**
   * Enfileira um e-mail de "ASO Atualizado" com o PDF assinado digitalmente,
   * para casos em que o ASO foi inicialmente entregue como DIGITALIZADA e
   * posteriormente o médico se autenticou no PSC e assinou.
   *
   * Não verifica `emailSent` — a intenção é SEMPRE re-enviar neste caso.
   */
  private async enqueueAsoUpdatedEmailAfterSignature(
    schedulingId: string,
    signedUrl: string,
  ): Promise<void> {
    const scheduling = (await this.getSchedulingById(
      schedulingId,
    )) as SchedulingDocument | null;

    if (!scheduling) {
      this.logger.warn(
        `[ASO_SIGNED_LATE_EMAIL] Agendamento não encontrado: schedulingId=${schedulingId}.`,
      );
      return;
    }

    const parecer = String(scheduling.PARECERMEDICO || '').trim().toUpperCase();
    if (parecer !== 'APTO') {
      this.logger.log(
        `[ASO_SIGNED_LATE_EMAIL] Parecer ${parecer || 'n/d'} — e-mail ignorado para schedulingId=${schedulingId}.`,
      );
      return;
    }

    const codEmpresa = String(scheduling.CODIGOEMPRESA || '').trim();
    let companyContacts: string[] = [];
    if (codEmpresa) {
      try {
        const contacts = await this.socService.getCompanyContacts(codEmpresa);
        if (Array.isArray(contacts)) {
          companyContacts = contacts.filter((e) => Boolean(e));
        }
      } catch {
        this.logger.warn(
          `[ASO_SIGNED_LATE_EMAIL] Falha ao buscar contatos da empresa ${codEmpresa}. Usando fallback interno.`,
        );
      }
    }

    const hasCompanyContacts = companyContacts.length > 0;
    const forcedRecipient = String(
      process.env.ASO_RELEASE_FORCE_TO || '',
    ).trim();
    const asoFallbackTo = String(process.env.ASO_RELEASE_EMAIL_FALLBACK_TO || 'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,esocial@cmsocupacional.com.br,apoio.esocial@cmsocupacional.com.br').trim();
    const targetTo = hasCompanyContacts
      ? companyContacts.join(',')
      : asoFallbackTo;
    const finalTargetTo = forcedRecipient || targetTo;

    this.assertCanonicalAsoReleaseUrl(
      signedUrl,
      `[ASO_SIGNED_LATE_EMAIL] schedulingId=${schedulingId}`,
    );

    const asoFileUrl = this.generateReadOnlyEmailLink(
      signedUrl,
      `[ASO_SIGNED_LATE_EMAIL] schedulingId=${schedulingId}`,
    );

    const documentName = formatDocumentFileName({
      prefix: 'ASO',
      nome: scheduling.NOME,
      empresa: scheduling.NOMEEMPRESA,
      tipo: scheduling.TIPOEXAMENOME || 'ASO',
      data: scheduling.DATAAGENDAMENTO,
    });

    const email: EmailType = {
      to: finalTargetTo,
      bcc: String(process.env.ASO_RELEASE_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br,draandrea@cmsocupacional.com.br,ricardo@cmsocupacional.com.br').trim(),
      subject: `[ATUALIZADO] CMSO - ASO Assinado Digitalmente - ${scheduling.NOME} - ${scheduling.NOMEEMPRESA}`,
      templatename: TemplateNames.ASO_RELEASE,
      attachment: [],
      data: {
        asoInfo: {
          nomeFuncionario: scheduling.NOME,
          nomeEmpresa: scheduling.NOMEEMPRESA,
          tipoExame: scheduling.TIPOEXAMENOME,
          data: scheduling.DATAAGENDAMENTO,
          chegada: this.buildArrivalLabel(scheduling),
          cpf: scheduling.CPFFUNCIONARIO,
          parecer: scheduling.PARECERMEDICO || undefined,
          asoFileName: documentName,
          asoFileUrl,
          anotacoes: scheduling.ANOTACOES || undefined,
          observacoesParecer: scheduling.ASOINFO?.observacoesParecer || [],
          examesRealizados: (scheduling.EXAMES || []).map((ex) => ({
            nomeExame: ex.nomeExame,
            status: ex.status,
            dataExame: ex.dataExame ?? undefined,
            sala: ex.sala,
            profissional: ex.profissional,
            url: ex.url,
          })),
          isAssinadoDigitalmente: true,
        },
      },
    };

    await this.azureService.filaEnvioDeEmail(email);

    // Idempotência: envia o PARECER médico para a equipe apenas uma vez,
    // contendo o link de visualização do ASO assinado digitalmente.
    try {
      await this.enqueueParecerMedicoToTeam(schedulingId, {
        asoFileUrl,
        subjectSuffix: ' (ASO assinado)',
      });
    } catch (error) {
      this.logger.error(
        `[ASO_SIGNED_LATE_EMAIL] Falha ao enfileirar PARECER médico para a equipe (schedulingId=${schedulingId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(
      `[ASO_SIGNED_LATE_EMAIL] E-mail "[ATUALIZADO]" enfileirado para schedulingId=${schedulingId} destinatarios=${finalTargetTo}`,
    );
  }

  private async updateAsoInfoField(
    schedulingId: string,
    field: string,
    value: unknown,
  ): Promise<void> {
    await this.schedulingsCollection.updateOne(
      { _id: new ObjectId(schedulingId) },
      { $set: { [`ASOINFO.${field}`]: value } },
    );
  }

  /**
   * Enfileira o PARECER médico para a equipe com o link de visualização do ASO.
   * Idempotente por ASOINFO.parecerEquipeEmailSent.
   * Quando `asoFileUrl` é fornecido, o template renderiza o CTA "Visualizar ASO".
   */
  private async enqueueParecerMedicoToTeam(
    schedulingId: string,
    opts: { asoFileUrl?: string; subjectSuffix?: string },
  ): Promise<void> {
    const scheduling = (await this.getSchedulingById(
      schedulingId,
    )) as SchedulingDocument | null;

    if (!scheduling) {
      this.logger.warn(
        `[PARECER_EQUIPE_EMAIL] Agendamento não encontrado: schedulingId=${schedulingId}.`,
      );
      return;
    }

    if (scheduling.ASOINFO?.parecerEquipeEmailSent) {
      this.logger.log(
        `[PARECER_EQUIPE_EMAIL] PARECER médico para a equipe já enviado anteriormente — skip (schedulingId=${schedulingId}).`,
      );
      return;
    }

    const teamOpinion: MedicalOpinionData = {
      opinionType: (scheduling.PARECERMEDICO as ParecerMedico) || null,
      details: scheduling.RECOMENDACAOMEDICA || null,
      isProgrammed: null,
      orientacaoId: null,
      laudoPCD: null,
      laudoRestricao: null,
      altura: (scheduling.ALTURA_PARECER as ParecerTrabalhoAltura) || null,
      confinado: (scheduling.CONFINADO_PARECER as ParecerEspaçoConfinado) || null,
      examesParaRepetir: [],
    };

    const storedIssuer = scheduling.ASOINFO
      ?.parecerEquipeIssuer as IUserInfo | undefined;
    const teamIssuer: IUserInfo | undefined = storedIssuer?.codigo ||
      storedIssuer?.nome
      ? storedIssuer
      : scheduling.ASOINFO?.professional
        ? {
            nome: scheduling.ASOINFO.professional.nome || '',
            cpf: scheduling.ASOINFO.professional.cpf || '',
            perfil: 'MEDICO',
            codigo: scheduling.ASOINFO.professional.codigo || '',
            conselho: scheduling.ASOINFO.professional.conselho || '',
            ufconselho: scheduling.ASOINFO.professional.ufconselho || '',
          }
        : undefined;

    const parecerEmailTo =
      this.configService.get<string>('PARECER_MEDICO_EMAIL_TO')?.trim() ||
      'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,incompany@cmsocupacional.com.br';
    const parecerEmailCc =
      this.configService.get<string>('PARECER_MEDICO_EMAIL_CC')?.trim() ||
      'enfermagem@cmsocupacional.com.br,draandrea@cmsocupacional.com.br';

    const asoInfoData: any = {
      nomeFuncionario: scheduling.NOME,
      nomeEmpresa: scheduling.NOMEEMPRESA,
      tipoExame: scheduling.TIPOEXAMENOME,
      data: scheduling.DATAAGENDAMENTO,
      cpf: scheduling.CPFFUNCIONARIO,
      parecer: scheduling.PARECERMEDICO || undefined,
      observacoesParecer: scheduling.ASOINFO?.observacoesParecer || [],
    };
    if (opts.asoFileUrl) {
      asoInfoData.asoFileUrl = opts.asoFileUrl;
    }

    await this.azureService.filaEnvioDeEmail({
      attachment: [],
      cc: parecerEmailCc,
      subject: `PARECER: ${scheduling.NOME} - ${scheduling.TIPOEXAMENOME}${opts.subjectSuffix ?? ''}`,
      template: '',
      templatename: TemplateNames.PARECER_MEDICO,
      to: parecerEmailTo,
      data: {
        funcionario: scheduling as any,
        medicalOpinion: teamOpinion,
        issuedBy: teamIssuer,
        asoInfo: asoInfoData,
      },
    });

    await this.updateAsoInfoField(schedulingId, 'parecerEquipeEmailSent', true);

    this.logger.log(
      `[PARECER_EQUIPE_EMAIL] PARECER médico para a equipe enfileirado com link ASO para schedulingId=${schedulingId}.`,
    );
  }


  private generateReadOnlyEmailLink(
    urlOrPath: string,
    context: string,
  ): string {
    const rawUrl = String(urlOrPath || '').trim();
    if (!rawUrl) {
      throw new Error(`${context}: URL vazia para geracao de SAS.`);
    }

    try {
      return this.azureService.generateSasUrlFromUrl(
        rawUrl,
        this.EMAIL_LINK_SAS_EXPIRATION_MINUTES,
      );
    } catch (error) {
      throw new Error(
        `${context}: falha ao gerar SAS URL somente leitura (5 dias): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private assertCanonicalAsoReleaseUrl(
    rawUrl: string,
    context: string,
  ): void {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch (error) {
      throw new Error(
        `${context}: URL do ASO invalida para entrega ao cliente (${error instanceof Error ? error.message : String(error)}).`,
      );
    }

    const decodedPath = decodeURIComponent(parsed.pathname || '');
    const normalizedPath = decodedPath.toUpperCase();
    const fileName = String(decodedPath.split('/').pop() || '').toUpperCase();

    if (fileName.startsWith('PRT_') || normalizedPath.includes('/PRONTUARIOS/')) {
      throw new Error(
        `${context}: fluxo bloqueado por URL de prontuario (${fileName || decodedPath}).`,
      );
    }

    if (!normalizedPath.includes('/ASO/') || !fileName.startsWith('ASO_')) {
      throw new Error(
        `${context}: URL do ASO fora do padrao canonico (${fileName || decodedPath}).`,
      );
    }
  }

  /**
   * Converte o objeto RestricoesMedicas em texto legível para o email.
   */
  private formatarRestricoesParaTexto(restricoes: any): string {
    if (!restricoes || typeof restricoes !== 'object') {
      return String(restricoes ?? '');
    }

    const itens: string[] = [];

    if (restricoes.evitarCarregarPeso) {
      const peso = restricoes.pesoMaximoKg ? ` (máx. ${restricoes.pesoMaximoKg}kg)` : '';
      itens.push(`Evitar carregar peso excessivo${peso}`);
    }
    if (restricoes.evitarElevacaoBracos) {
      const tipo = restricoes.tipoElevacaoBracos ? ` - ${restricoes.tipoElevacaoBracos}` : '';
      itens.push(`Evitar elevação dos braços acima do nível dos ombros${tipo}`);
    }
    if (restricoes.evitarCurvarTronco) {
      itens.push('Evitar curvar tronco com frequência');
    }
    if (restricoes.evitarEscadas) {
      itens.push('Evitar subir/descer escadas ou degraus');
    }
    if (restricoes.evitarLongasCaminhadas) {
      itens.push('Evitar longas caminhadas');
    }
    if (restricoes.evitarAlterarPostura) {
      itens.push('Evitar alterar postura sentado e em pé');
    }
    if (restricoes.outros && restricoes.descricaoOutros) {
      itens.push(`Outros: ${restricoes.descricaoOutros}`);
    } else if (restricoes.outros) {
      itens.push('Outras restrições');
    }

    return itens.length > 0 ? itens.map(i => `• ${i}`).join('\n') : '';
  }

  private buildMedicalOpinionEmailScheduling(
    scheduling: SchedulingDocument,
  ): SchedulingDocument {
    const schedulingId = String(scheduling?._id || 'n/a');

    return {
      ...scheduling,
      EXAMES: (scheduling.EXAMES || []).map((exam: any) => ({
        ...exam,
        url: exam?.url
          ? this.generateReadOnlyEmailLink(
            exam.url,
            `[PARECER_MEDICO] exame=${exam?.nomeExame || exam?.grupo || 'n/d'} schedulingId=${schedulingId}`,
          )
          : exam?.url,
      })),
      ANEXOS: (scheduling.ANEXOS || []).map((attachment: any) => ({
        ...attachment,
        StoragePath: attachment?.StoragePath
          ? this.generateReadOnlyEmailLink(
            attachment.StoragePath,
            `[PARECER_MEDICO] anexo=${attachment?.Name || 'n/d'} schedulingId=${schedulingId}`,
          )
          : attachment?.StoragePath,
      })),
    } as SchedulingDocument;
  }

  /**
   * Enfileira e-mail de liberacao de ASO a partir do callback de status.
   * Mantem idempotencia por ASOINFO.emailSent.
   */
  private async enqueueAsoReleaseEmailFromCallback(
    schedulingId: string,
    fallbackAsoUrl?: string,
  ): Promise<void> {
    const scheduling = (await this.getSchedulingById(
      schedulingId,
    )) as SchedulingDocument | null;

    if (!scheduling) {
      this.logger.warn(
        `[ASO_EMAIL][CALLBACK] Agendamento nao encontrado para schedulingId=${schedulingId}.`,
      );
      return;
    }

    if (scheduling.ASOINFO?.emailSent) {
      this.logger.log(
        `[ASO_EMAIL][CALLBACK] E-mail ja estava marcado como enviado para schedulingId=${schedulingId}.`,
      );
      return;
    }

    const parecer = String(scheduling.PARECERMEDICO || '')
      .trim()
      .toUpperCase();
    if (parecer !== 'APTO') {
      this.logger.log(
        `[ASO_EMAIL][CALLBACK] Parecer ${parecer || 'n/d'} - envio de e-mail ignorado para schedulingId=${schedulingId}.`,
      );
      return;
    }

    const isInaptoAltura = String(scheduling.ALTURA_PARECER || '') === 'INAPTO PARA TRABALHO EM ALTURA';
    const isInaptoConfinado = String(scheduling.CONFINADO_PARECER || '') === 'INAPTO PARA ESPAÇO CONFINADO';
    if (isInaptoAltura || isInaptoConfinado) {
      this.logger.log(
        `[ASO_EMAIL][CALLBACK] ASO liberado com parecer APTO mas inaptidao altura/confinado — email ASO_RELEASE suprimido para schedulingId=${schedulingId}.`,
      );
      return;
    }

    const codEmpresa = String(scheduling.CODIGOEMPRESA || '').trim();
    let companyContacts: string[] = [];
    if (codEmpresa) {
      try {
        const contacts = await this.socService.getCompanyContacts(codEmpresa);
        if (Array.isArray(contacts)) {
          companyContacts = contacts.filter((email) => Boolean(email));
        }
      } catch (error) {
        this.logger.warn(
          `[ASO_EMAIL][CALLBACK] Falha ao buscar contatos da empresa ${codEmpresa}. Usando fallback interno.`,
        );
      }
    }

    const hasCompanyContacts = companyContacts.length > 0;
    const forcedReleaseRecipient = String(
      process.env.ASO_RELEASE_FORCE_TO || '',
    ).trim();
    const asoFallbackTo = String(process.env.ASO_RELEASE_EMAIL_FALLBACK_TO || 'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,esocial@cmsocupacional.com.br,apoio.esocial@cmsocupacional.com.br').trim();
    const targetTo = hasCompanyContacts
      ? companyContacts.join(',')
      : asoFallbackTo;
    const finalTargetTo = forcedReleaseRecipient || targetTo;
    const template = forcedReleaseRecipient
      ? TemplateNames.ASO_RELEASE
      : hasCompanyContacts
        ? TemplateNames.ASO_RELEASE
        : TemplateNames.ASO_NO_CONTACTS;
    const asoRawUrl = String(
      scheduling.ASOINFO?.url || fallbackAsoUrl || '',
    ).trim();
    if (!asoRawUrl) {
      throw new Error(
        `[ASO_EMAIL][CALLBACK] URL do ASO ausente para schedulingId=${schedulingId}. E-mail nao enviado para evitar exposicao insegura.`,
      );
    }
    this.assertCanonicalAsoReleaseUrl(
      asoRawUrl,
      `[ASO_EMAIL][CALLBACK] schedulingId=${schedulingId}`,
    );
    const asoFileUrl = this.generateReadOnlyEmailLink(
      asoRawUrl,
      `[ASO_EMAIL][CALLBACK] schedulingId=${schedulingId}`,
    );
    const documentName = formatDocumentFileName({
      prefix: 'ASO',
      nome: scheduling.NOME,
      empresa: scheduling.NOMEEMPRESA,
      tipo: scheduling.TIPOEXAMENOME || 'ASO',
      data: scheduling.DATAAGENDAMENTO,
    });
    const formatDuration = (dataExame?: string | Date | null): string => {
      if (!dataExame) return '-';
      const ticketTime = scheduling.TICKET?.updatedAt || scheduling.TICKET?.emissao;
      if (!ticketTime) return '-';

      const start = new Date(ticketTime);
      const end = new Date(dataExame);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return '-';
      }

      const diffMinutes = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );
      if (diffMinutes <= 0) return '-';
      return `${diffMinutes} min`;
    };

    const email: EmailType = {
      to: finalTargetTo,
      bcc: String(process.env.ASO_RELEASE_EMAIL_BCC || 'tecnologia@cmsocupacional.com.br,draandrea@cmsocupacional.com.br,ricardo@cmsocupacional.com.br').trim(),
      subject: `CMSO - Atestado de Saude Ocupacional (ASO) - ${scheduling.NOME} - ${scheduling.NOMEEMPRESA}`,
      templatename: template,
      attachment: [],
      data: {
        asoInfo: {
          nomeFuncionario: scheduling.NOME,
          nomeEmpresa: scheduling.NOMEEMPRESA,
          tipoExame: scheduling.TIPOEXAMENOME,
          data: scheduling.DATAAGENDAMENTO,
          chegada: this.buildArrivalLabel(scheduling),
          cpf: scheduling.CPFFUNCIONARIO,
          parecer: scheduling.PARECERMEDICO || undefined,
          asoFileName: documentName,
          asoFileUrl,
          anotacoes: scheduling.ANOTACOES || undefined,
          observacoesParecer: scheduling.ASOINFO?.observacoesParecer || [],
          examesRealizados: (scheduling.EXAMES || []).map((ex) => ({
            nomeExame: ex.nomeExame,
            status: ex.status,
            dataExame: ex.dataExame ?? undefined,
            sala: ex.sala,
            profissional: ex.profissional,
            duracao: formatDuration(ex.dataExame),
            url: ex.url,
          })),
        },
      },
    };

    await this.azureService.filaEnvioDeEmail(email);

    await this.schedulingsCollection.updateOne(
      { _id: scheduling._id as any },
      { $set: { 'ASOINFO.emailSent': true } },
    );
    this.logger.log(
      `[ASO_EMAIL][CALLBACK] E-mail de liberacao enfileirado para schedulingId=${schedulingId} destinatarios=${finalTargetTo}`,
    );
  }

  private buildArrivalLabel(
    scheduling: SchedulingDocument,
  ): string | undefined {
    const emittedAt = scheduling.TICKET?.emissao;
    const unidade = String(
      scheduling.TICKET?.unidade ||
      scheduling.UNIDADEATENDIMENTO ||
      scheduling.NOMEUNIDADE ||
      '',
    ).trim();

    let emittedAtLabel = '';
    if (emittedAt) {
      const date = emittedAt instanceof Date ? emittedAt : new Date(emittedAt);
      if (!Number.isNaN(date.getTime())) {
        emittedAtLabel = new Intl.DateTimeFormat('pt-BR', {
          timeZone: this.BRAZIL_TIMEZONE,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date);
      }
    }

    if (emittedAtLabel && unidade) {
      return `${emittedAtLabel} - ${unidade}`;
    }

    return emittedAtLabel || unidade || undefined;
  }

  /**
   * Callback interno do worker: atualizacao de assinatura de um exame.
   * Atualiza signature/url e recalcula o status do atendimento.
   */
  async applyExamSignatureUpdateFromWorker(payload: {
    schedulingId: string;
    grupoExame: string;
    signature: import('./types/scheduling').DocumentSignatureInfo;
    url?: string;
    commandId?: string;
  }) {
    const { schedulingId, grupoExame, signature, url } = payload;
    const normalizedGrupoExame = this.normalizeGroupName(grupoExame);
    const normalizedStatus = mapStatusToPtBr(String(signature?.status || ''));
    const normalizedSignature = {
      ...signature,
      status: normalizedStatus,
    };
    const filter = { _id: new ObjectId(schedulingId) };
    const scheduledDoc =
      await this.schedulingsCollection.findOne<
        import('./types/scheduling').SchedulingDocument
      >(filter);
    if (!scheduledDoc)
      throw new Error(`Agendamento ${schedulingId} não encontrado.`);

    if (payload.commandId) {
      const existingExam = scheduledDoc.EXAMES.find(
        (e) => this.normalizeGroupName(e.grupo) === normalizedGrupoExame,
      );
      if (existingExam?.signature?.lastCommandId === payload.commandId) {
        this.logger.log(
          `[CALLBACK] Ignorando callback duplicado para grupo ${grupoExame} (commandId: ${payload.commandId})`,
        );
        return;
      }
    }

    const funcionario = new FuncionarioEntity(scheduledDoc);

    const modifiedIndices: number[] = [];
    funcionario.getRaw().EXAMES.forEach((ex: any, idx: number) => {
      if (this.normalizeGroupName(ex.grupo) !== normalizedGrupoExame) return;
      if (ex.repeticao && ex.status !== ExamStatus.PENDENTE) return;

      const isSigned = normalizedStatus === 'ASSINADO';
      const isNotRequired = normalizedStatus === 'DIGITALIZADA';
      const isWaitingSignature =
        normalizedStatus === 'PENDENTE' || normalizedStatus === 'PROCESSANDO';

      const patch: any = {
        signature: {
          ...normalizedSignature,
          lastCommandId: payload.commandId,
        },
      };

      if (url) patch.url = url;
      const finalStatusByGroup =
        getExamesList()[ex.grupo || '']?.[0]?.statusFinalizacao ??
        ExamStatus.FINALIZADO;

      if (isSigned || (url && isNotRequired)) {
        patch.status = finalStatusByGroup;
      } else if (url && isWaitingSignature) {
        patch.status = finalStatusByGroup;
      }
      funcionario.updateExameAtIndex(idx, patch);
      modifiedIndices.push(idx);
    });

    if (modifiedIndices.length === 0) {
      throw new Error(
        `Nenhum exame do grupo ${grupoExame} encontrado em schedulingId=${schedulingId}`,
      );
    }

    const previousStatus = scheduledDoc.ATENDIMENTOSTATUS as AtendimentoStatus;
    funcionario.updateAtendimentoStatus(previousStatus);

    // --- Lógica de Auto-Liberação (migrada do worker para o backend como orquestrador) ---
    const podeLiberar =
      funcionario.isAptoSomenteClinico() ||
      funcionario.isAptoClinicoAudiometria() ||
      funcionario.isAptoClinicoAcuidade() ||
      funcionario.isAptoClinicoAudiometriaAcuidade();

    const asoInfoToPersist = funcionario.getRaw().ASOINFO;
    const updatePayload: any = {
      $set: {
        ATENDIMENTOSTATUS: funcionario.getRaw().ATENDIMENTOSTATUS,
        PARECERMEDICO: funcionario.getRaw().PARECERMEDICO,
        ASOINFO: asoInfoToPersist,
      },
    };

    modifiedIndices.forEach((idx) => {
      const ex = funcionario.getRaw().EXAMES[idx];
      updatePayload.$set[`EXAMES.${idx}.status`] = ex.status;
      updatePayload.$set[`EXAMES.${idx}.url`] = ex.url;
      updatePayload.$set[`EXAMES.${idx}.signature`] = ex.signature;
    });

    if (
      podeLiberar &&
      funcionario.getRaw().ATENDIMENTOSTATUS !== AtendimentoStatus.FINALIZADO
    ) {
      const doctor = funcionario.getMedicoClinico();
      const clinicalExam = funcionario
        .getRaw()
        .EXAMES.find((e) => e.grupo === 'Exame Clínico');
      const opinionType =
        clinicalExam?.formulario?.conclusao?.toUpperCase() === 'APTO'
          ? ParecerMedico.APTO
          : (clinicalExam?.formulario?.conclusao as ParecerMedico) ||
          ParecerMedico.APTO;
      if (doctor) {
        const autoReleaseCredentials =
          this.extractPendingAutoReleaseCredentials(scheduledDoc, doctor);
        this.logger.log(
          `[AUTO-RELEASE] Credencial temporaria para ASO schedulingId=${schedulingId} found=${Boolean(autoReleaseCredentials?.pin)} doctorCodigo=${doctor?.codigo || 'n/a'}`,
        );
        this.logger.log(
          `[AUTO-RELEASE] Disparando finalização automática para ${schedulingId} após atualização de assinatura no grupo ${grupoExame}`,
        );

        // Persiste primeiro a assinatura/URL do exame para que o finishScheduling
        // recarregue o prontuário já com os dados assinados.
        await this.schedulingsCollection.updateOne(
          { _id: new ObjectId(schedulingId) },
          updatePayload,
        );

        await this.finishScheduling(
          schedulingId,
          doctor,
          { opinionType },
          autoReleaseCredentials,
        );

        return; // finishScheduling já realizou o update e disparou as filas necessárias
      }
    }

    await this.schedulingsCollection.updateOne(
      { _id: new ObjectId(schedulingId) },
      updatePayload,
    );

    // Disparo antecipado para SOCGED se todos os exames estiverem finalizados
    await this.maybeTriggerSocgedUpload(funcionario);
  }

  /**
   * Callback interno do worker: atualização de resultado técnico de exame (scraper/integrações).
   * Backend aplica as regras de negócio e persiste o estado final.
   */
  async applyExamResultFromWorker(payload: {
    schedulingId: string;
    examCodes: string[];
    url: string;
    source?: string;
    commandId?: string;
  }) {
    const { schedulingId, examCodes, url, source } = payload;
    const filter = { _id: new ObjectId(schedulingId) };

    const scheduledDoc =
      await this.schedulingsCollection.findOne<SchedulingDocument>(filter);
    if (!scheduledDoc)
      throw new Error(`Agendamento ${schedulingId} não encontrado.`);

    const matchingExams = (scheduledDoc.EXAMES || []).filter((ex) =>
      examCodes.includes(ex.codigoExame),
    );
    if (
      payload.commandId &&
      matchingExams.length > 0 &&
      matchingExams.every(
        (ex) => ex.signature?.lastCommandId === payload.commandId,
      )
    ) {
      // Se o commandId já foi processado (pelo signature/exam-updated) mas o exame
      // já está FINALIZADO, enfileira SOC mesmo assim — o signature callback não
      // enfileira SOC, apenas o result-updated é responsável por isso.
      if (
        matchingExams.every((ex) => ex.status === ExamStatus.FINALIZADO) &&
        matchingExams.some((ex) => ex?.grupo)
      ) {
        this.logger.log(
          `[SOC_ENQUEUE][DUPLICATE_FINALIZADO] Enfileirando SOC para exames já finalizados com commandId duplicado | schedulingId=${schedulingId} | examCodes=[${examCodes.join(',')}]`,
        );
        (scheduledDoc.EXAMES || []).forEach((ex, idx) => {
          if (examCodes.includes(ex.codigoExame) && ex?.grupo) {
            this.azureService.filaResultadoExameSoc({
              schedulingId,
              grupo: ex.grupo,
              examIndex: idx,
              requestedAt: new Date().toISOString(),
              codigoExame: ex.codigoExame,
              sequencialResultadoExame: ex.sequencialResultadoExame,
              sequencialFicha: scheduledDoc.SEQUENCIAFICHA,
            });
          }
        });
      }
      this.logger.log(
        `[CALLBACK][EXAM_RESULT] Ignorando callback duplicado schedulingId=${schedulingId} commandId=${payload.commandId}`,
      );
      return;
    }
    if (
      matchingExams.length > 0 &&
      matchingExams.every(
        (ex) => ex.status === ExamStatus.FINALIZADO && ex.url === url,
      )
    ) {
      this.logger.log(
        `[CALLBACK][EXAM_RESULT] Estado já aplicado schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'} examCodes=${examCodes.join(',')}`,
      );
      if (payload.commandId) {
        const alreadyAppliedSet: Record<string, string> = {};
        (scheduledDoc.EXAMES || []).forEach((ex, idx) => {
          if (examCodes.includes(ex.codigoExame)) {
            alreadyAppliedSet[`EXAMES.${idx}.signature.lastCommandId`] =
              payload.commandId!;
          }
        });
        if (Object.keys(alreadyAppliedSet).length > 0) {
          await this.schedulingsCollection.updateOne(filter, {
            $set: alreadyAppliedSet,
          });
        }
      }
      // Enfileira SOC mesmo quando estado já aplicado (ex: exames sem assinatura digital
      // onde o callback signature/exam-updated já finalizou o exame antes do result-updated).
      this.logger.log(
        `[SOC_ENQUEUE][JA_APLICADO] Enfileirando SOC para exames já finalizados | schedulingId=${schedulingId} | examCodes=[${examCodes.join(',')}] | url=${url}`,
      );
      (scheduledDoc.EXAMES || []).forEach((ex, idx) => {
        if (examCodes.includes(ex.codigoExame) && ex?.grupo) {
          this.azureService.filaResultadoExameSoc({
            schedulingId,
            grupo: ex.grupo,
            examIndex: idx,
            requestedAt: new Date().toISOString(),
            codigoExame: ex.codigoExame,
            sequencialResultadoExame: ex.sequencialResultadoExame,
            sequencialFicha: scheduledDoc.SEQUENCIAFICHA,
          });
        }
      });
      return;
    }

    const previousAtendimentoStatus = scheduledDoc.ATENDIMENTOSTATUS;
    this.logger.log(
      `[OBS][EXAM_RESULT][APPLY][IN] schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'} source=${source ?? 'n/a'} examCodes=${examCodes.join(',')} atendimentoAtual=${previousAtendimentoStatus ?? 'n/a'}`,
    );

    const funcionario = new FuncionarioEntity(scheduledDoc);

    const modifiedIndices: number[] = [];
    funcionario.getRaw().EXAMES = (funcionario.getRaw().EXAMES || []).map(
      (ex, idx) => {
        if (!examCodes.includes(ex.codigoExame)) return ex;

        modifiedIndices.push(idx);
        return {
          ...ex,
          status: ExamStatus.FINALIZADO,
          url,
        };
      },
    );

    if (modifiedIndices.length === 0) {
      throw new Error(
        `Nenhum exame dos códigos ${examCodes.join(',')} encontrado para schedulingId=${schedulingId}`,
      );
    }

    const allFinished = funcionario.allExamesFinalizados();

    // Unificando cálculo de status na entidade
    funcionario.updateAtendimentoStatus(
      previousAtendimentoStatus as AtendimentoStatus,
    );

    const updatePayload: any = {
      $set: {
        ATENDIMENTOSTATUS: funcionario.getRaw().ATENDIMENTOSTATUS,
      },
    };

    modifiedIndices.forEach((idx) => {
      const ex = funcionario.getRaw().EXAMES[idx];
      updatePayload.$set[`EXAMES.${idx}.status`] = ex.status;
      updatePayload.$set[`EXAMES.${idx}.url`] = ex.url;
      if (payload.commandId) {
        updatePayload.$set[`EXAMES.${idx}.signature.lastCommandId`] =
          payload.commandId;
      }
    });

    await this.schedulingsCollection.updateOne(filter, updatePayload);

    this.logger.log(
      `[OBS][EXAM_RESULT][APPLY][OUT] schedulingId=${schedulingId} commandId=${payload.commandId ?? 'n/a'} source=${source ?? 'n/a'} examCodes=${examCodes.join(',')} atendimentoAntes=${previousAtendimentoStatus ?? 'n/a'} atendimentoDepois=${funcionario.getRaw().ATENDIMENTOSTATUS ?? 'n/a'} allFinished=${allFinished}`,
    );

    // Disparo antecipado para SOCGED se todos os exames estiverem finalizados
    await this.maybeTriggerSocgedUpload(funcionario);

    // Enfileirar cada exame finalizado para envio ao SOC via resultado-exame-soc
    this.logger.log(
      `[SOC_ENQUEUE][NORMAL] Enfileirando SOC para exames finalizados | schedulingId=${schedulingId} | modifiedIndices=[${modifiedIndices.join(',')}] | source=${source ?? 'n/a'}`,
    );
    for (const idx of modifiedIndices) {
      const ex = funcionario.getRaw().EXAMES[idx];
      if (ex?.grupo) {
        await this.azureService.filaResultadoExameSoc({
          schedulingId,
          grupo: ex.grupo,
          examIndex: idx,
          requestedAt: new Date().toISOString(),
          codigoExame: ex.codigoExame,
          sequencialResultadoExame: ex.sequencialResultadoExame,
          sequencialFicha: scheduledDoc.SEQUENCIAFICHA,
        });
      }
    }
  }

  private isCredenciadaForResultRules(doc: SchedulingDocument): boolean {
    return (
      (doc.NOMECARGO || '').includes('KIT CREDENCIADA') ||
      (doc.NOMESETOR || '').includes('KIT CREDENCIADA') ||
      (doc.CODIGOINTERNOEMPRESA || '').toUpperCase() === 'KIT'
    );
  }

  async applyExamAnexosUpdateFromWorker(payload: {
    schedulingId: string;
    anexos: any[];
    source?: string;
    commandId?: string;
  }) {
    const { schedulingId, anexos, commandId, source } = payload;
    const filter = { _id: new ObjectId(schedulingId) };
    const scheduledDoc =
      await this.schedulingsCollection.findOne<SchedulingDocument>(filter);

    if (!scheduledDoc) {
      throw new Error(`Agendamento ${schedulingId} não encontrado.`);
    }

    if (commandId && scheduledDoc.ASOINFO?.anexosLastCommandId === commandId) {
      this.logger.log(
        `[CALLBACK][EXAM_ANEXOS] Ignorando callback duplicado schedulingId=${schedulingId} commandId=${commandId}`,
      );
      return;
    }

    await this.schedulingsCollection.updateOne(filter, {
      $set: {
        ANEXOS: anexos,
        ...(commandId ? { 'ASOINFO.anexosLastCommandId': commandId } : {}),
      },
    });

    this.logger.log(
      `[CALLBACK][EXAM_ANEXOS] Atualização aplicada schedulingId=${schedulingId} commandId=${commandId ?? 'n/a'} anexos=${anexos.length} source=${source ?? 'n/a'}`,
    );
  }

  async getPendingSignatureItemsFromBackend(limit = 50): Promise<
    Array<{
      schedulingId: string;
      grupoExame: string;
      codigoProfissional: string;
      url: string;
      signature: any;
    }>
  > {
    const now = new Date();
    const cappedLimit = Math.min(Math.max(limit, 1), 200);

    const docs = await this.schedulingsCollection
      .find<SchedulingDocument>({
        $or: [
          {
            EXAMES: {
              $elemMatch: {
                'signature.requiresSignature': true,
                'signature.status': 'PENDENTE',
                $or: [
                  { 'signature.retry.pending': { $exists: false } },
                  { 'signature.retry.pending': false },
                  {
                    $and: [
                      { 'signature.retry.pending': true },
                      {
                        $or: [
                          { 'signature.retry.nextRetryAt': { $lte: now } },
                          {
                            'signature.retry.nextRetryAt': {
                              $exists: false,
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            'ASOINFO.signature.requiresSignature': true,
            'ASOINFO.signature.status': 'PENDENTE',
            $or: [
              { 'ASOINFO.signature.retry.pending': { $exists: false } },
              { 'ASOINFO.signature.retry.pending': false },
              {
                $and: [
                  { 'ASOINFO.signature.retry.pending': true },
                  {
                    $or: [
                      {
                        'ASOINFO.signature.retry.nextRetryAt': { $lte: now },
                      },
                      {
                        'ASOINFO.signature.retry.nextRetryAt': {
                          $exists: false,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
      .project({
        _id: 1,
        EXAMES: 1,
        ASOINFO: 1,
        MEDICO: 1,
        profissional: 1,
      })
      .limit(cappedLimit)
      .toArray();

    const pendingItems: Array<{
      schedulingId: string;
      grupoExame: string;
      codigoProfissional: string;
      url: string;
      signature: any;
    }> = [];

    for (const doc of docs) {
      const schedulingId = String(doc._id);

      // 1. Processar pendencias de ASO (modelo unificado)
      const asoSignature = (doc as any)?.ASOINFO?.signature;
      const asoStatus = String(asoSignature?.status || '');
      const asoRetry = asoSignature?.retry;
      const asoRetryDue =
        !asoRetry?.pending ||
        !asoRetry?.nextRetryAt ||
        new Date(asoRetry.nextRetryAt) <= now;
      if (
        asoStatus === 'PENDENTE' &&
        asoRetryDue &&
        String((doc as any)?.ASOINFO?.url || '').trim()
      ) {
        const exameComCodigo = (doc.EXAMES || []).find((exame: any) =>
          Boolean(
            String(exame?.formulario?.codigoMedico || '').trim() ||
            String(exame?.formulario?.codigoProfissional || '').trim() ||
            String(exame?.codigoProfissional || '').trim(),
          ),
        );

        const asoCodigoProfissional = String(
          (doc as any)?.ASOINFO?.codigoProfissional ||
          exameComCodigo?.formulario?.codigoMedico ||
          exameComCodigo?.formulario?.codigoProfissional ||
          exameComCodigo?.codigoProfissional ||
          (doc as any)?.profissional?.codigo ||
          doc.MEDICO ||
          '',
        ).trim();

        pendingItems.push({
          schedulingId,
          grupoExame: 'ASO',
          codigoProfissional: asoCodigoProfissional,
          url: String((doc as any)?.ASOINFO?.url || ''),
          signature: {
            ...asoSignature,
            status: mapStatusToPtBr(asoStatus),
          },
        });

        if (pendingItems.length >= cappedLimit) return pendingItems;
      }

      // 2. Processar pendencias de exames (modelo unificado)
      for (const exame of doc.EXAMES || []) {
        const signature = exame?.signature;
        if (!signature) continue;

        const status = String(signature.status || '');
        const pendingRetry = status === 'PENDENTE';

        if (!pendingRetry) continue;

        if (pendingRetry && signature.retry?.nextRetryAt) {
          const nextRetryAt = new Date(signature.retry.nextRetryAt);
          if (nextRetryAt > now) continue;
        }

        const codigoProfissional = String(
          exame.codigoProfissional || '',
        ).trim();
        const grupoExame = String(exame.grupo || '').trim();
        const url = String(exame.url || '').trim();

        if (!codigoProfissional || !grupoExame) continue;

        pendingItems.push({
          schedulingId,
          grupoExame,
          codigoProfissional,
          url,
          signature: {
            ...signature,
            status: mapStatusToPtBr(String(signature.status || '')),
          },
        });

        if (pendingItems.length >= cappedLimit) {
          return pendingItems;
        }
      }
    }

    return pendingItems;
  }

  public normalizeGroupName(value?: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private resolveExamGroupMetadata(params: {
    exam?: ExamsScheduled | null;
    codigoExame?: string;
  }): {
    groupName: string;
    config: ExamToogle;
  } | null {
    const { exam, codigoExame } = params;
    let groupName = String(exam?.grupo || '').trim();

    const examMatchByCodigo = codigoExame
      ? getExamGroupAndItemByCodigo(codigoExame)
      : null;

    if (examMatchByCodigo?.grupo) {
      groupName = examMatchByCodigo.grupo;
    }

    if (groupName) {
      const normalizedGroup = this.normalizeGroupName(groupName);
      const normalizedMatch = Object.keys(getExamesList()).find(
        (key) => this.normalizeGroupName(key) === normalizedGroup,
      );
      if (normalizedMatch) {
        groupName = normalizedMatch;
      }
    }

    if ((!groupName || !getExamesList()[groupName]) && exam?.nomeExame) {
      const normalizedExamName = this.normalizeGroupName(exam.nomeExame);
      const byName = Object.entries(getExamesList()).find(([, exams]) =>
        exams.some(
          (item) => this.normalizeGroupName(item.nome) === normalizedExamName,
        ),
      );
      if (byName?.[0]) {
        groupName = byName[0];
      }
    }

    if ((!groupName || !getExamesList()[groupName]) && codigoExame) {
      const resolvedByCode = encontrarGrupoPorCodigo(codigoExame);
      if (resolvedByCode && getExamesList()[resolvedByCode]) {
        groupName = resolvedByCode;
      }
    }

    const examsInGroup = getExamesList()[groupName] || [];
    if (!groupName || examsInGroup.length === 0) {
      return null;
    }

    let config = examsInGroup[0];

    if (codigoExame) {
      const matchByCode = examsInGroup.find((e) => e.codigos.includes(codigoExame));
      if (matchByCode) config = matchByCode;
    } else if (exam?.nomeExame) {
      const matchByName = examsInGroup.find(
        (e) => this.normalizeGroupName(e.nome) === this.normalizeGroupName(exam.nomeExame),
      );
      if (matchByName) config = matchByName;
    }

    return {
      groupName,
      config,
    };
  }

  async findLatestMatchingExamFormSnapshot(params: {
    schedulingId: string;
    codigoExame?: string;
    grupo?: string;
  }): Promise<ExamFormSnapshotDocument | null> {
    if (!this.examFormSnapshotsCollection) {
      return null;
    }

    const { schedulingId, codigoExame, grupo } = params;
    const normalizedCode = this.normalizeGroupName(codigoExame);
    const normalizedGroup = this.normalizeGroupName(grupo);

    const snapshots = await this.examFormSnapshotsCollection
      .find({ schedulingId })
      .sort({ createdAt: -1 })
      .toArray();

    return (
      snapshots.find((snapshot) => {
        const hasCodeMatch = (snapshot.codigoExame || []).some(
          (code) => this.normalizeGroupName(code) === normalizedCode,
        );
        const hasGroupMatch = (snapshot.grupos || []).some(
          (item) => this.normalizeGroupName(item) === normalizedGroup,
        );

        return hasCodeMatch || hasGroupMatch;
      }) || null
    );
  }

  private async persistExamFormSnapshot(params: {
    funcionarioDoc: SchedulingDocument;
    payload: ExamUpdateDto;
    authUser?: IUserInfo | null;
  }) {
    if (!this.examFormSnapshotsCollection) {
      this.logger.warn(
        '[EXAM_FORM_SNAPSHOT][SKIP] Collection indisponivel para snapshot.',
      );
      return;
    }

    const { funcionarioDoc, payload, authUser } = params;
    const grupos = [
      ...new Set(
        (payload.codigoExame || []).map((codigo) => {
          const exam =
            funcionarioDoc.EXAMES?.find(
              (item) => item.codigoExame === codigo,
            ) || null;

          return (
            exam?.grupo ||
            encontrarGrupoPorCodigo(codigo) ||
            exam?.nomeExame ||
            codigo
          );
        }),
      ),
    ];

    const snapshot: ExamFormSnapshotDocument = {
      version: 1,
      route: 'schedulings/exame/update',
      schedulingId: String(funcionarioDoc._id || payload.funcionarioId),
      prontuario: funcionarioDoc.CODIGOPRONTUARIO || null,
      funcionarioNome: funcionarioDoc.NOME || null,
      codigoExame: [...(payload.codigoExame || [])],
      grupos,
      unidadeAtendimento: funcionarioDoc.UNIDADEATENDIMENTO || null,
      empresa: funcionarioDoc.NOMEEMPRESA || null,
      isEditing: !!payload.isEditing,
      sala: payload.sala || null,
      dataExame: this.resolveExamDataExameForPersistence({
        incomingDataExame: payload.dataExame,
        existingDataExame:
          funcionarioDoc.EXAMES?.find((item) =>
            (payload.codigoExame || []).includes(item.codigoExame),
          )?.dataExame ?? null,
        isEditing: !!payload.isEditing,
      }),
      formulario: payload.formulario ?? null,
      authUser: authUser
        ? {
          codigo: authUser.codigo,
          nome: authUser.nome,
          cpf: authUser.cpf,
          perfil: authUser.perfil as any,
        }
        : null,
      profissional: payload.profissional
        ? {
          codigo: payload.profissional.codigo,
          nome: payload.profissional.nome,
          cpf: payload.profissional.cpf,
          perfil: payload.profissional.perfil as any,
        }
        : null,
      createdAt: new Date(),
    };

    try {
      await this.examFormSnapshotsCollection.insertOne(snapshot);
    } catch (error) {
      this.logger.error(
        `[EXAM_FORM_SNAPSHOT][FAIL] schedulingId=${snapshot.schedulingId} codes=${snapshot.codigoExame.join(',')} message=${error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildAccentInsensitivePattern(value: string): string {
    const accentMap: Record<string, string> = {
      a: '[aàáâãäå]',
      e: '[eèéêë]',
      i: '[iìíîï]',
      o: '[oòóôõöø]',
      u: '[uùúûü]',
      c: '[cç]',
      n: '[nñ]',
      y: '[yÿ]',
    };

    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    return normalized
      .split('')
      .map((char) => {
        const lowerChar = char.toLowerCase();

        if (accentMap[lowerChar]) return accentMap[lowerChar];
        if (/\s/.test(char)) return '\\s+';

        return this.escapeRegex(char);
      })
      .join('');
  }

  private applyNameSearchFilter(matchQuery: any, search?: string): void {
    const rawSearch = String(search || '').trim();

    if (!rawSearch) return;

    const terms = rawSearch.split(/\s+/).filter(Boolean);

    if (!terms.length) return;

    const regexConditions = terms.map((term) => ({
      NOME: {
        $regex: this.buildAccentInsensitivePattern(term),
        $options: 'i',
      },
    }));

    if (regexConditions.length === 1) {
      Object.assign(matchQuery, regexConditions[0]);
      return;
    }

    matchQuery.$and = [...(matchQuery.$and || []), ...regexConditions];
  }

  private extractPendingAutoReleaseCredentials(
    scheduling: any,
    doctor?: IUserInfo | null,
  ): { pin?: string } | undefined {
    return undefined;
  }
  async updateTicketScheduling(id: any, update: Partial<Ticket>) {
    const now = new Date().toISOString();

    let objectId: ObjectId;
    try {
      if (id instanceof ObjectId) {
        objectId = id;
      } else if (typeof id === 'string') {
        objectId = new ObjectId(id);
      } else if (id && typeof id === 'object' && (id as any).$oid) {
        objectId = new ObjectId((id as any).$oid);
      } else {
        objectId = new ObjectId(String(id));
      }
    } catch (e) {
      throw new Error(`ID de funcionario invalido para conversao em ObjectId: ${JSON.stringify(id)}`);
    }

    const sanitized = Object.fromEntries(
      Object.entries(update).filter(([_, v]) => v !== undefined),
    );

    const scheduling = await this.schedulingsCollection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...Object.fromEntries(
            Object.entries(sanitized).map(([key, value]) => [
              `TICKET.${key}`,
              value,
            ]),
          ),
          'TICKET.updatedAt': now,
        },
      },
      { returnDocument: 'after' },
    );

    return scheduling?.value ?? null;
  }

  async executeAction(request: ActionRequestAtendimento) {
    const { funcionarioId, action } = request;

    // Projeção para buscar apenas campos necessários
    const scheduling =
      await this.schedulingsCollection.findOne<SchedulingDocument>(
        { _id: new ObjectId(funcionarioId) },
        {
          projection: {
            TICKET: 1,
            UNIDADEATENDIMENTO: 1,
            CODIGOEMPRESA: 1,
            CODIGO: 1,
            DATAAGENDAMENTO: 1,
          },
        },
      );

    if (!scheduling || !scheduling.TICKET) {
      throw new Error(`Ticket ${funcionarioId} não encontrado no Mongo.`);
    }

    const ticket = scheduling.TICKET;
    let nextStatus = ticket.status;
    const nextGroup = ticket.grupo;

    switch (action) {
      case TicketActionType.CHAMAR:
        nextStatus = TicketStatus.EM_CHAMADA;
        break;

      case TicketActionType.RETORNAR:
        nextStatus = TicketStatus.AGUARDANDO;
        break;

      case TicketActionType.ATENDER:
        nextStatus = TicketStatus.EM_ATENDIMENTO;
        break;

      case TicketActionType.FINALIZAR:
        nextStatus = TicketStatus.FINALIZADO;
        break;

      default:
        throw new Error(`Ação inválida: ${action}`);
    }

    const normalize = (value?: string) => (value || '').trim();
    const storedSala = normalize(ticket.sala);
    const storedProfissional = normalize(
      ticket.profissional || ticket.atendente,
    );
    const requestSala = normalize(request.sala);
    const requestUser = normalize(request.user);

    const hasActiveOwnershipStatus =
      ticket.status === TicketStatus.EM_CHAMADA ||
      ticket.status === TicketStatus.EM_ATENDIMENTO;

    const shouldValidateOwnershipConflict =
      hasActiveOwnershipStatus &&
      (action === TicketActionType.CHAMAR ||
        action === TicketActionType.ATENDER ||
        action === TicketActionType.FINALIZAR);

    if (shouldValidateOwnershipConflict) {
      const conflictBySala =
        storedSala !== '' && requestSala !== '' && requestSala !== storedSala;
      const conflictByProfissional =
        storedProfissional !== '' &&
        requestUser !== '' &&
        requestUser !== storedProfissional;
      const conflictFinalizeWithoutContext =
        action === TicketActionType.FINALIZAR &&
        (storedSala !== '' || storedProfissional !== '') &&
        requestSala === '' &&
        requestUser === '';

      if (
        conflictBySala ||
        conflictByProfissional ||
        conflictFinalizeWithoutContext
      ) {
        throw new HttpException(
          {
            status: HttpStatus.CONFLICT,
            message:
              'Conflito de posse ativa: ticket vinculado a outro contexto de sala/profissional.',
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    if (
      requestSala !== '' &&
      (action === TicketActionType.CHAMAR ||
        action === TicketActionType.ATENDER)
    ) {
      const requestOwner = this.normalizeOperationalContextValue(requestUser);
      const conflictingSchedulings =
        await this.findConflictingActiveRoomOccupants({
          schedulingId: new ObjectId(scheduling._id),
          ticketId: Number(ticket.id),
          unidade:
            request.unidade || ticket.unidade || scheduling.UNIDADEATENDIMENTO,
          dataAgendamento: scheduling.DATAAGENDAMENTO,
          sala: requestSala,
        });

      for (const conflictingScheduling of conflictingSchedulings) {
        const autoReconciliation = this.buildTicketReconciliation(
          conflictingScheduling,
          scheduling.DATAAGENDAMENTO || '',
        );

        if (autoReconciliation) {
          await this.schedulingsCollection.updateOne(
            { _id: new ObjectId(conflictingScheduling._id) },
            {
              $set: {
                TICKET: autoReconciliation.nextTicket,
              },
            },
          );
        } else {
          const conflictingOwner = this.getTicketOperationalOwner(
            conflictingScheduling.TICKET as Ticket,
          );
          const sameOwnerContext =
            requestOwner !== '' &&
            conflictingOwner !== '' &&
            requestOwner === conflictingOwner;

          if (sameOwnerContext) {
            continue;
          }

          throw new HttpException(
            {
              status: HttpStatus.CONFLICT,
              message: `Sala ${requestSala} já está ocupada por outro atendimento ativo.`,
              conflict: {
                funcionarioId: String(conflictingScheduling._id),
                nome: conflictingScheduling.NOME || '',
                ticketId: conflictingScheduling.TICKET?.id || null,
                profissional:
                  conflictingScheduling.TICKET?.profissional ||
                  conflictingScheduling.TICKET?.atendente ||
                  '',
              },
            },
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    const preserveBindingWhenEmpty =
      action === TicketActionType.CHAMAR || action === TicketActionType.ATENDER;
    const nextSala =
      requestSala !== ''
        ? requestSala
        : preserveBindingWhenEmpty
          ? storedSala
          : '';
    const nextProfissional =
      requestUser !== ''
        ? requestUser
        : preserveBindingWhenEmpty
          ? storedProfissional
          : '';

    const updateDoc = {
      'TICKET.status': nextStatus,
      'TICKET.sala': nextSala,
      'TICKET.profissional': nextProfissional,
      'TICKET.unidade': request.unidade ?? ticket.unidade,
      'TICKET.exame': request.exame ?? ticket.exame,
      'TICKET.grupo': nextGroup,
      'TICKET.updatedAt': new Date(),
    };

    const updatedScheduling = await this.schedulingsCollection.findOneAndUpdate(
      { _id: new ObjectId(scheduling._id) },
      { $set: updateDoc },
      { returnDocument: 'after' },
    );

    if (!updatedScheduling) {
      throw new Error(
        `Erro ao atualizar ticket ${scheduling.TICKET.id} no Mongo.`,
      );
    }

    return updatedScheduling.TICKET;
  }

  // ======================== FUNÇÕES AUXILIARES ======================== //

  async cleanupSchedule() {
    try {
      this.logger.log('⏳ Iniciando limpeza de agendamentos antigos...');

      const { inicioDoDiaBR } = calcularRangePipeline();
      const inicioDiaReferenciaBR = new Date(inicioDoDiaBR);
      const deleteResult = await this.schedulingsCollection.deleteMany({
        ATENDIMENTOSTATUS: AtendimentoStatus.AGENDADO,
        DATAAGENDAMENTO_DATE: { $lt: inicioDiaReferenciaBR },
      });

      const totalDeleted = deleteResult.deletedCount ?? 0;

      if (totalDeleted === 0) {
        this.logger.log('✅ Nenhum agendamento encontrado para exclusão.');
        return;
      }

      this.logger.log(
        `[CLEANUP][AGENDADO] Removidos ${totalDeleted} agendamento(s) antigos.`,
      );
    } catch (err) {
        this.logger.error('Erro ao limpar agendamentos:', err);
    }
  }

  private findExamToggleByCode(
    codigoExame?: string,
  ): { groupName: string; config: ExamToogle } | null {
    const normalizedCode = String(codigoExame || '').trim();

    if (!normalizedCode) {
      return null;
    }

    for (const [groupName, configs] of Object.entries(getExamesList())) {
      const config = configs.find((item) => item.codigos.includes(normalizedCode));
      if (config) {
        return {
          groupName,
          config,
        };
      }
    }

    return null;
  }

  private async buildBacklogReissuePayload(params: {
    doc: SchedulingDocument;
    exame: ExamsScheduled;
    groupName: string;
    config: ExamToogle;
    funcionario: FuncionarioEntity;
  }): Promise<resultadosExamesQueue | null> {
    const { doc, exame, groupName, config, funcionario } = params;
    const schedulingId = String(doc._id);

    if (config.enviarParaAzure !== true) {
      return null;
    }

    const snapshotFallbackNeeded =
      !hasMeaningfulExamFormData(exame.formulario) ||
      !String(exame.codigoProfissional || exame.profissional || '').trim();
    const snapshotFallback = snapshotFallbackNeeded
      ? await this.findLatestMatchingExamFormSnapshot({
          schedulingId,
          codigoExame: exame.codigoExame,
          grupo: exame.grupo || groupName,
        })
      : null;

    const effectiveFormulario = hasMeaningfulExamFormData(exame.formulario)
      ? exame.formulario
      : snapshotFallback?.formulario;

    if (
      shouldRequireMeaningfulExamForm(config) &&
      !hasMeaningfulExamFormData(effectiveFormulario)
    ) {
      this.logger.warn(
        `[MANUTENCAO][REISSUE_SKIP] schedulingId=${schedulingId} grupo=${groupName} reason=MISSING_FORM_DATA`,
      );
      return null;
    }

    const resolvedProfessional = this.buildResolvedProfessionalFromExam(
      {
        ...exame,
        formulario: effectiveFormulario,
        codigoProfissional:
          exame.codigoProfissional ||
          snapshotFallback?.profissional?.codigo ||
          snapshotFallback?.authUser?.codigo ||
          '',
        profissional:
          exame.profissional ||
          snapshotFallback?.profissional?.nome ||
          snapshotFallback?.authUser?.nome ||
          '',
      } as ExamsScheduled,
      snapshotToUserInfo(snapshotFallback?.profissional),
      snapshotToUserInfo(snapshotFallback?.authUser),
    );
    if (!hasMinimumProfessionalIdentity(resolvedProfessional)) {
      this.logger.warn(
        `[MANUTENCAO][REISSUE_SKIP] schedulingId=${schedulingId} grupo=${groupName} reason=INSUFFICIENT_PROFESSIONAL_IDENTITY`,
      );
      return null;
    }

    let assinaturaDigitalObrigatoria = false;
    if (config.requerAssinaturaDigital) {
      assinaturaDigitalObrigatoria =
        await this.signatureService.hasValidSignatureSession(
          String(resolvedProfessional?.codigo || '').trim(),
        );

      if (!assinaturaDigitalObrigatoria) {
        this.logger.warn(
          `[MANUTENCAO][REISSUE_SKIP] schedulingId=${schedulingId} grupo=${groupName} reason=MISSING_SIGNATURE_SESSION`,
        );
        return null;
      }
    }

    return {
      schedulingId,
      grupo: groupName,
      funcionario: funcionario.getRaw(),
      profissional: resolvedProfessional || undefined,
      updateAt: new Date(),
      assinaturaDigitalObrigatoria,
    };
  }

  private async buildCronReissueData(params: {
    doc: SchedulingDocument;
    exame: ExamsScheduled;
    groupName: string;
    config: ExamToogle;
  }): Promise<ExamUpdateDto | null> {
    const { doc, exame, config } = params;
    const schedulingId = String(doc._id);

    if (config.enviarParaAzure !== true) {
      return null;
    }

    const snapshotFallbackNeeded =
      !String(exame.sala || '').trim() ||
      !hasMeaningfulExamFormData(exame.formulario);

    const snapshotFallback = snapshotFallbackNeeded
      ? await this.findLatestMatchingExamFormSnapshot({
          schedulingId,
          codigoExame: exame.codigoExame,
          grupo: exame.grupo || params.groupName,
        })
      : null;

    const effectiveSala =
      String(exame.sala || '').trim() || snapshotFallback?.sala || '';
    const effectiveFormulario = hasMeaningfulExamFormData(exame.formulario)
      ? exame.formulario
      : snapshotFallback?.formulario;

    if (
      shouldRequireMeaningfulExamForm(config) &&
      !hasMeaningfulExamFormData(effectiveFormulario)
    ) {
      this.logger.warn(
        `[MANUTENCAO][REISSUE_SKIP] schedulingId=${schedulingId} grupo=${params.groupName} reason=MISSING_FORM_DATA`,
      );
      return null;
    }

    const resolvedProfessional = this.buildResolvedProfessionalFromExam(
      {
        ...exame,
        formulario: effectiveFormulario,
        codigoProfissional:
          exame.codigoProfissional ||
          snapshotFallback?.profissional?.codigo ||
          snapshotFallback?.authUser?.codigo ||
          '',
        profissional:
          exame.profissional ||
          snapshotFallback?.profissional?.nome ||
          snapshotFallback?.authUser?.nome ||
          '',
      } as ExamsScheduled,
      snapshotToUserInfo(snapshotFallback?.profissional),
      snapshotToUserInfo(snapshotFallback?.authUser),
    );

    if (!hasMinimumProfessionalIdentity(resolvedProfessional)) {
      this.logger.warn(
        `[MANUTENCAO][REISSUE_SKIP] schedulingId=${schedulingId} grupo=${params.groupName} reason=INSUFFICIENT_PROFESSIONAL_IDENTITY`,
      );
      return null;
    }

    return {
      codigoExame: [exame.codigoExame],
      formulario: effectiveFormulario,
      funcionarioId: schedulingId,
      profissional: resolvedProfessional || undefined,
      sala: effectiveSala,
      isEditing: true,
      dataExame: exame.dataExame || snapshotFallback?.dataExame,
    };
  }

  /**
   * Rotina de manutenção ativa para exames e atendimentos do dia anterior.
   * Varre os exames PENDENTES, consulta a configuração (EXAMES_LIST) para o próximo status natural,
   * reemite via updateExam() (mesmo fluxo manual), ou transiciona para AGUARDANDO_RESULTADO, finalizando com o recalculo do
   * ATENDIMENTOSTATUS.
   */
  async processUnfinishedSchedulings(
    options: BacklogMaintenanceOptions = {},
  ): Promise<BacklogMaintenanceSummary> {
    try {
      this.logger.log('Ínicio da varredura ativa de exames e atendimentos não finalizados do passado...');

      const { inicioDoDiaBR } = calcularRangePipeline();
      const inicioDiaReferenciaBR = options.beforeDate
        ? new Date(options.beforeDate)
        : new Date(inicioDoDiaBR);
      const dryRun = options.dryRun === true;
      const query = {
        DATAAGENDAMENTO_DATE: { $lt: inicioDiaReferenciaBR },
        ATENDIMENTOSTATUS: {
          $in: [
            AtendimentoStatus.EM_ATENDIMENTO,
            AtendimentoStatus.AGUARDANDO_RESULTADOS,
            AtendimentoStatus.AVALIACAO_MEDICA,
          ],
        },
      };

      const unfinishedDocs = await this.schedulingsCollection
        .find<SchedulingDocument>(query)
        .toArray();
      let updatedCount = 0;
      let pendingExamRows = 0;
      let movedToAguardandoResultado = 0;
      let reissued = 0;
      let unchanged = 0;

      for (const doc of unfinishedDocs) {
        const funcionario = new FuncionarioEntity(doc as SchedulingDocument);
        let hasChanges = false;

        for (const exame of doc.EXAMES || []) {
          if (exame.status !== ExamStatus.PENDENTE) continue;
          pendingExamRows += 1;

          const resolvedToggle = this.findExamToggleByCode(exame.codigoExame);
          const isPsicossocial = exame.nomeExame?.toLowerCase().includes('psicossocial');
          const nextStatusResult = isPsicossocial
            ? ExamStatus.AGUARDANDO_RESULTADO
            : resolvedToggle?.config.statusFinalizacao ??
              ExamStatus.AGUARDANDO_RESULTADO;

          if (nextStatusResult === ExamStatus.AGUARDANDO_RESULTADO) {
            if (!dryRun) {
              await this.schedulingsCollection.updateOne(
                { _id: typeof doc._id === 'string' ? new ObjectId(doc._id) : doc._id },
                {
                  $set: {
                    [`EXAMES.${funcionario.findExameIndex(exame.codigoExame)}.status`]: ExamStatus.AGUARDANDO_RESULTADO,
                  },
                },
              );
            }
            exame.status = ExamStatus.AGUARDANDO_RESULTADO;
            hasChanges = true;
            movedToAguardandoResultado += 1;
            continue;
          }

          if (!resolvedToggle) {
            continue;
          }

          const dto = await this.buildCronReissueData({
            doc: doc as unknown as SchedulingDocument,
            exame,
            groupName: resolvedToggle.groupName,
            config: resolvedToggle.config,
          });

          if (!dto) {
            continue;
          }

          if (dryRun) {
            reissued += 1;
            continue;
          }

          try {
            this.logger.debug(
              `[MANUTENCAO][REISSUE] Reemitindo exame ${exame.nomeExame} schedulingId=${String(doc._id)} grupo=${resolvedToggle.groupName}`,
            );
            await this.updateExam(dto);
            const updatedDoc = await this.schedulingsCollection.findOne({ _id: doc._id });
            if (updatedDoc) {
              Object.assign(doc, updatedDoc);
            }
            hasChanges = false;
            reissued += 1;
          } catch (err) {
            this.logger.warn(
              `[MANUTENCAO][REISSUE_SKIP] schedulingId=${String(doc._id)} grupo=${resolvedToggle.groupName} reason=REISSUE_FAILED msg=${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        if (!dryRun) {
          const currentStatus = doc.ATENDIMENTOSTATUS;
          funcionario.updateAtendimentoStatus(currentStatus);
          if (doc.ATENDIMENTOSTATUS !== currentStatus || hasChanges) {
            await this.schedulingsCollection.updateOne(
              { _id: typeof doc._id === 'string' ? new ObjectId(doc._id) : doc._id },
              {
                $set: {
                  ATENDIMENTOSTATUS: doc.ATENDIMENTOSTATUS,
                  EXAMES: doc.EXAMES,
                },
              },
            );
            this.logger.log(
              `[MANUTENCAO][ATENDIMENTOSTATUS_RECONCILED] schedulingId=${String(doc._id)} previous=${currentStatus} new=${doc.ATENDIMENTOSTATUS}`,
            );
            updatedCount += 1;
          }
        }
      }

      // Processa documentos FINALIZADO com ASO pendente sem processingQueuedAt
      // (documentos que ficaram órfãos — CAS falhou na única chamada do maybeTriggerSocgedUpload)
      const pendingAsoQuery = {
        DATAAGENDAMENTO_DATE: { $lt: inicioDiaReferenciaBR },
        ATENDIMENTOSTATUS: AtendimentoStatus.FINALIZADO,
        'ASOINFO.status': 'PENDENTE',
        CODIGOINTERNOEMPRESA: { $nin: [/COMPLEMENTAR/i, /KIT/i] },
        $and: [
          {
            $or: [
              { 'ASOINFO.url': { $exists: false } },
              { 'ASOINFO.url': null },
              { 'ASOINFO.url': '' },
            ],
          },
          {
            $or: [
              { 'ASOINFO.processingQueuedAt': { $exists: false } },
              { 'ASOINFO.processingQueuedAt': null },
            ],
          },
        ],
      };

      const pendingAsoDocs = await this.schedulingsCollection
        .find<SchedulingDocument>(pendingAsoQuery)
        .toArray();

      let asoReenqueued = 0;

      for (const doc of pendingAsoDocs) {
        try {
          const funcionario = new FuncionarioEntity(
            doc as SchedulingDocument,
          );

          if (!dryRun) {
            this.logger.log(
              `[MANUTENCAO][ASO_REENQUEUE] Re-triggerando ASO para schedulingId=${String(doc._id)} prontuario=${doc.CODIGOPRONTUARIO ?? 'N/A'}`,
            );
            await this.maybeTriggerSocgedUpload(funcionario);
            asoReenqueued++;
          } else {
            this.logger.log(
              `[MANUTENCAO][ASO_REENQUEUE_DRY] schedulingId=${String(doc._id)} prontuario=${doc.CODIGOPRONTUARIO ?? 'N/A'} — dry run, não executado`,
            );
          }
        } catch (err) {
          this.logger.error(
            `[MANUTENCAO][ASO_REENQUEUE_ERR] schedulingId=${String(doc._id)} erro=${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.logger.log(`Varredura ativa concluída. ${reissued} exame(s) reemitido(s) via updateExam. ${movedToAguardandoResultado} movido(s) para AGUARDANDO_RESULTADO. ${asoReenqueued} ASO(s) re-enfileirado(s).`);
      return {
        beforeDate: inicioDiaReferenciaBR.toISOString(),
        dryRun,
        queriedSchedulings: unfinishedDocs.length,
        updatedSchedulings: reissued + movedToAguardandoResultado,
        pendingExamRows,
        movedToAguardandoResultado,
        reissued,
        unchanged,
        asoReenqueued,
      };
    } catch (error) {
      this.logger.error('Erro durante o processamento de atendimentos não finalizados:', error);
      throw error;
    }
  }

  /**
   * Identifica atendimentos com mais de 90 dias com status ATENDIMENTO, AGUARDANDO_RESULTADOS, PENDENTE ou AGUARDANDO.
   * Envia os resultados existentes para o SOCGED e atualiza o status para FINALIZADO.
   */
  async autoFinalizeAgedSchedulings(
    options: { dryRun?: boolean } = {},
  ): Promise<{ queriedCount: number; finalizedCount: number; errorsCount: number }> {
    const dryRun = options.dryRun === true;
    try {
      this.logger.log('[MANUTENCAO][AUTO_FINALIZE] Iniciando varredura para finalização automática de atendimentos antigos (> 90 dias)...');

      // Calcula a data limite de 90 dias atrás
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      ninetyDaysAgo.setHours(23, 59, 59, 999);

      const query = {
        DATAAGENDAMENTO_DATE: { $lte: ninetyDaysAgo },
        ATENDIMENTOSTATUS: {
          $in: [
            AtendimentoStatus.EM_ATENDIMENTO, // 'ATENDIMENTO'
            AtendimentoStatus.AGUARDANDO_RESULTADOS, // 'AGUARDANDO_RESULTADOS'
            'PENDENTE',
            'AGUARDANDO',
          ],
        },
      };

      const docs = await this.schedulingsCollection
        .find<SchedulingDocument>(query)
        .toArray();

      this.logger.log(`[MANUTENCAO][AUTO_FINALIZE] Encontrados ${docs.length} agendamentos com mais de 90 dias pendentes.`);

      let finalizedCount = 0;
      let errorsCount = 0;

      for (const doc of docs) {
        try {
          const funcionario = new FuncionarioEntity(doc as SchedulingDocument);
          const scheduledId = String(doc._id);

          this.logger.log(
            `[MANUTENCAO][AUTO_FINALIZE] Processando agendamento ${scheduledId} - Funcionario: ${doc.NOME} - Data: ${doc.DATAAGENDAMENTO}`,
          );

          if (!dryRun) {
            // 1. Envia o prontuário completo para o SOCGED
            const socgedPayload = this.buildSocgedPayload(funcionario);
            await this.azureService.filaUploadSocged(socgedPayload);

            // 2. Envia os resultados individuais dos exames já finalizados para o SOC
            const exams = doc.EXAMES || [];
            for (let i = 0; i < exams.length; i++) {
              const ex = exams[i];
              if (ex.status === ExamStatus.FINALIZADO && ex.url && ex.grupo) {
                await this.azureService.filaResultadoExameSoc({
                  schedulingId: scheduledId,
                  grupo: ex.grupo,
                  examIndex: i,
                  requestedAt: new Date().toISOString(),
                  codigoExame: ex.codigoExame,
                  sequencialResultadoExame: ex.sequencialResultadoExame,
                  sequencialFicha: doc.SEQUENCIAFICHA,
                });
              }
            }

            // 3. Atualiza o status geral do atendimento para FINALIZADO
            await this.schedulingsCollection.updateOne(
              { _id: doc._id },
              {
                $set: {
                  ATENDIMENTOSTATUS: AtendimentoStatus.FINALIZADO,
                },
              },
            );
          }

          finalizedCount++;
        } catch (err) {
          errorsCount++;
          this.logger.error(
            `[MANUTENCAO][AUTO_FINALIZE_ERR] Falha ao processar agendamento ${String(doc._id)}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      this.logger.log(
        `[MANUTENCAO][AUTO_FINALIZE] Varredura finalizada. Processados: ${docs.length}. Finalizados com sucesso: ${finalizedCount}. Erros: ${errorsCount}.`,
      );

      return {
        queriedCount: docs.length,
        finalizedCount,
        errorsCount,
      };
    } catch (error) {
      this.logger.error('Erro na rotina de finalização automática de atendimentos antigos:', error);
      throw error;
    }
  }

  async getRecordsEmployee(empresa: string, funcionario: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const searchResult = await this.schedulingsCollection
      .find<SchedulingDocument>({
        CODIGOEMPRESA: empresa,
        CODIGO: funcionario,
      })
      .toArray();

    const records = searchResult.filter((s) => {
      const date =
        s.DATAAGENDAMENTO_DATE instanceof Date
          ? s.DATAAGENDAMENTO_DATE
          : new Date(s.DATAAGENDAMENTO_DATE);
      return date && date < today;
    });

    return records;
  }

  private resolverGrupoExame(
    grupoPayload?: string | null,
    grupoExistente?: string | null,
    codigoExame?: string,
  ): string | undefined {
    if (grupoPayload && String(grupoPayload).trim() !== '') {
      return grupoPayload;
    }
    if (grupoExistente && String(grupoExistente).trim() !== '') {
      return grupoExistente;
    }
    return (
      getExamGroupAndItemByCodigo(codigoExame || '')?.grupo ||
      encontrarGrupoPorCodigo(codigoExame || '')
    );
  }

  async updateFullDocument(scheduleDocument: SchedulingDocument) {
    const filter = { _id: new ObjectId(scheduleDocument._id) };
    const {
      _id,
      DATAAGENDAMENTO_DATE,
      EXAMES: examesNovos,
      // @ts-ignore - Propriedade removida conforme solicitação para evitar erros no C#
      migrationDate,
      AUTENTICACAOATENDIMENTO: authFromInput,
      ...resto
    } = scheduleDocument as any;

    const documentoAtual = await this.schedulingsCollection.findOne(filter);
    if (!documentoAtual) return null;

    const examesAtuais: ExamsScheduled[] = documentoAtual.EXAMES ?? [];

    const examesAtuaisMap = new Map(
      examesAtuais.map((ex) => [ex.codigoExame, ex]),
    );

    // Cria um Set com os códigos dos exames que devem ser mantidos
    const codigosParaManter = new Set(
      (examesNovos ?? []).map((ex) => ex.codigoExame),
    );

    // Primeiro, remove os exames que não estão em codigosParaManter
    for (const codigo of examesAtuaisMap.keys()) {
      if (!codigosParaManter.has(codigo)) {
        const exame = examesAtuaisMap.get(codigo);
        const isProtegido =
          exame.status === ExamStatus.FINALIZADO ||
          exame.status === ExamStatus.AGUARDANDO_RESULTADO;
        if (!isProtegido) {
          examesAtuaisMap.delete(codigo);
        }
      }
    }

    // Agora, adiciona/atualiza os exames de examesNovos
    for (const exameRecebido of examesNovos ?? []) {
      const codigo = exameRecebido.codigoExame;

      if (examesAtuaisMap.has(codigo)) {
        const existente = examesAtuaisMap.get(codigo);
        const mesclado: ExamsScheduled = { ...existente, ...exameRecebido };
        const grupoResolvido = this.resolverGrupoExame(
          mesclado.grupo,
          existente?.grupo,
          codigo,
        );
        if (grupoResolvido) mesclado.grupo = grupoResolvido;
        examesAtuaisMap.set(codigo, mesclado);
      } else {
        const novo: ExamsScheduled = { ...exameRecebido };
        const grupoResolvido = this.resolverGrupoExame(
          novo.grupo,
          undefined,
          codigo,
        );
        if (grupoResolvido) novo.grupo = grupoResolvido;
        examesAtuaisMap.set(codigo, novo);
      }
    }

    const examesMesclados = Array.from(examesAtuaisMap.values());

    const authAtual = (documentoAtual as any)?.AUTENTICACAOATENDIMENTO || {};
    const authNormalizado = mergeUnifiedAtendimentoAuthInfo(
      authAtual,
      authFromInput || { metodo: authAtual?.metodo || 'SOC' },
    );
    const update = {
      ...resto,
      AUTENTICACAOATENDIMENTO: authNormalizado,
      EXAMES: examesMesclados,
    };

    const result = await this.schedulingsCollection.findOneAndUpdate(
      filter,
      { $set: update },
      { returnDocument: 'after' },
    );

    if (result?.value) {
      await this.maybeTriggerSocgedUpload(new FuncionarioEntity(result.value));
    }

    return result;
  }

  async updateAnexo(
    schedulingId: string,
    files: Express.Multer.File[],
    origin: 'recepcao' | 'relatorio' | 'agendamento' = 'relatorio',
  ) {
    // 1. Validar inputs
    if (!schedulingId) throw new Error('O ID do agendamento é obrigatório');
    if (!files || files.length === 0) throw new Error('Nenhum arquivo enviado');

    // 2. Buscar agendamento
    const doc = await this.schedulingsCollection.findOne<SchedulingDocument>({
      _id: new ObjectId(schedulingId),
    });

    if (!doc) {
      throw new Error('Agendamento não encontrado');
    }

    // 3. Fazer o upload para o Azure Blob Storage e atualizar os links no objeto
    // Nota: O azureService.updateFile já anexa e retorna o documento modificado.
    const updatedDoc = await this.azureService.updateFile(doc, files, origin);

    // 4. Salvar no MongoDB
    const result = await this.updateFullDocument(updatedDoc);

    if (!result) {
      throw new Error('Erro ao salvar anexos no banco de dados');
    }

    return result;
  }

  async removeAnexo(schedulingId: string, fileName: string) {
    if (!schedulingId || !fileName) {
      throw new Error('Parâmetros incompletos para remoção de anexo');
    }

    const doc = await this.schedulingsCollection.findOne<SchedulingDocument>({
      _id: new ObjectId(schedulingId),
    });

    if (!doc) {
      throw new Error('Agendamento não encontrado');
    }

    // Filtra o anexo que deve ser removido pelo nome
    const anexosAtualizados =
      doc.ANEXOS?.filter((anexo) => anexo.Name !== fileName) || [];

    // Se a quantidade for a mesma, o anexo não foi encontrado
    if (anexosAtualizados.length === (doc.ANEXOS?.length || 0)) {
      throw new Error('Anexo não encontrado ou já removido');
    }

    doc.ANEXOS = anexosAtualizados;

    // Atualiza no MongoDB
    const result = await this.updateFullDocument(doc);

    // Opcional: remover do Azure as well
    // await this.azureService.deleteFile(...)
    // No momento seguimos a mesma lógica de receptionist que apenas desanexa

    return result;
  }

  async updateExamGroupDocument(scheduleDocument: SchedulingDocument) {
    const filter = { _id: new ObjectId(scheduleDocument._id) };
    const grupoAlvo = scheduleDocument.EXAMES?.[0]?.grupo;
    const exameAtualizado = scheduleDocument.EXAMES?.[0];

    if (!grupoAlvo || !exameAtualizado) return null;

    const update = { $set: { 'EXAMES.$[elem]': exameAtualizado } };
    const options = {
      arrayFilters: [{ 'elem.grupo': grupoAlvo }],
      returnDocument: 'after' as const,
    };

    const result = await this.schedulingsCollection.findOneAndUpdate(
      filter,
      update,
      options,
    );

    if (!result) {
      this.logger.error(
        `[ERRO] Nenhum documento encontrado para ID ${scheduleDocument._id}`,
      );
    } else {
      this.logger.log(`[OK] Exame '${grupoAlvo}' atualizado no Mongo.`);
    }

    return result;
  }

  private async checkUpdateExamesAssinaturaDigital(
    scheduled: SchedulingDocument,
    user: IUserInfo,
  ): Promise<resultadosExamesQueue[]> {
    const gruposProcessados = new Set<string>();
    const messages: resultadosExamesQueue[] = [];

    for (const exame of scheduled.EXAMES || []) {
      const grupo = (exame.grupo || '').trim();
      if (!grupo || gruposProcessados.has(grupo)) continue;

      const list = getExamesList()[grupo] || [];
      const config = list.find((e) => e.nome === grupo) || list[0];
      const requerAssinaturaDigital = config?.requerAssinaturaDigital === true;
      const enviarParaAzure = config?.enviarParaAzure === true;

      if (!requerAssinaturaDigital || !enviarParaAzure) {
        continue;
      }

      const examesDoGrupo = (scheduled.EXAMES || []).filter(
        (e) => (e.grupo || '').trim() === grupo,
      );

      const hasUrl = examesDoGrupo.some(
        (e) => typeof e.url === 'string' && e.url.trim() !== '',
      );

      // Já existe documento para o grupo no blob.
      if (hasUrl) {
        continue;
      }

      scheduled.EXAMES = (scheduled.EXAMES || []).map((e) => {
        if ((e.grupo || '').trim() !== grupo) return e;

        const snapshot = resolveProfessionalIdentity({
          authUser: user,
          bodyProfessional: {
            codigo: e.codigoProfissional || user.codigo,
            nome: e.profissional || user.nome,
            cpf: user.cpf,
            perfil: user.perfil,
            conselho: user.conselho,
            ufconselho: user.ufconselho,
          },
          existingExam: e,
          route: 'FINISH_SCHEDULING',
        });

        const patched: any = {
          ...e,
          status: ExamStatus.AGUARDANDO_RESULTADO,
          codigoProfissional:
            snapshot?.codigo || e.codigoProfissional || user.codigo,
          profissional: snapshot?.nome || e.profissional || user.nome,
        };

        if (grupo === 'Exame Clínico' && patched.formulario) {
          patched.formulario = {
            ...patched.formulario,
            codigoMedico:
              patched.formulario.codigoMedico ||
              snapshot?.codigo ||
              user.codigo,
            medico: patched.formulario.medico || snapshot?.nome || user.nome,
          };
        }

        return patched;
      });

      messages.push({
        schedulingId: String((scheduled as any)?._id || ''),
        funcionario: scheduled,
        grupo,
        profissional: user,
        updateAt: new Date(),
      });

      gruposProcessados.add(grupo);
    }

    return messages;
  }

  private isExamUrlFromCurrentProntuario(
    url?: string | null,
    prontuario?: string | null,
  ): boolean {
    const normalizedUrl = String(url || '').trim().toLowerCase();
    const normalizedProntuario = String(prontuario || '').trim().toLowerCase();

    if (!normalizedUrl) {
      return false;
    }

    if (!normalizedProntuario) {
      return true;
    }

    return normalizedUrl.includes(`/${normalizedProntuario}/`);
  }

  private buildResolvedProfessionalFromExam(
    exam: ExamsScheduled | undefined,
    fallbackProfessional?: IUserInfo | null,
    authUser?: IUserInfo | null,
  ): IUserInfo | null {
    const examForm = (exam?.formulario as
      | {
        codigoMedico?: string;
        medico?: string;
        codigoProfissional?: string;
        profissional?: string;
      }
      | undefined) ?? {};
    const codigo = String(
      exam?.codigoProfissional ||
      examForm.codigoMedico ||
      examForm.codigoProfissional ||
      fallbackProfessional?.codigo ||
      authUser?.codigo ||
      '',
    ).trim();
    const nome = String(
      exam?.profissional ||
      examForm.medico ||
      examForm.profissional ||
      fallbackProfessional?.nome ||
      authUser?.nome ||
      '',
    ).trim();

    if (!codigo && !nome) {
      return null;
    }

    return {
      codigo,
      nome,
      cpf: fallbackProfessional?.cpf || authUser?.cpf || '',
      perfil: fallbackProfessional?.perfil || authUser?.perfil || '',
      conselho: fallbackProfessional?.conselho || authUser?.conselho || '',
      ufconselho:
        fallbackProfessional?.ufconselho || authUser?.ufconselho || '',
    };
  }

  private invalidateAsoAfterAutomaticReissue(
    funcionario: FuncionarioEntity,
    credentials?: { pin?: string },
  ) {
    const currentAsoInfo = funcionario.getRaw().ASOINFO;
    const currentAsoSignature = currentAsoInfo?.signature;

    const invalidatedAsoInfo: AsoInfo = {
      ...(currentAsoInfo || {}),
      status: 'PENDENTE',
      url: '',
      validacao: undefined,
      emailSent: false,
      updatedAt: new Date(),
      signature: currentAsoSignature
        ? {
          ...currentAsoSignature,
          status: 'PENDENTE',
          signedUrl: '',
          signedAt: undefined,
          validacao: undefined,
          emailSent: false,
          error: undefined,
          retry: {
            pending: false,
            count: 0,
          },
          lastCommandId: undefined,
          credentials: credentials || currentAsoSignature.credentials,
        }
        : {
          documentType: 'ASO' as DocumentType,
          documentId: 'ASO',
          documentName: 'ASO',
          requiresSignature: true,
          status: 'PENDENTE',
          retry: {
            pending: false,
            count: 0,
          },
          emailSent: false,
          credentials,
        },
      credentials: credentials || currentAsoInfo?.credentials,
    };

    funcionario.getRaw().ASOINFO = invalidatedAsoInfo;
    funcionario.getRaw().ASOSTATUS = AsoStatus.NAO_GERADO;
  }

  private async ensureRequiredResultsBeforeMedicalEvaluation(params: {
    funcionario: FuncionarioEntity;
    previousStatus?: AtendimentoStatus;
    authUser?: IUserInfo | null;
    fallbackProfessional?: IUserInfo | null;
    credentials?: { pin?: string };
    examsQueueInfo: any[];
  }): Promise<void> {
    const {
      funcionario,
      previousStatus,
      authUser,
      fallbackProfessional,
      credentials,
      examsQueueInfo,
    } = params;
    const raw = funcionario.getRaw();

    if (raw.ATENDIMENTOSTATUS !== AtendimentoStatus.AVALIACAO_MEDICA) {
      return;
    }

    if (funcionario.isCredenciada()) {
      return;
    }

    const queuedGroupsInFlight = new Set(
      (examsQueueInfo || [])
        .filter((info) => info?.shouldSendToQueue)
        .map((info) => this.normalizeGroupName(info?.grupo)),
    );

    const groupedExams = new Map<
      string,
      {
        groupName: string;
        exams: ExamsScheduled[];
        config: ExamToogle;
      }
    >();

    for (const exam of raw.EXAMES || []) {
      const resolvedGroup = this.resolveExamGroupMetadata({
        exam,
        codigoExame: exam.codigoExame,
      });
      if (!resolvedGroup) {
        continue;
      }

      const { groupName, config } = resolvedGroup;
      if (groupName !== exam.grupo) {
        exam.grupo = groupName;
      }

      const normalizedGroup = this.normalizeGroupName(groupName);
      if (!groupedExams.has(normalizedGroup)) {
        groupedExams.set(normalizedGroup, {
          groupName,
          exams: [],
          config,
        });
      }

      groupedExams.get(normalizedGroup)!.exams.push(exam);
    }

    const blockedGroups: string[] = [];
    const blockedIdentityGroups: string[] = [];

    for (const [normalizedGroup, entry] of groupedExams.entries()) {
      const { groupName, exams, config } = entry;

      if (normalizedGroup === this.normalizeGroupName('Triagem')) {
        continue;
      }

      if (!config?.enviarParaAzure) {
        continue;
      }

      if (config.statusFinalizacao !== ExamStatus.FINALIZADO) {
        continue;
      }

      const groupHasMeaningfulForm = exams.some((exam) =>
        hasMeaningfulExamFormData(exam.formulario),
      );
      if (!groupHasMeaningfulForm) {
        continue;
      }

      const groupHasCurrentUrl = exams.some((exam) =>
        this.isExamUrlFromCurrentProntuario(exam.url, raw.CODIGOPRONTUARIO),
      );
      if (groupHasCurrentUrl) {
        continue;
      }

      const resolvedProfessional = this.buildResolvedProfessionalFromExam(
        exams.find((exam) =>
          String(
            exam.codigoProfissional ||
            exam.profissional ||
            exam.formulario?.codigoMedico ||
            exam.formulario?.medico ||
            exam.formulario?.codigoProfissional ||
            exam.formulario?.profissional ||
            '',
          ).trim(),
        ),
        fallbackProfessional,
        authUser,
      );
      const requiresStrictIdentity =
        !!config.enviarParaAzure &&
        requiresStrictProfessionalIdentityForGroup(groupName);

      if (requiresStrictIdentity && !hasMinimumProfessionalIdentity(resolvedProfessional)) {
        this.logger.warn(
          `[AUTO_REISSUE_IDENTITY_BLOCK] schedulingId=${String(
            raw._id || '',
          )} prontuario=${raw.CODIGOPRONTUARIO || 'n/a'} grupo=${groupName} reason=INSUFFICIENT_IDENTITY`,
        );
        blockedIdentityGroups.push(groupName);
        continue;
      }

      assertProfessionalIdentityAvailable({
        route: 'schedulings/exame/update:auto-medical-eval',
        grupo: groupName,
        professional: resolvedProfessional,
        required: requiresStrictIdentity,
        enforced: isExamProfessionalIdentityBlockEnabled(),
      });

      const assinaturaDigitalObrigatoria =
        !!config.requerAssinaturaDigital &&
        !!String(resolvedProfessional?.codigo || '').trim() &&
        (await this.signatureService.hasValidSignatureSession(
          String(resolvedProfessional?.codigo || '').trim(),
        ));

      raw.EXAMES = raw.EXAMES.map((exam) => {
        if (this.normalizeGroupName(exam.grupo) !== normalizedGroup) {
          return exam;
        }

        return {
          ...exam,
          status: ExamStatus.AGUARDANDO_RESULTADO,
          url: '',
          signature: {
            documentType: 'EXAME',
            documentId: exam.signature?.documentId || exam.codigoExame,
            documentName:
              exam.signature?.documentName ||
              groupName ||
              exam.nomeExame ||
              'Exame',
            requiresSignature: !!config.requerAssinaturaDigital,
            status: 'PENDENTE',
            provider: exam.signature?.provider,
            signedUrl: '',
            signedAt: undefined,
            error: undefined,
            retry: {
              pending: false,
              count: 0,
            },
            codigoProfissional:
              resolvedProfessional?.codigo || exam.codigoProfissional || '',
          },
        };
      });

      blockedGroups.push(groupName);

      if (!queuedGroupsInFlight.has(normalizedGroup)) {
        examsQueueInfo.push({
          grupo: groupName,
          codigo: exams[0]?.codigoExame || '',
          shouldSendToQueue: true,
          assinaturaDigitalObrigatoria,
          enviarParaAzure: true,
          resolvedProfessional,
        });
      }

      this.logger.warn(
        `[AUTO_REISSUE_BEFORE_MEDICAL_EVAL] schedulingId=${String(
          raw._id || '',
        )} prontuario=${raw.CODIGOPRONTUARIO || 'n/a'} grupo=${groupName} action=${queuedGroupsInFlight.has(normalizedGroup)
          ? 'REUSE_CURRENT_QUEUE'
          : 'QUEUE_REISSUE'
        }`,
      );
    }

    if (blockedGroups.length === 0 && blockedIdentityGroups.length === 0) {
      return;
    }

    this.invalidateAsoAfterAutomaticReissue(funcionario, credentials);

    raw.ATENDIMENTOSTATUS =
      previousStatus === AtendimentoStatus.EM_ATENDIMENTO
        ? AtendimentoStatus.EM_ATENDIMENTO
        : AtendimentoStatus.AGUARDANDO_RESULTADOS;

    this.logger.warn(
      `[AUTO_REISSUE_BLOCK_MEDICAL_EVAL] schedulingId=${String(
        raw._id || '',
      )} blockedGroups=${blockedGroups.join(', ')} blockedIdentityGroups=${blockedIdentityGroups.join(', ')}`,
    );
  }

  /**
   * Dispara o envio ao SOCGED caso todos os exames estejam finalizados
   * OU realmente prontos para downstream.
   *
   * Para exames como Espirometria e Raio-X que ficam em AGUARDANDO_RESULTADO
   * (aguardando laudo médico), o ASO pode ser gerado se o PDF do questionário
   * já estiver disponível, desde que não exista assinatura pendente.
   */
  private async maybeTriggerSocgedUpload(funcionario: FuncionarioEntity) {
    if (funcionario.isCredenciada()) {
      this.logger.log(
        `[SOCGED][SKIP] Atendimento KIT CREDENCIADA: abortando trigger de upload para schedulingId=${funcionario.getRaw()._id}`,
      );
      return;
    }

    const allFinalized = funcionario.allExamesFinalizados();
    const allReadyForDownstream = funcionario
      .getRaw()
      .EXAMES.every((exam) => isExamReadyForDownstream(exam));

    this.logger.log(
      `[SOCGED][CHECK] schedulingId=${funcionario.getRaw()._id} | allFinalized=${allFinalized} | allReadyForDownstream=${allReadyForDownstream}`,
    );

    if (!allFinalized && !allReadyForDownstream) {
      const pendingExams = funcionario
        .getRaw()
        .EXAMES.filter((e) => !isExamReadyForDownstream(e))
        .map((e) => getExamDownstreamStateLabel(e))
        .join(', ');
      this.logger.log(`[SOCGED][SKIP] Exames pendentes: ${pendingExams}`);
      return;
    }

    const raw = funcionario.getRaw();

    const statusAtual = raw.ASOINFO?.status;
    const shouldCreateAso = MedicalOpinionRules.shouldCreateAso(
      {
        opinionType: String(
          raw.PARECERMEDICO || ParecerMedico.APTO,
        ) as ParecerMedico,
        details: raw.RECOMENDACAOMEDICA,
      },
      raw as any,
    );

    if (!statusAtual && shouldCreateAso) {
      const asoInfoTracking: AsoInfo = {
        status: 'PENDENTE',
        updatedAt: new Date(),
        signature: {
          documentType: 'ASO',
          documentId: 'ASO',
          documentName: 'ASO',
          requiresSignature: true,
          status: 'PENDENTE',
          retry: {
            pending: false,
            count: 0,
          },
        },
      };

      await this.schedulingsCollection.updateOne(
        { _id: new ObjectId(raw._id) },
        { $set: { ASOINFO: asoInfoTracking } },
      );

      raw.ASOINFO = asoInfoTracking;
    }

    try {
      await this.enqueuePendingAsoProcessingForOperationalRelease(funcionario);
      const socgedPayload = this.buildSocgedPayload(funcionario);
      this.logger.log(
        `[SOCGED][AUTO] Enfileirando prontuário seq=${socgedPayload.sequencialFicha} | Status ASO: ${raw.ASOINFO?.status}`,
      );
      await this.azureService.filaUploadSocged(socgedPayload);
    } catch (err: any) {
      this.logger.error(
        `[SOCGED][AUTO][ERR] Falha ao enfileirar upload: ${err?.message ?? err}`,
      );
    }
  }

  private async enqueuePendingAsoProcessingForOperationalRelease(
    funcionario: FuncionarioEntity,
  ) {
    const raw = funcionario.getRaw();
    const schedulingId = String(raw._id || '').trim();
    const asoInfo = raw.ASOINFO;
    const doctor = funcionario.getMedicoClinico();
    const hasAsoUrl = Boolean(String(asoInfo?.url || '').trim());
    const shouldCreateAso = MedicalOpinionRules.shouldCreateAso(
      {
        opinionType: String(
          raw.PARECERMEDICO || ParecerMedico.APTO,
        ) as ParecerMedico,
        details: raw.RECOMENDACAOMEDICA,
      },
      raw as any,
    );

    if (!schedulingId) {
      this.logger.debug(`[ASO_GUARD] schedulingId vazio`);
      return;
    }
    if (!doctor) {
      this.logger.debug(`[ASO_GUARD] doctor=null schedulingId=${schedulingId}`);
      return;
    }
    if (!shouldCreateAso) {
      this.logger.debug(`[ASO_GUARD] shouldCreateAso=false schedulingId=${schedulingId} parecer=${raw.PARECERMEDICO}`);
      return;
    }
    if (raw.ATENDIMENTOSTATUS !== AtendimentoStatus.FINALIZADO) {
      this.logger.debug(`[ASO_GUARD] status=${raw.ATENDIMENTOSTATUS} != FINALIZADO schedulingId=${schedulingId}`);
      return;
    }
    if (asoInfo?.status !== 'PENDENTE') {
      this.logger.debug(`[ASO_GUARD] asoStatus=${asoInfo?.status} schedulingId=${schedulingId}`);
      return;
    }
    if (hasAsoUrl) {
      this.logger.debug(`[ASO_GUARD] hasAsoUrl=true schedulingId=${schedulingId}`);
      return;
    }

    const queueClaimedAt = new Date();
    const claimed = await this.schedulingsCollection.findOneAndUpdate(
      {
        _id: new ObjectId(schedulingId),
        'ASOINFO.status': 'PENDENTE',
        $and: [
          {
            $or: [
              { 'ASOINFO.url': { $exists: false } },
              { 'ASOINFO.url': null },
              { 'ASOINFO.url': '' },
            ],
          },
          {
            $or: [
              { 'ASOINFO.processingQueuedAt': { $exists: false } },
              { 'ASOINFO.processingQueuedAt': null },
            ],
          },
        ],
      },
      {
        $set: {
          'ASOINFO.processingQueuedAt': queueClaimedAt,
          'ASOINFO.updatedAt': queueClaimedAt,
        },
      },
      { returnDocument: 'after' },
    );

    const claimedDoc = claimed?.value ?? null;
    if (!claimedDoc) {
      this.logger.log(
        `[ASO][AUTO] Queue do ASO já estava reservada ou documento já avançou para schedulingId=${schedulingId}.`,
      );
      return;
    }

    // Validação prévia dos campos obrigatórios
    const requiredFields = [
      { name: 'schedulingId', value: schedulingId },
      { name: 'sequencial', value: raw.SEQUENCIAFICHA },
      { name: 'codEmpresa', value: raw.CODIGOEMPRESA },
      { name: 'codFuncionario', value: raw.CODIGO },
      { name: 'medico', value: doctor.codigo },
    ];

    const missingFields = requiredFields
      .filter((field) => !String(field.value || '').trim())
      .map((field) => field.name);

    if (missingFields.length > 0) {
      this.logger.warn(
        `[ASO][AUTO] Campos obrigatórios ausentes para schedulingId=${schedulingId}: ${missingFields.join(', ')}`,
      );
      this.logger.debug(
        `[ASO][AUTO] Dados do documento para schedulingId=${schedulingId}: ` +
        JSON.stringify({
          schedulingId,
          sequencial: raw.SEQUENCIAFICHA,
          codEmpresa: raw.CODIGOEMPRESA,
          codFuncionario: raw.CODIGO,
          medico: doctor.codigo,
        }),
      );
      return;
    }

    const payload: AsoProcessingMessage = {
      commandId: new ObjectId().toHexString(),
      schedulingId,
      sequencial: raw.SEQUENCIAFICHA,
      nomeFuncionario: raw.NOME,
      nomeEmpresa: raw.NOMEEMPRESA,
      tipoExame: raw.TIPOEXAME,
      tipoExameNome: raw.TIPOEXAMENOME,
      dataFicha: raw.DATAAGENDAMENTO,
      codEmpresa: raw.CODIGOEMPRESA,
      codFuncionario: raw.CODIGO,
      cpfFuncionario: raw.CPFFUNCIONARIO,
      parecer: String(raw.PARECERMEDICO || ParecerMedico.APTO),
      alturaParecer: raw.ALTURA_PARECER,
      confinadoParecer: raw.CONFINADO_PARECER,
      observacoesParecer: asoInfo?.observacoesParecer || [],
      action: 'PROCESSAR',
      createdAt: queueClaimedAt,
      medico: doctor.codigo,
      prontuario: raw.CODIGOPRONTUARIO,
      socgedCode: '',
      profissional: doctor,
      credentials: asoInfo?.credentials,
    };

    if (!isSocOrigin(claimedDoc as SchedulingDocument)) {
      this.logger.log(
        `[ASO_SKIP_ORIGEM][AUTO] schedulingId=${schedulingId} origem=${claimedDoc.AUTENTICACAOATENDIMENTO?.metodo} — não enviado para cmso360-aso-generate`,
      );
      return;
    }

    await this.azureService.filaAsoProcessing(payload);
    this.logger.log(
      `[ASO_ENQUEUE][AUTO] schedulingId=${schedulingId} origem=SOC enfileirado para cmso360-aso-generate`,
    );
  }

  private buildSocgedPayload(funcionario: FuncionarioEntity): UploadSocged {
    const raw = funcionario.getRaw();
    const nomeBase = standardizeFileName(
      `Prontuario_${raw.NOME}_${raw.TIPOEXAMENOME}_${raw.DATAAGENDAMENTO}`,
    );

    // adicionamos schedulingId opcional apenas para facilitar diagnósticos no
    // worker, mas não é exigido pela API SOCGED.
    return {
      arquivo: null,
      codEmpresa: raw.CODIGOEMPRESA,
      codFuncionario: raw.CODIGO,
      codigoGed: CODIGOS_TIPO_SOCGED.PRONTUARIO_MEDICO,
      sequencialFicha: raw.SEQUENCIAFICHA,
      nomeArquivo: `${nomeBase}.PDF`,
      nomeGed: nomeBase,
      schedulingId: raw._id ? raw._id.toString() : undefined,
    };
  }

  async sendFinishExamMessage(funcionario: any) {
    this.webSocket.server
      .to(`${funcionario.UNIDADEATENDIMENTO}:ATENDIMENTO`)
      .emit('exame_concluido', funcionario);
  }

  async handleSchedulingDeleteNotification(data: SchedulingDocument) {
    if (!data) return;

    try {
      await this.schedulingsCollection.deleteOne({
        _id: new ObjectId(data._id),
      });

      this.webSocket.handleSchedulingDelete({
        operation: MongoOperationTypes.DELETE,
        schedule: data,
      });

      return true;
    } catch (err) {
      console.error(err);

      return false;
    }
  }

  public isChangeStreamActive(): boolean {
    return this.changeStreamActive;
  }

  public getChangeStreamHealth(): {
    active: boolean;
    lastEventAgeSec: number;
    reconnectAttempts: number;
    unhealthy: boolean;
  } {
    const lastEventAgeSec = Math.floor(
      (Date.now() - this.lastChangeStreamEvent) / 1000,
    );
    const streamMissing = this.changeStreamActive && !this.changeStream;
    const reconnectStuck = this.reconnectAttempts > this.maxReconnectAttempts;

    return {
      active: this.changeStreamActive,
      lastEventAgeSec,
      reconnectAttempts: this.reconnectAttempts,
      unhealthy:
        !this.changeStreamActive || streamMissing || reconnectStuck,
    };
  }

  public async restartChangeStream(): Promise<void> {
    if (this.isRestarting) {
      this.logger.warn('restartChangeStream já está em execução.');
      return;
    }
    this.isRestarting = true;
    this.logger.warn('🔄 Reiniciando ChangeStream...');

    try {
      this.changeStreamActive = false;

      if (this.changeStream) {
        try {
          this.changeStream.removeAllListeners();
          await this.changeStream.close();
        } catch (error) {
          this.logger.warn(
            'Erro ao fechar ChangeStream anterior:',
            error.message,
          );
        }
      }

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.changeStream = null;

      // Reseta os controladores de inatividade para o momento atual.
      // Isso evita o loop eterno de reinicializações apontado nos logs.
      this.lastChangeStreamEvent = Date.now();
      this.changeStreamMetrics.lastEventTime = Date.now();

      // Sem delay artificial: Reconecta imediatamente usando o Resume Token
      // para recuperar eventuais documentos impactados durante este recarregamento.
      this.listenForSchedulingChanges();
    } catch (error) {
      this.logger.error('Erro ao reiniciar ChangeStream:', error.message);
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * Inicia o ChangeStream do MongoDB para monitorar alterações em agendamentos.
   *
   * Características:
   * - Mantém métricas de desempenho e saúde do stream
   * - Deduplica eventos em uma janela curta para evitar processamento duplicado
   * - Propaga INSERT/UPDATE/DELETE para canais WebSocket específicos (atendimento e prontuário)
   * - Implementa backoff exponencial e tentativa de reconexão em caso de erro ou fechamento
    * - Implementa backoff exponencial e tentativa de reconex?o em caso de erro ou fechamento
    * - Implementa backoff exponencial e tentativa de reconexão em caso de erro ou fechamento
    */
  private listenForSchedulingChanges() {
    if (this.isListening) {
      this.logger.warn('listenForSchedulingChanges já está em execução.');
      return;
    }
    this.isListening = true;

    if (this.changeStreamActive) {
      this.logger.warn('ChangeStream já está ativo.');
      this.isListening = false;
      return;
    }

    // Limpa timer anterior se houver (safety check)
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Deduplicação de eventos
    const recentEvents = new Map<string, number>();
    const EVENT_DEDUP_WINDOW = 500;

    this.logger.log('👀 Iniciando ChangeStream do MongoDB...');

    const openStream = () => {
      this.changeStreamActive = true;
      this.isListening = false;

      this.logger.log(
        `⌚ ChangeStream Inicializado (Ouvindo todos os eventos sem filtro fixo de data)`,
      );

      // Sem restrição estática de {$lte: fimDoDiaBR} para evitar o encerramento do tracking diário na transição da meia-noite
      const pipeline = [];
      // Garante que a abertura sempre resete a inatividade para não conflitar com o Watchdog após desconexões de rede
      this.lastChangeStreamEvent = Date.now();
      this.changeStreamMetrics.lastEventTime = Date.now();

      const options: any = {
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable',
        readPreference: 'primary',
        batchSize: 50,
        maxAwaitTimeMS: 1000,
      };

      if (this.changeStreamToken) {
        options.resumeAfter = this.changeStreamToken;
        this.logger.log(`🕒 Retomando ChangeStream do último evento detectado`);
      }

      const changeStream = this.schedulingsCollection.watch(pipeline, options);

      changeStream.on('change', async (change) => {
        this.lastChangeStreamEvent = Date.now();

        if (
          'documentKey' in change &&
          change.documentKey?._id?.toString() ===
            this.legacyHeartbeatId.toString()
        ) {
          return;
        }

        const startTime = Date.now();
        this.changeStreamToken = (change as any)._id;

        try {
          // Deduplicação
          const eventKey = `${change.operationType}-${change._id}`;
          const now = Date.now();
          const lastEventTime = recentEvents.get(eventKey);

          if (lastEventTime && now - lastEventTime < EVENT_DEDUP_WINDOW) {
            this.logger.debug(`🔄 Evento duplicado ignorado: ${eventKey}`);
            return;
          }

          recentEvents.set(eventKey, now);

          // Limpeza periódica do Map
          if (recentEvents.size > 1000) {
            const cutoff = now - EVENT_DEDUP_WINDOW;
            for (const [key, time] of recentEvents.entries()) {
              if (time < cutoff) recentEvents.delete(key);
            }
          }

          // Atualizar métricas
          this.changeStreamMetrics.eventsProcessed++;
          this.changeStreamMetrics.eventsPerMinute++;

          // ========================================
          // ⚡ INSERT ou REPLACE
          // ========================================
          if (
            change.operationType === MongoOperationTypes.INSERT ||
            change.operationType === MongoOperationTypes.REPLACE
          ) {
            const schedule = change.fullDocument as SchedulingDocument;

            let agendamentoDate: Date | null = null;

            if (schedule.DATAAGENDAMENTO_DATE instanceof Date) {
              agendamentoDate = new Date(schedule.DATAAGENDAMENTO_DATE);
            } else if (typeof schedule.DATAAGENDAMENTO === 'string') {
              agendamentoDate = parseDDMMYYYYtoDateBR(schedule.DATAAGENDAMENTO);
            }

            if (!agendamentoDate || isNaN(agendamentoDate.getTime())) {
              this.logger.warn(
                `Data inválida no agendamento ${schedule._id}: ${schedule.DATAAGENDAMENTO}`,
              );
              return;
            }

            agendamentoDate.setHours(0, 0, 0, 0);

            const { inicioDoDiaBR } = calcularRangePipeline();
            const inicioDia = new Date(inicioDoDiaBR);
            inicioDia.setHours(0, 0, 0, 0);

            const isHoje =
              schedule.DATAAGENDAMENTO ===
              new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              }).format(new Date());
            const isHojeOuAnterior = agendamentoDate <= inicioDia;

            if (isHoje) {
              this.webSocket.handleSchedulingChangedAtendimento({
                operation: MongoOperationTypes.INSERT,
                schedule,
              });
            }

            if (isHojeOuAnterior) {
              this.webSocket.handleSchedulingChangedProntuario({
                operation: MongoOperationTypes.INSERT,
                schedule,
              });
            }

            this.logger.debug(
              `✅ INSERT processado: ${schedule.NOME} | Hoje: ${isHoje} | Anterior: ${isHojeOuAnterior}` ,
            );
          } else if (change.operationType === MongoOperationTypes.UPDATE) {
            const updated = change.fullDocument as SchedulingDocument;

            let agendamentoDate: Date | null = null;

            if (updated.DATAAGENDAMENTO_DATE instanceof Date) {
              agendamentoDate = new Date(updated.DATAAGENDAMENTO_DATE);
            } else if (typeof updated.DATAAGENDAMENTO === 'string') {
              agendamentoDate = parseDDMMYYYYtoDateBR(updated.DATAAGENDAMENTO);
            }

            if (!agendamentoDate || isNaN(agendamentoDate.getTime())) {
              this.logger.warn(
                `Data inválida no UPDATE ${updated._id}: ${updated.DATAAGENDAMENTO}`,
              );
              return;
            }

            agendamentoDate.setHours(0, 0, 0, 0);

            const { inicioDoDiaBR } = calcularRangePipeline();
            const inicioDia = new Date(inicioDoDiaBR);
            inicioDia.setHours(0, 0, 0, 0);

            const isHoje =
              updated.DATAAGENDAMENTO ===
              new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
              }).format(new Date());
            const isHojeOuAnterior = agendamentoDate <= inicioDia;

            if (isHoje) {
              this.webSocket.handleSchedulingChangedAtendimento({
                operation: MongoOperationTypes.UPDATE,
                schedule: updated,
              });
            }

            if (isHojeOuAnterior) {
              this.webSocket.handleSchedulingChangedProntuario({
                operation: MongoOperationTypes.UPDATE,
                schedule: updated,
              });
            }
          } else if (change.operationType === MongoOperationTypes.DELETE) {
            const deletedDoc =
              change.fullDocumentBeforeChange as SchedulingDocument;

            if (!deletedDoc) {
              return; // Ignora DELETE sem dados
            }

            let agendamentoDate: Date | null = null;

            if (deletedDoc.DATAAGENDAMENTO_DATE instanceof Date) {
              agendamentoDate = new Date(deletedDoc.DATAAGENDAMENTO_DATE);
            } else if (typeof deletedDoc.DATAAGENDAMENTO === 'string') {
              agendamentoDate = parseDDMMYYYYtoDateBR(
                deletedDoc.DATAAGENDAMENTO,
              );
            }

            if (!agendamentoDate || isNaN(agendamentoDate.getTime())) {
              return; // Data inválida
            }

            const { fimDoDiaBR } = calcularRangePipeline();

            const isHojeOuAnterior = agendamentoDate <= fimDoDiaBR;
            if (isHojeOuAnterior) {
              this.webSocket.handleSchedulingDelete({
                operation: MongoOperationTypes.DELETE,
                schedule: deletedDoc,
              });
            }

            this.logger.log(`DELETE processado: ${change.documentKey._id}`);
          }

          // Atualizar métricas de latência
          const latency = Date.now() - startTime;
          this.changeStreamMetrics.averageLatency =
            (this.changeStreamMetrics.averageLatency + latency) / 2;

          this.changeStreamMetrics.lastEventTime = Date.now();

          if (latency > 200) {
            this.logger.warn(`Evento processado: ${latency}ms`);
          }
        } catch (err) {
          this.changeStreamMetrics.eventsFailed++;
          this.logger.error(
            `Erro ao processar evento do ChangeStream:`,
            err,
          );
        }
      });

      // Handlers de reconexão
      const handleReconnect = (reason: string) => {
        this.changeStreamActive = false;
        this.reconnectAttempts++;

        // Limita tentativas e reseta após sucesso
        const MAX_BACKOFF = 10000; // 10 segundos máximo
        const delay = Math.min(
          1000 * Math.pow(2, Math.min(this.reconnectAttempts, 10)),
          MAX_BACKOFF,
        );
        // Se tentativas > 5, aguarda 5 minutos antes de tentar novamente
        if (this.reconnectAttempts > 5) {
          this.logger.error(
            `Múltiplas tentativas falhas. Aguardando 5 minutos antes de nova tentativa.`,
          );
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectTimer = null;
            this.reconnectTimer = null;
            this.reconnectAttempts = 0; // Reset
            openStream();
          }, 300000); // 5 minutos (300.000ms) - CORRIGIDO
          return;
        }

        // Limpa eventos duplicados
        recentEvents.clear();

        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.logger.debug(
            `🔄 Reconectando ChangeStream (tentativa ${this.reconnectAttempts})...`,
          );
          openStream();
        }, delay);
      };

      changeStream.on('error', (err) => {
        this.logger.error('Erro no ChangeStream:', err);
        handleReconnect('Erro no ChangeStream');
      });

      changeStream.on('close', () => {
        handleReconnect('ChangeStream fechado');
      });

      changeStream.on('change', () => {
        if (this.reconnectAttempts > 0) {
          this.logger.log('ChangeStream reconectado com sucesso');
          this.reconnectAttempts = 0; // Reset para próximas falhas
        }
      });

      // Armazena referência
      this.changeStream = changeStream;
    };

    try {
      openStream();
    } catch (error) {
      this.changeStreamActive = false;
      this.isListening = false;
      this.logger.error('Erro ao abrir ChangeStream:', error.message);
    }
  }

  // ============================================
  // MÉTODOS DE ASSINATURA DIGITAL (UNIFICADOS)
  // ============================================

  /**
   * Busca documentos pendentes de assinatura para um profissional
   */
  async getPendingSignatureByProfessional(
    professionalCode: string,
    limit?: number,
  ): Promise<PendingDocument[]> {
    return this.getPendingDocumentsByProfessional(professionalCode, limit);
  }

  /**
   * Busca documentos pendentes de assinatura para um profissional (Implementação)
   */
  async getPendingDocumentsByProfessional(
    professionalCode: string,
    limit?: number,
  ): Promise<PendingDocument[]> {
    const docs = await this.schedulingsCollection
      .find({
        $or: [
          // Exames pendentes
          {
            EXAMES: {
              $elemMatch: {
                'signature.requiresSignature': true,
                'signature.status': 'PENDENTE',
                $and: [
                  {
                    $or: [
                      { 'signature.retry.nextRetryAt': { $lte: new Date() } },
                      { 'signature.retry.nextRetryAt': { $exists: false } },
                    ],
                  },
                  {
                    $or: [
                      { codigoProfissional: professionalCode },
                      { 'formulario.codigoProfissional': professionalCode },
                    ],
                  },
                ],
              },
            },
          },
          // ASO pendente ou aguardando autenticação
          {
            'ASOINFO.signature.requiresSignature': true,
            $or: [
              { 'ASOINFO.signature.status': 'PENDENTE' },
              {
                'ASOINFO.signature.status': 'AGUARDANDO_AUTENTICACAO',
                'ASOINFO.signature.error': /credenciais.*ausentes/i,
              },
            ],
            $and: [
              {
                $or: [
                  {
                    'ASOINFO.signature.retry.nextRetryAt': {
                      $lte: new Date(),
                    },
                  },
                  {
                    'ASOINFO.signature.retry.nextRetryAt': {
                      $exists: false,
                    },
                  },
                ],
              },
              {
                $or: [
                  { 'ASOINFO.codigoProfissional': professionalCode },
                  { MEDICO: professionalCode },
                  { 'EXAMES.codigoProfissional': professionalCode },
                  { 'EXAMES.formulario.codigoMedico': professionalCode },
                  { 'EXAMES.formulario.codigoProfissional': professionalCode },
                ],
              },
            ],
          },
        ],
      })
      .toArray();

    return this.extractPendingDocuments(docs);
  }

  /**
   * Extrai documentos pendentes do resultado
   */
  private extractPendingDocuments(docs: any[]): PendingDocument[] {
    const pending: PendingDocument[] = [];

    for (const doc of docs) {
      // Processa EXAMES
      for (let i = 0; i < (doc.EXAMES || []).length; i++) {
        const exam = doc.EXAMES[i];
        if (
          exam.signature?.requiresSignature &&
          exam.signature?.status === 'PENDENTE'
        ) {
          pending.push({
            schedulingId: doc._id.toString(),
            documentType: 'EXAME',
            documentIndex: i,
            documentId: exam.codigoExame,
            documentName: exam.nomeExame,
            provider: exam.signature.provider,
            url: exam.url,
            signature: exam.signature,
            professionalCode: exam.codigoProfissional,
          });
        }
      }

      // Processa ASO
      if (
        doc.ASOINFO?.signature?.requiresSignature &&
        (doc.ASOINFO?.signature?.status === 'PENDENTE' ||
          doc.ASOINFO?.signature?.status === 'AGUARDANDO_AUTENTICACAO')
      ) {
        const clinicalDoctor = Array.isArray(doc?.EXAMES)
          ? new FuncionarioEntity(doc as SchedulingDocument).getMedicoClinico()
          : null;
        pending.push({
          schedulingId: doc._id.toString(),
          documentType: 'ASO',
          documentId: 'ASO',
          documentName: 'ASO',
          provider: doc.ASOINFO.signature.provider,
          url: doc.ASOINFO.url,
          signature: doc.ASOINFO.signature,
          professionalCode:
            clinicalDoctor?.codigo ||
            doc.ASOINFO.codigoProfissional ||
            doc.MEDICO,
        });
      }
    }

    return pending;
  }

  /**
   * Atualiza a assinatura de um documento (ASO ou EXAME)
   */
  async updateDocumentSignature(
    schedulingId: string,
    documentType: DocumentType,
    documentIndex: number | undefined,
    update: Partial<DocumentSignatureInfo>,
  ): Promise<void> {
    const filter = { _id: new ObjectId(schedulingId) };
    const updateQuery: Record<string, any> = {};

    if (documentType === 'ASO') {
      const doc = await this.schedulingsCollection.findOne<SchedulingDocument>(
        filter,
        {
          projection: { 'ASOINFO.signature': 1 },
        },
      );

      const currentSignature =
        doc?.ASOINFO?.signature && typeof doc.ASOINFO.signature === 'object'
          ? doc.ASOINFO.signature
          : null;

      const mergedSignature: DocumentSignatureInfo = {
        ...(currentSignature || {
          documentType: 'ASO',
          requiresSignature: true,
          status: 'PENDENTE',
        }),
        ...update,
        documentType: 'ASO',
      };

      updateQuery['ASOINFO.signature'] = mergedSignature;
      if (update.status) updateQuery['ASOINFO.status'] = update.status;
      if (update.signedUrl) updateQuery['ASOINFO.url'] = update.signedUrl;
      updateQuery['ASOINFO.updatedAt'] = new Date();

      await this.schedulingsCollection.updateOne(filter, { $set: updateQuery });
      return;
    }

    if (documentIndex === undefined || documentIndex < 0) {
      throw new Error(
        `documentIndex invalido para updateDocumentSignature EXAME: ${documentIndex}`,
      );
    }

    const doc = await this.schedulingsCollection.findOne<SchedulingDocument>(
      filter,
      {
        projection: { [`EXAMES.${documentIndex}.signature`]: 1 },
      },
    );

    const currentSignature =
      doc?.EXAMES?.[documentIndex]?.signature &&
        typeof doc.EXAMES[documentIndex].signature === 'object'
        ? doc.EXAMES[documentIndex].signature
        : null;

    const mergedSignature: DocumentSignatureInfo = {
      ...(currentSignature || {
        documentType: 'EXAME',
        requiresSignature: true,
        status: 'PENDENTE',
      }),
      ...update,
      documentType: 'EXAME',
    };

    updateQuery[`EXAMES.${documentIndex}.signature`] = mergedSignature;
    if (update.signedUrl) {
      updateQuery[`EXAMES.${documentIndex}.url`] = update.signedUrl;
    }

    await this.schedulingsCollection.updateOne(filter, { $set: updateQuery });
  }

  /**
   * Busca a assinatura atual de um documento
   */
  async getDocumentSignature(
    schedulingId: string,
    documentType: DocumentType,
    documentIndex?: number,
  ): Promise<DocumentSignatureInfo | null> {
    const projection: any = { _id: 0 };
    if (documentType === 'ASO') {
      projection['ASOINFO.signature'] = 1;
    } else {
      projection[`EXAMES.${documentIndex}.signature`] = 1;
    }

    const doc = await this.schedulingsCollection.findOne(
      { _id: new ObjectId(schedulingId) },
      { projection },
    );

    if (!doc) return null;

    if (documentType === 'ASO') {
      return doc.ASOINFO?.signature || null;
    } else {
      return doc.EXAMES?.[documentIndex!]?.signature || null;
    }
  }

  // ======================== MÉTODOS DE BIOMETRIA ======================== //

  async registrarAuditoriaBiometria(auditData: {
    tipo: 'BIOMETRIA_CADASTRO' | 'BIOMETRIA_VALIDACAO';
    funcionarioId: string;
    cpfHash?: string;
    dataNascimentoHash?: string;
    dedo: string;
    requestId: string;
    resultado: 'SUCESSO' | 'ERRO' | 'CANCELADO' | 'TENTATIVA_DUPLICADA';
    codigoErro?: string;
    unidade?: string;
    operador?: string;
    agentIpLocal?: string;
    agentMachineName?: string | null;
    digitalDocumentalHash?: string;
    templateHash?: string | null;
    score?: number | null;
    threshold?: number | null;
  }) {
    try {
      const collection = this.db.collection('biometrias_audit');
      await collection.insertOne({
        tipo: auditData.tipo,
        funcionarioId: auditData.funcionarioId,
        cpfHash: auditData.cpfHash || null,
        dataNascimentoHash: auditData.dataNascimentoHash || null,
        dedo: auditData.dedo,
        requestId: auditData.requestId,
        resultado: auditData.resultado,
        codigoErro: auditData.codigoErro || null,
        unidade: auditData.unidade || null,
        operador: auditData.operador || null,
        agentIpLocal: auditData.agentIpLocal || null,
        agentMachineName: auditData.agentMachineName || null,
        digitalDocumentalHash: auditData.digitalDocumentalHash || null,
        templateHash: auditData.templateHash || null,
        score: auditData.score || null,
        threshold: auditData.threshold || null,
        criadoEm: new Date(),
      });
    } catch (error) {
      this.logger.error(`[BIOMETRIA_AUDIT] Falha ao registrar auditoria de biometria: ${error.message}`, error);
    }
  }

  async updateSchedulingAuthInfo(
    schedulingId: string,
    authInfo: Partial<AtendimentoAuthInfo>,
  ): Promise<void> {
    try {
      const current = await this.schedulingsCollection.findOne(
        { _id: new ObjectId(schedulingId) },
        { projection: { AUTENTICACAOATENDIMENTO: 1 } },
      );

      const enriched: Partial<AtendimentoAuthInfo> = { ...authInfo };
      if (enriched.status === 'VALIDADO' && !enriched.validadoEm) {
        enriched.validadoEm = new Date().toISOString();
      }

      const normalized = mergeUnifiedAtendimentoAuthInfo(
        (current as any)?.AUTENTICACAOATENDIMENTO,
        enriched,
      );

      await this.schedulingsCollection.updateOne(
        { _id: new ObjectId(schedulingId) },
        { $set: { AUTENTICACAOATENDIMENTO: normalized } },
      );

      this.logger.log(
        `[AUTH_INFO] AUTENTICACAOATENDIMENTO atualizado: schedulingId=${schedulingId} metodo=${authInfo.metodo} status=${authInfo.status}`,
      );
    } catch (error) {
      this.logger.error(
        `[AUTH_INFO] Falha ao atualizar AUTENTICACAOATENDIMENTO: schedulingId=${schedulingId} error=${error.message}`,
        error,
      );
    }
  }

  async getCadastroBiometricoAtivo(funcionarioId: string, dedoCodigo: string) {
    const collection = this.db.collection('biometrias');
    const funcionarioIds: any[] = [funcionarioId];
    if (ObjectId.isValid(funcionarioId)) {
      funcionarioIds.push(new ObjectId(funcionarioId));
    }

    return collection.findOne({
      funcionarioId: { $in: funcionarioIds },
      dedo: dedoCodigo,
      status: 'ATIVO',
    });
  }

  async getCadastroBiometricoAtivoByIdentity(cpfHash: string, dataNascimentoHash: string, dedoCodigo: string, requestId?: string) {
    const collection = this.db.collection('biometrias');
    const cpfHashPrefix = cpfHash ? cpfHash.slice(0, 16) : '';
    const dataNascimentoHashPrefix = dataNascimentoHash ? dataNascimentoHash.slice(0, 16) : '';
    
    this.logger.log(
      `BIOMETRIA_VALIDACAO_BUSCA_INICIADA requestId=${requestId || ''} cpfHashPrefix=${cpfHashPrefix}... dataNascimentoHashPrefix=${dataNascimentoHashPrefix}... dedo=${dedoCodigo}`
    );

    const doc = await collection.findOne({
      cpfHash,
      dataNascimentoHash,
      dedo: dedoCodigo,
      status: 'ATIVO',
    });

    if (!doc) {
      this.logger.log(
        `BIOMETRIA_VALIDACAO_BUSCA_NOT_FOUND requestId=${requestId || ''} cpfHashPrefix=${cpfHashPrefix}... dataNascimentoHashPrefix=${dataNascimentoHashPrefix}... dedo=${dedoCodigo}`
      );
    }

    return doc;
  }

  async getCadastroBiometricoStatusByIdentity(cpfHash: string, dataNascimentoHash: string) {
    const collection = this.db.collection('biometrias');

    const ativo = await collection.findOne({
      cpfHash,
      dataNascimentoHash,
      status: 'ATIVO',
    });

    if (ativo) {
      return {
        status: 'ATIVO',
        dedos: [ativo.dedo],
        template: ativo.template,
        documento: ativo,
      };
    }

    const pendente = await collection.findOne({
      cpfHash,
      dataNascimentoHash,
      status: 'PENDENTE_TEMPLATE_ENGINE',
    });

    if (pendente) {
      return {
        status: 'PENDENTE_TEMPLATE_ENGINE',
        dedos: [pendente.dedo],
        template: null,
        documento: pendente,
      };
    }

    return { status: 'NAO_ENCONTRADO', dedos: [], template: null, documento: null };
  }

  async getLatestSchedulingContextByProntuario(prontuario: string) {
    if (!prontuario) return null;

    return this.schedulingsCollection.findOne(
      { CODIGOPRONTUARIO: prontuario } as any,
      {
        sort: { DATAAGENDAMENTO_DATE: -1, _id: -1 } as any,
        projection: {
          NOME: 1,
          NOMEEMPRESA: 1,
          CODIGOPRONTUARIO: 1,
          UNIDADEATENDIMENTO: 1,
          DATAAGENDAMENTO: 1,
        },
      } as any,
    );
  }

  async salvarCadastroBiometrico(data: {
    funcionarioId: string;
    cpfHash: string;
    dataNascimentoHash?: string;
    dedo: string;
    template: string | null;
    templateHash: string;
    templateEncrypted?: string;
    templateEncryption?: any;
    templateVersion?: string;
    templateStorage: string;
    status?: string;
    unidade?: string;
    agentIpLocal?: string;
    agentMachineName?: string | null;
    operadorId?: string;
    operadorCodigo?: string;
    funcionarioRefs?: Array<{
      funcionarioId: string;
      prontuarioId?: string | null;
      schedulingId?: string | null;
      origem: string;
      vinculadoEm: Date;
    }>;
    metadata?: any;
    digitalDocumentalBlobPath?: string;
    digitalDocumentalHash?: string;
    digitalDocumentalContentType?: string;
    digitalDocumentalGeradaEm?: Date;
    digitalDocumentalFinalidade?: string;
    digitalDocumentalOrigem?: string;
    /**
     * Reservado para conformidade LGPD futura (Fase 2+).
     * Registra base legal, finalidade e evidência de ciência do titular.
     * Não obrigatório na Fase 1.3 — campo opcional para compatibilidade futura.
     */
    lgpd?: {
      baseLegal: string;           // Ex: "Art. 7º, II c/c Art. 11, II, a LGPD"
      finalidade: string;          // Ex: "Controle de acesso biométrico ocupacional"
      cienciaRegistradaEm: Date;   // Quando o titular registrou ciência
      cienciaRegistradaPor: string; // ID do operador que registrou
      versaoTermo: string;         // Ex: "v1.0"
      origem: string;              // Ex: "RECEPCAO_MODAL"
      alternativaDisponivel: boolean; // Se existe alternativa não-biométrica
    };
  }) {
    const collection = this.db.collection('biometrias');

    const payload: any = {
      funcionarioId: ObjectId.isValid(data.funcionarioId) ? new ObjectId(data.funcionarioId) : data.funcionarioId as any,
      cpfHash: data.cpfHash,
      dataNascimentoHash: data.dataNascimentoHash || null,
      dedo: data.dedo,
      template: data.template,
      templateHash: data.templateHash,
      templateEncrypted: data.templateEncrypted || null,
      templateEncryption: data.templateEncryption || null,
      templateVersion: data.templateVersion || null,
      templateStorage: data.templateStorage,
      status: data.status || 'ATIVO',
      cadastradoEm: new Date(),
      cadastradoPor: (data.operadorId && ObjectId.isValid(data.operadorId)) ? new ObjectId(data.operadorId) : null,
      cadastradoPorCodigo: data.operadorCodigo || data.operadorId || null,
      unidade: data.unidade,
      agentIpLocal: data.agentIpLocal,
      agentMachineName: data.agentMachineName || null,
      funcionarioRefs: data.funcionarioRefs || [],
      metadata: data.metadata,
      digitalDocumentalBlobPath: data.digitalDocumentalBlobPath || null,
      digitalDocumentalHash: data.digitalDocumentalHash || null,
      digitalDocumentalContentType: data.digitalDocumentalContentType || null,
      digitalDocumentalGeradaEm: data.digitalDocumentalGeradaEm || null,
      digitalDocumentalFinalidade: data.digitalDocumentalFinalidade || null,
      digitalDocumentalOrigem: data.digitalDocumentalOrigem || null,
      lgpd: data.lgpd || null,
    };

    try {
      return await collection.insertOne(payload);
    } catch (error: any) {
      if (error.code === 11000) {
        this.logger.warn(
          `[BIOMETRIA] Duplicata detectada (cpfHash=${data.cpfHash?.slice(0, 16)}... ` +
          `dedo=${data.dedo}), atualizando cadastro existente com nova captura.`
        );
        const filter = {
          cpfHash: data.cpfHash,
          dataNascimentoHash: data.dataNascimentoHash || null,
          dedo: data.dedo,
          status: data.status || 'ATIVO',
        };
        // O driver do MongoDB adiciona _id ao payload durante insertOne
        // Remover para evitar erro "modify the immutable field _id"
        delete payload._id;
        await collection.updateOne(filter, { $set: payload });
        const updated = await collection.findOne(filter);
        return { insertedId: updated?._id };
      }
      this.logger.error(`[BIOMETRIA] Falha ao salvar cadastro biométrico: ${error.message}`, error);
      throw error;
    }
  }

  async atualizarBiometriaLgpd(
    biometriaId: string,
    lgpd: Record<string, unknown>,
  ) {
    const collection = this.db.collection('biometrias');
    const filter = {
      _id: ObjectId.isValid(biometriaId)
        ? new ObjectId(biometriaId)
        : (biometriaId as any),
    };

    await collection.updateOne(filter, {
      $set: { lgpd },
    });
  }

  async gerarBiometriaDocumentalInfo(biometriaId: string) {
    try {
      const collection = this.db.collection('biometrias');
      const doc = await collection.findOne({
        _id: ObjectId.isValid(biometriaId) ? new ObjectId(biometriaId) : biometriaId as any,
      });

      if (!doc) {
        return null;
      }

      const dedoLabels: Record<string, string> = {
        'INDICADOR_DIREITO': 'Indicador direito',
        'INDICADOR_ESQUERDO': 'Indicador esquerdo',
        'POLICAR_DIREITO': 'Polegar direito',
        'POLICAR_ESQUERDO': 'Polegar esquerdo',
        'MEDIO_DIREITO': 'Médio direito',
        'MEDIO_ESQUERDO': 'Médio esquerdo',
        'ANELAR_DIREITO': 'Anelar direito',
        'ANELAR_ESQUERDO': 'Anelar esquerdo',
        'MINIMO_DIREITO': 'Mínimo direito',
        'MINIMO_ESQUERDO': 'Mínimo esquerdo',
      };

      return {
        requestId: doc.metadata?.requestId || null,
        dedo: doc.dedo || null,
        dedoLabel: dedoLabels[doc.dedo] || doc.dedo,
        capturadoEm: doc.cadastradoEm?.toISOString() || null,
        unidade: doc.unidade || null,
        operador: doc.cadastradoPor?.toString() || null,
        agentMachineName: doc.agentMachineName || null,
        digitalDocumentalBlobPath: doc.digitalDocumentalBlobPath || null,
        digitalDocumentalHash: doc.digitalDocumentalHash || null,
        finalidade: doc.digitalDocumentalFinalidade || 'COMPOSICAO_DOCUMENTAL',
        origem: doc.digitalDocumentalOrigem || 'IMAGEM_DERIVADA_NAO_RAW',
        textoEvidencia: 'Evidência biométrica documental gerada a partir de captura local no agente CMSO360.',
      };
    } catch (error) {
      this.logger.error(`[BIOMETRIA] Falha ao gerar info documental: ${error.message}`, error);
      return null;
    }
  }

  private async enriquecerMedicoCoordenador(
    codigoEmpresa: string,
    unidadeAtendimento: string | null | undefined,
  ): Promise<MedicoCoordenadorSnapshot | null> {
    const empresa = await this.empresaCacheService.getEmpresa(codigoEmpresa);
    if (!empresa?.RESPONSAVEISTECNICOS?.length) return null;

    const agora = new Date();
    const coord = empresa.RESPONSAVEISTECNICOS.find(
      (r) =>
        r.documentos.includes('PCMSO') &&
        (!r.dataInicio || new Date(r.dataInicio) <= agora) &&
        (!r.dataFim || new Date(r.dataFim) >= agora),
    );
    if (!coord) return null;

    let cidade = empresa.CIDADE || null;
    let enderecoLogradouro = empresa.ENDERECO || null;
    let numero = empresa.NUMEROENDERECO || null;
    let bairro = empresa.BAIRRO || null;
    let cep = empresa.CEP || null;
    let ufEndereco = empresa.UF || null;

    if (unidadeAtendimento) {
      try {
        const unit = await this.unitsService.findByNome(unidadeAtendimento);
        if (unit) {
          cidade = unit.cidade || cidade;
          enderecoLogradouro = unit.endereco || enderecoLogradouro;
          ufEndereco = unit.uf || ufEndereco;
          cep = unit.cep || cep;
        }
      } catch {
        // fallback silencioso para dados da empresa
      }
    }

    return {
      nome: coord.nome,
      crm: coord.registro,
      uf: coord.uf,
      cidade,
      endereco: enderecoLogradouro,
      numero,
      complemento: empresa.COMPLEMENTOENDERECO || null,
      bairro,
      origem: 'CADASTRO_INTERNO',
      atualizadoEm: new Date().toISOString(),
    };
  }

  /**
   * Busca atendimentos do dia anterior que possuem exames com status NAO_REALIZADO.
   * Utilizado na janela de manutenção diária para gerar relatório de pendências.
   */
  async findSchedulingsWithUnfinishedExams(
    targetDate: Date,
  ): Promise<SchedulingDocument[]> {
    try {
      const diaBrStr = formatInTimeZone(targetDate, 'America/Sao_Paulo', 'dd/MM/yyyy');

      this.logger.log(
        `[UNFINISHED_EXAMS] Buscando atendimentos do dia ${diaBrStr} com exames NAO_REALIZADO...`,
      );

      const schedulings = await this.schedulingsCollection
        .find({
          DATAAGENDAMENTO: diaBrStr,
          'EXAMES.status': ExamStatus.NAO_REALIZADO,
        })
        .toArray();

      this.logger.log(
        `[UNFINISHED_EXAMS] Encontrados ${schedulings.length} atendimentos com exames não realizados.`,
      );

      return schedulings;
    } catch (error) {
      this.logger.error(
        '[UNFINISHED_EXAMS] Erro ao buscar atendimentos com exames não realizados:',
        error,
      );
      return [];
    }
  }

  /**
   * Envia relatório de exames não realizados para a equipe via email.
   * O email é enfileirado para processamento pelo cmso360-worker.
   */
  async sendUnfinishedExamsReport(
    schedulings: SchedulingDocument[],
  ): Promise<void> {
    if (schedulings.length === 0) {
      this.logger.log('[UNFINISHED_EXAMS] Nenhum atendimento para reportar.');
      return;
    }

    try {
      const parecerEmailTo =
        this.configService
          .get<string>('PARECER_MEDICO_EMAIL_TO')
          ?.trim() ||
        'liberacao@cmsocupacional.com.br,tecnologia@cmsocupacional.com.br,incompany@cmsocupacional.com.br';
      const parecerEmailCc =
        this.configService
          .get<string>('PARECER_MEDICO_EMAIL_CC')
          ?.trim() ||
        'enfermagem@cmsocupacional.com.br,draandrea@cmsocupacional.com.br';

      // Agrupa exames não realizados por atendimento
      const reportData = schedulings.map((scheduling) => {
        const unfinishedExams =
          scheduling.EXAMES?.filter(
            (exam) => exam.status === ExamStatus.NAO_REALIZADO,
          ) || [];

        return {
          nomeFuncionario: scheduling.NOME,
          nomeEmpresa: scheduling.NOMEEMPRESA,
          tipoExame: scheduling.TIPOEXAMENOME,
          dataAgendamento: scheduling.DATAAGENDAMENTO,
          unfinishedExams: unfinishedExams.map((exam) => ({
            nomeExame: exam.nomeExame,
            status: exam.status,
          })),
        };
      });

      const reportDate = formatInTimeZone(
        new Date(),
        'America/Sao_Paulo',
        'dd/MM/yyyy',
      );

      await this.azureService.filaEnvioDeEmail({
        attachment: [],
        cc: parecerEmailCc,
        subject: `RELATÓRIO: Exames Não Realizados - ${reportDate}`,
        template: '',
        templatename: 'EXAMES_NAO_REALIZADOS' as any,
        to: parecerEmailTo,
        data: {
          unfinishedExamsInfo: {
            reportDate,
            totalAttendances: schedulings.length,
            attendances: reportData,
          },
        },
      });

      this.logger.log(
        `[UNFINISHED_EXAMS] Relatório enfileirado com ${schedulings.length} atendimentos.`,
      );
    } catch (error) {
      this.logger.error(
        '[UNFINISHED_EXAMS] Erro ao enfileirar relatório de exames não realizados:',
        error,
      );
      throw error;
    }
  }

  private listenForMuralChanges() {
    try {
      this.logger.log('👀 Iniciando ChangeStream do MongoDB para Murais...');
      const changeStream = this.db.collection('murais').watch();

      changeStream.on('change', (change) => {
        this.logger.log(`🔔 Alteração detectada no Mural Digital (tipo: ${change.operationType}), notificando clientes via WebSocket.`);
        if (this.webSocket?.server) {
          this.webSocket.server.to('MURAL').emit('mural_alterado', {
            operationType: change.operationType,
            documentKey: change.documentKey,
          });
        }
      });

      changeStream.on('error', (error) => {
        this.logger.error('Erro no ChangeStream de murais:', error);
      });
    } catch (err) {
      this.logger.error('Falha ao iniciar ChangeStream de murais:', err);
    }
  }
}
