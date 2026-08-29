import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import {
  CreateTeleatendimentoSessionInput,
  CreateTeleatendimentoSessionResult,
  TeleatendimentoParticipantRole,
  TeleatendimentoSession,
  TeleatendimentoSessionStatus,
  TeleatendimentoSessionView,
  TeleatendimentoSocketDetachResult,
  TeleatendimentoSocketJoinResult,
} from './teleatendimento.types';

@Injectable()
export class TeleatendimentoService {
  private readonly logger = new Logger(TeleatendimentoService.name);
  private readonly sessions = new Map<string, TeleatendimentoSession>();
  private readonly inviteTokens = new Map<string, string>();
  private readonly socketIndex = new Map<
    string,
    { sessionId: string; role: TeleatendimentoParticipantRole }
  >();

  // Map<cpfNormalizado, { socketId: string, schedulingId?: string, joinedAt: string, unidade?: string, sala?: string, exame?: string, nomeFuncionario?: string }>
  private readonly virtualWaitingRoom = new Map<
    string,
    { socketId: string; schedulingId?: string; joinedAt: string; unidade?: string; sala?: string; exame?: string; nomeFuncionario?: string }
  >();

  createSession(
    input: CreateTeleatendimentoSessionInput,
  ): CreateTeleatendimentoSessionResult {
    if (!String(input.schedulingId || '').trim()) {
      throw new BadRequestException('schedulingId e obrigatorio.');
    }

    if (!String(input.professionalName || '').trim()) {
      throw new BadRequestException('professionalName e obrigatorio.');
    }

    if (!String(input.employeeName || '').trim()) {
      throw new BadRequestException('employeeName e obrigatorio.');
    }

    const sessionId = randomUUID();
    const inviteToken = this.createOpaqueInviteToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const roomId = this.buildRoomId(sessionId);
    const appOrigin = this.resolveAppOrigin(input.appOrigin);

    const session: TeleatendimentoSession = {
      id: sessionId,
      roomId,
      appOrigin,
      schedulingId: String(input.schedulingId).trim(),
      unidade: this.cleanOptional(input.unidade),
      sala: this.cleanOptional(input.sala),
      exame: this.cleanOptional(input.exame),
      status: 'WAITING_EMPLOYEE',
      professional: {
        id: this.cleanOptional(input.professionalId),
        name: String(input.professionalName).trim(),
        socketId: null,
      },
      employee: {
        id: this.cleanOptional(input.employeeId),
        name: String(input.employeeName).trim(),
        companyCode: this.cleanOptional(input.companyCode),
        prontuarioCode: this.cleanOptional(input.prontuarioCode),
        examType: this.cleanOptional(input.examType),
        inviteToken,
        socketId: null,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      endedAt: null,
    };

    this.sessions.set(sessionId, session);
    this.inviteTokens.set(inviteToken, sessionId);

    const inviteUrl = `${appOrigin}/teleatendimento/convite/${inviteToken}`;
    const professionalUrl = `${appOrigin}/atendimento/videochamada/${sessionId}`;

    this.logger.log(
      `[TELEATENDIMENTO] Sessao criada sessionId=${sessionId} schedulingId=${session.schedulingId}`,
    );

    return {
      sessionId,
      roomId,
      inviteToken,
      inviteUrl,
      professionalUrl,
      expiresAt: session.expiresAt,
    };
  }

  getSessionForProfessional(sessionId: string): TeleatendimentoSessionView {
    const session = this.getActiveSession(sessionId);
    return this.toView(session, true);
  }

  getInviteDetails(inviteToken: string): TeleatendimentoSessionView {
    const sessionId = this.inviteTokens.get(String(inviteToken || '').trim());
    if (!sessionId) {
      throw new NotFoundException('Convite de teleatendimento nao encontrado.');
    }

    return this.toView(this.getActiveSession(sessionId));
  }

  endSession(sessionId: string): TeleatendimentoSession {
    const session = this.getSession(sessionId);
    const now = new Date().toISOString();

    session.status = 'ENDED';
    session.endedAt = now;
    session.updatedAt = now;

    if (session.professional.socketId) {
      this.socketIndex.delete(session.professional.socketId);
      session.professional.socketId = null;
    }

    if (session.employee.socketId) {
      this.socketIndex.delete(session.employee.socketId);
      session.employee.socketId = null;
    }

    return session;
  }

  joinProfessional(
    sessionId: string,
    socketId: string,
  ): TeleatendimentoSocketJoinResult {
    const session = this.getActiveSession(sessionId);
    this.detachSocket(socketId);

    if (
      session.professional.socketId &&
      session.professional.socketId !== socketId
    ) {
      this.socketIndex.delete(session.professional.socketId);
    }

    session.professional.socketId = socketId;
    session.updatedAt = new Date().toISOString();
    session.status = this.computeStatus(session);
    this.socketIndex.set(socketId, {
      sessionId: session.id,
      role: 'PROFESSIONAL',
    });

    return { session, role: 'PROFESSIONAL' };
  }

  joinEmployee(
    sessionId: string,
    socketId: string,
  ): TeleatendimentoSocketJoinResult {
    const session = this.getActiveSession(sessionId);
    this.detachSocket(socketId);

    if (
      session.employee.socketId &&
      session.employee.socketId !== socketId
    ) {
      this.socketIndex.delete(session.employee.socketId);
    }

    session.employee.socketId = socketId;
    session.updatedAt = new Date().toISOString();
    session.status = this.computeStatus(session);
    this.socketIndex.set(socketId, {
      sessionId: session.id,
      role: 'EMPLOYEE',
    });

    return { session, role: 'EMPLOYEE' };
  }

  joinEmployeeByInvite(
    inviteToken: string,
    socketId: string,
  ): TeleatendimentoSocketJoinResult {
    const sessionId = this.inviteTokens.get(String(inviteToken || '').trim());
    if (!sessionId) {
      throw new NotFoundException('Convite de teleatendimento nao encontrado.');
    }

    const session = this.getActiveSession(sessionId);
    this.detachSocket(socketId);

    if (
      session.employee.socketId &&
      session.employee.socketId !== socketId
    ) {
      throw new ConflictException('Esta sessao de teleatendimento esta ocupada.');
    }

    session.employee.socketId = socketId;
    session.updatedAt = new Date().toISOString();
    session.status = this.computeStatus(session);
    this.socketIndex.set(socketId, {
      sessionId: session.id,
      role: 'EMPLOYEE',
    });

    return { session, role: 'EMPLOYEE' };
  }

  detachSocket(socketId: string): TeleatendimentoSocketDetachResult | null {
    const current = this.socketIndex.get(socketId);
    if (!current) return null;

    const session = this.sessions.get(current.sessionId);
    this.socketIndex.delete(socketId);
    if (!session) return null;

    if (current.role === 'PROFESSIONAL') {
      session.professional.socketId = null;
    } else {
      session.employee.socketId = null;
    }

    session.updatedAt = new Date().toISOString();
    if (session.status !== 'ENDED' && session.status !== 'EXPIRED') {
      session.status = this.computeStatus(session);
    }

    // Remove from waiting room just in case
    this.leaveVirtualWaitingRoom(socketId);

    return { session, role: current.role };
  }

  assertSessionParticipant(sessionId: string, socketId: string) {
    const session = this.getActiveSession(sessionId);
    if (
      session.professional.socketId !== socketId &&
      session.employee.socketId !== socketId
    ) {
      throw new ConflictException(
        'Socket nao pertence a esta sessao de teleatendimento.',
      );
    }

    return session;
  }

  // =========================================================
  // VIRTUAL WAITING ROOM (TOTEM)
  // =========================================================

  joinVirtualWaitingRoom(cpf: string, socketId: string, schedulingId?: string, unidade?: string, sala?: string, exame?: string, nomeFuncionario?: string) {
    const normalizedCpf = String(cpf || '').replace(/\D/g, '');
    if (!normalizedCpf) {
      throw new BadRequestException('CPF e obrigatorio para a sala de espera.');
    }

    // Remover socketId antigo, se existir (evitar vazamento se o mesmo CPF reconectar)
    for (const [key, value] of this.virtualWaitingRoom.entries()) {
      if (value.socketId === socketId) {
        this.virtualWaitingRoom.delete(key);
      }
    }

    this.virtualWaitingRoom.set(normalizedCpf, {
      socketId,
      schedulingId,
      unidade,
      sala,
      exame,
      nomeFuncionario,
      joinedAt: new Date().toISOString(),
    });

    this.logger.log(`[VIRTUAL_WAITING_ROOM] CPF ${normalizedCpf.slice(0,3)}*** entrou na fila. socket=${socketId}`);
    return normalizedCpf;
  }

  leaveVirtualWaitingRoom(socketId: string) {
    for (const [cpf, data] of this.virtualWaitingRoom.entries()) {
      if (data.socketId === socketId) {
        this.virtualWaitingRoom.delete(cpf);
        this.logger.log(`[VIRTUAL_WAITING_ROOM] CPF ${cpf.slice(0,3)}*** saiu da fila. socket=${socketId}`);
        return cpf;
      }
    }
    return null;
  }

  getWaitingEmployeeByCpf(cpf: string) {
    const normalizedCpf = String(cpf || '').replace(/\D/g, '');
    return this.virtualWaitingRoom.get(normalizedCpf);
  }

  getWaitingEmployeeBySchedulingId(schedulingId: string) {
    for (const [cpf, data] of this.virtualWaitingRoom.entries()) {
      if (data.schedulingId === schedulingId) {
        return { cpf, ...data };
      }
    }
    return null;
  }

  getQueueByLocation(unidade: string, sala: string, exame?: string) {
    const queue: any[] = [];
    this.logger.log(`[QUEUE_DEBUG] Buscando fila para unidade="${unidade}", sala="${sala}". Total na sala virtual: ${this.virtualWaitingRoom.size}`);
    for (const [cpf, data] of this.virtualWaitingRoom.entries()) {
      this.logger.log(`[QUEUE_DEBUG] Avaliando paciente CPF ${cpf.slice(0,3)}***: unidade="${data.unidade}", sala="${data.sala}"`);
      if (data.unidade === unidade && data.sala === sala) {
        queue.push({ cpf, ...data });
      }
    }
    this.logger.log(`[QUEUE_DEBUG] Encontrados ${queue.length} pacientes na fila.`);
    return queue.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }

  private toView(
    session: TeleatendimentoSession,
    includeProfessionalLinks = false,
  ): TeleatendimentoSessionView {
    const appOrigin = session.appOrigin || this.resolveAppOrigin();

    return {
      sessionId: session.id,
      roomId: session.roomId,
      schedulingId: session.schedulingId,
      unidade: session.unidade,
      sala: session.sala,
      exame: session.exame,
      status: session.status,
      inviteUrl: includeProfessionalLinks
        ? `${appOrigin}/teleatendimento/convite/${session.employee.inviteToken}`
        : undefined,
      professionalUrl: includeProfessionalLinks
        ? `${appOrigin}/atendimento/videochamada/${session.id}`
        : undefined,
      professional: {
        id: session.professional.id,
        name: session.professional.name,
        connected: !!session.professional.socketId,
      },
      employee: {
        id: session.employee.id,
        name: session.employee.name,
        companyCode: session.employee.companyCode,
        prontuarioCode: session.employee.prontuarioCode,
        examType: session.employee.examType,
        connected: !!session.employee.socketId,
      },
      expiresAt: session.expiresAt,
      endedAt: session.endedAt,
    };
  }

  public getSession(sessionId: string): TeleatendimentoSession {
    const session = this.sessions.get(String(sessionId || '').trim());
    if (!session) {
      throw new NotFoundException('Sessao de teleatendimento nao encontrada.');
    }

    return session;
  }

  private getActiveSession(sessionId: string): TeleatendimentoSession {
    const session = this.getSession(sessionId);
    this.expireIfNeeded(session);

    if (session.status === 'ENDED') {
      throw new ConflictException('A sessao de teleatendimento foi encerrada.');
    }

    if (session.status === 'EXPIRED') {
      throw new ConflictException('A sessao de teleatendimento expirou.');
    }

    return session;
  }

  private expireIfNeeded(session: TeleatendimentoSession) {
    if (session.status === 'ENDED' || session.status === 'EXPIRED') return;

    const expiresAt = new Date(session.expiresAt).getTime();
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      session.status = 'EXPIRED';
      session.updatedAt = new Date().toISOString();

      if (session.professional.socketId) {
        this.socketIndex.delete(session.professional.socketId);
        session.professional.socketId = null;
      }

      if (session.employee.socketId) {
        this.socketIndex.delete(session.employee.socketId);
        session.employee.socketId = null;
      }
    }
  }

  private computeStatus(
    session: TeleatendimentoSession,
  ): TeleatendimentoSessionStatus {
    if (session.professional.socketId && session.employee.socketId) {
      return 'IN_CALL';
    }

    return 'WAITING_EMPLOYEE';
  }

  private resolveAppOrigin(appOrigin?: string): string {
    const raw = String(
      process.env.NEXT_PUBLIC_WEB_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_BASE_URL ||
        appOrigin ||
        'http://127.0.0.1:3000',
    ).trim();

    return raw.replace(/\/+$/, '');
  }

  private buildRoomId(sessionId: string) {
    return `teleatendimento:${sessionId}`;
  }

  private cleanOptional(value?: string) {
    const trimmed = String(value || '').trim();
    return trimmed ? trimmed : undefined;
  }

  private createOpaqueInviteToken() {
    return randomBytes(18).toString('base64url');
  }
}
