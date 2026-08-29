import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sanitizeAuditDetails } from './audit-log.sanitizer';
import { UserActivityLogEntry } from './audit-log.types';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        '[AuditLogService] SUPABASE_KEY está ausente ou vazia. ' +
          'O serviço não pode ser inicializado sem credencial válida.',
      );
    }

    if (!supabaseUrl) {
      throw new Error(
        '[AuditLogService] SUPABASE_URL está ausente ou vazia. ' +
          'O serviço não pode ser inicializado sem URL válida.',
      );
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /**
   * Persiste uma entrada de log de atividade do usuário na tabela `user_activity_logs`.
   *
   * Semântica Fire-and-Forget:
   * - Retorna `void` imediatamente (não `Promise<void>`)
   * - Não pode ser aguardado pelo caller
   * - Nenhuma exceção interna propaga para o caller
   * - Erros são capturados e logados internamente em nível `error`
   */
  logUserAction(entry: UserActivityLogEntry): void {
    (async () => {
      const sanitizedDetalhes = entry.detalhes
        ? sanitizeAuditDetails(entry.detalhes)
        : null;

      const detalhesParaInserir =
        sanitizedDetalhes !== null &&
        typeof sanitizedDetalhes === 'object' &&
        !Array.isArray(sanitizedDetalhes) &&
        Object.keys(sanitizedDetalhes).length === 0
          ? {}
          : sanitizedDetalhes;

      const record = {
        user_codigo: entry.user?.codigo ?? 'SISTEMA',
        user_nome: entry.user?.nome ?? null,
        user_perfil: entry.user?.perfil ?? null,
        acao: entry.acao,
        recurso_id: entry.recursoId ?? null,
        recurso_tipo: entry.recursoTipo ?? null,
        paciente_codigo: entry.pacienteCodigo ?? null,
        paciente_nome: entry.pacienteNome ?? null,
        unidade: entry.unidade ?? null,
        detalhes: detalhesParaInserir,
        ip: entry.ip ?? null,
        user_agent: entry.userAgent ?? null,
        request_id: entry.requestId ?? null,
      };

      const { error } = await this.supabase
        .from('user_activity_logs')
        .insert(record);

      if (error) {
        this.logger.error(
          `[AuditLogService] Erro ao inserir log de atividade: ${error.message}`,
          { code: error.code, details: error.details, hint: error.hint },
        );
      }
    })().catch((err: unknown) => {
      this.logger.error(
        `[AuditLogService] Exceção inesperada ao persistir log de atividade: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
}
