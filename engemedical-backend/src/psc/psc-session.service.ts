import { Injectable, Logger } from '@nestjs/common';
import {
  PscSessionRepository,
  IPscSession,
} from '../repositories/psc-session.repository';
import { DateTime } from 'luxon';

@Injectable()
export class PscSessionService {
  private readonly logger = new Logger(PscSessionService.name);

  constructor(private readonly pscSessionRepository: PscSessionRepository) {}

  async saveSession(
    user: {
      codigo: string;
      cpf?: string;
      nome?: string;
      perfil?: string;
      conselho?: string;
      ufconselho?: string;
    },
    pscName: string,
    signatureSession: string,
    state: string,
    expiresIn: number,
    integraUrl: string = 'https://integra.bry.com.br/api/service',
  ): Promise<IPscSession> {
    const expiresAt = DateTime.now().plus({ seconds: expiresIn }).toISO();

    if (!expiresAt) {
      throw new Error('Failed to calculate expiration date');
    }

    const session: IPscSession = {
      user_codigo: user.codigo,
      user_cpf: user.cpf,
      user_nome: user.nome,
      user_perfil: user.perfil,
      conselho: user.conselho,
      ufconselho: user.ufconselho,
      state,
      psc_name: pscName,
      signature_session: signatureSession,
      integra_url: integraUrl,
      is_authorized: false,
      expires_in: expiresIn,
      expires_at: expiresAt,
    };

    return this.pscSessionRepository.createOrReplaceSession(session);
  }

  async getSessionByState(state: string): Promise<IPscSession | null> {
    return this.pscSessionRepository.findByState(state);
  }

  async authorizeSessionByState(state: string): Promise<void> {
    await this.pscSessionRepository.authorizeByState(state);
  }

  async getValidToken(userCodigo: string): Promise<string | null> {
    const session =
      await this.pscSessionRepository.findValidAuthorizedSessionByUserCodigo(
        userCodigo,
      );

    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      await this.invalidateSession(
        userCodigo,
        'Session expired during validation',
      );
      return null;
    }

    return session.signature_session;
  }

  async invalidateSession(userCodigo: string, reason: string): Promise<void> {
    await this.pscSessionRepository.invalidateByUserCodigo(userCodigo, reason);
  }

  async markConsumed(id: string): Promise<void> {
    await this.pscSessionRepository.markConsumed(id);
  }

  private isExpired(session: IPscSession): boolean {
    const expiresAt = DateTime.fromISO(session.expires_at);
    return expiresAt < DateTime.now();
  }
}
