import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IExameResponse, IExameCreate, IExameUpdate } from './exames.interface';
import { TEMPLATE_MAP } from './exames.constant';
import { ExamStatus } from 'src/mongo/enum/scheduling.enum';

export type ExamToogle = {
  codigos: string[];
  nome: string;
  statusFinalizacao: ExamStatus.FINALIZADO | ExamStatus.AGUARDANDO_RESULTADO;
  enviarParaAzure?: boolean;
  requerAssinaturaDigital: boolean;
  template?: (...args: any[]) => TDocumentDefinitions | Promise<TDocumentDefinitions>;
};

@Injectable()
export class ExamesService {
  private readonly logger = new Logger(ExamesService.name);
  private readonly table = 'exames';
  private cache: { data: IExameResponse[]; at: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000;

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

  private async findAllFromDb(apenasAtivos = true): Promise<IExameResponse[]> {
    let query = this.client.from(this.table).select('*');
    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }
    const { data, error } = await query.order('grupo').order('nome');

    if (error) {
      this.logger.error('Erro ao buscar exames', error);
      throw error;
    }
    return data || [];
  }

  async findAll(apenasAtivos = true): Promise<IExameResponse[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < this.CACHE_TTL) {
      if (apenasAtivos) {
        return this.cache.data.filter((e) => e.ativo);
      }
      return this.cache.data;
    }

    const data = await this.findAllFromDb(apenasAtivos);
    this.cache = { data, at: now };
    return data;
  }

  invalidateCache(): void {
    this.cache = null;
  }

  async findById(id: string): Promise<IExameResponse> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Exame não encontrado');
    }
    return data;
  }

  async findGrupos(): Promise<string[]> {
    const exames = await this.findAll();
    const grupos = [...new Set(exames.map((e) => e.grupo))];
    return grupos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  async findByGrupo(grupo: string): Promise<IExameResponse[]> {
    const exames = await this.findAll();
    return exames.filter((e) => e.grupo === grupo);
  }

  async findActiveByCodigo(codigo: string): Promise<IExameResponse | null> {
    const exames = await this.findAll(true);
    return exames.find((e) => e.codigos.includes(codigo)) || null;
  }

  async buildGroupedMap(): Promise<Record<string, ExamToogle[]>> {
    const exames = await this.findAll(true);
    const grouped: Record<string, ExamToogle[]> = {};

    for (const exame of exames) {
      if (!grouped[exame.grupo]) grouped[exame.grupo] = [];
      grouped[exame.grupo].push({
        codigos: exame.codigos,
        nome: exame.nome,
        statusFinalizacao: exame.status_finalizacao as ExamToogle['statusFinalizacao'],
        enviarParaAzure: exame.enviar_para_azure,
        requerAssinaturaDigital: exame.requer_assinatura,
        template: exame.template_key ? TEMPLATE_MAP[exame.template_key] : undefined,
      });
    }

    return grouped;
  }

  async refreshProviderCache(): Promise<void> {
    const grouped = await this.buildGroupedMap();
    const { setExamesData, setSupabaseClient } = await import('./exames.provider');
    setExamesData(grouped);
    setSupabaseClient(this.client);
  }

  async create(
    input: IExameCreate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IExameResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem criar exames');
    }
    if (!input.grupo?.trim()) {
      throw new BadRequestException('Grupo é obrigatório');
    }
    if (!input.nome?.trim()) {
      throw new BadRequestException('Nome é obrigatório');
    }

    const payload = {
      grupo: input.grupo.trim(),
      nome: input.nome.trim(),
      codigos: this.normalizeArray(input.codigos),
      status_finalizacao: input.status_finalizacao,
      enviar_para_azure: input.enviar_para_azure ?? false,
      requer_assinatura: input.requer_assinatura ?? false,
      template_key: this.normalizeText(input.template_key),
      estimativa_minutos: input.estimativa_minutos ?? null,
      preparacao: this.normalizeText(input.preparacao),
      ativo: true,
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Erro ao criar exame', error);
      throw new BadRequestException(error.message);
    }

    this.invalidateCache();
    await this.refreshProviderCache();

    this.auditLog.logUserAction({
      user,
      acao: 'CRIAR_EXAME',
      recursoTipo: 'exames',
      recursoId: data.id,
      detalhes: { nome: data.nome, grupo: data.grupo },
      requestId,
    });

    return data;
  }

  async update(
    id: string,
    input: IExameUpdate,
    user: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<IExameResponse> {
    if (user?.perfil !== 'MASTER') {
      throw new ForbiddenException('Apenas usuários MASTER podem editar exames');
    }

    const existing = await this.findById(id);

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.grupo !== undefined) payload.grupo = input.grupo.trim();
    if (input.nome !== undefined) payload.nome = input.nome.trim();
    if (input.codigos !== undefined) payload.codigos = this.normalizeArray(input.codigos);
    if (input.status_finalizacao !== undefined) payload.status_finalizacao = input.status_finalizacao;
    if (input.enviar_para_azure !== undefined) payload.enviar_para_azure = input.enviar_para_azure;
    if (input.requer_assinatura !== undefined) payload.requer_assinatura = input.requer_assinatura;
    if (input.template_key !== undefined) payload.template_key = this.normalizeText(input.template_key);
    if (input.estimativa_minutos !== undefined) payload.estimativa_minutos = input.estimativa_minutos;
    if (input.preparacao !== undefined) payload.preparacao = this.normalizeText(input.preparacao);
    if (input.ativo !== undefined) payload.ativo = input.ativo;

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Exame não encontrado');
    }

    this.invalidateCache();
    await this.refreshProviderCache();

    this.auditLog.logUserAction({
      user,
      acao: 'EDITAR_EXAME',
      recursoTipo: 'exames',
      recursoId: id,
      detalhes: { nome: existing.nome, grupo: existing.grupo, alteracoes: Object.keys(payload) },
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
      throw new ForbiddenException('Apenas usuários MASTER podem excluir exames');
    }

    const existing = await this.findById(id);

    const { error } = await this.client
      .from(this.table)
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      this.logger.error('Erro ao desativar exame', error);
      throw new BadRequestException(error.message);
    }

    this.invalidateCache();
    await this.refreshProviderCache();

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_EXAME',
      recursoTipo: 'exames',
      recursoId: id,
      detalhes: { nome: existing.nome, grupo: existing.grupo },
      requestId,
    });

    return { success: true };
  }
}
