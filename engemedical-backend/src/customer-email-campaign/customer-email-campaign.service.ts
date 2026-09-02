import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerEmailCampaignDto, UpdateCustomerEmailCampaignDto } from './customer-email-campaign.types';
import { SocCompanyService } from '../soc/services/soc-company.service';
import { SocExportService } from '../soc/services/soc-export.service';
import { AzureService } from '../azure/azure.service';

@Injectable()
export class CustomerEmailCampaignService {
  private readonly logger = new Logger(CustomerEmailCampaignService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(forwardRef(() => SocCompanyService))
    private readonly socCompanyService: SocCompanyService,
    @Inject(forwardRef(() => SocExportService))
    private readonly socExportService: SocExportService,
    private readonly azureService: AzureService,
  ) {}

  async createDraft(dto: CreateCustomerEmailCampaignDto) {
    const supabase = this.supabaseService.getClient();
    const targetSources = dto.targetSources || (dto.scope ? [dto.scope as any] : ['all']);

    const fullPayload: any = {
      name: dto.name,
      scope: dto.scope || 'all',
      target_sources: targetSources,
      status: 'draft',
      subject: dto.subject,
      from_name: dto.fromName,
      reply_to: dto.replyTo,
      cc: dto.cc || [],
      bcc: dto.bcc || [],
      selected_company_codes: dto.selectedCompanyCodes || [],
      target_app_user_ids: dto.targetAppUserIds || [],
      custom_emails: dto.customEmails || [],
      editor_source: dto.editorSource ?? {},
      html_body: dto.htmlBody,
      text_body: dto.textBody,
      attachments: dto.attachments || [],
      inline_assets: dto.inlineAssets || [],
      requested_by_codigo: dto.requestedByCodigo,
      requested_by_nome: dto.requestedByNome,
      requested_by_unidade: dto.requestedByUnidade,
    };

    let { data, error } = await supabase
      .from('customer_email_campaigns')
      .insert(fullPayload)
      .select()
      .single();

    // Fallback: se o banco ainda não tiver as colunas novas criadas, remove-as do payload e grava no modo legado
    if (error && error.message?.includes("Could not find the '")) {
      this.logger.warn(`⚠️ Colunas novas ausentes no Supabase (${error.message}). Executando fallback legado.`);
      delete fullPayload.target_sources;
      delete fullPayload.target_app_user_ids;
      delete fullPayload.custom_emails;

      const fallbackRes = await supabase
        .from('customer_email_campaigns')
        .insert(fullPayload)
        .select()
        .single();

      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      this.logger.error(`Error creating draft campaign: ${error.message}`);
      throw new Error(`Failed to create campaign draft: ${error.message}`);
    }
    return data;
  }

