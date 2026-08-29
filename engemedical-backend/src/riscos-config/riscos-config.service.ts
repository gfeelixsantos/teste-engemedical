import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IRiscoConfigResponse, IRiscoConfigCreate, IRiscoConfigUpdate, GRUPOS_RISCOS } from './riscos-config.interface';

const PERIGO_FIELDS = [
  'perigo_nome', 'perigo_tipo_exposicao', 'perigo_fonte_geradora',
  'perigo_trajetoria_acao', 'perigo_tecnica_utilizada', 'perigo_possiveis_danos',
  'perigo_medidas_administrativas', 'perigo_epc_eficaz', 'perigo_epc_descricao',
  'perigo_epi_eficaz', 'perigo_epi_descricao', 'perigo_acoes_necessarias',
  'perigo_criterio_monitoracao', 'perigo_observacao',
] as const;

@Injectable()
export class RiscosConfigService {
  private readonly logger = new Logger(RiscosConfigService.name);
  private readonly table = 'riscos_config';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findAll(apenasAtivos = false): Promise<IRiscoConfigResponse[]> {
    try {
      let query = this.client.from(this.table).select('*');
      if (apenasAtivos) query = query.eq('ativo', true);
      const { data, error } = await query.order('tipo');

      if (error) {
        this.logger.error('Erro ao buscar riscos config (Supabase)', error);
        return [];
      }
      return data || [];
    } catch (e) {
      this.logger.error('Falha de rede ao buscar riscos_config no Supabase:', e);
      return [];
    }
  }

  async findById(id: string): Promise<IRiscoConfigResponse> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new NotFoundException('Configuração de risco não encontrada');
      }
      return data;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      this.logger.error(`Falha de rede ao buscar riscos_config ${id}:`, e);
      throw new NotFoundException('Configuração de risco não encontrada');
    }
  }

  async create(
    input: IRiscoConfigCreate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IRiscoConfigResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem criar configurações de risco');
    }

    if (!input.descricao?.trim()) {
      throw new BadRequestException('Descrição é obrigatória');
    }
    if (!input.codigos?.length) {
      throw new BadRequestException('Ao menos um código deve ser informado');
    }
    if (!input.grupo) {
      throw new BadRequestException('Grupo é obrigatório');
    }
    if (!GRUPOS_RISCOS.includes(input.grupo as any)) {
      throw new BadRequestException(`Grupo inválido. Valores aceitos: ${GRUPOS_RISCOS.join(', ')}`);
    }

    const payload: Record<string, any> = {
      tipo: input.tipo?.trim().toUpperCase() || null,
      descricao: input.descricao.trim(),
      codigos: input.codigos,
      grupo: input.grupo,
      parecer_opcoes: input.parecer_opcoes?.map(o => o.trim().toUpperCase()).filter(Boolean) || null,
      observacao: input.observacao?.trim() || null,
    };

    // Perigo integrado
    for (const field of PERIGO_FIELDS) {
      const value = input[field as keyof IRiscoConfigCreate];
      if (value !== undefined) {
        payload[field] = typeof value === 'string' ? value.trim() || null : value ?? null;
      }
    }

    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Já existe uma configuração com este tipo');
      }
      this.logger.error('Erro ao criar configuração de risco', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'CRIAR_RISCO_CONFIG',
      recursoTipo: 'riscos_config',
      recursoId: data.id,
      detalhes: { tipo: data.tipo, descricao: data.descricao, grupo: data.grupo },
      requestId,
    });

    return data;
  }

  async update(
    id: string,
    input: IRiscoConfigUpdate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IRiscoConfigResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem editar configurações de risco');
    }

    const existing = await this.findById(id);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.tipo !== undefined) payload.tipo = input.tipo.trim().toUpperCase() || null;
    if (input.descricao !== undefined) payload.descricao = input.descricao.trim();
    if (input.codigos !== undefined) payload.codigos = input.codigos;
    if (input.ativo !== undefined) payload.ativo = input.ativo;
    if (input.grupo !== undefined) {
      if (!GRUPOS_RISCOS.includes(input.grupo as any)) {
        throw new BadRequestException(`Grupo inválido. Valores aceitos: ${GRUPOS_RISCOS.join(', ')}`);
      }
      payload.grupo = input.grupo;
    }
    if (input.parecer_opcoes !== undefined) payload.parecer_opcoes = input.parecer_opcoes.map(o => o.trim().toUpperCase()).filter(Boolean);
    if (input.observacao !== undefined) payload.observacao = input.observacao?.trim() || null;

    // Perigo integrado
    for (const field of PERIGO_FIELDS) {
      if (input[field as keyof IRiscoConfigUpdate] !== undefined) {
        const value = input[field as keyof IRiscoConfigUpdate];
        payload[field] = typeof value === 'string' ? value.trim() || null : value ?? null;
      }
    }

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Configuração de risco não encontrada');
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EDITAR_RISCO_CONFIG',
      recursoTipo: 'riscos_config',
      recursoId: id,
      detalhes: { tipoAntigo: existing.tipo, tipoNovo: data.tipo, alteracoes: Object.keys(payload) },
      requestId,
    });

    return data;
  }

  /**
   * Cria automaticamente uma configuração de risco no Supabase (sem validação de usuário/audit).
   * Usado pelo serviço SOC para popular riscos_config com resoluções bem-sucedidas.
   */
  async autoCreate(codigo: string, grupo: string, descricao: string): Promise<void> {
    try {
      const { data: existing } = await this.client
        .from(this.table)
        .select('id')
        .contains('codigos', [codigo])
        .limit(1);

      if (existing && existing.length > 0) return;

      const { error } = await this.client
        .from(this.table)
        .insert({
          tipo: null,
          descricao: descricao.trim(),
          codigos: [codigo],
          grupo: grupo.trim().toUpperCase(),
          ativo: true,
        });

      if (error) {
        if (error.code === '23505') return;
        this.logger.warn(`[autoCreate] Erro ao inserir código ${codigo}: ${error.message}`);
      }
    } catch (e) {
      this.logger.warn(`[autoCreate] Falha de rede ao inserir código ${codigo}:`, e?.message);
    }
  }

  async remove(
    id: string,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<{ success: boolean }> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem inativar configurações de risco');
    }

    const existing = await this.findById(id);

    const { error } = await this.client
      .from(this.table)
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Erro ao inativar configuração de risco', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_RISCO_CONFIG',
      recursoTipo: 'riscos_config',
      recursoId: id,
      detalhes: { tipo: existing.tipo, descricao: existing.descricao },
      requestId,
    });

    return { success: true };
  }
}
