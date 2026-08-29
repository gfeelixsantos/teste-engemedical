import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IGrupoResponse, IGrupoCreate, IGrupoUpdate } from './grupos.interface';

@Injectable()
export class GruposService {
  private readonly logger = new Logger(GruposService.name);
  private readonly table = 'grupos';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findAll(apenasAtivos = false): Promise<IGrupoResponse[]> {
    let query = this.client.from(this.table).select('*');
    if (apenasAtivos) query = query.eq('ativo', true);
    const { data, error } = await query.order('nome');

    if (error) {
      this.logger.error('Erro ao buscar grupos', error);
      throw error;
    }
    return data || [];
  }

  async findById(id: string): Promise<IGrupoResponse> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Grupo não encontrado');
    }
    return data;
  }

  async create(
    input: IGrupoCreate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IGrupoResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem criar grupos');
    }

    if (!input.nome?.trim()) {
      throw new BadRequestException('Nome do grupo é obrigatório');
    }

    const { data, error } = await this.client
      .from(this.table)
      .insert({ nome: input.nome.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Já existe um grupo com este nome');
      }
      this.logger.error('Erro ao criar grupo', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'CRIAR_GRUPO',
      recursoTipo: 'grupos',
      recursoId: data.id,
      detalhes: { nome: data.nome },
      requestId,
    });

    return data;
  }

  async update(
    id: string,
    input: IGrupoUpdate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IGrupoResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem editar grupos');
    }

    const existing = await this.findById(id);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.nome !== undefined) payload.nome = input.nome.trim();
    if (input.ativo !== undefined) payload.ativo = input.ativo;

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Grupo não encontrado');
    }

    if (input.nome !== undefined && input.nome.trim() !== existing.nome) {
      await this.client
        .from('exames')
        .update({ grupo: input.nome.trim(), updated_at: new Date().toISOString() })
        .eq('grupo', existing.nome);

      const { invalidateCache } = await import('../exames/exames.provider');
      invalidateCache();
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EDITAR_GRUPO',
      recursoTipo: 'grupos',
      recursoId: id,
      detalhes: { nomeAntigo: existing.nome, nomeNovo: data.nome, alteracoes: Object.keys(payload) },
      requestId,
    });

    return data;
  }

  async remove(
    id: string,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<{ success: boolean }> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem inativar grupos');
    }

    const existing = await this.findById(id);

    const { error } = await this.client
      .from(this.table)
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Erro ao inativar grupo', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_GRUPO',
      recursoTipo: 'grupos',
      recursoId: id,
      detalhes: { nome: existing.nome },
      requestId,
    });

    return { success: true };
  }
}