  async updateCampaign(id: string, dto: UpdateCustomerEmailCampaignDto) {
    const supabase = this.supabaseService.getClient();
    const { data: campaign, error: getError } = await supabase
      .from('customer_email_campaigns')
      .select('status, content_version')
      .eq('id', id)
      .single();

    if (getError) {
      this.logger.error(`updateCampaign - Supabase error fetching id=${id}: code=${getError.code} msg=${getError.message}`);
      throw new NotFoundException(`Campaign not found (${getError.code}: ${getError.message})`);
    }
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found in database`);
    }

    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.scope !== undefined) updates.scope = dto.scope;
    if (dto.targetSources !== undefined) updates.target_sources = dto.targetSources;
    if (dto.subject !== undefined) updates.subject = dto.subject;
    if (dto.fromName !== undefined) updates.from_name = dto.fromName;
    if (dto.replyTo !== undefined) updates.reply_to = dto.replyTo;
    if (dto.cc !== undefined) updates.cc = dto.cc;
    if (dto.bcc !== undefined) updates.bcc = dto.bcc;
    if (dto.selectedCompanyCodes !== undefined) updates.selected_company_codes = dto.selectedCompanyCodes;
    if (dto.targetAppUserIds !== undefined) updates.target_app_user_ids = dto.targetAppUserIds;
    if (dto.customEmails !== undefined) updates.custom_emails = dto.customEmails;
    if (dto.editorSource !== undefined) updates.editor_source = dto.editorSource;
    if (dto.htmlBody) updates.html_body = dto.htmlBody;
    if (dto.textBody) updates.text_body = dto.textBody;
    if (dto.attachments) updates.attachments = dto.attachments;
    if (dto.inlineAssets) updates.inline_assets = dto.inlineAssets;

    const contentFields = ['subject', 'htmlBody', 'textBody', 'attachments', 'inlineAssets'];
    const hasContentChange = contentFields.some((field) => dto[field] !== undefined);

    if (campaign.status === 'active' && hasContentChange) {
      updates.content_version = campaign.content_version + 1;
    }

    updates.updated_at = new Date().toISOString();

    let { data, error } = await supabase
      .from('customer_email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes("Could not find the '")) {
      delete updates.target_sources;
      delete updates.target_app_user_ids;
      delete updates.custom_emails;

      const fallbackRes = await supabase
        .from('customer_email_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    return data;
  }

  async publishCampaign(id: string) {
    const supabase = this.supabaseService.getClient();

    // Get Campaign
    const { data: campaign, error: getError } = await supabase
      .from('customer_email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (getError || !campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== 'draft') throw new Error('Only draft campaigns can be published');

    // Validação: nome e assunto são obrigatórios para iniciar o disparo
    if (!campaign.name || campaign.name.trim() === '') {
      throw new BadRequestException('O nome da campanha é obrigatório para iniciar o disparo.');
    }
    if (!campaign.subject || campaign.subject.trim() === '') {
      throw new BadRequestException('O assunto do e-mail é obrigatório para iniciar o disparo.');
    }

    const sources: string[] = campaign.target_sources && campaign.target_sources.length > 0
      ? campaign.target_sources
      : [campaign.scope];

    this.logger.log(`[CAMPAIGN] Iniciando processamento da campanha ${id} "${campaign.name}"`);
    this.logger.log(`[CAMPAIGN] scope=${campaign.scope}, target_sources=${JSON.stringify(campaign.target_sources)}, target_app_user_ids=${JSON.stringify(campaign.target_app_user_ids)}, custom_emails=${JSON.stringify(campaign.custom_emails)}`);
    this.logger.log(`[CAMPAIGN] Sources finais a processar: ${JSON.stringify(sources)}`);

    const companyRowsToInsert: Array<{
      campaign_id: string;
      company_code: string;
      company_name: string;
      emails: string[];
      status: string;
    }> = [];

    // Track emails already added to ensure no duplicates across sources
    const globalSeenEmails = new Set<string>();

    // 1. Resolve SOC Companies if selected
    let companyCodesToProcess: string[] = [];
    if (sources.includes('all')) {
      const allCompanies = await this.socCompanyService.getCompaniesRegister();
      companyCodesToProcess = allCompanies.map((c: any) => String(c.CODIGO).trim());
    } else if (sources.includes('selected') && Array.isArray(campaign.selected_company_codes)) {
      companyCodesToProcess = campaign.selected_company_codes;
    }

    for (const code of companyCodesToProcess) {
      const comp = this.socCompanyService.getCompanyByCode(code);
      const companyName = comp ? comp.RAZAOSOCIAL : `EMPRESA ${code}`;
      const rawEmails = (await this.socExportService.getCompanyContacts(code)) || [];
      const uniqueEmails = rawEmails.filter(e => {
        const lower = e.toLowerCase().trim();
        if (!lower || globalSeenEmails.has(lower)) return false;
        globalSeenEmails.add(lower);
        return true;
      });

      companyRowsToInsert.push({
        campaign_id: id,
        company_code: `SOC_${code}`,
        company_name: companyName,
        emails: uniqueEmails,
        status: uniqueEmails.length > 0 ? 'pending' : 'skipped_no_email',
      });
    }

    // 2. Resolve Application Users if selected
    if (sources.includes('app_users')) {
      this.logger.log(`[CAMPAIGN] Resolvendo usuários da aplicação para campanha ${id}`);

      const { data: appUsers, error: usersError } = await supabase
        .from('users')
        .select('codigo, nome, email, perfil, ativo')
        .eq('ativo', true)
        .not('email', 'is', null);

      if (usersError) {
        this.logger.error(`[CAMPAIGN] Erro ao buscar usuários da aplicação: ${usersError.message}`);
      }

      if (!usersError && appUsers && appUsers.length > 0) {
        const selectedIds: string[] = campaign.target_app_user_ids || [];
        const filteredUsers = selectedIds.length > 0
          ? appUsers.filter(u => selectedIds.includes(String(u.codigo)))
          : appUsers;

        this.logger.log(`[CAMPAIGN] Encontrados ${appUsers.length} usuários ativos com email. target_app_user_ids=${JSON.stringify(selectedIds)}. Filtro por IDs: ${selectedIds.length > 0 ? selectedIds.length : 'todos'}. Filtrados: ${filteredUsers.length}`);
        this.logger.log(`[CAMPAIGN] Usuários ativos com email: ${appUsers.map(u => `${u.codigo}|${u.nome}|${u.email}|ativo=${u.ativo}`).join(' | ')}`);

        const userRows: Array<{ user: typeof filteredUsers[number]; email: string }> = [];
        for (const u of filteredUsers) {
          const email = (u.email || '').toLowerCase().trim();
          if (email && !globalSeenEmails.has(email)) {
            globalSeenEmails.add(email);
            userRows.push({ user: u, email });
          } else if (email && globalSeenEmails.has(email)) {
            this.logger.log(`[CAMPAIGN] Email duplicado ignorado: ${email} (${u.nome})`);
          }
        }

        if (userRows.length > 0) {
          this.logger.log(`[CAMPAIGN] Adicionando ${userRows.length} emails de usuários: ${userRows.map(r => r.email).join(', ')}`);
          // One row per user so each receives an individual email
          for (const { user, email } of userRows) {
            companyRowsToInsert.push({
              campaign_id: id,
              company_code: `APP_USER_${user.codigo ?? email}`,
              company_name: user.nome || email,
              emails: [email],
              status: 'pending',
            });
          }
        } else {
          this.logger.warn(`[CAMPAIGN] Nenhum email único encontrado para usuários da aplicação (podem ser duplicados de outras fontes)`);
        }
      } else if (!usersError) {
        this.logger.warn(`[CAMPAIGN] Nenhum usuário ativo com email encontrado na tabela users`);
      }
    }

    // 3. Resolve Custom Emails if selected
    if (sources.includes('custom_emails') && Array.isArray(campaign.custom_emails)) {
      const validCustomEmails: string[] = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const raw of campaign.custom_emails) {
        const email = String(raw || '').toLowerCase().trim();
        if (email && emailRegex.test(email) && !globalSeenEmails.has(email)) {
          globalSeenEmails.add(email);
          validCustomEmails.push(email);
        }
      }

if (validCustomEmails.length > 0) {
          // One row per email so each receives an individual email
          for (const email of validCustomEmails) {
            companyRowsToInsert.push({
              campaign_id: id,
              company_code: `CUSTOM_${email}`,
              company_name: email,
              emails: [email],
              status: 'pending',
            });
          }
        }
    }

    // 4. Insert into Companies table in chunks
    this.logger.log(`[CAMPAIGN] Total de grupos de destinatários para campanha ${id}: ${companyRowsToInsert.length}`);
    const chunkSize = 200;
    let pendingCompanies = 0;
    let skippedCompanies = 0;

    for (let i = 0; i < companyRowsToInsert.length; i += chunkSize) {
      const chunk = companyRowsToInsert.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('customer_email_campaign_companies')
        .insert(chunk);

      if (insertError) {
        this.logger.error(`Error inserting recipients for campaign ${id}: ${insertError.message}`);
        throw new Error('Failed to resolve and insert campaign recipients');
      }

      chunk.forEach(row => {
        if (row.status === 'pending') pendingCompanies++;
        if (row.status === 'skipped_no_email') skippedCompanies++;
      });
    }

    // 5. Update campaign status and counters
    const { data, error } = await supabase
      .from('customer_email_campaigns')
      .update({
        status: 'active',
        total_companies: companyRowsToInsert.length,
        pending_companies: pendingCompanies,
        skipped_companies: skippedCompanies,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish campaign: ${error.message}`);
    }

    // 6. Enqueue Orchestration — SE falhar, rollback do status para 'draft'
    //    para evitar campanha stuck em 'active' sem mensagem na fila.
    try {
      this.logger.log(`[CAMPAIGN] Enfileirando orquestração para campanha ${id}`);
      await this.azureService.filaCustomerEmailCampaignOrchestrate({ campaignId: id });
      this.logger.log(`[CAMPAIGN] Campanha ${id} publicada e orquestração enfileirada com sucesso`);
    } catch (enqueueError) {
      const errMsg = enqueueError instanceof Error ? enqueueError.message : String(enqueueError);
      this.logger.error(`[CAMPAIGN] Falha ao enfileirar orquestração para campanha ${id}: ${errMsg}. Fazendo rollback do status para draft.`);

      // Rollback: volta status para draft
      await supabase
        .from('customer_email_campaigns')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', id);

      throw new Error(`Campanha salva mas não foi possível iniciar processamento: ${errMsg}`);
    }

    return data;
  }

  async cancelCampaign(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('customer_email_campaigns')
      .update({
        status: 'cancelling',
        cancel_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel campaign: ${error.message}`);
    }

    // Call helper function to cancel pending companies
    await supabase.rpc('cancel_customer_email_campaign_pending', { p_campaign_id: id });

    return data;
  }

  async deleteCampaign(id: string) {
    const supabase = this.supabaseService.getClient();
    // Logical deletion: cancel + hide
    await this.cancelCampaign(id);
    const { data, error } = await supabase
      .from('customer_email_campaigns')
      .update({
        status: 'deleted',
        hidden_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }

    return data;
  }

  async listCampaigns() {
    const supabase = this.supabaseService.getClient();
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const { data, error } = await supabase
      .from('customer_email_campaigns')
      .select('*')
      .is('hidden_at', null)
      // Exclude campaigns that are completed or deleted/cancelled and older than 30 days
      // Unfortunately Supabase client complex OR logic is tricky, 
      // but we can filter the resulting array or use an OR string.
      .or(`status.eq.draft,status.eq.active,status.eq.processing,and(status.in.(completed,cancelling,deleted),created_at.gte.${thirtyDaysAgoStr})`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }

    return data;
  }

  async getCampaign(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('customer_email_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Campaign not found');
    }

    return data;
  }

  async getCampaignProgress(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('customer_email_campaign_companies')
      .select('status')
      .eq('campaign_id', id);

    if (error) {
      throw new Error(`Failed to get progress: ${error.message}`);
    }

    const stats = {
      total: data.length,
      sent: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      skipped: 0
    };

    for (const row of data) {
      if (row.status === 'sent') stats.sent++;
      else if (['pending', 'claimed', 'queued', 'retry'].includes(row.status)) stats.pending++;
      else if (row.status === 'sending') stats.processing++;
      else if (row.status === 'failed' || row.status === 'cancelled') stats.failed++;
      else if (row.status.startsWith('skipped')) stats.skipped++;
    }

    const completed = stats.sent + stats.failed + stats.skipped;
    const percentage = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;

    return { ...stats, percentage };
  }

  /**
   * Re-enfileira a orquestração de uma campanha que está em status 'active'
   * mas não tem mensagem na fila (stuck). Útil para recuperação manual.
   */
  async retriggerCampaign(id: string) {
    const supabase = this.supabaseService.getClient();

    const { data: campaign, error: getError } = await supabase
      .from('customer_email_campaigns')
      .select('id, status, name')
      .eq('id', id)
      .single();

    if (getError || !campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== 'active') {
      throw new BadRequestException(
        `Campanha "${campaign.name}" está com status "${campaign.status}". Apenas campanhas "active" podem ser retriggered.`,
      );
    }

    // Verificar quantas empresas ainda estão pendentes
    const { data: pendingRows } = await supabase
      .from('customer_email_campaign_companies')
      .select('id', { count: 'exact' })
      .eq('campaign_id', id)
      .in('status', ['pending', 'processing']);

    const pendingCount = pendingRows?.length || 0;
    if (pendingCount === 0) {
      throw new BadRequestException(
        `Campanha "${campaign.name}" não tem empresas pendentes. Nada a retriggered.`,
      );
    }

    this.logger.log(`[CAMPAIGN][RETRIGGER] Reenfileirando orquestração para campanha ${id} "${campaign.name}" (${pendingCount} empresas pendentes)`);

    await this.azureService.filaCustomerEmailCampaignOrchestrate({ campaignId: id });

    this.logger.log(`[CAMPAIGN][RETRIGGER] Orquestração reenfileirada com sucesso para campanha ${id}`);
    return { success: true, pendingCompanies: pendingCount };
  }
}
