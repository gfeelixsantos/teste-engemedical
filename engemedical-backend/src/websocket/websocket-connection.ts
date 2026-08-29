import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import { AzureService } from 'src/azure/azure.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { SchedulingChange } from 'src/mongo/types/scheduling';
import { PushService } from 'src/push/push.service';
import { SocService } from 'src/soc/soc.service';
import { TicketActionType, TicketStatus } from 'src/ticket/enum/ticket.enum';
import { PreparationRequestModel, Ticket } from 'src/ticket/interfaces/ticket';
import { IUserWebsocket } from 'src/user/interfaces/user.interface';
import { WebsocketType, PreparationRequestTypes } from './enum/websocket.enum';
import {
  EventType,
  CustomEventMap,
  EventPayloadMap,
  TicketActionSuccessPayload,
  BiometriaCapturaRequestPayload,
  BiometriaCapturaCommandPayload,
  BiometriaCapturaSuccessPayload,
  BiometriaCapturaErrorPayload,
  BiometriaCapturaStartedPayload,
  BiometriaCapturaResultPayload,
  BiometriaCapturaStatusPayload,
  BiometriaCapturaCancelPayload,
  BiometriaCadastroRequestPayload,
  BiometriaCadastroCommandPayload,
  BiometriaCadastroStatusPayload,
  BiometriaCadastroResultPayload,
  BiometriaCadastroCancelPayload,
  BiometriaValidacaoRequestPayload,
  BiometriaValidacaoCommandPayload,
  BiometriaValidacaoStatusPayload,
  BiometriaValidacaoResultPayload,
  BiometriaStatusFuncionarioRequestPayload,
  BiometriaStatusFuncionarioResultPayload,
  BiometriaAgentStatusPayload,
  BiometriaRequestStatusPayload,
  BiometriaRequestStatePayload,
  BiometriaAgentSnapshotPayload,
  FacialCadastroRequestPayload,
  FacialCadastroCommandPayload,
  FacialCadastroStatusPayload,
  FacialCadastroResultPayload,
  FacialCadastroCancelPayload,
  FacialValidacaoRequestPayload,
  FacialValidacaoCommandPayload,
  FacialValidacaoStatusPayload,
  FacialValidacaoResultPayload,
  TeleatendimentoJoinPayload,
  TeleatendimentoSignalPayload,
  TeleatendimentoChatPayload,
  UserPresencePayload,
} from './events/events';

export interface IUserPresence {
  socketId: string;
  id?: string;
  nome: string;
  unidade: string;
  sala?: string;
  type: string;
  exame?: string;
  conectadoEm: Date;
  isTeleatendimentoActive: boolean;
  inviteUrl?: string;
}
import {
  PrinterService,
  PrinterResult,
  ActionRequest,
  ActionRequestAtendimento,
} from './interfaces/actions';
import { TtsService } from 'src/aws/tts.service';
import { ObjectId } from 'mongodb';
import { BiometriaCryptoService } from 'src/biometria/biometria-crypto.service';
import { BiometriaLgpdTermoService } from 'src/biometria/biometria-lgpd-termo.service';
import { AtendimentoAuthService } from 'src/atendimento-auth/atendimento-auth.service';
import { FacialService } from 'src/facial/facial.service';
import { TeleatendimentoService } from 'src/teleatendimento/teleatendimento.service';
import {
  buildPublicEvidenceUrl,
  buildValidationBlobPath,
  resolveRelatorioEvidenciasUrl,
} from 'src/utils/autenticacao-evidencias-url.util';

// Lazy getters para evitar ReferenceError do SWC por imports estáticos circulares
// Usa caminhos relativos para funcionar tanto no ts-node quanto no dist compilado
const getMongoService = () => require('../mongo/mongo.service').MongoService;
const getTicketService = () => require('../ticket/ticket.service').TicketService;

interface PendingBiometriaRequest {
  requestId: string;
  clientId: string;
  unidade: string;
  sala: string;
  estacaoId: string;
  funcionarioId: string;
  atendimentoId?: string;
  origem?: string;
  createdAt: Date;
  timeoutRef: NodeJS.Timeout;
  tipo?: 'CAPTURA' | 'CADASTRO_BIOMETRICO' | 'VALIDACAO_BIOMETRICA';
  targetRoom?: string;
  dedo?: string;
  operadorId?: string;
  operadorNome?: string;
  operadorPerfil?: string;
  prontuario?: string;
  cpf?: string;
  dataNascimento?: string;
  cpfHash?: string;
  dataNascimentoHash?: string;
  agentMachineName?: string;
  templateRef?: string;
  templateHashRef?: string;
  templateVersionRef?: string;
  enrollmentMongoId?: string;
  enrollmentTemplateStorage?: string;
  enrollmentDigitalDocumentalBlobPath?: string;
}

interface PendingFacialRequest {
  requestId: string;
  clientId: string;
  unidade: string;
  sala: string;
  estacaoId: string;
  funcionarioId: string;
  prontuario?: string;
  cpf?: string;
  dataNascimento?: string;
  operadorId?: string;
  operadorNome?: string;
  operadorPerfil?: string;
  schedulingId: string;
  sessionId: string;
  transactionId: string;
  redirectUrl: string;
  createdAt: Date;
  timeoutRef: NodeJS.Timeout;
}

