import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IUnitCreate, IUnitUpdate, IUnitResponse } from './units.interface';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);
  private readonly table = 'units';

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

  async findAll(): Promise<IUnitResponse[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (error) {
      this.logger.error('Erro ao buscar unidades', error);
      throw error;
    }
    return data || [];
  }

  async findAllAdmin(): Promise<IUnitResponse[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .order('ordem', { ascending: true });

    if (error) {
      this.logger.error('Erro ao buscar todas as unidades', error);
      throw error;
    }
    return data || [];
  }

  async findById(id: string): Promise<IUnitResponse> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidade não encontrada');
    }
    return data;
  }

  async findByNome(nome: string): Promise<IUnitResponse | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select('*')
      .ilike('nome', nome)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async create(input: IUnitCreate): Promise<IUnitResponse> {
    if (!input.nome?.trim()) {
      throw new BadRequestException('Nome da unidade é obrigatório');
    }

    const payload = {
      nome: input.nome.toUpperCase().trim(),
      nome_exibicao: this.normalizeText(input.nome_exibicao) || input.nome.trim(),
      ativo: true,
      ordem: input.ordem ?? 0,
      endereco: this.normalizeText(input.endereco),
      cidade: this.normalizeText(input.cidade),
      uf: this.normalizeText(input.uf),
      cep: this.normalizeText(input.cep),
      whatsapp: this.normalizeText(input.whatsapp),
      email: this.normalizeText(input.email),
      horario_funcionamento: this.normalizeText(input.horario_funcionamento),
      qrcode_path: this.normalizeText(input.qrcode_path),
      salas: {
        recepcao: this.normalizeArray(input.salas?.recepcao),
        exames: this.normalizeArray(input.salas?.exames),
      },
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Erro ao criar unidade', error);
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async update(id: string, input: IUnitUpdate): Promise<IUnitResponse> {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };

    if (input.nome !== undefined) payload.nome = input.nome.toUpperCase().trim();
    if (input.nome_exibicao !== undefined) payload.nome_exibicao = this.normalizeText(input.nome_exibicao);
    if (input.ativo !== undefined) payload.ativo = input.ativo;
    if (input.ordem !== undefined) payload.ordem = input.ordem;
    if (input.endereco !== undefined) payload.endereco = this.normalizeText(input.endereco);
    if (input.cidade !== undefined) payload.cidade = this.normalizeText(input.cidade);
    if (input.uf !== undefined) payload.uf = this.normalizeText(input.uf);
    if (input.cep !== undefined) payload.cep = this.normalizeText(input.cep);
    if (input.whatsapp !== undefined) payload.whatsapp = this.normalizeText(input.whatsapp);
    if (input.email !== undefined) payload.email = this.normalizeText(input.email);
    if (input.horario_funcionamento !== undefined) payload.horario_funcionamento = this.normalizeText(input.horario_funcionamento);
    if (input.qrcode_path !== undefined) payload.qrcode_path = this.normalizeText(input.qrcode_path);
    if (input.salas !== undefined) {
      payload.salas = {
        recepcao: this.normalizeArray(input.salas.recepcao),
        exames: this.normalizeArray(input.salas.exames),
      };
    }

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Unidade não encontrada');
    }
    return data;
  }

  async remove(
    id: string,
    user?: { codigo?: string; nome?: string; perfil?: string },
    requestId?: string,
  ): Promise<{ success: boolean }> {
    const { data: unit, error: fetchError } = await this.client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !unit) {
      throw new NotFoundException('Unidade não encontrada');
    }

    const { error: deleteError } = await this.client
      .from(this.table)
      .delete()
      .eq('id', id);

    if (deleteError) {
      this.logger.error('Erro ao excluir unidade', deleteError);
      throw new BadRequestException(deleteError.message);
    }

    this.auditLog.logUserAction({
      user,
      acao: 'EXCLUIR_UNIDADE',
      recursoTipo: 'units',
      recursoId: id,
      detalhes: { nome: unit.nome },
      requestId,
    });

    this.logger.warn(`Unidade ${unit.nome} (${id}) excluída por ${user?.codigo || 'desconhecido'}`);

    return { success: true };
  }
}
