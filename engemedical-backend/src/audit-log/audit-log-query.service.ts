import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuditLogQueryDto, AuditLogRecord, AuditResponseDto } from './audit-log.dto';
import { sanitizeAuditDetails } from './audit-log.sanitizer';

@Injectable()
export class AuditLogQueryService {
  private readonly logger = new Logger(AuditLogQueryService.name);
  private readonly supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error('[AuditLogQueryService] SUPABASE_URL or SUPABASE_KEY missing');
    }
    this.supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async findAll(query: AuditLogQueryDto): Promise<AuditResponseDto> {
    const { dataInicio, dataFim } = this.resolveInterval(query);
    const effectiveLimit = Math.min(query.limit ?? 50, 100);
    const page = query.page ?? 1;
    const offset = (page - 1) * effectiveLimit;

    try {
      let q = this.supabase
        .from('user_activity_logs')
        .select('id, user_codigo, user_nome, user_perfil, acao, recurso_id, recurso_tipo, paciente_codigo, paciente_nome, unidade, detalhes, ip, user_agent, request_id, created_at', { count: 'exact' })
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim)
        .order('created_at', { ascending: false })
        .range(offset, offset + effectiveLimit - 1);

      // Apply optional exact-match filters
      if (query.userCodigo) q = q.eq('user_codigo', query.userCodigo);
      if (query.userPerfil) q = q.eq('user_perfil', query.userPerfil);
      if (query.acao) q = q.eq('acao', query.acao);
      if (query.recursoTipo) q = q.eq('recurso_tipo', query.recursoTipo);
      if (query.recursoId) q = q.eq('recurso_id', query.recursoId);
      if (query.pacienteCodigo) q = q.eq('paciente_codigo', query.pacienteCodigo);
      if (query.unidade) q = q.eq('unidade', query.unidade);
      if (query.requestId) q = q.eq('request_id', query.requestId);

      const { data, error, count } = await q;

      if (error) {
        this.logger.error(`[AuditLogQueryService] Supabase error: ${error.message}`);
        throw new InternalServerErrorException('Erro interno ao consultar logs de auditoria');
      }

      const total = count ?? 0;
      const sanitizedData: AuditLogRecord[] = (data ?? []).map((row: any) => ({
        id: row.id,
        user_codigo: row.user_codigo ?? null,
        user_nome: row.user_nome ?? null,
        user_perfil: row.user_perfil ?? null,
        acao: row.acao,
        recurso_id: row.recurso_id ?? null,
        recurso_tipo: row.recurso_tipo ?? null,
        paciente_codigo: row.paciente_codigo ?? null,
        paciente_nome: row.paciente_nome ?? null,
        unidade: row.unidade ?? null,
        detalhes: row.detalhes ? (sanitizeAuditDetails(row.detalhes) as Record<string, unknown>) : null,
        ip: row.ip ?? null,
        user_agent: row.user_agent ?? null,
        request_id: row.request_id ?? null,
        created_at: row.created_at,
      }));

      return {
        data: sanitizedData,
        pagination: {
          page,
          limit: effectiveLimit,
          total,
          totalPages: Math.ceil(total / effectiveLimit),
        },
        filters: { dataInicio, dataFim },
      };
    } catch (err) {
      if (err instanceof InternalServerErrorException || err instanceof BadRequestException) throw err;
      this.logger.error(`[AuditLogQueryService] Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      throw new InternalServerErrorException('Erro interno ao consultar logs de auditoria');
    }
  }

  private resolveInterval(query: AuditLogQueryDto): { dataInicio: string; dataFim: string } {
    const { dataInicio, dataFim } = query;

    // Both must be provided together or neither
    if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
      throw new BadRequestException('dataInicio e dataFim devem ser fornecidos juntos ou nenhum');
    }

    if (!dataInicio || !dataFim) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { dataInicio: sevenDaysAgo.toISOString(), dataFim: now.toISOString() };
    }

     const start = new Date(dataInicio);
    const end = new Date(dataFim);

    if (start > end) {
      throw new BadRequestException('dataInicio não pode ser posterior a dataFim');
    }

    // Ajustar dataFim para o final do dia (23:59:59.999) para incluir todos os registros do dia
    const endInclusive = new Date(end);
    endInclusive.setUTCHours(23, 59, 59, 999);

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      throw new BadRequestException('O período máximo de consulta é de 90 dias');
    }

    return { dataInicio: start.toISOString(), dataFim: endInclusive.toISOString() };
  }
}