@Injectable()
@WebSocketGateway({
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  // timeouts para evitar desconexões
  pingInterval: 10000, // Ping a cada 10s (Reduzido de 25s para forçar mais heartbeats nativos)
  pingTimeout: 30000, // Timeout de 30s
  connectTimeout: 45000, // Timeout de conexão 45s (antes: 60s)
  perMessageDeflate: {
    threshold: 1024, // Compressão apenas para mensagens > 1KB
  },
  allowEIO3: true,
  cookie: false,

  maxHttpBufferSize: 1e6, // 1MB max por mensagem
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private pendingBiometriaRequests = new Map<string, PendingBiometriaRequest>();
  private pendingFacialRequests = new Map<string, PendingFacialRequest>();

  // Mapa de registro de agentes por Unidade + IP Local (chave: unidade:ipLocal)
  private biometriaAgentsByUnitIp = new Map<
    string,
    {
      socketId: string;
      unidade: string;
      ipLocal: string;
      machineName?: string;
      conectado: boolean;
      conectadoEm: Date;
      ultimoHeartbeatEm: Date;
      ultimoStatusRecebido?: string;
      leitorConectado: boolean;
      leitorAberto: boolean;
      estadoLeitor: string;
      ambiente: string;
      versao: string;
    }
  >();

  // Mapa reverso socketId -> chaveComposite para lookup rápido em disconnect
  private socketIdToAgentKey = new Map<string, string>();

  // Mapa de Conexões Ativas (Usuários humanos)
  private activeUsersMap = new Map<string, IUserPresence>();

  // Cache de agendamentos por unidade para otimizar conexões simultâneas
  private schedulingsCache = new Map<string, { data: any[]; timestamp: number }>();
  private readonly SCHEDULINGS_CACHE_TTL_MS = 5000; // 5 segundos

  private async getCachedSchedulings(unidade: string): Promise<any[]> {
    const now = Date.now();
    const key = unidade.toUpperCase();
    const cached = this.schedulingsCache.get(key);
    if (cached && now - cached.timestamp < this.SCHEDULINGS_CACHE_TTL_MS) {
      return cached.data;
    }
    const data = await this.mongoService.getSchedulingsToday(unidade);
    this.schedulingsCache.set(key, { data, timestamp: now });
    return data;
  }

  private invalidateSchedulingsCache(unidade?: string) {
    if (unidade) {
      this.schedulingsCache.delete(unidade.toUpperCase());
    } else {
      this.schedulingsCache.clear();
    }
  }

  // Métricas de memory leak detecção
  private agentHealthCheckInterval: NodeJS.Timeout | null = null;
  private reconcileOnConnectInFlight: Promise<void> | null = null;
  private lastReconcileOnConnectAt = 0;
  private readonly RECONCILE_ON_CONNECT_TTL_MS = 60_000;

  constructor(
    @Inject(forwardRef(getTicketService))
    private readonly ticketService: any,

    @Inject(forwardRef(getMongoService))
    private readonly mongoService: any,

    private readonly cryptoService: BiometriaCryptoService,

    private readonly socService: SocService,
    private readonly pushService: PushService,
    private readonly ttsService: TtsService,
    private readonly azureService: AzureService,
    private readonly auditLogService: AuditLogService,
    private readonly biometriaLgpdTermoService: BiometriaLgpdTermoService,
    private readonly atendimentoAuthService: AtendimentoAuthService,
    private readonly facialService: FacialService,
    private readonly teleatendimentoService: TeleatendimentoService,
  ) { }

  private broadcastPresence(unidadeTarget?: string) {
    if (!this.server) return;
    // Entradas TELEATENDIMENTO são "fantasmas" usadas apenas para rastrear o socket e
    // propagar isTeleatendimentoActive na entrada USER_ATENDIMENTO vinculada.
    // Não devem aparecer como cards separados no painel de presença.
    const allPresences: UserPresencePayload[] = Array.from(this.activeUsersMap.values())
      .filter((p) => p.type !== WebsocketType.TELEATENDIMENTO)
      .map((p) => ({
        ...p,
        conectadoEm: p.conectadoEm.toISOString(),
      }));

    if (unidadeTarget) {
      const targetRoom = unidadeTarget.toUpperCase();
      this.server.to(targetRoom).emit(EventType.PRESENCE_UPDATED, allPresences);
    }
    this.server.emit(EventType.PRESENCE_UPDATED, allPresences);
  }


  private normalizeIp(ip?: string): string {
    if (!ip) return '';
    if (ip === '::1') return '127.0.0.1';
    // Remove prefixos IPv4-mapped IPv6 (::ffff:) se existirem
    return ip.replace(/^.*:/, '');
  }

  private normalizeContextValue(value?: string): string | undefined {
    const trimmed = (value || '').trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private normalizeContextKeepCompatibility(value?: string): string {
    return (value || '').trim();
  }

  private sanitizeAuditErrorCode(value: unknown): string | undefined {
    const candidate = String(value || '').trim().toUpperCase();
    if (!candidate) return undefined;

    const [firstToken] = candidate.match(/[A-Z0-9_]+/g) || [];
    return firstToken || undefined;
  }

  private triggerConnectionReconcile(): void {
    const now = Date.now();
    if (this.reconcileOnConnectInFlight) {
      return;
    }

    if (
      now - this.lastReconcileOnConnectAt <
      this.RECONCILE_ON_CONNECT_TTL_MS
    ) {
      return;
    }

    this.lastReconcileOnConnectAt = now;
    this.reconcileOnConnectInFlight = this.mongoService
      .reconcileInconsistentActiveTickets('connection_request')
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[CONNECTION_RECONCILE] Falha na reconciliacao assincrona: ${message}`,
        );
      })
      .finally(() => {
        this.reconcileOnConnectInFlight = null;
      });
  }

  private safeAuditLog(entry: {
    user?: {
      codigo?: string;
      nome?: string;
      perfil?: string;
    };
    acao: string;
    recursoTipo?: string;
    recursoId?: string;
    pacienteCodigo?: string;
    unidade?: string;
    requestId?: string;
    detalhes?: Record<string, unknown>;
  }) {
    try {
      const normalizedEntry = {
        ...entry,
        user: entry.user?.codigo
          ? entry.user
          : {
              codigo: 'SISTEMA',
              nome: entry.user?.nome || 'Sistema',
              perfil: entry.user?.perfil || 'SISTEMA',
            },
      };
      this.auditLogService.logUserAction(normalizedEntry);
    } catch {
      // Auditoria nunca deve interromper o fluxo principal.
    }
  }

  private logBiometriaValidacaoErro(args: {
    requestId: string;
    funcionarioId?: string;
    unidade?: string;
    dedo?: string;
    codigoErroSanitizado?: string;
    operador?: {
      codigo?: string;
      nome?: string;
      perfil?: string;
    };
  }) {
    this.safeAuditLog({
      user: args.operador,
      acao: 'BIOMETRIA_VALIDACAO_ERRO',
      recursoTipo: 'biometria',
      recursoId: args.funcionarioId,
      pacienteCodigo: args.funcionarioId,
      unidade: args.unidade,
      requestId: args.requestId,
      detalhes: {
        dedo: args.dedo || null,
        resultado: 'ERRO',
        codigoErroSanitizado: args.codigoErroSanitizado,
      },
    });
  }

  private getFreshAgentByCompositeKey(compositeKey: string) {
    const agent = this.biometriaAgentsByUnitIp.get(compositeKey);
    if (!agent) return null;
    const ageMs = Date.now() - agent.ultimoHeartbeatEm.getTime();
    if (ageMs > 60000) return null;
    return agent;
  }

  private resolveAgentTargetRoom(
    unidade: string,
    clientIp: string,
    requestedIpLocal?: string,
  ): { targetRoom: string; compositeKey: string; agentSocketId: string } | null {
    const preferredIp = this.normalizeIp(requestedIpLocal || '');
    const candidates = [preferredIp, clientIp].filter((value, idx, arr) => {
      return !!value && arr.indexOf(value) === idx;
    });

    // 1. Tentar matching exato Unidade:IP
    for (const ip of candidates) {
      const compositeKey = `${unidade}:${ip}`;
      const freshAgent = this.getFreshAgentByCompositeKey(compositeKey);
      if (freshAgent) {
        return {
          targetRoom: `${unidade}:BIOMETRIA:IP:${freshAgent.ipLocal}`,
          compositeKey,
          agentSocketId: freshAgent.socketId,
        };
      }
    }

    // 2. Fuzzy Matching: Se falhar por IP, mas houver apenas UM agente na unidade, usar ele
    this.logger.debug(`[BIOMETRIA] Fallback fuzzy matching para unidade: ${unidade}`);
    const agentsInUnit = Array.from(this.biometriaAgentsByUnitIp.values()).filter(
      (a) => a.unidade === unidade && (Date.now() - a.ultimoHeartbeatEm.getTime() < 60000)
    );

    if (agentsInUnit.length === 1) {
      const agent = agentsInUnit[0];
      const compositeKey = `${agent.unidade}:${agent.ipLocal}`;
      this.logger.log(`[BIOMETRIA] Fuzzy match único encontrado: ${compositeKey} para request vindo de ${clientIp}`);
      return {
        targetRoom: `${unidade}:BIOMETRIA:IP:${agent.ipLocal}`,
        compositeKey,
        agentSocketId: agent.socketId,
      };
    }

    // 3. Fallback Dev: Se o requester é 127.0.0.1, tentar qualquer agent que também conectou via 127.0.0.1
    if (clientIp === '127.0.0.1') {
      this.logger.debug(`[BIOMETRIA] Fallback localhost matching para unidade: ${unidade}`);
      const localAgents = Array.from(this.biometriaAgentsByUnitIp.values()).filter(
        (a) => a.unidade === unidade && (Date.now() - a.ultimoHeartbeatEm.getTime() < 60000)
      );

      if (localAgents.length > 0) {
        // Pega o primeiro que estiver online (provavelmente é o único em dev)
        const agent = localAgents[0];
        const compositeKey = `${agent.unidade}:${agent.ipLocal}`;
        this.logger.log(`[BIOMETRIA] Localhost match encontrado: ${compositeKey}`);
        return {
          targetRoom: `${unidade}:BIOMETRIA:IP:${agent.ipLocal}`,
          compositeKey,
          agentSocketId: agent.socketId,
        };
      }
    }

    return null;
  }

  private extractBiometriaInsertId(persistResult: unknown): string | undefined {
    if (
      persistResult &&
      typeof persistResult === 'object' &&
      'insertedId' in persistResult &&
      (persistResult as { insertedId?: unknown }).insertedId
    ) {
      return String((persistResult as { insertedId: unknown }).insertedId);
    }
    return undefined;
  }

  private async persistFacialEvidenceReport(
    pending: PendingFacialRequest,
  ): Promise<{ url: string; hash: string } | null> {
    try {
      const reportBuffer = await this.facialService.getEvidenceReport(
        pending.sessionId,
        pending.transactionId,
      );
      const prontuario =
        pending.prontuario || pending.funcionarioId || pending.schedulingId;
      const blobPath = buildValidationBlobPath(prontuario);
      const publicContainer = process.env.AZURE_CONTAINER_PUBLIC || 'public';
      const uploadedUrl = await this.azureService.uploadPublic(
        publicContainer,
        blobPath,
        reportBuffer,
        'application/pdf',
      );
      const hash = crypto
        .createHash('sha256')
        .update(reportBuffer)
        .digest('hex');
      const url =
        resolveRelatorioEvidenciasUrl(prontuario, uploadedUrl) || uploadedUrl;

      return { url, hash };
    } catch (error) {
      this.logger.warn(
        `[FACIAL] Falha ao persistir relatorio de evidencias: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private resolveValidadoPor(
    pending: Pick<
      PendingBiometriaRequest | PendingFacialRequest,
      'operadorNome' | 'operadorId'
    >,
  ): string {
    return (
      String(pending.operadorNome || pending.operadorId || '').trim() ||
      'SISTEMA'
    );
  }

  private buildFuncionarioTermoContext(
    pending: PendingBiometriaRequest,
    payloadFuncionario?: {
      id?: string;
      nome?: string;
      cpf?: string;
      prontuario?: string;
      dataNascimento?: string;
    },
  ) {
    return {
      id: pending.funcionarioId || payloadFuncionario?.id,
      nome: payloadFuncionario?.nome,
      cpf: pending.cpf || payloadFuncionario?.cpf,
      prontuario: pending.prontuario || payloadFuncionario?.prontuario,
      dataNascimento:
        pending.dataNascimento || payloadFuncionario?.dataNascimento,
    };
  }

  private async vincularTermoBiometriaPosValidacao(
    pending: PendingBiometriaRequest,
    payload: {
      requestId: string;
      templateVersion?: string;
      funcionario?: {
        id?: string;
        nome?: string;
        cpf?: string;
        prontuario?: string;
        dataNascimento?: string;
      };
    },
  ): Promise<void> {
    if (!pending.atendimentoId) {
      this.logger.warn(
        `[BIOMETRIA_VALIDACAO_TERMO] atendimentoId ausente — termo não vinculado. requestId=${payload.requestId}`,
      );
      return;
    }

    if (!pending.cpfHash || !pending.dataNascimentoHash) {
      this.logger.warn(
        `[BIOMETRIA_VALIDACAO_TERMO] Identidade incompleta — termo não vinculado. requestId=${payload.requestId} cpfHashPresent=${!!pending.cpfHash} dataNascHashPresent=${!!pending.dataNascimentoHash}`,
      );
      return;
    }

    this.logger.log(
      `[BIOMETRIA_VALIDACAO_TERMO] Iniciando vinculação termo schedulingId=${pending.atendimentoId} requestId=${payload.requestId}`,
    );

    const enrollments = await this.atendimentoAuthService.findAllBiometricEnrollments(
      pending.cpfHash,
      pending.dataNascimentoHash,
    );
    this.logger.log(
      `[BIOMETRIA_VALIDACAO_TERMO] findAllBiometricEnrollments retornou ${enrollments.length} enrollments`,
    );

    const enrollmentFromPending = pending.enrollmentMongoId
      ? enrollments.find(
          (e: any) => String(e._id) === pending.enrollmentMongoId,
        ) || {
          _id: pending.enrollmentMongoId,
          dedo: pending.dedo,
          templateStorage:
            pending.enrollmentTemplateStorage || 'ENCRYPTED_AES_256_GCM',
          templateVersion: pending.templateVersionRef,
          digitalDocumentalBlobPath:
            pending.enrollmentDigitalDocumentalBlobPath,
          lgpd: null,
        }
      : null;

    const enrollmentWithTermo = enrollments.find(
      (e: any) => e.lgpd?.documentoTermoUrl,
    );
    if (enrollmentWithTermo?.lgpd?.documentoTermoUrl) {
      const prontuario =
        pending.prontuario || payload.funcionario?.prontuario || pending.funcionarioId;
      const relatorioEvidenciasUrl = prontuario
        ? buildPublicEvidenceUrl(prontuario)
        : null;
      await this.atendimentoAuthService.appendAuthEvidence(pending.atendimentoId, {
        termoCienciaUrl: enrollmentWithTermo.lgpd.documentoTermoUrl,
        termoCienciaHash: enrollmentWithTermo.lgpd.documentoTermoHash || null,
        relatorioEvidenciasUrl,
        relatorioEvidenciasHash:
          enrollmentWithTermo.lgpd.relatorioEvidenciasHash || null,
      });
      this.logger.log(
        `[BIOMETRIA_VALIDACAO] termoCienciaUrl copiado do enrollment ${enrollmentWithTermo._id} para scheduling ${pending.atendimentoId}`,
      );
      return;
    }

    if (enrollments.length === 0 && !enrollmentFromPending) {
      this.logger.error(
        `[BIOMETRIA_VALIDACAO_TERMO] Nenhum enrollment encontrado para gerar termo. schedulingId=${pending.atendimentoId}`,
      );
      return;
    }

    const enrollment = enrollmentFromPending || enrollments[0];
    this.logger.warn(
      `[BIOMETRIA_VALIDACAO] Nenhum enrollment com termo — gerando novo. schedulingId=${pending.atendimentoId} enrollmentId=${enrollment._id} lgpdPresent=${!!enrollment.lgpd}`,
    );

    const termoResult = await this.biometriaLgpdTermoService.registrarTermoPosCadastro({
      biometriaId: enrollment._id?.toString(),
      schedulingId: pending.atendimentoId,
      requestId: payload.requestId,
      funcionario: this.buildFuncionarioTermoContext(pending, payload.funcionario),
      operador: {
        id: pending.operadorId,
        nome: pending.operadorNome,
        perfil: pending.operadorPerfil,
      },
      unidade: pending.unidade,
      dedo: enrollment.dedo || pending.dedo || '',
      templateStorage: enrollment.templateStorage || 'ENCRYPTED_AES_256_GCM',
      templateVersion:
        enrollment.templateVersion || payload.templateVersion || 'futronic-ansi-v1',
      digitalDocumentalBlobPath: enrollment.digitalDocumentalBlobPath,
      cadastradoEm: new Date(),
    });

    if (!termoResult.success) {
      this.logger.error(
        `[BIOMETRIA_VALIDACAO_TERMO] Falha ao gerar/vincular termo schedulingId=${pending.atendimentoId} motivo=${termoResult.motivo || 'DESCONHECIDO'} lgpdPersistido=${termoResult.lgpdPersistido ?? false}`,
      );
    }
  }

  private cleanupBiometriaRequest(requestId: string, motivo: string) {
    const pending = this.pendingBiometriaRequests.get(requestId);
    if (!pending) {
      this.logger.debug(
        `BIOMETRIA_PENDING_REQUEST_NAO_ENCONTRADO requestId=${requestId} motivo=${motivo}`,
      );
      return null;
    }

    clearTimeout(pending.timeoutRef);
    this.pendingBiometriaRequests.delete(requestId);
    this.logger.log(
      `BIOMETRIA_PENDING_REQUEST_LIMPO requestId=${requestId} motivo=${motivo}`,
    );
    return pending;
  }

  private cleanupFacialRequest(requestId: string, motivo: string) {
    const pending = this.pendingFacialRequests.get(requestId);
    if (!pending) {
      this.logger.debug(
        `FACIAL_PENDING_REQUEST_NAO_ENCONTRADO requestId=${requestId} motivo=${motivo}`,
      );
      return null;
    }

    clearTimeout(pending.timeoutRef);
    this.pendingFacialRequests.delete(requestId);
    this.logger.log(
      `FACIAL_PENDING_REQUEST_LIMPO requestId=${requestId} motivo=${motivo}`,
    );
    return pending;
  }

  private emitBiometriaRequestStatus(
    client: Socket,
    payload: Omit<BiometriaRequestStatusPayload, 'timestamp'>,
  ) {
    client.emit(EventType.BIOMETRIA_REQUEST_STATUS, {
      ...payload,
      timestamp: new Date().toISOString(),
      } as BiometriaRequestStatusPayload);
  }

  private async downloadImageBufferFromUrl(url: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem facial: HTTP_${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType:
        response.headers.get('content-type') || 'image/jpeg',
    };
  }

  private async processFacialResult(
    payload:
      | FacialCadastroResultPayload
      | FacialValidacaoResultPayload,
    client: Socket,
  ) {
    const requestId = payload.requestId;
    const pending = this.cleanupFacialRequest(requestId, 'resultado_recebido');
    if (!pending) {
      return;
    }

    const isValidacao = 'aprovado' in payload;
    const statusEvento = isValidacao
      ? EventType.FACIAL_VALIDACAO_STATUS
      : EventType.FACIAL_CADASTRO_STATUS;
    const resultEvento = isValidacao
      ? EventType.FACIAL_VALIDACAO_RESULT
      : EventType.FACIAL_CADASTRO_RESULT;

    const sucesso = isValidacao
      ? !!payload.aprovado
      : payload.status === 'concluido';
    const cadastroPayload = payload as FacialCadastroResultPayload;
    const validacaoPayload = payload as FacialValidacaoResultPayload;
    const termoCienciaUrl =
      'termoCienciaUrl' in cadastroPayload
        ? cadastroPayload.termoCienciaUrl
        : undefined;
    const termoCienciaHash =
      'termoCienciaHash' in cadastroPayload
        ? cadastroPayload.termoCienciaHash
        : undefined;
    const imagemHash = 'imagemHash' in cadastroPayload
      ? cadastroPayload.imagemHash
      : undefined;
    const confidence = isValidacao
      ? validacaoPayload.confidence
      : cadastroPayload.confidence ?? null;

    if (!sucesso) {
      const mensagem =
        payload.mensagem ||
        (isValidacao
          ? 'Validação facial não aprovada.'
          : 'Cadastro facial não concluído.');

      client.emit(statusEvento, {
        requestId,
        status: 'erro',
        mensagem,
      } as FacialCadastroStatusPayload | FacialValidacaoStatusPayload);
      client.emit(resultEvento, {
        ...payload,
        mensagem,
      } as FacialCadastroResultPayload | FacialValidacaoResultPayload);
      return;
    }

    let imagemRepresentativaUrl = payload.imagemUrl || pending.redirectUrl;
    let imagemRepresentativaHash = imagemHash || undefined;

    if (payload.imagemUrl) {
      try {
        const downloaded = await this.downloadImageBufferFromUrl(payload.imagemUrl);
        const blobPath = await this.azureService.uploadFacialImage(
          pending.prontuario || pending.funcionarioId || pending.schedulingId,
          downloaded.buffer,
          downloaded.contentType,
        );
        imagemRepresentativaUrl = this.azureService.generateSasUrlFromUrl(
          blobPath,
          60,
        );
        imagemRepresentativaHash =
          imagemHash || crypto.createHash('sha256').update(downloaded.buffer).digest('hex');
      } catch (error) {
        this.logger.warn(
          `[FACIAL] Falha ao armazenar imagem representativa: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const evidenceReport = await this.persistFacialEvidenceReport(pending);
    const prontuario =
      pending.prontuario || pending.funcionarioId || pending.schedulingId;
    const relatorioEvidenciasUrl =
      evidenceReport?.url || resolveRelatorioEvidenciasUrl(prontuario, null);
    const relatorioEvidenciasHash = evidenceReport?.hash || null;

    try {
      await this.atendimentoAuthService.registerAuthValidation(
        pending.schedulingId,
        {
          schedulingId: pending.schedulingId,
          metodo: 'FACIAL',
          status: 'VALIDADO',
          requestId,
          validadoPor: this.resolveValidadoPor(pending),
          facial: {
            provider: 'BRY_SIGN',
            sessionId: pending.sessionId,
            transactionId: pending.transactionId,
            confidence,
            imagemRepresentativaUrl,
            imagemRepresentativaHash: imagemRepresentativaHash || null,
          },
          evidencias: {
            termoCienciaUrl: termoCienciaUrl || pending.redirectUrl,
            termoCienciaHash: termoCienciaHash || null,
            relatorioEvidenciasUrl,
            relatorioEvidenciasHash,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `[FACIAL] Falha ao atualizar AUTENTICACAOATENDIMENTO: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    client.emit(statusEvento, {
      requestId,
      status: 'concluido',
      mensagem:
        payload.mensagem || 'Fluxo facial concluído com sucesso.',
    } as FacialCadastroStatusPayload | FacialValidacaoStatusPayload);
    client.emit(resultEvento, {
      ...payload,
      imagemUrl: imagemRepresentativaUrl,
      imagemHash: imagemRepresentativaHash,
      mensagem: payload.mensagem || 'Fluxo facial concluído com sucesso.',
    } as FacialCadastroResultPayload | FacialValidacaoResultPayload);
  }

  private buildTicketErrorPayload(
    payload: Pick<
      ActionRequestAtendimento | ActionRequest,
      'ticketId' | 'action'
    >,
    error: unknown,
  ) {
    const serializedError = error as {
      message?: string;
      stack?: string;
      getResponse?: () => unknown;
      getStatus?: () => number;
    };
    const response =
      typeof serializedError?.getResponse === 'function'
        ? serializedError.getResponse()
        : undefined;
    const responseObject =
      response && typeof response === 'object'
        ? (response as Record<string, unknown>)
        : undefined;
    const rawMessage = responseObject?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' | ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : serializedError?.message || 'Erro desconhecido ao processar a ação.';
    const status =
      typeof responseObject?.status === 'number'
        ? responseObject.status
        : typeof serializedError?.getStatus === 'function'
          ? serializedError.getStatus()
          : undefined;

    return {
      ticketId: payload.ticketId,
      action: payload.action,
      message,
      status,
      conflict: responseObject?.conflict,
      stack:
        process.env.NODE_ENV === 'development'
          ? serializedError?.stack
          : undefined,
    };
  }

  private buildTicketActionSuccessPayload(
    payload: Pick<
      ActionRequestAtendimento | ActionRequest,
      'ticketId' | 'action'
    >,
    statusFinal: TicketStatus,
  ): TicketActionSuccessPayload {
    return {
      ticketId: Number(payload.ticketId),
      action: payload.action,
      statusFinal,
      timestamp: new Date().toISOString(),
    };
  }

  afterInit() {
    this.logger.log('✅ WebSocket Gateway inicializado (single-instance)');

    // Heartbeat independente a cada 5s para evitar conexões ociosas caindo
    setInterval(() => {
      this.server.emit('server:heartbeat', {
        timestamp: Date.now(),
        active: true,
      });
    }, 5000);

    // Monitoramento aprimorado
    setInterval(() => {
      const connectedClients = this.server.sockets.sockets.size;
      const rooms = Array.from(this.server.sockets.adapter.rooms.keys());
      this.logger.debug(
        `📊 Clientes: ${connectedClients} | Salas: ${rooms.length}`,
      );
    }, 60000);

    // Health check - limpar agents sem heartbeat > 60s e pending requests órfãos
    this.agentHealthCheckInterval = setInterval(() => {
      const now = Date.now();
      const maxHeartbeatAge = 60000; // 60s sem heartbeat = offline

      for (const [key, agent] of this.biometriaAgentsByUnitIp.entries()) {
        const age = now - agent.ultimoHeartbeatEm.getTime();
        if (age > maxHeartbeatAge) {
          this.logger.warn(
            `🧹 [BIOMETRIA_AGENT] Removendo agent sem heartbeat: ${key} (${Math.round(age / 1000)}s sem contato)`,
          );
          this.socketIdToAgentKey.delete(agent.socketId);
          this.biometriaAgentsByUnitIp.delete(key);
        }
      }

      // Limpar pending requests órfãos (client desconectado sem cleanup)
      for (const [reqId, pending] of this.pendingBiometriaRequests.entries()) {
        const clientSocket = this.server.sockets.sockets.get(pending.clientId);
        if (!clientSocket) {
          this.cleanupBiometriaRequest(reqId, 'orphan_client_disconnect');
        }
      }

      // Log de métricas de saúde
      const totalAgents = this.biometriaAgentsByUnitIp.size;
      const totalPending = this.pendingBiometriaRequests.size;
      if (totalAgents > 0 || totalPending > 0) {
        this.logger.debug(
          `📊 Saúde: Agents=${totalAgents} Pending=${totalPending} Sola=true`,
        );
      }
    }, 30000);
  }

  async handleConnection(client: Socket) {
    const startTime = Date.now();
    const ipNormalizado = this.normalizeIp(client.handshake.address);

    const authConnection = client.handshake.auth as
      | Ticket
      | IUserWebsocket
      | PrinterService;

    if (!authConnection) {
      this.logger.error(`❌ Conexão rejeitada para ${client.id} (${ipNormalizado}): Auth ausente.`);
      client.disconnect();
      return;
    }

    // Entrar nas salas
    const unidade = (authConnection as any)?.unidade?.toUpperCase();
    const connectionType = String((authConnection as any)?.type || 'UNKNOWN');
    this.logger.log(
      `[WS_CONNECT][START] client=${client.id} type=${connectionType} unidade=${unidade || 'N/A'} ip=${ipNormalizado || 'N/A'}`,
    );

    if (
      !unidade &&
      (authConnection as any).type !== WebsocketType.PRONTUARIO &&
      (authConnection as any).type !== WebsocketType.TELEATENDIMENTO &&
      (authConnection as any).type !== WebsocketType.MURAL
    ) {
      this.logger.warn(`⚠️ Conexão sem unidade identificada: ${client.id}`);
    }

    const userName = (authConnection as any)?.nome || (authConnection as any)?.name;
    if (userName && unidade) {
      // Para TELEATENDIMENTO: em vez de criar uma 2ª entrada duplicada, atualiza
      // a entrada existente do mesmo profissional (mesmo nome + unidade) para indicar
      // que ele abriu a videochamada. Isso evita dois cards para a mesma pessoa.
      if (connectionType === WebsocketType.TELEATENDIMENTO) {
        let linkedEntry: IUserPresence | null = null;
        for (const [, presence] of this.activeUsersMap.entries()) {
          if (presence.nome === userName && presence.unidade === unidade.toUpperCase() && presence.type !== WebsocketType.TELEATENDIMENTO) {
            linkedEntry = presence;
            break;
          }
        }
        if (linkedEntry) {
          linkedEntry.isTeleatendimentoActive = true;
          // Registra o socketId do TELEATENDIMENTO para limpeza no disconnect
          this.activeUsersMap.set(client.id, {
            socketId: client.id,
            nome: userName,
            unidade: unidade.toUpperCase(),
            sala: linkedEntry.sala,
            type: connectionType,
            conectadoEm: new Date(),
            isTeleatendimentoActive: true,
            // entrada "fantasma" — usada apenas para rastrear o socket e limpar no disconnect
          });
          this.broadcastPresence(unidade);
        } else {
          // Sem entrada ATENDIMENTO correspondente — registra normalmente
          this.activeUsersMap.set(client.id, {
            socketId: client.id,
            id: (authConnection as any)?.id?.toString(),
            nome: userName,
            unidade: unidade.toUpperCase(),
            sala: (authConnection as any)?.sala?.toString(),
            type: connectionType,
            exame: (authConnection as any)?.exame?.toString(),
            conectadoEm: new Date(),
            isTeleatendimentoActive: true,
          });
          this.broadcastPresence(unidade);
        }
      } else {
        this.activeUsersMap.set(client.id, {
          socketId: client.id,
          id: (authConnection as any)?.id?.toString(),
          nome: userName,
          unidade: unidade.toUpperCase(),
          sala: (authConnection as any)?.sala?.toString(),
          type: connectionType,
          exame: (authConnection as any)?.exame?.toString(),
          conectadoEm: new Date(),
          isTeleatendimentoActive: false,
        });
        this.broadcastPresence(unidade);
      }
    }

    const roomJoinStart = Date.now();
    switch (authConnection.type) {
      case WebsocketType.USER_RECEPCAO:
        if (unidade) await client.join([unidade, `${unidade}:RECEPCAO`]);
        break;
      case WebsocketType.USER_ATENDIMENTO:
        if (unidade) await client.join([unidade, `${unidade}:ATENDIMENTO`]);
        break;
      case WebsocketType.USER_PREPARO:
        if (unidade) await client.join([unidade, `${unidade}:PREPARO`]);
        break;
      case WebsocketType.PRINTER:
        if (unidade) await client.join([unidade, `${unidade}:PRINTER`]);
        break;
      case WebsocketType.PRONTUARIO:
        await client.join(WebsocketType.PRONTUARIO);
        break;
      case WebsocketType.PAINEL:
        if (unidade) await client.join([unidade, `${unidade}:PAINEL`]);
        break;

      case WebsocketType.SCRAPER:
        await client.join('SCRAPER');
        break;

      case WebsocketType.GED_BATCH:
        await client.join('GED_BATCH');
        break;

      case WebsocketType.MURAL:
        await client.join(WebsocketType.MURAL);
        break;

      case WebsocketType.BIOMETRIA_AGENT:
        if (unidade) {
          const estacaoId = (authConnection as any).estacaoId?.toUpperCase();
          const ipLocal = (authConnection as any).ipLocal;
          const machineName = (authConnection as any).machineName || '';
          const ambiente = (authConnection as any).environment || '';
          const versao = (authConnection as any).versao || '';

          // Sala genérica da unidade
          await client.join([unidade, `${unidade}:BIOMETRIA`]);

          // Sala específica por IP (Nova estratégia prioritária)
          if (ipLocal) {
            const ipSala = `${unidade}:BIOMETRIA:IP:${ipLocal}`;
            const ipConexao = this.normalizeIp(client.handshake.address);
            const compositeKey = `${unidade}:${ipLocal}`;

            await client.join(ipSala);

            // Verificar se já existe registro para esta unidade+ipLocal
            const existing = this.biometriaAgentsByUnitIp.get(compositeKey);
            if (existing) {
              // Remover mapeamento reverso do socket antigo
              this.socketIdToAgentKey.delete(existing.socketId);
              this.logger.log(
                `🔄 [BIOMETRIA_AGENT] Substituindo socket antigo ${existing.socketId} por ${client.id} para ${compositeKey}`,
              );
            }

            // Registrar/atualizar no mapa em memória (chave composta unidade:ipLocal)
            this.biometriaAgentsByUnitIp.set(compositeKey, {
              socketId: client.id,
              unidade,
              ipLocal,
              machineName,
              conectado: true,
              conectadoEm: existing?.conectadoEm || new Date(),
              ultimoHeartbeatEm: new Date(),
              ultimoStatusRecebido: 'connected',
              leitorConectado: false,
              leitorAberto: false,
              estadoLeitor: 'Conectando',
              ambiente,
              versao,
            });

            // Mapa reverso socketId -> compositeKey
            this.socketIdToAgentKey.set(client.id, compositeKey);

            this.logger.log(
              `✅ [BIOMETRIA_AGENT] Registrado: ${compositeKey} | Socket: ${client.id} | Unidade: ${unidade} | IP Agente: ${ipLocal} | IP Conexão: ${ipConexao} | Sala: ${ipSala}`,
            );
          }
        } else {
          this.logger.warn(
            `Agente Biometria conectou sem unidade: ${client.id}`,
          );
        }
        return; // Retorna imediatamente (não busca agendamentos nem reconcilica tickets ativos)
    }


    // Buscar agendamentos com cache curto para conexão inicial, evitando picos no banco
    const roomJoinDuration = Date.now() - roomJoinStart;
    const schedulingsStart = Date.now();
    let atendimentosUnidade = [];
    try {
      atendimentosUnidade = unidade
        ? await this.getCachedSchedulings(unidade)
        : [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[WS_CONNECT][QUERY_ERROR] client=${client.id} type=${connectionType} unidade=${unidade || 'N/A'} durationMs=${Date.now() - schedulingsStart} message=${message}`,
      );
      throw error;
    }
    const schedulingsDuration = Date.now() - schedulingsStart;

    if (atendimentosUnidade.length > 0) {
      const emitStart = Date.now();
      this.emitEvent<EventType.CONNECTION_REQUEST>(
        client,
        EventType.CONNECTION_REQUEST,
        atendimentosUnidade,
      );
      this.logger.log(
        `[WS_CONNECT][EMIT] client=${client.id} unidade=${unidade || 'N/A'} count=${atendimentosUnidade.length} queryMs=${schedulingsDuration} emitMs=${Date.now() - emitStart}`,
      );
    } else {
      this.logger.log(
        `[WS_CONNECT][EMIT] client=${client.id} unidade=${unidade || 'N/A'} count=0 queryMs=${schedulingsDuration} emitSkipped=true`,
      );
    }

    this.triggerConnectionReconcile();

    this.logger.log(
      `[WS_CONNECT][DONE] client=${client.id} type=${connectionType} unidade=${unidade || 'N/A'} roomsMs=${roomJoinDuration} queryMs=${schedulingsDuration} totalMs=${Date.now() - startTime} records=${atendimentosUnidade.length}`,
    );

    const duration = Date.now() - startTime;
    this.logger.log(
      `✅ Cliente conectado: ${client.id} em ${unidade || 'N/A'} (${duration}ms)`,
    );
  }

  handleDisconnect(client: Socket) {
    const remoteAddress = client.handshake.address;

    // Verificar se é um Agent pelo mapa reverso
    const compositeKey = this.socketIdToAgentKey.get(client.id);
    if (compositeKey) {
      const agent = this.biometriaAgentsByUnitIp.get(compositeKey);
      if (agent && agent.socketId === client.id) {
        // Só remover se o socket desconectado for o atual registrado
        // Se um novo socket já se registrou para a mesma unidade+ipLocal, não remover
        this.biometriaAgentsByUnitIp.delete(compositeKey);
        this.logger.log(
          `👋 [BIOMETRIA_AGENT] Desconectado: ${compositeKey} | Socket antigo: ${client.id} removido do registry`,
        );
      } else if (agent && agent.socketId !== client.id) {
        // Socket antigo desconectou, mas já existe socket novo - preservar registro
        this.logger.log(
          `👋 [BIOMETRIA_AGENT] Socket antigo ${client.id} desconectado para ${compositeKey}, mas socket atual ${agent.socketId} mantido no registry`,
        );
      }
      this.socketIdToAgentKey.delete(client.id);
    } else {
      this.logger.log(
        `👋 Cliente desconectado: ${client.id} addr=${remoteAddress}`,
      );
    }

    if (this.activeUsersMap.has(client.id)) {
      const user = this.activeUsersMap.get(client.id);
      this.activeUsersMap.delete(client.id);

      // Se era um socket TELEATENDIMENTO, limpa isTeleatendimentoActive
      // na entrada ATENDIMENTO vinculada (mesmo nome + unidade)
      if (user?.type === WebsocketType.TELEATENDIMENTO && user.nome && user.unidade) {
        for (const [, presence] of this.activeUsersMap.entries()) {
          if (presence.nome === user.nome && presence.unidade === user.unidade && presence.type !== WebsocketType.TELEATENDIMENTO) {
            presence.isTeleatendimentoActive = false;
            presence.inviteUrl = undefined;
          }
        }
      }

      this.broadcastPresence(user?.unidade);
    }

    // Limpar pending requests deste client
    for (const [reqId, pending] of this.pendingBiometriaRequests.entries()) {
      if (pending.clientId === client.id) {
        this.cleanupBiometriaRequest(reqId, 'client_disconnect');
      }
    }

    // Limpar Sala de Espera Virtual
    this.teleatendimentoService.leaveVirtualWaitingRoom(client.id);

    const teleResult = this.teleatendimentoService.detachSocket(client.id);
    if (teleResult) {
      this.server.to(teleResult.session.roomId).emit(
        EventType.TELEATENDIMENTO_CALL_STATUS,
        {
          sessionId: teleResult.session.id,
          status:
            teleResult.session.status === 'EXPIRED'
              ? 'expired'
              : teleResult.session.status === 'ENDED'
                ? 'ended'
                : 'left',
          role: teleResult.role,
          message:
            teleResult.role === 'PROFESSIONAL'
              ? 'Profissional desconectado da videochamada.'
              : 'Funcionario desconectado da videochamada.',
        },
      );
      this.server.to(teleResult.session.roomId).emit(
        EventType.TELEATENDIMENTO_SESSION_SYNC,
        this.buildTeleatendimentoSessionSync(
          teleResult.session,
          teleResult.role,
        ),
      );
    }
  }

  async handleSchedulingChangedAtendimento(data: SchedulingChange) {
    const unidade = data.schedule?.UNIDADEATENDIMENTO;
    if (unidade) {
      this.invalidateSchedulingsCache(unidade);
    }
    const scheduleId = data.schedule?._id?.toString();

    try {
      if (!this.server) return; // Proteção para scripts sem WS server instanciado
      // Emissão direta
      if (unidade) {
        this.logger.debug(`📤 Emitindo UPDATE_SCHEDULE para ${unidade}`);
        this.server.to(unidade).emit(EventType.UPDATE_SCHEDULE, data);
      } else {
        this.server.emit(EventType.UPDATE_SCHEDULE, data);
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao emitir evento ${data.operation}:`, error);
    }
  }

  async handleSchedulingDelete(data: SchedulingChange) {
    const unidade = data.schedule?.UNIDADEATENDIMENTO;
    if (unidade) {
      this.invalidateSchedulingsCache(unidade);
    }
    try {
      if (!this.server) return;
      this.server.emit(EventType.UPDATE_RECORD, data);
      this.server.emit(EventType.UPDATE_SCHEDULE, data);

      this.logger.debug(`📤 Emitindo UPDATE_RECORD para prontuário`);
    } catch (error) {
      this.logger.error(`❌ Erro ao emitir evento ${data.operation}:`, error);
    }
  }

  async handleSchedulingChangedProntuario(data: SchedulingChange) {
    try {
      if (!this.server) return;
      this.server
        .to(WebsocketType.PRONTUARIO)
        .emit(EventType.UPDATE_RECORD, data);

      this.logger.debug(`📤 Emitindo UPDATE_RECORD para prontuário`);
    } catch (error) {
      this.logger.error(`❌ Erro ao emitir evento ${data.operation}:`, error);
    }
  }

  emitGedBatchStatus(payload: import('./events/events').GedBatchStatusPayload) {
    try {
      if (!this.server) return;
      this.server.to('GED_BATCH').emit(EventType.GED_BATCH_STATUS, payload);
      this.logger.debug(`📤 [GED_BATCH] Status emitido: ${payload.jobId} -> ${payload.status}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao emitir GED_BATCH_STATUS:`, error);
    }
  }

  emitGedBatchProgress(payload: import('./events/events').GedBatchProgressPayload) {
    try {
      if (!this.server) return;
      this.server.to('GED_BATCH').emit(EventType.GED_BATCH_PROGRESS, payload);
      this.logger.debug(`📤 [GED_BATCH] Progresso emitido: ${payload.jobId} ${payload.processedFuncionarios}/${payload.totalFuncionarios}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao emitir GED_BATCH_PROGRESS:`, error);
    }
  }

  @SubscribeMessage(EventType.PRESENCE_REQUEST)
  handlePresenceRequest(@ConnectedSocket() client: Socket) {
    const allPresences: UserPresencePayload[] = Array.from(this.activeUsersMap.values())
      .filter((p) => p.type !== WebsocketType.TELEATENDIMENTO)
      .map((p) => ({
        ...p,
        conectadoEm: p.conectadoEm.toISOString(),
      }));
    client.emit(EventType.PRESENCE_UPDATED, allPresences);
  }

  @SubscribeMessage('impressao_finalizada')
  async handlePrinterResult(@MessageBody() payload: PrinterResult) {
    if (payload.process) {
      this.ticketService.handleTicketEmited(payload.ticket);
    }
  }

  @SubscribeMessage('ticket_action')
  async handleTicketAction(
    @MessageBody() payload: ActionRequest,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(
        `[WS][TICKET_ACTION][IN] socket=${client.id} ticketId=${payload.ticketId} action=${payload.action} unidade=${payload.unidade || 'n/a'} sala=${payload.sala || 'n/a'} user=${payload.user || 'n/a'}`,
      );

      const shouldDropEmptyContext =
        payload.action === TicketActionType.CHAMAR ||
        payload.action === TicketActionType.ATENDER;

      const normalizedPayload: ActionRequest = {
        ...payload,
        sala: shouldDropEmptyContext
          ? this.normalizeContextValue(payload.sala)
          : this.normalizeContextKeepCompatibility(payload.sala),
        user: shouldDropEmptyContext
          ? this.normalizeContextValue(payload.user)
          : this.normalizeContextKeepCompatibility(payload.user),
      };

      const ticketUpdated =
        await this.ticketService.executeAction(normalizedPayload);

      // Emissão imediata para toda a unidade
      this.server
        .to(payload.unidade)
        .emit(EventType.TICKET_UPDATED, ticketUpdated);

      this.logger.log(
        `[WS][TICKET_ACTION][EMIT] socket=${client.id} ticketId=${payload.ticketId} event=${EventType.TICKET_UPDATED} room=${payload.unidade || 'n/a'} status=${ticketUpdated.status || 'n/a'} grupo=${ticketUpdated.grupo || 'n/a'} ativo=${(ticketUpdated as any).ativo ?? 'n/a'}`,
      );

      // Push notification para atendimento quando ação é EXAME (recepção -> atendimento)
      if (payload.action === TicketActionType.EXAME) {
        this.pushService.sendAtendimentoNotification(payload.unidade, {
          title: ticketUpdated.funcionario?.nome || 'Funcionário',
          body: `${ticketUpdated.exame || 'Exame'} - Sala ${payload.sala || ''}`,
          sala: payload.sala,
          exame: ticketUpdated.exame,
          funcionarioNome: ticketUpdated.funcionario?.nome,
        });
      }

      if (ticketUpdated.status === TicketStatus.EM_CHAMADA) {
        const chamadaPainel = await this.ticketService.audioGenerate(
          ticketUpdated,
          payload.funcionario,
          payload.exame,
          payload.unidade,
        );

        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('chamar funcionario', chamadaPainel);
      } else if (ticketUpdated.status === TicketStatus.EM_ATENDIMENTO) {
        // Compatibilidade: mantem evento legado usado pelo painel atual.
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', ticketUpdated);
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('funcionario em atendimento', ticketUpdated);
      } else if (ticketUpdated.status === TicketStatus.AGUARDANDO) {
        // Compatibilidade: mantem evento legado usado pelo painel atual.
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', ticketUpdated);
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento retornado', ticketUpdated);
      } else {
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', ticketUpdated);
      }

      // ACK para o cliente: confirma que a ação foi processada com sucesso
      return { ok: true };
    } catch (error) {
      this.logger.error(`❌ Erro ao executar ação:`, error);

      client.emit(
        EventType.TICKET_ERROR,
        JSON.stringify(this.buildTicketErrorPayload(payload, error)),
      );

      // ACK para o cliente: informa que a ação falhou
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  @SubscribeMessage(EventType.TICKET_DELETE)
  async handleDeleteTicket(
    @MessageBody() { ticketId: id, unidade: unidadeSelecionada },
  ) {
    try {
      await this.ticketService.deleteById(id);

      this.server
        .to(`${unidadeSelecionada}:RECEPCAO`)
        .emit(EventType.TICKET_DELETE, id);
    } catch (error) {
      this.server
        .to(`${unidadeSelecionada}:RECEPCAO`)
        .emit(
          EventType.TICKET_ERROR,
          'Erro ao deletar ticket: ' + error.message,
        );
    }
  }

  @SubscribeMessage('atendimento_action')
  async handleAtendimentoAction(
    @MessageBody() payload: ActionRequestAtendimento & { isTelemedicina?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // BUSCAR NOME DO FUNCIONÁRIO ANTES DA AÇÃO
      const schedulingDoc =
        await this.mongoService.schedulingsCollection.findOne(
          { _id: new ObjectId(payload.funcionarioId) },
          { projection: { NOME: 1, TICKET: 1 } },
        );

      if (!schedulingDoc?.TICKET) {
        throw new Error(
          `Ticket não encontrado para funcionário ${payload.funcionarioId}`,
        );
      }

      // EXECUTAR AÇÃO NO MONGODB
      const normalizedPayload: ActionRequestAtendimento = {
        ...payload,
        sala: this.normalizeContextValue(payload.sala),
        user: this.normalizeContextValue(payload.user),
      };

      const ticketUpdated =
        await this.mongoService.executeAction(normalizedPayload);
      const successPayload = this.buildTicketActionSuccessPayload(
        payload,
        ticketUpdated.status,
      );

      this.logger.log(
        `[ATENDIMENTO_ACTION_SUCCESS] ${JSON.stringify({
          ticketId: successPayload.ticketId,
          funcionarioId: payload.funcionarioId,
          action: successPayload.action,
          statusFinal: successPayload.statusFinal,
          unidade: payload.unidade,
          sala: normalizedPayload.sala || null,
          profissional: normalizedPayload.user || null,
        })}`,
      );

      client.emit(EventType.TICKET_ACTION_SUCCESS, successPayload);

      // CONVERTER PARA PAINELCALL
      const painelCall = this.ticketService.convertToPainelCall(
        ticketUpdated,
        schedulingDoc.NOME, // Nome do funcionário
      );

      // EMITIR EVENTOS
      if (ticketUpdated.status === TicketStatus.EM_CHAMADA) {
        const chamadaPainel = await this.ticketService.audioGenerate(
          ticketUpdated,
          payload.nomeFuncionario,
          payload.exame,
          payload.unidade,
        );

        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('chamar funcionario', chamadaPainel);

        this.logger.log(
          `📞 Chamada enviada ao painel: ${painelCall.name} - ${painelCall.sala}`,
        );
      } else if (ticketUpdated.status === TicketStatus.EM_ATENDIMENTO) {
        this.ttsService.deleteAudio(ticketUpdated);

        // Compatibilidade: mantem evento legado usado pelo painel atual.
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', painelCall);
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('funcionario em atendimento', painelCall);

        this.logger.log(
          `👨‍⚕️ Funcionário em atendimento enviado ao painel: ${painelCall.name} - ${painelCall.sala}`,
        );

        // Lógica da Sala de Espera Virtual (Telemedicina) - Desativada do ATENDER tradicional do Card
        // A chamada de vídeo agora deve ser iniciada exclusivamente pelo painel de Teleatendimento (botão INICIAR)
        /*
        const waitingData = this.teleatendimentoService.getWaitingEmployeeBySchedulingId(payload.funcionarioId);
        if (waitingData) {
          const sessionInfo = this.teleatendimentoService.createSession({
            schedulingId: payload.funcionarioId,
            professionalName: payload.user || 'Profissional',
            employeeName: payload.nomeFuncionario || schedulingDoc.NOME || 'Funcionario',
            appOrigin: client.handshake.headers.origin,
            unidade: payload.unidade,
            sala: payload.sala
          });

          this.server.to(waitingData.socketId).emit(EventType.TELEATENDIMENTO_PULL_TO_CALL, {
            sessionId: sessionInfo.sessionId
          });

          // Enviar para o próprio médico o sessionId para ele conectar
          client.emit(EventType.TELEATENDIMENTO_PULL_TO_CALL, {
            sessionId: sessionInfo.sessionId
          });

          this.logger.log(`[PULL_TO_CALL] Puxando funcionario ${payload.funcionarioId} para sessao ${sessionInfo.sessionId}`);
        }
        */
      } else if (ticketUpdated.status === TicketStatus.AGUARDANDO) {
        this.ttsService.deleteAudio(ticketUpdated);

        // Compatibilidade: mantem evento legado usado pelo painel atual.
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', painelCall);
        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento retornado', painelCall);

        this.logger.log(
          `🔄 Atendimento retornado enviado ao painel: ${painelCall.name} - ${painelCall.sala}`,
        );
      } else {
        this.ttsService.deleteAudio(ticketUpdated);

        this.server
          .to(`${payload.unidade}:PAINEL`)
          .emit('atendimento finalizado', painelCall);

        this.logger.log(
          `✅ Atendimento finalizado enviado ao painel: ${painelCall.name} - ${painelCall.sala}`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ Erro em atendimento_action:`, error);
      this.logger.error(
        `[ATENDIMENTO_ACTION_ERROR] ${JSON.stringify({
          ticketId: payload.ticketId,
          funcionarioId: payload.funcionarioId,
          action: payload.action,
          unidade: payload.unidade,
          sala: payload.sala || null,
          profissional: payload.user || null,
          message: (error as Error)?.message || 'Erro desconhecido',
        })}`,
      );

      client.emit(
        EventType.TICKET_ERROR,
        JSON.stringify(this.buildTicketErrorPayload(payload, error)),
      );
    }
  }

  @SubscribeMessage(EventType.PREPARATION_REQUEST)
  async handlePreparationRequest(
    @MessageBody() payload: PreparationRequestModel,
    @ConnectedSocket() client: Socket,
  ) {
    switch (payload.type) {
      case PreparationRequestTypes.CREATE:
        const requestDocument = await this.ticketService.createPreparation(
          payload.request,
        );

        if (requestDocument) {
          this.server
            .to(`${requestDocument.tickets.unidade}:RECEPCAO`)
            .to(`${requestDocument.tickets.unidade}:PREPARO`)
            .emit(EventType.PREPARATION_REQUEST, {
              type: PreparationRequestTypes.SUCCESS,
              request: requestDocument,
            });

          this.pushService.sendFromEvent(requestDocument.unidade, {
            title: requestDocument.nome,
            body: `${requestDocument.tipoExame} para preparação`,
          });
        } else {
          this.emitEvent(client, EventType.PREPARATION_REQUEST, {
            type: PreparationRequestTypes.ERROR,
            request: payload.request,
            message: 'Erro ao solicitação preparação de exame.',
          });
        }
        break;
      case PreparationRequestTypes.FINISHED:
        const { empresa } = payload.request;

        await this.socService.EdResultadoExamesTodasEmpresas({
          empresa: empresa,
        });
        await this.socService.EdPedidoExame({ empresa: empresa });

        this.server
          .to(`${payload.request.unidade}:RECEPCAO`)
          .to(`${payload.request.unidade}:PREPARO`)
          .emit(EventType.PREPARATION_REQUEST, {
            type: PreparationRequestTypes.FINISHED,
            request: payload.request,
          });

      default:
        break;
    }
  }

  @SubscribeMessage(EventType.TICKET_INFO)
  async sendTicketsInformations(
    @MessageBody() unidade: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Cache mantido apenas para consulta de informações (não crítico)
    const tickets = await this.ticketService.findByUnidade(unidade);
    const ticketsUnidade = tickets?.tickets || [];

    if (ticketsUnidade && ticketsUnidade.length > 0) {
      for (const item of ticketsUnidade) {
        client.emit(EventType.TICKET_UPDATED, item);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  @SubscribeMessage('psc_authenticated')
  async handlePscAuthenticated(
    @MessageBody() payload: { professionalCode?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const professionalCode = String(payload?.professionalCode || '').trim();
    if (!professionalCode) {
      this.logger.warn(
        '[PSC_AUTH] Evento psc_authenticated recebido sem professionalCode.',
      );
      return;
    }

    this.logger.log(
      `[PSC_AUTH] Profissional ${professionalCode} autenticado no PSC. Buscando pendentes...`,
    );

    try {
      const pending =
        await this.mongoService.getPendingSignatureByProfessional(
          professionalCode,
        );

      this.logger.log(
        `[PSC_AUTH] ${pending.length} item(ns) pendente(s) para profissional ${professionalCode}`,
      );

      client.emit('psc_pending_queue', {
        professionalCode,
        count: pending.length,
        items: pending,
      });
    } catch (error) {
      this.logger.error(
        `[PSC_AUTH] Erro ao buscar pendentes para profissional ${professionalCode}: ${error?.message ?? error}`,
      );
    }
  }

  // =========================================================
  // BIOMETRIA - CADASTRO ORCHESTRATOR
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_CADASTRO_REQUEST)
  async handleBiometriaCadastroRequest(
    @MessageBody() payload: BiometriaCadastroRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.trim().toUpperCase();
    const requestId = payload.requestId || new ObjectId().toString();
    const schedulingId = payload.schedulingId || payload.atendimentoId;
    this.logger.log(`BIOMETRIA_CADASTRO_REQUEST_RECEBIDO requestId=${requestId} unidade=${unidade}`);

    if (!unidade || !payload.sala || !payload.funcionario?.id || !payload.dedo?.id) {
      this.logger.warn(`[BIOMETRIA_CADASTRO] Request inválido: payload incompleto requestId=${requestId}`);
      return;
    }

    if ((!payload.funcionario?.cpf || !payload.funcionario?.dataNascimento) && payload.atendimentoId) {
      const resolved = await this.atendimentoAuthService.resolveIdentityFromScheduling(payload.atendimentoId);
      if (resolved) {
        payload.funcionario = { ...payload.funcionario, cpf: resolved.cpf, dataNascimento: resolved.dataNascimento };
      }
    }

    const cpfNormalizadoCadastro = payload.funcionario.cpf?.replace(/\D/g, '') || '';
    const dataNascimentoNormalizadaCadastro = this.normalizarDataNascimento(
      payload.funcionario.dataNascimento || '',
    );
    const dedoCadastro = payload.dedo?.codigo || '';
    const existente =
      cpfNormalizadoCadastro.length === 11 && dataNascimentoNormalizadaCadastro
        ? await this.atendimentoAuthService.findBiometricEnrollment(
            crypto.createHash('sha256').update(cpfNormalizadoCadastro).digest('hex'),
            crypto.createHash('sha256').update(dataNascimentoNormalizadaCadastro).digest('hex'),
            dedoCadastro,
          )
        : await this.mongoService.getCadastroBiometricoAtivo(
            payload.funcionario.id,
            dedoCadastro,
          );
    if (existente) {
      this.logger.warn(`[BIOMETRIA_CADASTRO] Cadastro ja existente para este dedo, prosseguindo mesmo assim. requestId=${requestId} dedo=${payload.dedo?.codigo}`);
    }

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'agent_resolving',
      message: 'Localizando agente para cadastro...',
      unidade,
    });

    const ipUsuario = this.normalizeIp(client.handshake.address);
    const requestedIpLocal = this.normalizeIp((payload as any)?.ipLocal || '');

    // Estratégia de Roteamento via Registry (fonte da verdade)
    const resolved = this.resolveAgentTargetRoom(unidade, ipUsuario, requestedIpLocal);
    const agentEncontrado = resolved ? this.biometriaAgentsByUnitIp.get(resolved.compositeKey) : undefined;
    const compositeKey = resolved?.compositeKey || `${unidade}:${requestedIpLocal || ipUsuario}`;

    if (!agentEncontrado) {
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'agent_not_found',
        message: `Nenhum Agente Biométrico online para cadastro em ${unidade}.`,
        unidade,
      });
      return;
    }

    if (!agentEncontrado.leitorAberto) {
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'reader_unavailable',
        message: `Leitor biométrico desconectado ou fechado no Agente.`,
        unidade,
        agentKey: compositeKey,
      });
      return;
    }

    this.logger.log(`BIOMETRIA_CADASTRO_AGENT_LOCALIZADO requestId=${requestId} agentKey=${compositeKey}`);

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'agent_found',
      message: `Agente localizado para cadastro: ${agentEncontrado.machineName}`,
      unidade,
      agentKey: compositeKey,
    });

    const timeoutRef = setTimeout(() => {
      const pending = this.cleanupBiometriaRequest(requestId, 'cadastro_timeout');
      if (pending) {
        this.emitBiometriaRequestState(pending.clientId, {
          requestId,
          state: 'timeout',
          message: 'O fluxo de cadastro esgotou o tempo limite (60s).',
          unidade,
        });
      }
    }, 60000);

    this.pendingBiometriaRequests.set(requestId, {
      requestId,
      clientId: client.id,
      unidade,
      sala: payload.sala,
      estacaoId: '',
      funcionarioId: payload.funcionario.id,
      timeoutRef,
      createdAt: new Date(),
      tipo: 'CADASTRO_BIOMETRICO',
      targetRoom: `${unidade}:BIOMETRIA:IP:${agentEncontrado.ipLocal}`,
      dedo: payload.dedo?.codigo || '',
      operadorId: payload.operador?.id,
      operadorNome: payload.operador?.nome,
      operadorPerfil: payload.operador?.perfil,
      atendimentoId: payload.atendimentoId,
      origem: payload.origem,
      prontuario: payload.funcionario.prontuario,
      cpf: payload.funcionario.cpf,
      dataNascimento: payload.funcionario.dataNascimento,
      agentMachineName: agentEncontrado.machineName,
    });

    this.server.to(agentEncontrado.socketId).emit(EventType.BIOMETRIA_CADASTRO_COMMAND, {
      ...payload,
      requestId,
      clientId: client.id,
      modo: 'CADASTRO_BIOMETRICO',
      capturasNecessarias: 2,
    });
    
    this.logger.log(`BIOMETRIA_CADASTRO_COMMAND_ENVIADO requestId=${requestId} socketId=${agentEncontrado.socketId}`);

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'command_sent',
      message: 'Comando de cadastro enviado ao hardware.',
      unidade,
    });
  }

  @SubscribeMessage(EventType.BIOMETRIA_CADASTRO_STATUS)
  async handleBiometriaCadastroStatus(
    @MessageBody() payload: BiometriaCadastroStatusPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const pending = this.pendingBiometriaRequests.get(payload.requestId);
    if (pending) {
      const stateMap: Record<string, BiometriaRequestStatePayload['state']> = {
        aguardando_dedo: 'waiting_finger',
        dedo_detectado: 'finger_detected',
        capturando: 'capturing',
        started: 'ready',
      };

      const newState = stateMap[payload.status] || 'capturing';

      // CRITICAL: Propaga o status original para que o CadastroBiometricoModal no frontend
      // consiga avançar nos círculos (steps) 1, 2, 3...
      if (pending.clientId) {
        this.server.to(pending.clientId).emit(EventType.BIOMETRIA_CADASTRO_STATUS, payload);
        
        this.emitBiometriaRequestState(pending.clientId, {
          requestId: payload.requestId,
          state: newState,
          message: payload.mensagem,
          unidade: pending.unidade,
          source: 'agent',
        });
      }
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_CADASTRO_RESULT)
  async handleBiometriaCadastroResult(
    @MessageBody() payload: BiometriaCadastroResultPayload,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`BIOMETRIA_CADASTRO_RESULT_RECEBIDO requestId=${payload.requestId} status=${payload.status}`);
    const isSuccess = payload.status === 'concluido';
    const pending = this.cleanupBiometriaRequest(payload.requestId, isSuccess ? 'cadastro_result_success' : 'cadastro_result_error');
    
    if (pending) {
      const resultPayload = { ...payload };
      this.emitBiometriaRequestState(pending.clientId, {
        requestId: payload.requestId,
        state: isSuccess ? 'success' : 'error',
        message: isSuccess ? 'Cadastro concluído com sucesso!' : (payload.mensagem || 'Falha no cadastro.'),
        unidade: pending.unidade,
      });

      if (isSuccess) {
        try {
          // --- CPF: normalizar e validar ---
          const cpfRaw = pending.cpf || payload.funcionario?.cpf || '';
          const cpfNormalizado = cpfRaw.replace(/\D/g, '');
          const cpfValido = this.validarCPF(cpfNormalizado);

          if (!cpfValido) {
            const cpfMascarado = cpfNormalizado.length === 11
              ? `${cpfNormalizado.slice(0,3)}.***.***-${cpfNormalizado.slice(9)}`
              : (cpfNormalizado || '(vazio)');
            throw new Error(`IDENTIDADE_INSUFICIENTE: CPF inválido ou ausente (${cpfMascarado}). Biometria requer CPF válido.`);
          }

          const cpfHash = crypto.createHash('sha256').update(cpfNormalizado).digest('hex');

          // --- dataNascimento: normalizar e hash ---
          let dataNascimentoHash: string | undefined;
          const dataNascimentoRaw = pending.dataNascimento || payload.funcionario?.dataNascimento || '';
          if (dataNascimentoRaw) {
            const dataNascimentoNormalizada = this.normalizarDataNascimento(dataNascimentoRaw);
            if (dataNascimentoNormalizada) {
              dataNascimentoHash = crypto.createHash('sha256').update(dataNascimentoNormalizada).digest('hex');
            }
          }

          // --- Determinar se template é real ou imagem ---
          const templateRaw = payload.template || '';
          const templateSize = payload.templateSize || 0;
          const isRealTemplate = templateRaw.length > 0
            && !templateRaw.startsWith('iVBORw0KGgo')
            && !templateRaw.startsWith('/9j/')
            && templateSize > 0;

          const templateStatus = isRealTemplate ? 'ATIVO' : 'PENDENTE_TEMPLATE_ENGINE';

          // templateHash é SHA-256 do template bruto ANTES da criptografia
          const templateHashToSave = isRealTemplate
            ? crypto.createHash('sha256').update(templateRaw).digest('hex')
            : '';

          // Criptografar template real via AES-256-GCM
          let templateToSave: string | null = null;
          let templateEncryptedToSave: string | undefined;
          let templateEncryptionToSave: any;
          let templateStorageToSave: string;

          if (isRealTemplate) {
            try {
              const encResult = this.cryptoService.encrypt(templateRaw);
              templateEncryptedToSave = encResult.templateEncrypted;
              templateEncryptionToSave = encResult.templateEncryption;
              templateStorageToSave = 'ENCRYPTED_AES_256_GCM';
              // template bruto NÃO é armazenado; template=null
              templateToSave = null;
              this.logger.log(
                `[BIOMETRIA] Template criptografado: size=${templateSize} hashPrefix=${templateHashToSave.slice(0, 16)}... keyId=${encResult.templateEncryption.keyId} version=${payload.templateVersion || 'futronic-ansi-v1'}`,
              );
            } catch (cryptoErr) {
              throw new Error(`FALHA_CRIPTOGRAFIA_TEMPLATE: ${cryptoErr.message}`);
            }
          } else {
            templateStorageToSave = 'PENDING_ENGINE';
            this.logger.log(`[BIOMETRIA] Template não é real (pendente engine). Status: PENDENTE_TEMPLATE_ENGINE. requestId=${payload.requestId}`);
          }

          // --- Upload Azure (agora bloqueante) ---
          let digitalDocumentalBlobPath, digitalDocumentalHash, digitalDocumentalContentType;
          
          if (payload.capturas && payload.capturas.length > 0) {
            const lastCap = payload.capturas[payload.capturas.length - 1];
            if (lastCap.imagemDerivadaBase64) {
               try {
                 this.logger.log(`BIOMETRIA_BLOB_DOCUMENTAL_UPLOAD_INICIADO requestId=${payload.requestId}`);

                 const buffer = Buffer.from(lastCap.imagemDerivadaBase64, 'base64');

                 this.logger.log(`BIOMETRIA_BLOB_DOCUMENTAL_HASH_GERADO requestId=${payload.requestId} hash=${lastCap.imagemDerivadaHash?.slice(0, 16)}...`);

                 const prontuarioId = pending.prontuario || payload.funcionario?.prontuario || pending.funcionarioId || payload.funcionario?.id || 'DESCONHECIDO';
                 digitalDocumentalBlobPath = await this.azureService.uploadBiometricImage(
                    prontuarioId,
                    payload.dedo?.codigo || pending.dedo || 'DESCONHECIDO',
                    buffer,
                    'image/png'
                 );
                 digitalDocumentalHash = lastCap.imagemDerivadaHash;
                 digitalDocumentalContentType = 'image/png';
               } catch (azureErr) {
                 this.logger.error(`[BIOMETRIA_CADASTRO] Falha no upload Azure (bloqueante): ${azureErr.message}`);
                 throw new Error(`FALHA_UPLOAD_AZURE: Não foi possível salvar a imagem documental. ${azureErr.message}`);
               }

               // Não armazenar base64 em memória após upload
               delete (lastCap as any).imagemDerivadaBase64;
            }
          }

          const funcionarioIdStr = pending.funcionarioId || payload.funcionario?.id;
          if (!funcionarioIdStr) {
            throw new Error('ID_FUNCIONARIO_AUSENTE');
          }

          // Log sanitizado
          const cpfMascaradoLog = cpfNormalizado.length === 11
            ? `${cpfNormalizado.slice(0,3)}.***.***-${cpfNormalizado.slice(9)}`
            : '(não informado)';
          this.logger.log(`[BIOMETRIA] Persistindo biometria: funcionarioId=${funcionarioIdStr} cpfHash=${cpfHash.slice(0,16)}... cpf=${cpfMascaradoLog} status=${templateStatus}`);

          const biometriaPersistida = await this.atendimentoAuthService.saveBiometricEnrollment({
            funcionarioId: funcionarioIdStr,
            cpfHash: cpfHash,
            dataNascimentoHash: dataNascimentoHash,
            dedo: payload.dedo?.codigo || pending.dedo || '',
            template: templateToSave,
            templateHash: templateHashToSave,
            templateEncrypted: templateEncryptedToSave,
            templateEncryption: templateEncryptionToSave,
            templateVersion: payload.templateVersion || (isRealTemplate ? 'futronic-ansi-v1' : undefined),
            templateStorage: templateStorageToSave,
            status: templateStatus,
            unidade: pending.unidade,
            agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
            agentMachineName: pending.agentMachineName || null,
            operadorId: pending.operadorId,
            funcionarioRefs: [{
              funcionarioId: funcionarioIdStr,
              prontuarioId: pending.prontuario || payload.funcionario?.prontuario || null,
              schedulingId: pending.atendimentoId || null,
              origem: pending.origem || 'RECEPCAO',
              vinculadoEm: new Date(),
            }],
            metadata: {
              ...payload.metadata,
              requestId: payload.requestId,
              enrollmentSource: 'PHASE2_REFINED_MODAL',
              operadorId: pending.operadorId,
              operadorNome: pending.operadorNome,
              operadorPerfil: pending.operadorPerfil,
              agentMachineName: pending.agentMachineName || undefined,
              agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
            },
            digitalDocumentalBlobPath,
            digitalDocumentalHash,
            digitalDocumentalContentType,
            digitalDocumentalGeradaEm: digitalDocumentalBlobPath ? new Date() : undefined,
            digitalDocumentalFinalidade: digitalDocumentalBlobPath ? 'COMPOSICAO_DOCUMENTAL' : undefined,
            digitalDocumentalOrigem: digitalDocumentalBlobPath ? 'IMAGEM_DERIVADA_NAO_RAW' : undefined,
          });

           if (digitalDocumentalBlobPath) {
             this.logger.log(`BIOMETRIA_BLOB_DOCUMENTAL_SALVO requestId=${payload.requestId} path=${digitalDocumentalBlobPath}`);
           }

           this.logger.log(`BIOMETRIA_CADASTRO_PERSISTIDO requestId=${payload.requestId} funcionarioId=${funcionarioIdStr} status=${templateStatus}`);

           await this.atendimentoAuthService.registrarBiometriaAudit({
             tipo: 'BIOMETRIA_CADASTRO',
             funcionarioId: pending.funcionarioId,
             cpfHash: cpfHash,
             dataNascimentoHash: dataNascimentoHash,
             dedo: payload.dedo?.codigo || pending.dedo || '',
             requestId: payload.requestId,
             resultado: 'SUCESSO',
             unidade: pending.unidade,
             operador: pending.operadorId,
             agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
             agentMachineName: pending.agentMachineName || null,
             digitalDocumentalHash: digitalDocumentalHash || null,
             templateHash: isRealTemplate ? templateHashToSave : null,
           });

           this.logger.log(`BIOMETRIA_AUDITORIA_REGISTRADA requestId=${payload.requestId}`);

           const biometriaId = this.extractBiometriaInsertId(biometriaPersistida);
           if (!biometriaId) {
             this.logger.error(
               `[BIOMETRIA_CADASTRO] insertedId ausente após persistência — termo LGPD não será gerado. requestId=${payload.requestId}`,
             );
           } else {
             const termoResult = await this.biometriaLgpdTermoService.registrarTermoPosCadastro({
               biometriaId,
               schedulingId: pending.atendimentoId,
               requestId: payload.requestId,
               funcionario: this.buildFuncionarioTermoContext(pending, payload.funcionario),
               operador: {
                 id: pending.operadorId,
                 nome: pending.operadorNome,
                 perfil: pending.operadorPerfil,
               },
               unidade: pending.unidade,
               dedo: payload.dedo?.codigo || pending.dedo || '',
               templateStorage: templateStorageToSave,
               templateVersion:
                 payload.templateVersion ||
                 (isRealTemplate ? 'futronic-ansi-v1' : undefined),
               digitalDocumentalBlobPath,
               cadastradoEm: new Date(),
             });

             if (!termoResult.success) {
               this.logger.error(
                 `[BIOMETRIA_CADASTRO] Termo LGPD não gerado requestId=${payload.requestId} motivo=${termoResult.motivo || 'DESCONHECIDO'} lgpdPersistido=${termoResult.lgpdPersistido ?? false}`,
               );
             }
           }

            // Atualizar AUTENTICACAOATENDIMENTO no scheduling quando cadastro concluído
            if (pending.atendimentoId) {
              try {
                await this.atendimentoAuthService.registerAuthValidation(pending.atendimentoId, {
                  schedulingId: pending.atendimentoId,
                  metodo: 'BIOMETRIA',
                  status: 'VALIDADO',
                  requestId: payload.requestId,
                  validadoPor: this.resolveValidadoPor(pending),
                  biometria: {
                    cadastroId: funcionarioIdStr,
                    dedo: payload.dedo?.codigo || pending.dedo,
                    templateVersion: payload.templateVersion || (isRealTemplate ? 'futronic-ansi-v1' : undefined),
                  },
                });
              } catch (authErr) {
                this.logger.error(`[BIOMETRIA_AUTH] Falha ao atualizar AUTENTICACAOATENDIMENTO no cadastro: ${authErr}`);
              }
            }
         } catch (err) {
           this.logger.error(`[BIOMETRIA_CADASTRO] Erro ao persistir biometria: ${err.message}`);
          
          // Se falhar a persistência, o status final deve ser erro
          (resultPayload as any).status = 'erro';
          (resultPayload as any).mensagem = `Erro ao salvar cadastro: ${err.message}`;

          // Tentar extrair cpfHash para auditoria mesmo em caso de erro
          let cpfHashForAudit: string | undefined;
          let dataNascimentoHashForAudit: string | undefined;
          try {
            const cpfRaw = pending.cpf || payload.funcionario?.cpf || '';
            const cpfNorm = cpfRaw.replace(/\D/g, '');
            if (cpfNorm.length === 11) {
              cpfHashForAudit = crypto.createHash('sha256').update(cpfNorm).digest('hex');
            }
            const dnRaw = pending.dataNascimento || payload.funcionario?.dataNascimento || '';
            if (dnRaw) {
              const dnNorm = this.normalizarDataNascimento(dnRaw);
              if (dnNorm) {
                dataNascimentoHashForAudit = crypto.createHash('sha256').update(dnNorm).digest('hex');
              }
            }
          } catch (_) { /* ignorar */ }

          await this.atendimentoAuthService.registrarBiometriaAudit({
            tipo: 'BIOMETRIA_CADASTRO',
            funcionarioId: pending.funcionarioId,
            cpfHash: cpfHashForAudit,
            dataNascimentoHash: dataNascimentoHashForAudit,
            dedo: pending.dedo || '',
            requestId: payload.requestId,
            resultado: 'ERRO',
            codigoErro: err.message.startsWith('IDENTIDADE_INSUFICIENTE') ? 'IDENTIDADE_INSUFICIENTE' : 'ERRO_PERSISTENCIA',
            unidade: pending.unidade,
            agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
            agentMachineName: pending.agentMachineName || null,
          });
        }
      } else {
        await this.atendimentoAuthService.registrarBiometriaAudit({
          tipo: 'BIOMETRIA_CADASTRO',
          funcionarioId: pending.funcionarioId,
          dedo: pending.dedo || '',
          requestId: payload.requestId,
          resultado: 'ERRO',
          codigoErro: payload.mensagem || 'UNKNOWN_ERROR',
          unidade: pending.unidade,
          agentMachineName: pending.agentMachineName || null,
        });
      }

      // Payload sanitizado antes de enviar ao frontend
      delete (resultPayload as any).template;
      delete (resultPayload as any).templateHash;
      
      if (resultPayload.capturas && Array.isArray(resultPayload.capturas)) {
        resultPayload.capturas = resultPayload.capturas.map(cap => ({
          indice: cap.indice,
          imagemDerivadaHash: cap.imagemDerivadaHash
        })) as any;
      }

      // Auditoria operacional LGPD - fire-and-forget, sem dados sensíveis
      try {
        this.auditLogService.logUserAction({
          user: {
            codigo: pending.operadorId,
            nome: pending.operadorNome,
            perfil: pending.operadorPerfil,
          },
          acao: isSuccess ? 'BIOMETRIA_CADASTRO_SUCESSO' : 'BIOMETRIA_CADASTRO_ERRO',
          recursoTipo: 'biometria',
          recursoId: pending.funcionarioId,
          pacienteCodigo: pending.funcionarioId,
          unidade: pending.unidade,
          requestId: payload.requestId,
          detalhes: {
            dedo: (payload.dedo as any)?.codigo || pending.dedo,
            resultado: payload.status,
          },
        });
      } catch { /* silenciado - auditoria nunca interrompe o fluxo */ }

      this.server.to(pending.clientId).emit(EventType.BIOMETRIA_CADASTRO_RESULT, resultPayload);
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_CADASTRO_CANCEL)
  async handleBiometriaCadastroCancel(
    @MessageBody() payload: BiometriaCadastroCancelPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.requestId) {
      this.logger.debug(`[BIOMETRIA_CADASTRO] Recebido CANCEL sem requestId. Ignorado.`);
      return;
    }
    const pending = this.cleanupBiometriaRequest(payload.requestId, 'cadastro_cancel');
    if (!pending) {
      this.logger.debug(`[BIOMETRIA_CADASTRO] Recebido CANCEL para requisição já inexistente (ignorado silenciosamente).`);
      return;
    }
    this.logger.log(`[BIOMETRIA_CADASTRO] Cancelamento: requestId=${payload.requestId} funcionarioId=${pending.funcionarioId}`);

    // Auditar cancelamento
    await this.atendimentoAuthService.registrarBiometriaAudit({
      tipo: 'BIOMETRIA_CADASTRO',
      funcionarioId: pending.funcionarioId,
      dedo: pending.dedo || '',
      requestId: payload.requestId,
      resultado: 'CANCELADO',
      unidade: pending.unidade,
      operador: pending.operadorId,
      agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
      agentMachineName: pending.agentMachineName || null,
    });

    if (pending.targetRoom) {
      this.server.to(pending.targetRoom).emit(EventType.BIOMETRIA_CADASTRO_CANCEL, { requestId: payload.requestId });
    }
  }

  // =========================================================
  // BIOMETRIA - VALIDAÇÃO 1:1 ORCHESTRATOR
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_VALIDACAO_REQUEST)
  async handleBiometriaValidacaoRequest(
    @MessageBody() payload: BiometriaValidacaoRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.trim().toUpperCase();
    const requestId = payload.requestId || new ObjectId().toString();
    this.logger.log(`BIOMETRIA_VALIDACAO_REQUEST_RECEBIDO requestId=${requestId} unidade=${unidade}`);

    if ((!payload.funcionario?.cpf || !payload.funcionario?.dataNascimento) && payload.atendimento?.id) {
      const resolved = await this.atendimentoAuthService.resolveIdentityFromScheduling(payload.atendimento.id);
      if (resolved) {
        payload.funcionario = { ...payload.funcionario, cpf: resolved.cpf, dataNascimento: resolved.dataNascimento };
      } else {
        this.logger.warn(`[BIOMETRIA_VALIDACAO] RESOLVE_IDENTITY_FALHOU requestId=${requestId} schedulingId=${payload.atendimento.id}`);
      }
    }

    if (!unidade) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] Request inválido: unidade vazia requestId=${requestId}`);
      return;
    }

    if (!payload.funcionario?.cpf) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] Request inválido: CPF não resolvido requestId=${requestId} atendimentoId=${payload.atendimento?.id} schedulingId=${(payload as any).schedulingId}`);
      return;
    }

    // Normalizar CPF e gerar hash
    const cpfNormalizado = payload.funcionario.cpf.replace(/\D/g, '');
    if (cpfNormalizado.length !== 11) {
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: '',
        capturadoEm: new Date().toISOString(),
        mensagem: 'CPF inválido para validação biométrica.',
      });
      return;
    }

    const cpfHash = crypto.createHash('sha256').update(cpfNormalizado).digest('hex');
    const dataNascimentoHash = payload.funcionario.dataNascimento
      ? crypto.createHash('sha256').update(this.normalizarDataNascimento(payload.funcionario.dataNascimento) || '').digest('hex')
      : '';

    // Buscar cadastro ATIVO por identidade estável
    const dedoCodigo = payload.dedo?.codigo || '';

    this.logger.log(
      `[BIOMETRIA_VALIDACAO_BUSCA_INICIADA] requestId=${requestId} cpfHashPrefix=${cpfHash.slice(0, 16)}... dataNascimentoHashPrefix=${dataNascimentoHash ? dataNascimentoHash.slice(0, 16) + '...' : '(vazio)'} dedo=${dedoCodigo}`
    );

    const cadastro = await this.atendimentoAuthService.findBiometricEnrollment(
      cpfHash, dataNascimentoHash, dedoCodigo
    );

    this.logger.log(
      `[BIOMETRIA_VALIDACAO_BUSCA_RESULTADO] requestId=${requestId} encontrados=${cadastro ? 1 : 0} status=${cadastro?.status || 'N/A'} templateStorage=${cadastro?.templateStorage || 'N/A'}`
    );

    if (!cadastro) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] CADASTRO_NAO_ENCONTRADO requestId=${requestId} cpfHashPrefix=${cpfHash.slice(0, 16)}`);
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Nenhum cadastro biométrico ativo foi encontrado para este funcionário.',
      });
      return;
    }

    if (cadastro.status !== 'ATIVO') {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] CADASTRO_INATIVO requestId=${requestId} status=${cadastro.status}`);
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Nenhum cadastro biométrico ativo foi encontrado para este funcionário.',
      });
      return;
    }

    // Exige estritamente os campos criptografados novos
    if (
      cadastro.templateStorage !== 'ENCRYPTED_AES_256_GCM' ||
      !cadastro.templateEncrypted ||
      !cadastro.templateEncryption ||
      cadastro.templateVersion !== 'futronic-ansi-v1'
    ) {
      this.logger.warn(
        `[BIOMETRIA_VALIDACAO] Cadastro ativo mas sem template criptografado válido (requestId=${requestId}). Storage=${cadastro.templateStorage || 'N/A'} Version=${cadastro.templateVersion || 'N/A'}`
      );
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Cadastro biométrico incompleto ou pendente de template (CADASTRO_PENDENTE_TEMPLATE).',
      });
      return;
    }

    let templateCleartext: string;
    try {
      templateCleartext = this.cryptoService.decrypt(cadastro.templateEncrypted, cadastro.templateEncryption);
    } catch (err) {
      this.logger.error(`[BIOMETRIA_VALIDACAO] Falha ao descriptografar template (requestId=${requestId}): ${err.message}`);
      this.logBiometriaValidacaoErro({
        requestId,
        funcionarioId: cadastro.funcionarioId?.toString() || undefined,
        unidade,
        dedo: dedoCodigo,
        codigoErroSanitizado: 'CRYPTO_ERROR',
      });
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Falha interna ao processar o cadastro biométrico (criptografia).',
      });
      return;
    }

    if (!templateCleartext) {
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Cadastro biométrico incompleto ou sem template.',
      });
      return;
    }

    this.logger.log(`[BIOMETRIA_VALIDACAO] Cadastro encontrado: templateHash=${cadastro.templateHash || 'N/A'} status=${cadastro.status}`);

    // Localizar agente
    const ipUsuario = this.normalizeIp(client.handshake.address);
    const requestedIpLocal = this.normalizeIp((payload as any)?.ipLocal || '');
    this.logger.log(`[BIOMETRIA_VALIDACAO_RESOLVENDO_AGENTE] requestId=${requestId} unidade=${unidade} ipUsuario=${ipUsuario} requestedIpLocal=${requestedIpLocal} agentsDisponiveis=${Array.from(this.biometriaAgentsByUnitIp.entries()).map(([k, v]) => `${k}:sockId=${v.socketId}:leitor=${v.leitorAberto}:hbAge=${Date.now() - v.ultimoHeartbeatEm.getTime()}ms`).join(' | ')}`);
    const resolved = this.resolveAgentTargetRoom(unidade, ipUsuario, requestedIpLocal);
    const agentEncontrado = resolved ? this.biometriaAgentsByUnitIp.get(resolved.compositeKey) : undefined;
    const compositeKey = resolved?.compositeKey || `${unidade}:${requestedIpLocal || ipUsuario}`;

    if (!agentEncontrado) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] AGENTE_NAO_ENCONTRADO requestId=${requestId} unidade=${unidade} compositeKeyProcurada=${resolved?.compositeKey || `${unidade}:${requestedIpLocal || ipUsuario}`}`);
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'agent_not_found',
        message: `Nenhum Agente Biométrico online para validação em ${unidade}.`,
        unidade,
      });
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: `Nenhum Agente Biométrico online para validação em ${unidade}.`,
      });
      return;
    }

    if (!agentEncontrado.leitorAberto) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] LEITOR_FECHADO requestId=${requestId} agentKey=${compositeKey} socketId=${agentEncontrado.socketId}`);
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'reader_unavailable',
        message: `Leitor biométrico desconectado ou fechado no Agente.`,
        unidade,
      });
      client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
        requestId,
        aprovado: false,
        score: null,
        threshold: null,
        engine: 'backend',
        templateVersion: '',
        dedo: dedoCodigo,
        capturadoEm: new Date().toISOString(),
        mensagem: 'Leitor biométrico desconectado ou fechado no Agente.',
      });
      return;
    }

    this.logger.log(`[BIOMETRIA_VALIDACAO] AGENTE_OK requestId=${requestId} agentKey=${compositeKey} socketId=${agentEncontrado.socketId} machineName=${agentEncontrado.machineName} leitorAberto=${agentEncontrado.leitorAberto}`);

    // Timeout
    const timeoutRef = setTimeout(() => {
      const pending = this.cleanupBiometriaRequest(requestId, 'validacao_timeout');
      if (pending) {
        client.emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
          requestId,
          aprovado: false,
          score: null,
          threshold: null,
          engine: 'backend',
          templateVersion: '',
          dedo: dedoCodigo,
          capturadoEm: new Date().toISOString(),
          mensagem: 'Validação biométrica esgotou o tempo limite.',
        });
      }
    }, 60000);

    this.pendingBiometriaRequests.set(requestId, {
      requestId,
      tipo: 'VALIDACAO_BIOMETRICA',
      funcionarioId: cadastro.funcionarioId?.toString() || '',
      atendimentoId: payload.atendimento?.id,
      cpf: cpfNormalizado,
      cpfHash,
      dataNascimento: payload.funcionario.dataNascimento,
      dataNascimentoHash,
      prontuario: payload.funcionario?.prontuario,
      dedo: dedoCodigo,
      unidade,
      sala: '',
      estacaoId: '',
      createdAt: new Date(),
      operadorId: (payload as any).operador?.id,
      operadorNome: (payload as any).operador?.nome,
      operadorPerfil: (payload as any).operador?.perfil,
      targetRoom: agentEncontrado.socketId,
      clientId: client.id,
      agentMachineName: agentEncontrado.machineName,
      timeoutRef,
      templateRef: templateCleartext,
      templateHashRef: cadastro.templateHash,
      templateVersionRef: cadastro.templateVersion,
      enrollmentMongoId: cadastro._id?.toString(),
      enrollmentTemplateStorage: cadastro.templateStorage,
      enrollmentDigitalDocumentalBlobPath: cadastro.digitalDocumentalBlobPath,
    });

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'agent_found',
      message: `Agente localizado: ${agentEncontrado.machineName}`,
      unidade,
      agentKey: compositeKey,
    });

    // Enviar comando ao agent
    this.logger.log(`[BIOMETRIA_VALIDACAO] ENVIANDO_COMANDO requestId=${requestId} para socketId=${agentEncontrado.socketId} agentKey=${compositeKey}`);
    this.server.to(agentEncontrado.socketId).emit(EventType.BIOMETRIA_VALIDACAO_COMMAND, {
      requestId,
      clientId: client.id,
      unidade,
      ipLocal: requestedIpLocal || ipUsuario,
      funcionario: payload.funcionario,
      dedo: payload.dedo,
      templateBase64: templateCleartext,
      templateHash: cadastro.templateHash || '',
      templateVersion: cadastro.templateVersion || 'futronic-ansi-v1',
      dedoCodigo,
    });

    this.logger.log(`BIOMETRIA_VALIDACAO_COMMAND_ENVIADO requestId=${requestId} agentKey=${compositeKey}`);
  }

  @SubscribeMessage(EventType.BIOMETRIA_VALIDACAO_RESULT)
  async handleBiometriaValidacaoResult(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`BIOMETRIA_VALIDACAO_RESULT_RECEBIDO requestId=${payload.requestId} aprovado=${payload.aprovado}`);

    const pending = this.cleanupBiometriaRequest(payload.requestId, 'validacao_result');
    if (!pending) {
      this.logger.warn(`[BIOMETRIA_VALIDACAO] Result para requisição inexistente: ${payload.requestId}`);
      return;
    }

    // Registrar auditoria
    await this.atendimentoAuthService.registrarBiometriaAudit({
      tipo: 'BIOMETRIA_VALIDACAO',
      funcionarioId: pending.funcionarioId,
      cpfHash: pending.cpfHash,
      dataNascimentoHash: pending.dataNascimentoHash,
      dedo: pending.dedo || '',
      requestId: payload.requestId,
      resultado: payload.aprovado ? 'SUCESSO' : 'ERRO',
      unidade: pending.unidade,
      operador: pending.operadorId,
      agentIpLocal: pending.targetRoom ? pending.targetRoom.split(':IP:')[1] || pending.targetRoom : 'UNKNOWN',
      agentMachineName: pending.agentMachineName || null,
      templateHash: pending.templateHashRef || null,
      score: payload.score || null,
      threshold: payload.threshold || null,
    });

    // Encaminhar resultado ao frontend
    this.logger.log(`[BIOMETRIA_VALIDACAO] ENVIANDO_RESULTADO_AO_FRONTEND requestId=${payload.requestId} aprovado=${payload.aprovado} score=${payload.score} clientId=${pending.clientId}`);
    this.server.to(pending.clientId).emit(EventType.BIOMETRIA_VALIDACAO_RESULT, {
      requestId: payload.requestId,
      aprovado: payload.aprovado,
      score: payload.score,
      threshold: payload.threshold,
      engine: payload.engine || 'futronic-ansi',
      templateVersion: payload.templateVersion || 'futronic-ansi-v1',
      dedo: payload.dedo || pending.dedo,
      capturadoEm: payload.capturadoEm || new Date().toISOString(),
      mensagem: payload.mensagem,
    });

    // Auditoria operacional LGPD - fire-and-forget, sem dados sensíveis
    try {
      this.auditLogService.logUserAction({
        user: {
          codigo: pending.operadorId,
          nome: pending.operadorNome,
          perfil: pending.operadorPerfil,
        },
        acao: payload.aprovado ? 'BIOMETRIA_VALIDACAO_APROVADA' : 'BIOMETRIA_VALIDACAO_REPROVADA',
        recursoTipo: 'biometria',
        recursoId: pending.funcionarioId,
        pacienteCodigo: pending.funcionarioId,
        unidade: pending.unidade,
        requestId: payload.requestId,
        detalhes: {
          dedo: pending.dedo,
          resultado: payload.aprovado ? 'APROVADO' : 'REPROVADO',
        },
      });
    } catch { /* silenciado - auditoria nunca interrompe o fluxo */ }

    // Atualizar AUTENTICACAOATENDIMENTO no scheduling quando validação aprovada
    if (payload.aprovado && pending.atendimentoId) {
      try {
        await this.atendimentoAuthService.registerAuthValidation(pending.atendimentoId, {
          schedulingId: pending.atendimentoId,
          metodo: 'BIOMETRIA',
          status: 'VALIDADO',
          requestId: payload.requestId,
          validadoPor: this.resolveValidadoPor(pending),
          biometria: {
            cadastroId: pending.funcionarioId,
            dedo: pending.dedo,
            templateVersion: payload.templateVersion || 'futronic-ansi-v1',
          },
        });
      } catch (err) {
        this.logger.error(`[BIOMETRIA_AUTH] Falha ao atualizar AUTENTICACAOATENDIMENTO: ${err}`);
      }

      try {
        await this.vincularTermoBiometriaPosValidacao(pending, payload);
      } catch (err) {
        this.logger.error(`[BIOMETRIA_VALIDACAO] Erro ao vincular termoCienciaUrl: ${err}`);
        this.logger.error(
          `[BIOMETRIA_VALIDACAO_TERMO] Stack: ${err instanceof Error ? err.stack : 'N/A'}`,
        );
      }
    }
  }

  // =========================================================
  // VALIDACAO STATUS - Relay Agent -> Frontend
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_VALIDACAO_STATUS)
  async handleBiometriaValidacaoStatus(
    @MessageBody() payload: BiometriaValidacaoStatusPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { requestId, status, mensagem } = payload;
    this.logger.log(
      `[BIOMETRIA_VALIDACAO_STATUS] requestId=${requestId} status=${status} source=agent`,
    );

    const pending = this.pendingBiometriaRequests.get(requestId);
    if (!pending) {
      this.logger.warn(
        `[BIOMETRIA_VALIDACAO_STATUS] Request inexistente ou já finalizada requestId=${requestId}`,
      );
      return;
    }

    // Repassa ao frontend (cliente original)
    this.server.to(pending.clientId).emit(EventType.BIOMETRIA_VALIDACAO_STATUS, {
      requestId,
      status,
      mensagem,
    });

    if (status === 'error') {
      this.logBiometriaValidacaoErro({
        requestId,
        funcionarioId: pending.funcionarioId,
        unidade: pending.unidade,
        dedo: pending.dedo,
        operador: {
          codigo: pending.operadorId,
          nome: pending.operadorNome,
          perfil: pending.operadorPerfil,
        },
        codigoErroSanitizado:
          this.sanitizeAuditErrorCode(mensagem) || 'VALIDACAO_TECNICA_ERRO',
      });
    }
  }

  // =========================================================
  // STATUS BIOMÉTRICO DO FUNCIONÁRIO
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_STATUS_FUNCIONARIO_REQUEST)
  async handleBiometriaStatusFuncionarioRequest(
    @MessageBody() payload: BiometriaStatusFuncionarioRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const requestId = payload.requestId || randomUUID();
    const schedulingId = payload.schedulingId || payload.atendimentoId;

    this.logger.log(`[BIOMETRIA_STATUS_FUNC] Request recebido requestId=${requestId} schedulingId=${schedulingId || '(vazio)'}`);

    let resolvedIdentity: { cpf: string; dataNascimento: string } | null = null;
    if (schedulingId) {
      resolvedIdentity = await this.atendimentoAuthService.resolveIdentityFromScheduling(schedulingId, {
        codigo: payload.operador?.id || 'SISTEMA',
        nome: payload.operador?.nome,
        perfil: payload.operador?.perfil,
      });
      if (resolvedIdentity) {
        payload.funcionario = {
          ...(payload.funcionario || {}),
          cpf: resolvedIdentity.cpf,
          dataNascimento: resolvedIdentity.dataNascimento,
        };
      }
    }

    if (!resolvedIdentity) {
      const result: BiometriaStatusFuncionarioResultPayload = {
        requestId,
        status: 'ERRO_IDENTIDADE_INSUFICIENTE',
        mensagem: 'Nao foi possivel resolver CPF e data de nascimento do agendamento informado.',
      };
      client.emit(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT, result);
      return;
    }

    const cpfRaw = (resolvedIdentity.cpf || '').replace(/\D/g, '');
    const dataNascimentoRaw = resolvedIdentity.dataNascimento || '';

    // Validar CPF
    const cpfValido = this.validarCPF(cpfRaw);
    if (!cpfValido || !dataNascimentoRaw) {
      const result: BiometriaStatusFuncionarioResultPayload = {
        requestId,
        status: 'ERRO_IDENTIDADE_INSUFICIENTE',
        mensagem: 'CPF ou data de nascimento ausentes/inválidos. Não é possível usar biometria.',
      };
      client.emit(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT, result);
      return;
    }

    const cpfHash = crypto.createHash('sha256').update(cpfRaw).digest('hex');
    const dataNascimentoNormalizada = this.normalizarDataNascimento(dataNascimentoRaw);
    const dataNascimentoHash = dataNascimentoNormalizada
      ? crypto.createHash('sha256').update(dataNascimentoNormalizada).digest('hex')
      : null;

    const cpfHashPrefix = cpfHash.slice(0, 16);
    this.logger.log(`[BIOMETRIA_STATUS_FUNC] Buscando cadastro cpfHashPrefix=${cpfHashPrefix}...`);

    const resultado = await this.atendimentoAuthService.checkBiometricEnrollmentStatus(cpfHash, dataNascimentoHash || '');

    // Verificar se o registro criptografado é válido para validação 1:1
    const hasEncryptedTemplate =
      resultado.documento?.templateStorage === 'ENCRYPTED_AES_256_GCM' &&
      Boolean(resultado.documento?.templateEncrypted) &&
      Boolean(resultado.documento?.templateEncryption) &&
      resultado.documento?.templateVersion === 'futronic-ansi-v1';

    const hasValidTemplate = Boolean(resultado.template) || hasEncryptedTemplate;

    if (resultado.status === 'ATIVO' && hasValidTemplate) {
      const dedos = resultado.documento?.funcionarioRefs?.map((ref: any) => ref.dedo as string).filter(Boolean) || [resultado.documento?.dedo];
      const cadastros = await this.atendimentoAuthService.findAllBiometricEnrollments(cpfHash, dataNascimentoHash || '');
      const result: BiometriaStatusFuncionarioResultPayload = {
        requestId,
        status: 'CADASTRO_ATIVO',
        funcionarioId: resultado.documento?.funcionarioId?.toString(),
        dedosDisponiveis: [...new Set(dedos as string[])].filter(Boolean) as string[],
        dedoPadrao: resultado.documento?.dedo,
        cadastros: cadastros.map((cadastro: any) => ({
          dedo: cadastro.dedo || '',
          cadastradoEm: cadastro.cadastradoEm ? new Date(cadastro.cadastradoEm).toISOString() : undefined,
          unidade: cadastro.unidade || undefined,
          operador: {
            id: cadastro.cadastradoPorCodigo || cadastro.metadata?.operadorId || cadastro.cadastradoPor?.toString?.() || undefined,
            nome: cadastro.metadata?.operadorNome || cadastro.metadata?.operador || undefined,
            perfil: cadastro.metadata?.operadorPerfil || undefined,
          },
          agentMachineName: cadastro.agentMachineName || undefined,
          agentIpLocal: cadastro.agentIpLocal || undefined,
          templateVersion: cadastro.templateVersion || undefined,
          status: cadastro.status || undefined,
        })),
        mensagem: 'Biometria cadastrada com sucesso.',
      };
      this.logger.log(`[BIOMETRIA_STATUS_FUNC] CADASTRO_ATIVO encontrado dedo=${resultado.documento?.dedo}`);
      client.emit(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT, result);
    } else if (resultado.status === 'ATIVO' || resultado.status === 'PENDENTE_TEMPLATE_ENGINE') {
      const result: BiometriaStatusFuncionarioResultPayload = {
        requestId,
        status: 'CADASTRO_PENDENTE_TEMPLATE_ENGINE',
        mensagem: 'Cadastro biométrico pendente de template válido. Recadastre a biometria.',
      };
      this.logger.log(`[BIOMETRIA_STATUS_FUNC] CADASTRO_PENDENTE_TEMPLATE_ENGINE`);
      client.emit(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT, result);
    } else {
      const result: BiometriaStatusFuncionarioResultPayload = {
        requestId,
        status: 'SEM_CADASTRO_ATIVO',
        mensagem: 'Este funcionário ainda não possui biometria cadastrada.',
      };
      this.logger.log(`[BIOMETRIA_STATUS_FUNC] SEM_CADASTRO_ATIVO`);
      client.emit(EventType.BIOMETRIA_STATUS_FUNCIONARIO_RESULT, result);
    }
  }

  // =========================================================
  // AGENT STATUS / HEARTBEAT
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_AGENT_STATUS)
  async handleBiometriaAgentStatus(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    let dynamicCompositeKey = this.socketIdToAgentKey.get(client.id);
    const payloadUnidade = payload?.unidade ? String(payload.unidade).trim().toUpperCase() : '';
    const payloadIpLocal = payload?.ipLocal ? this.normalizeIp(String(payload.ipLocal)) : '';

    if (!dynamicCompositeKey && payloadUnidade && payloadIpLocal) {
      dynamicCompositeKey = `${payloadUnidade}:${payloadIpLocal}`;
      this.socketIdToAgentKey.set(client.id, dynamicCompositeKey);
    }

    if (dynamicCompositeKey) {
      let dynamicAgent = this.biometriaAgentsByUnitIp.get(dynamicCompositeKey);
      if (!dynamicAgent) {
        dynamicAgent = {
          socketId: client.id,
          unidade: String(payload.unidade || '').trim().toUpperCase(),
          ipLocal: this.normalizeIp(String(payload.ipLocal || '')),
          machineName: payload.machineName || '',
          conectado: true,
          conectadoEm: new Date(),
          ultimoHeartbeatEm: new Date(),
          ultimoStatusRecebido: payload.estado || payload.estadoLeitor || 'online',
          leitorConectado: payload.leitorConectado === true,
          leitorAberto: payload.leitorAberto === true,
          estadoLeitor: payload.estadoLeitor || payload.estado || 'Desconhecido',
          ambiente: payload.ambiente || '',
          versao: payload.versao || '',
        };
        this.biometriaAgentsByUnitIp.set(dynamicCompositeKey, dynamicAgent);
      }

      dynamicAgent.ultimoHeartbeatEm = new Date();
      dynamicAgent.leitorConectado = payload.leitorConectado === true;
      dynamicAgent.leitorAberto = payload.leitorAberto === true;
      dynamicAgent.estadoLeitor = payload.estadoLeitor || payload.estado || 'Desconhecido';
      dynamicAgent.ultimoStatusRecebido = payload.estado || payload.estadoLeitor || 'online';
      dynamicAgent.machineName = payload.machineName || dynamicAgent.machineName;
      return;
    }

    // Localizar o agent pelo client.id no mapa reverso
    const compositeKey = this.socketIdToAgentKey.get(client.id);
    if (!compositeKey) {
      // Agent não registrado
      return;
    }

    const agent = this.biometriaAgentsByUnitIp.get(compositeKey);
    if (!agent) {
      return;
    }

    // Atualizar heartbeat e status
    agent.ultimoHeartbeatEm = new Date();
    agent.leitorConectado = payload.leitorConectado === true;
    agent.leitorAberto = payload.leitorAberto === true;
    agent.estadoLeitor = payload.estadoLeitor || payload.estado || 'Desconhecido';
    agent.ultimoStatusRecebido = payload.estado || payload.estadoLeitor || 'online';
    agent.machineName = payload.machineName || agent.machineName;

    // Log sanitizado (sem base64, sem template)
    this.logger.debug(
      `[BIOMETRIA_AGENT_STATUS] ${compositeKey} | leitor=${agent.leitorAberto} conectado=${agent.leitorConectado} estado=${agent.estadoLeitor}`,
    );

    // Emitir snapshot para a sala da unidade para atualizar frontends em tempo real
    const snapshot: BiometriaAgentSnapshotPayload = {
      unidade: agent.unidade,
      agentKey: compositeKey,
      online: true,
      leitorAberto: agent.leitorAberto,
      estadoLeitor: agent.estadoLeitor,
      machineName: agent.machineName,
      ipLocal: agent.ipLocal,
      version: agent.versao,
      lastSeen: agent.ultimoHeartbeatEm.toISOString(),
    };
    this.server.to(`${agent.unidade}:BIOMETRIA`).emit(EventType.BIOMETRIA_AGENT_SNAPSHOT, snapshot);
  }

  // =========================================================
  // OUTROS EVENTOS BIOMETRIA (Agent Availability, etc)
  // =========================================================

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_REQUEST)
  async handleBiometriaCapturaRequest(
    @MessageBody() payload: BiometriaCapturaRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.trim().toUpperCase();
    const estacaoId = payload.estacaoId?.trim().toUpperCase();

    // 1. Validar payload mínimo completo
    if (
      !unidade ||
      !payload.sala ||
      !payload.funcionario?.id ||
      !payload.funcionario?.nome ||
      !payload.atendimento?.id ||
      !payload.origem ||
      !payload.solicitadoEm
    ) {
      this.logger.warn(
        `[BIOMETRIA] Request inválido: payload incompleto ou malformado`,
      );
      return;
    }

    const requestId = payload.requestId || new ObjectId().toString();
    const ipUsuario = this.normalizeIp(client.handshake.address);
    const requestedIpLocal = this.normalizeIp((payload as any)?.ipLocal || '');

    // Early write: mesmo padrão do FACIAL — escreve metodo antes da conclusão
    // Evita race condition com auto-release do exame clínico
    this.atendimentoAuthService.registerAuthValidation(
      payload.atendimento.id,
      {
        schedulingId: payload.atendimento.id,
        metodo: 'BIOMETRIA' as const,
        status: 'PENDENTE' as const,
        requestId,
        validadoPor: String(payload.operador?.nome || payload.operador?.id || '').trim() || 'SISTEMA',
      },
    ).catch((err) => {
      this.logger.warn(`[BIOMETRIA] Falha ao registrar AUTENTICACAOATENDIMENTO PENDENTE: ${err.message}`);
    });

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'agent_resolving',
      message: 'Localizando agente biométrico...',
    });

    // Estratégia de Roteamento via Registry (fonte da verdade)
    const resolved = this.resolveAgentTargetRoom(unidade, ipUsuario, requestedIpLocal);
    const agentEncontrado = resolved ? this.biometriaAgentsByUnitIp.get(resolved.compositeKey) : undefined;
    const compositeKey = resolved?.compositeKey || `${unidade}:${requestedIpLocal || ipUsuario}`;

    if (!agentEncontrado) {
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'agent_not_found',
        message: `Nenhum Agente Biométrico online para ${unidade} em ${ipUsuario}.`,
        unidade,
      });
      return;
    }

    if (!agentEncontrado.leitorAberto) {
      this.emitBiometriaRequestState(client, {
        requestId,
        state: 'reader_unavailable',
        message: `Leitor biométrico desconectado ou fechado no Agente.`,
        unidade,
        agentKey: compositeKey,
        leitorAberto: false,
        estadoLeitor: agentEncontrado.estadoLeitor,
      });
      return;
    }

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'agent_found',
      message: `Agente localizado: ${agentEncontrado.machineName || 'WPF Agent'}`,
      unidade,
      agentKey: compositeKey,
      agentSocketId: agentEncontrado.socketId,
    });

    const timeoutRef = setTimeout(() => {
      const pending = this.pendingBiometriaRequests.get(requestId);
      if (pending) {
        this.emitBiometriaRequestState(client, {
          requestId,
          state: 'timeout',
          message: 'Tempo limite de resposta do Agente esgotado (60s).',
          unidade,
        });
        this.cleanupBiometriaRequest(requestId, 'timeout');
      }
    }, 60000); // 60s fallback técnico

    this.pendingBiometriaRequests.set(requestId, {
      requestId,
      clientId: client.id,
      unidade,
      sala: payload.sala,
      estacaoId,
      funcionarioId: payload.funcionario.id,
      atendimentoId: payload.atendimento.id,
      createdAt: new Date(),
      timeoutRef,
      tipo: 'CAPTURA',
      targetRoom: `${unidade}:BIOMETRIA:IP:${agentEncontrado.ipLocal}`,
    });

    this.server.to(agentEncontrado.socketId).emit(EventType.BIOMETRIA_CAPTURA_COMMAND, {
      ...payload,
      requestId,
    });

    this.emitBiometriaRequestState(client, {
      requestId,
      state: 'command_sent',
      message: 'Comando de captura enviado ao hardware.',
      unidade,
    });
  }

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_SUCCESS)
  async handleBiometriaCapturaSuccess(
    @MessageBody() payload: BiometriaCapturaSuccessPayload,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`[BIOMETRIA] Captura Success recebido (reqId: ${payload.requestId})`);

    const pending = this.cleanupBiometriaRequest(payload.requestId, 'captura_success');
    if (pending) {
      this.emitBiometriaRequestState(pending.clientId, {
        requestId: payload.requestId,
        state: 'success',
        message: 'Captura concluída com sucesso!',
        unidade: pending.unidade,
      });
    } else {
      this.logger.debug(`[BIOMETRIA] Captura Success para requestId ${payload.requestId} sem pending (request já resolvido). Ignorado.`);
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_ERROR)
  async handleBiometriaCapturaError(
    @MessageBody() payload: BiometriaCapturaErrorPayload,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.debug(`[BIOMETRIA] Captura Error (reqId: ${payload.requestId}): ${payload.erro}`);

    const resultPayload: BiometriaCapturaResultPayload = {
      requestId: payload.requestId,
      success: false,
      message: payload.erro,
    };

    const pending = this.cleanupBiometriaRequest(payload.requestId, 'captura_error');
    if (pending) {
      this.emitBiometriaRequestState(pending.clientId, {
        requestId: payload.requestId,
        state: 'error',
        message: payload.erro,
        unidade: pending.unidade,
      });
    } else {
      this.logger.debug(`[BIOMETRIA] Captura Error para requestId ${payload.requestId} sem pending. Ignorado.`);
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_STATUS_REQUEST)
  async handleBiometriaStatusRequest(
    @MessageBody() payload: { unidade: string; ipLocal?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.toUpperCase();
    const clientIp = this.normalizeIp(client.handshake.address);
    const requestedIpLocal = this.normalizeIp(payload.ipLocal || '');

    // Reutilizar lógica de resolução para consistência
    const resolved = this.resolveAgentTargetRoom(unidade, clientIp, requestedIpLocal);
    
    const agent = resolved ? this.biometriaAgentsByUnitIp.get(resolved.compositeKey) : undefined;

    const snapshot: BiometriaAgentSnapshotPayload = {
      unidade,
      agentKey: resolved?.compositeKey || `${unidade}:${requestedIpLocal || clientIp}`,
      online: !!agent,
      leitorAberto: agent?.leitorAberto ?? false,
      estadoLeitor: agent?.estadoLeitor || (agent ? 'Aguardando Status...' : 'Offline'),
      machineName: agent?.machineName,
      ipLocal: agent?.ipLocal,
      version: agent?.versao,
      lastSeen: agent?.ultimoHeartbeatEm?.toISOString(),
    };

    client.emit(EventType.BIOMETRIA_AGENT_SNAPSHOT, snapshot);
  }

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_STARTED)
  async handleBiometriaCapturaStarted(
    @MessageBody() payload: BiometriaCapturaStartedPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const pending = this.pendingBiometriaRequests.get(payload.requestId);
    if (pending) {
      this.emitBiometriaRequestState(pending.clientId, {
        requestId: payload.requestId,
        state: 'ready',
        message: payload.mensagem,
        unidade: pending.unidade,
      });
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_STATUS)
  async handleBiometriaCapturaStatusFromAgent(
    @MessageBody() payload: BiometriaCapturaStatusPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const pending = this.pendingBiometriaRequests.get(payload.requestId);
    if (pending) {
      const stateMap: Record<string, BiometriaRequestStatePayload['state']> = {
        aguardando_dedo: 'waiting_finger',
        dedo_detectado: 'finger_detected',
        capturando: 'capturing',
        started: 'ready',
      };

      const newState = stateMap[payload.status] || 'capturing';

      this.emitBiometriaRequestState(pending.clientId, {
        requestId: payload.requestId,
        state: newState,
        message: payload.mensagem,
        unidade: pending.unidade,
        source: 'agent',
      });
    }
  }

  @SubscribeMessage(EventType.BIOMETRIA_CAPTURA_CANCEL)
  async handleBiometriaCapturaCancel(
    @MessageBody() payload: BiometriaCapturaCancelPayload,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload.requestId) return;
    const pending = this.cleanupBiometriaRequest(payload.requestId, 'captura_cancel');
    if (!pending) return;

    this.emitBiometriaRequestState(pending.clientId, {
      requestId: payload.requestId,
      state: 'cancelled',
      message: 'Operação cancelada.',
      unidade: pending.unidade,
    });

    if (pending.targetRoom) {
      this.server.to(pending.targetRoom).emit(EventType.BIOMETRIA_CAPTURA_CANCEL, { requestId: payload.requestId });
    }
  }

  private emitBiometriaRequestState(
    client: Socket | string,
    payload: Partial<BiometriaRequestStatePayload> & { requestId: string; state: BiometriaRequestStatePayload['state'] },
  ) {
    const fullPayload: BiometriaRequestStatePayload = {
      message: 'Atualizando estado...',
      source: 'backend',
      unidade: 'DESCONHECIDA',
      ...payload,
    };

    this.logger.log(
      `[BIOMETRIA_REQUEST_STATE] requestId=${fullPayload.requestId} state=${fullPayload.state} message=${fullPayload.message}`,
    );

    if (typeof client === 'string') {
      this.server.to(client).emit(EventType.BIOMETRIA_REQUEST_STATE, fullPayload);
    } else {
      client.emit(EventType.BIOMETRIA_REQUEST_STATE, fullPayload);
    }
  }

  public emitEvent<T extends EventType>(
    socket: Socket<CustomEventMap>,
    event: T,
    payload: EventPayloadMap[T],
  ) {
    socket.emit(event, ...([payload] as unknown as Parameters<CustomEventMap[T]>));
  }

  public onEvent<T extends EventType>(
    socket: Socket<CustomEventMap>,
    event: T,
    callback: (payload: EventPayloadMap[T]) => void,
  ) {
    socket.on(event, callback as any);
  }

  /**
   * Valida CPF: verifica formato, dígitos repetidos e dígitos verificadores.
   * Recebe CPF já limpo (somente números).
   */
  private validarCPF(cpf: string): boolean {
    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

    // Calcular primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    // Calcular segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  /**
   * Normaliza data de nascimento para formato ISO yyyy-MM-dd.
   * Aceita: "yyyy-MM-dd", "dd/MM/yyyy", "yyyy-MM-ddTHH:mm:ssZ", Date objects.
   * Retorna null se não conseguir normalizar.
   */
  private normalizarDataNascimento(data: string): string | null {
    if (!data) return null;

    // Já está no formato ISO
    const isoMatch = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Formato dd/MM/yyyy
    const brMatch = data.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }

    // Tentar parse como Date
    try {
      const d = new Date(data);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (_) {
      // ignorar
    }

    return null;
  }

  // =========================================================
  // FACIAL - CADASTRO ORCHESTRATOR
  // =========================================================

  @SubscribeMessage(EventType.FACIAL_CADASTRO_REQUEST)
  async handleFacialCadastroRequest(
    @MessageBody() payload: FacialCadastroRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.trim().toUpperCase();
    const requestId = payload.requestId || new ObjectId().toString();
    const schedulingId = payload.schedulingId;
    const estacaoId = payload.estacaoId?.trim().toUpperCase();
    this.logger.log(`FACIAL_CADASTRO_REQUEST_RECEBIDO requestId=${requestId} unidade=${unidade} schedulingId=${schedulingId}`);

    if (!unidade || !payload.sala || !payload.funcionario?.id) {
      this.logger.warn(`[FACIAL_CADASTRO] Request inválido: payload incompleto requestId=${requestId}`);
      return;
    }

    try {
      // Buscar dados do funcionário do scheduling
      const schedulingDoc = await this.mongoService.schedulingsCollection.findOne(
        { _id: new ObjectId(schedulingId) },
        { projection: { NOME: 1, CPFFUNCIONARIO: 1, CODIGOPRONTUARIO: 1 } },
      );

      if (!schedulingDoc) {
        throw new Error(`Scheduling não encontrado: ${schedulingId}`);
      }

      const funcionarioNome = (schedulingDoc as any).NOME || payload.funcionario?.nome || '';
      const cpfRaw = (schedulingDoc as any).CPFFUNCIONARIO || payload.funcionario?.cpf || '';
      const cpfNormalizado = cpfRaw.replace(/\D/g, '');

      if (cpfNormalizado.length !== 11) {
        throw new Error('CPF inválido ou ausente para reconhecimento facial');
      }

      // Iniciar transação no BRy
      const transaction = await this.facialService.iniciarTransacao({
        schedulingId,
        funcionario: {
          nome: funcionarioNome,
          cpf: cpfNormalizado,
          prontuario: (schedulingDoc as any).CODIGOPRONTUARIO,
        },
        termoCienciaUrl: '',
        termoCienciaHash: '',
      });

      // Registrar termo LGPD facial usando o link retornado pela transação
      await this.biometriaLgpdTermoService.registrarTermoPosCadastro({
        schedulingId,
        requestId,
        funcionario: {
          id: payload.funcionario.id,
          nome: funcionarioNome,
          cpf: cpfNormalizado,
          prontuario: (schedulingDoc as any).CODIGOPRONTUARIO || payload.funcionario?.prontuario,
        },
        operador: payload.operador
          ? {
              id: payload.operador.id,
              nome: payload.operador.nome,
              perfil: payload.operador.perfil,
            }
          : undefined,
        unidade,
        dedo: 'FACIAL',
        templateStorage: 'ENCRYPTED_AES_256_GCM',
        templateVersion: 'facial-v1',
        origem: 'FACIAL',
        facial: {
          provider: 'BRY_SIGN',
          sessionId: transaction.sessionId,
          transactionId: transaction.transactionId,
        },
      });

      const timeoutRef = setTimeout(() => {
        const pending = this.pendingFacialRequests.get(requestId);
        if (pending) {
          client.emit(EventType.FACIAL_CADASTRO_STATUS, {
            requestId,
            status: 'erro',
            mensagem: 'Tempo limite de resposta do fluxo facial esgotado.',
          } as FacialCadastroStatusPayload);
          this.cleanupFacialRequest(requestId, 'timeout');
        }
      }, 120000);

      this.pendingFacialRequests.set(requestId, {
        requestId,
        clientId: client.id,
        unidade,
        sala: payload.sala,
        estacaoId,
        funcionarioId: payload.funcionario.id,
        prontuario: (schedulingDoc as any).CODIGOPRONTUARIO || payload.funcionario?.prontuario,
        cpf: cpfNormalizado,
        operadorId: payload.operador?.id,
        operadorNome: payload.operador?.nome,
        operadorPerfil: payload.operador?.perfil,
        schedulingId,
        sessionId: transaction.sessionId,
        transactionId: transaction.transactionId,
        redirectUrl: transaction.redirectUrl,
        createdAt: new Date(),
        timeoutRef,
      });

      // Emitir status: iniciado
      client.emit(EventType.FACIAL_CADASTRO_STATUS, {
        requestId,
        status: 'iniciado',
        mensagem: 'Iniciando fluxo de reconhecimento facial...',
      } as FacialCadastroStatusPayload);

      // Emitir status: aguardando captura
      client.emit(EventType.FACIAL_CADASTRO_STATUS, {
        requestId,
        status: 'aguardando_captura',
        mensagem: 'Preparando captura facial...',
      } as FacialCadastroStatusPayload);

      // Emitir command para o frontend
      client.emit(EventType.FACIAL_CADASTRO_COMMAND, {
        requestId,
        schedulingId,
        sessionId: transaction.sessionId,
        transactionId: transaction.transactionId,
        redirectUrl: transaction.redirectUrl,
        unidade,
        sala: payload.sala,
        operador: payload.operador,
        funcionario: payload.funcionario,
      } as FacialCadastroCommandPayload);

      this.logger.log(`FACIAL_CADASTRO_COMMAND_ENVIADO requestId=${requestId} transactionId=${transaction.transactionId}`);

    } catch (error) {
      this.logger.error(`[FACIAL_CADASTRO] Erro: ${error.message}`, error);
      client.emit(EventType.FACIAL_CADASTRO_STATUS, {
        requestId,
        status: 'erro',
        mensagem: `Erro ao iniciar fluxo facial: ${error.message}`,
      } as FacialCadastroStatusPayload);
    }
  }

  @SubscribeMessage(EventType.FACIAL_CADASTRO_CANCEL)
  async handleFacialCadastroCancel(
    @MessageBody() payload: FacialCadastroCancelPayload,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`FACIAL_CADASTRO_CANCEL_RECEBIDO requestId=${payload.requestId} schedulingId=${payload.schedulingId}`);
    client.emit(EventType.FACIAL_CADASTRO_STATUS, {
      requestId: payload.requestId,
      status: 'cancelado',
      mensagem: 'Fluxo de reconhecimento facial cancelado.',
    } as FacialCadastroStatusPayload);
  }

  // =========================================================
  // FACIAL - VALIDAÇÃO ORCHESTRATOR
  // =========================================================

  @SubscribeMessage(EventType.FACIAL_VALIDACAO_REQUEST)
  async handleFacialValidacaoRequest(
    @MessageBody() payload: FacialValidacaoRequestPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const unidade = payload.unidade?.trim().toUpperCase();
    const requestId = payload.requestId || new ObjectId().toString();
    const schedulingId = payload.schedulingId;
    this.logger.log(`FACIAL_VALIDACAO_REQUEST_RECEBIDO requestId=${requestId} unidade=${unidade} schedulingId=${schedulingId}`);

    if (!unidade || !payload.funcionario?.id) {
      this.logger.warn(`[FACIAL_VALIDACAO] Request inválido: payload incompleto requestId=${requestId}`);
      return;
    }

    try {
      // Buscar dados do funcionário do scheduling
      const schedulingDoc = await this.mongoService.schedulingsCollection.findOne(
        { _id: new ObjectId(schedulingId) },
        { projection: { NOME: 1, CPFFUNCIONARIO: 1, CODIGOPRONTUARIO: 1 } },
      );

      if (!schedulingDoc) {
        throw new Error(`Scheduling não encontrado: ${schedulingId}`);
      }

      const funcionarioNome = (schedulingDoc as any).NOME || payload.funcionario?.nome || '';
      const cpfRaw = (schedulingDoc as any).CPFFUNCIONARIO || payload.funcionario?.cpf || '';
      const cpfNormalizado = cpfRaw.replace(/\D/g, '');

      if (cpfNormalizado.length !== 11) {
        throw new Error('CPF inválido ou ausente para validação facial');
      }

      // Emitir status: aguardando
      client.emit(EventType.FACIAL_VALIDACAO_STATUS, {
        requestId,
        status: 'aguardando_captura',
        mensagem: 'Preparando validação facial...',
      } as FacialValidacaoStatusPayload);

      // Iniciar transação no BRy para validação
      const transaction = await this.facialService.iniciarTransacao({
        schedulingId,
        funcionario: {
          nome: funcionarioNome,
          cpf: cpfNormalizado,
          prontuario: (schedulingDoc as any).CODIGOPRONTUARIO,
        },
        termoCienciaUrl: '',
        termoCienciaHash: '',
      });

      // Emitir command para o frontend
      client.emit(EventType.FACIAL_VALIDACAO_COMMAND, {
        requestId,
        schedulingId,
        sessionId: transaction.sessionId,
        transactionId: transaction.transactionId,
        redirectUrl: transaction.redirectUrl,
      } as FacialValidacaoCommandPayload);

      this.logger.log(`FACIAL_VALIDACAO_COMMAND_ENVIADO requestId=${requestId} transactionId=${transaction.transactionId}`);

    } catch (error) {
      this.logger.error(`[FACIAL_VALIDACAO] Erro: ${error.message}`, error);
      client.emit(EventType.FACIAL_VALIDACAO_STATUS, {
        requestId,
        status: 'erro',
        mensagem: `Erro ao iniciar validação facial: ${error.message}`,
      } as FacialValidacaoStatusPayload);
    }
  }

  @SubscribeMessage(EventType.FACIAL_CADASTRO_RESULT)
  async handleFacialCadastroResult(
    @MessageBody() payload: FacialCadastroResultPayload,
    @ConnectedSocket() client: Socket,
  ) {
    await this.processFacialResult(payload, client);
  }

  @SubscribeMessage(EventType.FACIAL_VALIDACAO_RESULT)
  async handleFacialValidacaoResult(
    @MessageBody() payload: FacialValidacaoResultPayload,
    @ConnectedSocket() client: Socket,
  ) {
    await this.processFacialResult(payload, client);
  }

  // =========================================================
  // TELEATENDIMENTO 1:1
  // =========================================================

  @SubscribeMessage(EventType.TELEATENDIMENTO_JOIN_VIRTUAL_WAITING_ROOM)
  async handleJoinVirtualWaitingRoom(
    @MessageBody() payload: { cpf: string; unidade?: string; sala?: string; exame?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const cpfNormalizado = String(payload.cpf || '').replace(/\D/g, '');
      if (cpfNormalizado.length !== 11) {
        throw new Error('CPF inválido.');
      }

      // Procurar atendimento do dia para este CPF
      const todayBR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());

      const cpfFormatado = cpfNormalizado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

      const agendamentos = await this.mongoService.schedulingsCollection.find({
        $or: [
          { CPFFUNCIONARIO: { $regex: new RegExp(cpfNormalizado) } },
          { CPFFUNCIONARIO: cpfFormatado }
        ],
        DATAAGENDAMENTO: todayBR,
      }).toArray();

      const scheduling = agendamentos[0]; // Pega o primeiro, idealmente seria o mais recente ou o que está na fila

      if (!scheduling) {
        throw new Error('Nenhum agendamento encontrado para este CPF hoje.');
      }

      const schedulingId = scheduling._id.toString();

      this.teleatendimentoService.joinVirtualWaitingRoom(
        cpfNormalizado, 
        client.id, 
        schedulingId, 
        payload.unidade, 
        payload.sala, 
        payload.exame, 
        scheduling.NOME
      );

      client.emit(EventType.TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS, {
        status: 'waiting',
        message: `Identificado com sucesso. Você está na fila para atendimento: ${scheduling.TIPOEXAMENOME || 'Consulta'}`,
        schedulingId,
      });

      this.logger.log(`[VIRTUAL_WAITING_ROOM] Cliente ${client.id} entrou na sala de espera com CPF ${cpfNormalizado}. Unidade: ${payload.unidade}, Sala: ${payload.sala}`);

      if (payload.unidade && payload.sala) {
        const queueRoom = `${payload.unidade}:${payload.sala}:WAITING_QUEUE`;
        this.logger.log(`[QUEUE_DEBUG] Emitindo QUEUE_UPDATE para a sala: ${queueRoom}`);
        const queue = this.teleatendimentoService.getQueueByLocation(payload.unidade, payload.sala, payload.exame);
        this.server.to(queueRoom).emit(EventType.TELEATENDIMENTO_QUEUE_UPDATE, { queue });
      }

    } catch (error) {
      client.emit(EventType.TELEATENDIMENTO_VIRTUAL_WAITING_ROOM_STATUS, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro ao entrar na sala de espera.',
      });
    }
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_SUBSCRIBE_QUEUE)
  async handleTeleatendimentoSubscribeQueue(
    @MessageBody() payload: { unidade: string; sala: string; exame?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`[QUEUE_DEBUG] Profissional ${client.id} se inscrevendo na fila. Payload recebido: ${JSON.stringify(payload)}`);
    if (payload.unidade && payload.sala) {
      const queueRoom = `${payload.unidade}:${payload.sala}:WAITING_QUEUE`;
      await client.join(queueRoom);
      this.logger.log(`[QUEUE_DEBUG] Profissional ${client.id} adicionado a sala ${queueRoom}`);
      const queue = this.teleatendimentoService.getQueueByLocation(payload.unidade, payload.sala, payload.exame);
      client.emit(EventType.TELEATENDIMENTO_QUEUE_UPDATE, { queue });
    } else {
      this.logger.log(`[QUEUE_DEBUG] Profissional ${client.id} NAO TEM unidade e sala definidas!`);
    }
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_CALL_FROM_QUEUE)
  async handleTeleatendimentoCallFromQueue(
    @MessageBody() payload: { schedulingId: string; professionalName: string; unidade: string; sala: string; exame?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const waitingData = this.teleatendimentoService.getWaitingEmployeeBySchedulingId(payload.schedulingId);
      if (!waitingData) {
        throw new Error('Paciente não encontrado na fila virtual.');
      }

      // Mudar o status do Ticket para EM_ATENDIMENTO
      const schedulingDoc = await this.mongoService.schedulingsCollection.findOne({ 
        _id: new ObjectId(payload.schedulingId) 
      });

      if (schedulingDoc && schedulingDoc.TICKET) {
        await this.ticketService.executeAction({
          ticketId: schedulingDoc.TICKET.id,
          action: TicketActionType.ATENDER,
          user: payload.professionalName,
          sala: payload.sala,
          unidade: schedulingDoc.UNIDADEATENDIMENTO || payload.unidade,
        });
      }

      // Criar a sessao no teleatendimentoService
      const sessionResult = this.teleatendimentoService.createSession({
        schedulingId: payload.schedulingId,
        professionalName: payload.professionalName,
        employeeName: waitingData.nomeFuncionario || 'Funcionario',
        unidade: payload.unidade,
        sala: payload.sala,
        exame: payload.exame,
        appOrigin: client.handshake.headers.origin,
      });
      const session = this.teleatendimentoService.getSession(sessionResult.sessionId);

      // Atualizar a session na virtualWaitingRoom para poder notificar depois ou remover da fila
      this.teleatendimentoService.leaveVirtualWaitingRoom(waitingData.cpf);

      // Notificar a fila (remover o paciente)
      if (payload.unidade && payload.sala) {
        const queueRoom = `${payload.unidade}:${payload.sala}:WAITING_QUEUE`;
        const queue = this.teleatendimentoService.getQueueByLocation(payload.unidade, payload.sala, payload.exame);
        this.server.to(queueRoom).emit(EventType.TELEATENDIMENTO_QUEUE_UPDATE, { queue });
      }

      // Avisar o totem para puxar a chamada
      if (waitingData.socketId) {
        this.server.to(waitingData.socketId).emit(EventType.TELEATENDIMENTO_PULL_TO_CALL, {
          sessionId: session.id,
          inviteToken: session.employee.inviteToken,
        });
      }

      // Responder ao profissional com a nova sessao
      client.emit(EventType.TELEATENDIMENTO_SESSION_SYNC, this.buildTeleatendimentoSessionSync(session, 'PROFESSIONAL'));

    } catch (error) {
      this.logger.error(`[CALL_FROM_QUEUE] Erro ao chamar paciente da fila: ${error}`);
      client.emit('error_message', { message: error instanceof Error ? error.message : 'Erro ao chamar paciente.' });
    }
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_JOIN)
  async handleTeleatendimentoJoin(
    @MessageBody() payload: TeleatendimentoJoinPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result =
        payload.role === 'EMPLOYEE'
          ? (payload.inviteToken
              ? this.teleatendimentoService.joinEmployeeByInvite(
                  String(payload.inviteToken || '').trim(),
                  client.id,
                )
              : this.teleatendimentoService.joinEmployee(
                  String(payload.sessionId || '').trim(),
                  client.id,
                ))
          : this.teleatendimentoService.joinProfessional(
              String(payload.sessionId || '').trim(),
              client.id,
            );

      await client.join(result.session.roomId);

      client.emit(
        EventType.TELEATENDIMENTO_SESSION_SYNC,
        this.buildTeleatendimentoSessionSync(result.session, result.role),
      );

      this.server.to(result.session.roomId).emit(
        EventType.TELEATENDIMENTO_CALL_STATUS,
        {
          sessionId: result.session.id,
          status: result.session.status === 'IN_CALL' ? 'joined' : 'waiting',
          role: result.role,
          message:
            result.role === 'PROFESSIONAL'
              ? 'Profissional conectado a videochamada.'
              : 'Funcionario conectado a videochamada.',
        },
      );

      if (result.session && result.session.employee?.inviteToken) {
        const appOrigin = result.session.appOrigin || 'http://127.0.0.1:3000';
        const inviteUrl = `${appOrigin}/teleatendimento/convite/${result.session.employee.inviteToken}`;
        const sessionUnidade = result.session.unidade?.toUpperCase();
        const professionalName = result.session.professional.name;

        // Atualiza o socket TELEATENDIMENTO (fantasma) se existir
        if (this.activeUsersMap.has(client.id)) {
          const userP = this.activeUsersMap.get(client.id)!;
          userP.isTeleatendimentoActive = true;
          userP.inviteUrl = inviteUrl;
        }

        // Propaga inviteUrl para a entrada ATENDIMENTO vinculada
        for (const [, presence] of this.activeUsersMap.entries()) {
          if (
            presence.nome === professionalName &&
            presence.unidade === sessionUnidade &&
            presence.type !== WebsocketType.TELEATENDIMENTO
          ) {
            presence.isTeleatendimentoActive = true;
            presence.inviteUrl = inviteUrl;
          }
        }

        this.broadcastPresence(sessionUnidade);
      }

      this.server.to(result.session.roomId).emit(
        EventType.TELEATENDIMENTO_SESSION_SYNC,
        this.buildTeleatendimentoSessionSync(result.session, result.role),
      );
    } catch (error) {
      client.emit(EventType.TELEATENDIMENTO_CALL_STATUS, {
        sessionId: String(payload.sessionId || ''),
        status: this.isOccupiedError(error) ? 'occupied' : 'error',
        role: payload.role,
        message: error instanceof Error ? error.message : 'Erro na videochamada.',
      });
    }
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_OFFER)
  async handleTeleatendimentoOffer(
    @MessageBody() payload: TeleatendimentoSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    await this.relayTeleatendimentoSignal(
      client,
      EventType.TELEATENDIMENTO_OFFER,
      payload,
    );
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_ANSWER)
  async handleTeleatendimentoAnswer(
    @MessageBody() payload: TeleatendimentoSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    await this.relayTeleatendimentoSignal(
      client,
      EventType.TELEATENDIMENTO_ANSWER,
      payload,
    );
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_ICE_CANDIDATE)
  async handleTeleatendimentoIceCandidate(
    @MessageBody() payload: TeleatendimentoSignalPayload,
    @ConnectedSocket() client: Socket,
  ) {
    await this.relayTeleatendimentoSignal(
      client,
      EventType.TELEATENDIMENTO_ICE_CANDIDATE,
      payload,
    );
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_CHAT_MESSAGE)
  async handleTeleatendimentoChatMessage(
    @MessageBody() payload: TeleatendimentoChatPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.teleatendimentoService.assertSessionParticipant(
      payload.sessionId,
      client.id,
    );
    const recipientSocketId =
      client.id === session.professional.socketId
        ? session.employee.socketId
        : session.professional.socketId;

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit(EventType.TELEATENDIMENTO_CHAT_MESSAGE, payload);
    } else {
      client.to(session.roomId).emit(EventType.TELEATENDIMENTO_CHAT_MESSAGE, payload);
    }
  }

  @SubscribeMessage(EventType.TELEATENDIMENTO_END)
  async handleTeleatendimentoEnd(
    @MessageBody() payload: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.teleatendimentoService.assertSessionParticipant(
      payload.sessionId,
      client.id,
    );
    const ended = this.teleatendimentoService.endSession(session.id);
    this.server.to(ended.roomId).emit(EventType.TELEATENDIMENTO_CALL_STATUS, {
      sessionId: ended.id,
      status: 'ended',
      message: 'Sessao de teleatendimento encerrada.',
    });
    this.server.to(ended.roomId).emit(
      EventType.TELEATENDIMENTO_SESSION_SYNC,
      this.buildTeleatendimentoSessionSync(ended, 'PROFESSIONAL'),
    );
  }

  private async relayTeleatendimentoSignal(
    client: Socket,
    event:
      | EventType.TELEATENDIMENTO_OFFER
      | EventType.TELEATENDIMENTO_ANSWER
      | EventType.TELEATENDIMENTO_ICE_CANDIDATE,
    payload: TeleatendimentoSignalPayload,
  ) {
    const session = this.teleatendimentoService.assertSessionParticipant(
      payload.sessionId,
      client.id,
    );
    const recipientSocketId =
      client.id === session.professional.socketId
        ? session.employee.socketId
        : session.professional.socketId;

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit(event, payload);
    } else {
      client.to(session.roomId).emit(event, payload);
    }
  }

  private buildTeleatendimentoSessionSync(
    session: {
      id: string;
      roomId: string;
      status: 'WAITING_EMPLOYEE' | 'IN_CALL' | 'ENDED' | 'EXPIRED';
      professional: { name: string; socketId?: string | null };
      employee: { name: string; socketId?: string | null };
      schedulingId?: string;
      unidade?: string;
      sala?: string;
      exame?: string;
    },
    role: 'PROFESSIONAL' | 'EMPLOYEE',
  ) {
    return {
      sessionId: session.id,
      roomId: session.roomId,
      role,
      status: session.status,
      schedulingId: session.schedulingId,
      unidade: session.unidade,
      sala: session.sala,
      exame: session.exame,
      professional: {
        name: session.professional.name,
        connected: !!session.professional.socketId,
      },
      employee: {
        name: session.employee.name,
        connected: !!session.employee.socketId,
      },
    };
  }

  private isOccupiedError(error: unknown) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error || '');
    return message.includes('ocupada');
  }
}
