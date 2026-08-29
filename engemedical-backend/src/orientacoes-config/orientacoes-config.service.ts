import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  IOrientacaoConfigResponse,
  IOrientacaoConfigCreate,
  IOrientacaoConfigUpdate,
} from './orientacoes-config.interface';

@Injectable()
export class OrientacoesConfigService {
  private readonly logger = new Logger(OrientacoesConfigService.name);
  private readonly table = 'parecer_orientacoes';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async findAll(apenasAtivos = false): Promise<IOrientacaoConfigResponse[]> {
    try {
      let query = this.client.from(this.table).select('*');
      if (apenasAtivos) query = query.eq('ativo', true);
      const { data, error } = await query.order('ordem', { ascending: true });

      if (error) {
        this.logger.error('Erro ao buscar orientações de parecer (Supabase)', error);
        return [];
      }
      return data || [];
    } catch (e) {
      this.logger.error(
        'Falha de rede ao buscar orientações de parecer no Supabase:',
        e,
      );
      return [];
    }
  }

  async findById(id: string): Promise<IOrientacaoConfigResponse> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new NotFoundException('Orientação de parecer não encontrada');
      }
      return data;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      this.logger.error(
        `Falha de rede ao buscar orientação de parecer ${id}:`,
        e,
      );
      throw new NotFoundException('Orientação de parecer não encontrada');
    }
  }

  /**
   * Busca sem lançar exceção — usada no fluxo de finalização do parecer,
   * onde a ausência do registro não deve derrubar o atendimento.
   */
  async findByIdSafe(id: string): Promise<IOrientacaoConfigResponse | null> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data;
    } catch (e) {
      this.logger.warn(
        `[findByIdSafe] Falha ao buscar orientação de parecer ${id}:`,
        (e as Error)?.message,
      );
      return null;
    }
  }

  async create(
    input: IOrientacaoConfigCreate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IOrientacaoConfigResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException(
        'Apenas usuários MASTER podem criar orientações de parecer',
      );
    }

    if (!input.texto_tela?.trim()) {
      throw new BadRequestException('Texto de tela é obrigatório');
    }
    if (!input.texto_email?.trim()) {
      throw new BadRequestException('Texto de email é obrigatório');
    }

    const payload: Record<string, any> = {
      categoria: input.categoria?.trim() || 'Geral',
      texto_tela: input.texto_tela.trim(),
      texto_email: input.texto_email.trim(),
      libera_cliente: input.libera_cliente ?? true,
      ordem: typeof input.ordem === 'number' ? input.ordem : 0,
      ativo: true,
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Erro ao criar orientação de parecer', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'CRIAR_ORIENTACAO_PARECER',
      recursoTipo: this.table,
      recursoId: data.id,
      detalhes: {
        categoria: data.categoria,
        texto_tela: data.texto_tela,
        libera_cliente: data.libera_cliente,
      },
      requestId,
    });

    return data;
  }

  async update(
    id: string,
    input: IOrientacaoConfigUpdate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IOrientacaoConfigResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException(
        'Apenas usuários MASTER podem editar orientações de parecer',
      );
    }

    const existing = await this.findById(id);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.categoria !== undefined)
      payload.categoria = input.categoria.trim() || 'Geral';
    if (input.texto_tela !== undefined)
      payload.texto_tela = input.texto_tela.trim();
    if (input.texto_email !== undefined)
      payload.texto_email = input.texto_email.trim();
    if (input.libera_cliente !== undefined)
      payload.libera_cliente = input.libera_cliente;
    if (input.ativo !== undefined) payload.ativo = input.ativo;
    if (input.ordem !== undefined) payload.ordem = input.ordem;

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Orientação de parecer não encontrada');
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EDITAR_ORIENTACAO_PARECER',
      recursoTipo: this.table,
      recursoId: id,
      detalhes: {
        textoTelaAntigo: existing.texto_tela,
        textoTelaNovo: data.texto_tela,
        alteracoes: Object.keys(payload),
      },
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
      throw new ForbiddenException(
        'Apenas usuários MASTER podem excluir orientações de parecer',
      );
    }

    const existing = await this.findById(id);

    const { error } = await this.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Erro ao excluir orientação de parecer', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_ORIENTACAO_PARECER',
      recursoTipo: this.table,
      recursoId: id,
      detalhes: { texto_tela: existing.texto_tela },
      requestId,
    });

    return { success: true };
  }
}
