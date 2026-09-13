import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { IUserCreate, IUserUpdate, IUserSync, IUserResponse, IConsentStatus, IConsentRequest } from './users.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly table = 'users';
  private readonly safeSelect = 'codigo, cpf, nome, email, telefone, perfil, conselho, uf_conselho, registro_conselho, ativo, deleted_at, anonimizado_em, criado_em, atualizado_em, ultimo_login, criado_por, atualizado_por, consentimento_aceito, consentimento_aceito_em, consentimento_versao';

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

  private normalizeOptionalText(value?: string | null): string | null {
    return this.normalizeText(value);
  }

  private normalizeCpf(value?: string | null): string | null {
    const normalized = value?.replace(/\D/g, '') || '';

    return normalized ? normalized : null;
  }

  async findAll(perfil?: string, ativo?: boolean): Promise<IUserResponse[]> {
    let query = this.client
      .from(this.table)
      .select(this.safeSelect)
      .is('anonimizado_em', null)
      .order('nome', { ascending: true });

    if (perfil) {
      query = query.eq('perfil', perfil);
    }
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error('Erro ao buscar usuários', error);
      throw error;
    }
    return data || [];
  }

  async findByCodigo(codigo: string): Promise<IUserResponse> {
    const { data, error } = await this.client
      .from(this.table)
      .select(this.safeSelect)
      .eq('codigo', codigo)
      .is('anonimizado_em', null)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return data;
  }

  async findByCpf(cpf: string): Promise<IUserResponse | null> {
    const normalized = this.normalizeCpf(cpf);
    if (!normalized) return null;

    const { data, error } = await this.client
      .from(this.table)
      .select(this.safeSelect)
      .eq('cpf', normalized)
      .is('anonimizado_em', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async upsert(input: IUserCreate): Promise<IUserResponse> {
    if (!input.codigo?.trim() || !input.nome?.trim()) {
      throw new BadRequestException('código e nome são obrigatórios');
    }

    const payload = {
      codigo: input.codigo.trim(),
      cpf: this.normalizeCpf(input.cpf),
      nome: input.nome.trim(),
      email: this.normalizeOptionalText(input.email),
      telefone: this.normalizeOptionalText(input.telefone),
      perfil: input.perfil?.trim() || 'CONVIDADO',
      conselho: this.normalizeOptionalText(input.conselho),
      uf_conselho: this.normalizeOptionalText(input.uf_conselho),
      registro_conselho: this.normalizeOptionalText(input.registro_conselho),
      ultimo_login: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.table)
      .upsert(payload, { onConflict: 'codigo' })
      .select(this.safeSelect)
      .single();

    if (error) {
      this.logger.error('Erro ao upsert usuário', error);
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async update(codigo: string, input: IUserUpdate, user?: { codigo?: string; nome?: string }, requestId?: string): Promise<IUserResponse> {
    const payload: Record<string, any> = { atualizado_em: new Date().toISOString() };

    const campos: (keyof IUserUpdate)[] = ['nome', 'email', 'telefone', 'perfil', 'conselho', 'uf_conselho', 'registro_conselho', 'ativo', 'atualizado_por'];
    for (const campo of campos) {
      if (input[campo] !== undefined) {
        payload[campo] = typeof input[campo] === 'string' ? (input[campo] as string).trim() : input[campo];
      }
    }

    const { data, error } = await this.client
      .from(this.table)
      .update(payload)
      .eq('codigo', codigo)
      .is('anonimizado_em', null)
      .select(this.safeSelect)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuário não encontrado');
    }

    this.auditLog.logUserAction({
      user,
      acao: 'USUARIO_ATUALIZADO',
      recursoTipo: 'users',
      recursoId: codigo,
      detalhes: { campos: Object.keys(payload).filter(k => k !== 'atualizado_em') },
      requestId,
    });

    return data;
  }

  async sync(input: IUserSync, user?: { codigo?: string }): Promise<IUserResponse> {
    if (!input.codigo?.trim()) {
      throw new BadRequestException('código é obrigatório');
    }

    const { data: existing } = await this.client
      .from(this.table)
      .select(this.safeSelect)
      .eq('codigo', input.codigo)
      .maybeSingle();

    if (existing) {
      // Usuário já existe — só atualiza ultimo_login, preserva dados manuais
      const { data, error } = await this.client
        .from(this.table)
        .update({ ultimo_login: input.ultimo_login || new Date().toISOString() })
        .eq('codigo', input.codigo)
        .select(this.safeSelect)
        .single();

      if (error) {
        this.logger.error('Erro ao atualizar último login', error);
        throw new BadRequestException(error.message);
      }

      return data;
    }

    // Primeira vez — cria com dados do SOC
    const payload: Record<string, any> = {
      codigo: input.codigo.trim(),
      cpf: this.normalizeCpf(input.cpf),
      nome: input.nome?.trim() || '',
      email: this.normalizeOptionalText(input.email),
      telefone: this.normalizeOptionalText(input.telefone),
      perfil: input.perfil?.trim() || 'CONVIDADO',
      conselho: this.normalizeOptionalText(input.conselho),
      uf_conselho: this.normalizeOptionalText(input.uf_conselho),
      registro_conselho: this.normalizeOptionalText(input.registro_conselho),
      ultimo_login: input.ultimo_login || new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from(this.table)
      .upsert(payload, { onConflict: 'codigo' })
      .select(this.safeSelect)
      .single();

    if (error) {
      this.logger.error('Erro ao sincronizar usuário', error);
      throw new BadRequestException(error.message);
    }

    this.auditLog.logUserAction({
      user: user ? { codigo: user.codigo } : undefined,
      acao: 'USUARIO_SINCRONIZADO',
      recursoTipo: 'users',
      recursoId: input.codigo,
      detalhes: { nome: input.nome, cpf: this.normalizeCpf(input.cpf)?.replace(/\d(?=\d{2})/g, '*') || null },
    });

    return data;
  }

  async updateLastLogin(codigo: string): Promise<void> {
    await this.client
      .from(this.table)
      .update({ ultimo_login: new Date().toISOString() })
      .eq('codigo', codigo);
  }

  async checkConsent(codigo: string): Promise<IConsentStatus[]> {
    const tipos = ['TERMOS_DE_USO', 'POLITICA_PRIVACIDADE'];
    const versaoAtual = '1.0';

    const { data: user } = await this.client
      .from(this.table)
      .select('consentimento_aceito, consentimento_aceito_em, consentimento_versao')
      .eq('codigo', codigo)
      .maybeSingle();

    if (user?.consentimento_aceito) {
      return tipos.map((tipo) => ({
        tipo,
        versao_atual: versaoAtual,
        aceito: true,
        aceito_em: user.consentimento_aceito_em,
      }));
    }

    const aceitos = new Set<string>();
    if (user?.consentimento_versao) {
      for (const part of user.consentimento_versao.split(',')) {
        const [t] = part.split(':');
        if (t) aceitos.add(t);
      }
    }

    return tipos.map((tipo) => ({
      tipo,
      versao_atual: versaoAtual,
      aceito: aceitos.has(tipo),
      aceito_em: aceitos.has(tipo) ? user?.consentimento_aceito_em : null,
    }));
  }

  async recordConsent(
    codigo: string,
    input: IConsentRequest,
    ip?: string,
    userAgent?: string,
    userData?: { codigo?: string; nome?: string; cpf?: string; perfil?: string },
  ): Promise<{ success: boolean }> {
    const tipos = ['TERMOS_DE_USO', 'POLITICA_PRIVACIDADE'];
    const versaoAtual = '1.0';

    if (!tipos.includes(input.tipo)) {
      throw new BadRequestException(`Tipo inválido. Esperado: ${tipos.join(', ')}`);
    }
    if (input.versao !== versaoAtual) {
      throw new BadRequestException(`Versão inválida para ${input.tipo}. Esperada: ${versaoAtual}`);
    }

    const aceito = input.aceito !== false;
    const aceitoEm = new Date().toISOString();

    const { data: user } = await this.client
      .from(this.table)
      .select('codigo, consentimento_versao')
      .eq('codigo', codigo)
      .maybeSingle();

    const aceitosAnteriores: string[] = [];
    if (user?.consentimento_versao) {
      for (const part of user.consentimento_versao.split(',')) {
        const [t] = part.split(':');
        if (t && tipos.includes(t)) aceitosAnteriores.push(t);
      }
    }

    const aceitosAgora = [...new Set([...aceitosAnteriores, input.tipo])].sort();

    const todosAceitos = tipos.every((t) => aceitosAgora.includes(t));
    const versaoStr = todosAceitos
      ? tipos.map((t) => `${t}:${versaoAtual}`).join(',')
      : aceitosAgora.map((t) => `${t}:${versaoAtual}`).join(',');

    if (user) {
      // Usuário existe — update só consentimento
      const { error } = await this.client
        .from(this.table)
        .update({
          consentimento_aceito: todosAceitos,
          consentimento_aceito_em: todosAceitos ? aceitoEm : null,
          consentimento_versao: versaoStr,
          atualizado_em: aceitoEm,
        })
        .eq('codigo', codigo);

      if (error) {
        this.logger.error('Erro ao atualizar consentimento', error);
        throw error;
      }
    } else {
      // Usuário não existe na tabela — cria com dados mínimos + consentimento
      const { error } = await this.client
        .from(this.table)
        .upsert({
          codigo,
          cpf: userData?.cpf || `PENDENTE_${codigo}`,
          nome: userData?.nome || `Usuário ${codigo}`,
          perfil: userData?.perfil || 'CONVIDADO',
          consentimento_aceito: todosAceitos,
          consentimento_aceito_em: todosAceitos ? aceitoEm : null,
          consentimento_versao: versaoStr,
          atualizado_em: aceitoEm,
        }, { onConflict: 'codigo' });

      if (error) {
        this.logger.error('Erro ao upsert consentimento', error);
        throw error;
      }
    }

    this.auditLog.logUserAction({
      user: { codigo },
      acao: `CONSENTIMENTO_${aceito ? 'ACEITO' : 'REJEITADO'}`,
      recursoTipo: 'users',
      recursoId: codigo,
      detalhes: { tipo: input.tipo, versao: input.versao },
      ip,
      userAgent,
    });

    this.logger.log(`Consentimento ${input.tipo} v${input.versao} ${aceito ? 'aceito' : 'rejeitado'} para ${codigo}`);

    return { success: true };
  }

  async anonymize(codigo: string, user?: { codigo?: string; nome?: string }, requestId?: string): Promise<void> {
    const existing = await this.findByCodigo(codigo);

    const { error } = await this.client
      .from(this.table)
      .update({
        cpf: `ANONIMIZADO_${codigo}`,
        nome: 'USUÁRIO REMOVIDO',
        email: null,
        telefone: null,
        conselho: null,
        uf_conselho: null,
        registro_conselho: null,
        ativo: false,
        anonimizado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq('codigo', codigo);

    if (error) {
      this.logger.error('Erro ao anonimizar usuário', error);
      throw error;
    }

    this.auditLog.logUserAction({
      user,
      acao: 'USUARIO_EXCLUIDO',
      recursoTipo: 'users',
      recursoId: codigo,
      detalhes: { nome: existing.nome },
      requestId,
    });

    this.logger.warn(`Usuário ${codigo} (${existing.nome}) excluído por ${user?.codigo || 'desconhecido'}`);
  }
}
