import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IPrestadorResponse, IPrestadorCreate, IPrestadorUpdate } from './prestadores.interface';

@Injectable()
export class PrestadoresService {
  private readonly logger = new Logger(PrestadoresService.name);
  private readonly table = 'prestadores';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  private normalizeText(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeArray(values?: string[]): string[] {
    return (values || [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  async findAll(apenasAtivos = false): Promise<IPrestadorResponse[]> {
    let query = this.client.from(this.table).select('*');
    if (apenasAtivos) query = query.eq('ativo', true);
    const { data, error } = await query.order('nome');

    if (error) {
      this.logger.error('Erro ao buscar prestadores', error);
      throw error;
    }
    return data || [];
  }

  async findById(id: string): Promise<IPrestadorResponse> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Prestador não encontrado');
    }
    return data;
  }

  async create(
    input: IPrestadorCreate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IPrestadorResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem criar prestadores');
    }

    if (!input.nome?.trim()) {
      throw new BadRequestException('Nome do prestador é obrigatório');
    }
    if (!input.unidade?.trim()) {
      throw new BadRequestException('Unidade do prestador é obrigatória');
    }

    const payload = {
      nome: input.nome.trim(),
      unidade: input.unidade.trim(),
      endereco: this.normalizeText(input.endereco),
      horario: this.normalizeText(input.horario),
      referencia: this.normalizeText(input.referencia),
      grupos: this.normalizeArray(input.grupos),
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Erro ao criar prestador', error);
      throw new BadRequestException(error.message);
    }
    this.auditLog.logUserAction({
      user,
      acao: 'CRIAR_PRESTADOR',
      recursoTipo: 'prestadores',
      recursoId: data.id,
      detalhes: { nome: data.nome },
      requestId,
    });

    return data;
  }

  async update(
    id: string,
    input: IPrestadorUpdate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IPrestadorResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem editar prestadores');
    }

    const existing = await this.findById(id);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.nome !== undefined && input.nome !== null) payload.nome = input.nome.trim();
    if (input.unidade !== undefined && input.unidade !== null) payload.unidade = input.unidade.trim();
    if (input.endereco !== undefined) payload.endereco = this.normalizeText(input.endereco);
    if (input.horario !== undefined) payload.horario = this.normalizeText(input.horario);
    if (input.referencia !== undefined) payload.referencia = this.normalizeText(input.referencia);
    if (input.grupos !== undefined) payload.grupos = this.normalizeArray(input.grupos);
    if (input.ativo !== undefined) payload.ativo = input.ativo;

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Prestador não encontrado');
    }
    this.auditLog.logUserAction({
      user,
      acao: 'EDITAR_PRESTADOR',
      recursoTipo: 'prestadores',
      recursoId: id,
      detalhes: { nome: data.nome, alteracoes: Object.keys(payload) },
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
      throw new ForbiddenException('Apenas usuários MASTER podem inativar prestadores');
    }

    const existing = await this.findById(id);

    const { error } = await this.client
      .from(this.table)
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Erro ao inativar prestador', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_PRESTADOR',
      recursoTipo: 'prestadores',
      recursoId: id,
      detalhes: { nome: existing.nome },
      requestId,
    });

    return { success: true };
  }
}
