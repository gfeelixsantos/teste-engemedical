import { Injectable } from '@nestjs/common';
import { DequeuedMessageItem } from '@azure/storage-queue';
import { AzureBaseWorker } from '../azure-worker';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AzureQueueService } from '../azure-queue.service';
import { TemplateNames } from 'src/nodemailer/types/emailtype';

interface OrchestrationPayload {
  campaignId: string;
}

@Injectable()
export class AzureCustomerEmailCampaignWorkerService extends AzureBaseWorker {
  protected queueName = process.env.AZURE_QUEUE_CUSTOMER_EMAIL_CAMPAIGN || 'customer-email-campaign';
  protected readonly MAX_CONCURRENT_MESSAGES = 1;
  protected readonly RECEIVE_BATCH_SIZE = 1;
  protected readonly DELAY_BETWEEN_MESSAGES: number = 0;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly azureQueueService: AzureQueueService,
  ) {
    super();
  }

  protected async handleMessage(message: DequeuedMessageItem): Promise<void> {
    const payload = JSON.parse(message.messageText) as OrchestrationPayload;
    const { campaignId } = payload;
    const supabase = this.supabaseService.getClient();

    this.logger.log(`[${this.queueName}] Iniciando orquestração da campanha: ${campaignId}`);

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('customer_email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      this.logger.error(`[${this.queueName}] Campanha não encontrada: ${campaignId}`);
      return; // Do not throw, just discard message
    }

    if (campaign.status === 'cancelling' || campaign.status === 'deleted') {
      this.logger.log(`[${this.queueName}] Campanha ${campaignId} foi cancelada ou deletada. Abortando.`);
      return;
    }

    if (campaign.status !== 'active') {
      this.logger.log(`[${this.queueName}] Campanha ${campaignId} não está ativa (status: ${campaign.status}).`);
      return;
    }

    let hasMore = true;
    let processedThisRun = 0;

    // Process in batches (e.g. 5 companies at a time)
    while (hasMore) {
      const { data: companies, error: claimError } = await supabase.rpc(
        'claim_customer_email_campaign_companies',
        { p_campaign_id: campaignId, p_limit: 5 }
      );

      if (claimError) {
        this.logger.error(`[${this.queueName}] Erro ao dar lock nas empresas da campanha ${campaignId}: ${claimError.message}`);
        throw new Error('Lock error');
      }

      if (!companies || companies.length === 0) {
        hasMore = false;
        break;
      }

      for (const comp of companies) {
        // Verify campaign is still active (not cancelled while processing)
        const { data: freshCampaign } = await supabase
          .from('customer_email_campaigns')
          .select('status, content_version')
          .eq('id', campaignId)
          .single();

        if (freshCampaign?.status === 'cancelling' || freshCampaign?.status === 'deleted') {
          hasMore = false;
          break;
        }

        let fullComp = comp;
        if (!fullComp.id || !fullComp.emails) {
          const { data } = await supabase
            .from('customer_email_campaign_companies')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('company_code', comp.company_code)
            .single();
          if (data) fullComp = data;
        }

        if (freshCampaign?.content_version !== campaign.content_version) {
          // Version mismatch - stale content. Fail the company row.
          await this.updateCompanyRow(fullComp.id, 'failed', 'Conteúdo da campanha foi alterado durante o envio');
          continue;
        }

        try {
          await this.sendEmailsForCompany(campaign, fullComp);
          await this.updateCompanyRow(fullComp.id, 'sent');
          processedThisRun++;

          // Pacing timeout para evitar "limit exceed" no provedor de email (cPanel/SMTP)
          // Aguarda 7 segundos entre cada empresa (aprox. ~500 emails/hora)
          await new Promise((resolve) => setTimeout(resolve, 7000));
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await this.updateCompanyRow(fullComp.id, 'failed', errMsg);
        }
      }
    }

    // After processing, check if all companies are done
    const { data: pendingCountData } = await supabase
      .from('customer_email_campaign_companies')
      .select('id', { count: 'exact' })
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'processing']);

    const remaining = pendingCountData?.length || 0;

    if (remaining === 0) {
      // All done! Update campaign to completed
      await supabase
        .from('customer_email_campaigns')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', campaignId);
      this.logger.log(`[${this.queueName}] Campanha ${campaignId} concluída com sucesso!`);
    } else {
      this.logger.log(`[${this.queueName}] Processamento pausado. Restam ${remaining} empresas (poderão ser pegas por outra instância ou por retry).`);
    }
  }

  private async updateCompanyRow(rowId: string, status: string, errorLog: string | null = null) {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('customer_email_campaign_companies')
      .update({
        status,
        last_error: errorLog,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('id', rowId);
  }

  private async sendEmailsForCompany(campaign: any, compRow: any) {
    const toEmails = compRow.emails;
    if (!toEmails || toEmails.length === 0) return;

    let html = campaign.html_body;
    let text = campaign.text_body;
    const subject = campaign.subject;
    const fromName = campaign.from_name;
    const replyTo = campaign.reply_to;

    // String Replacement
    const companyName = compRow.company_name || '';
    html = html?.replace(/{{NOME_EMPRESA}}/g, companyName);
    text = text?.replace(/{{NOME_EMPRESA}}/g, companyName);

    // Build attachments
    const mailAttachments = [];
    if (campaign.attachments && campaign.attachments.length > 0) {
      for (const att of campaign.attachments) {
        mailAttachments.push({
          filename: att.name,
          path: att.url,
        });
      }
    }
    if (campaign.inline_assets && campaign.inline_assets.length > 0) {
      for (const asset of campaign.inline_assets) {
        mailAttachments.push({
          filename: asset.name,
          path: asset.url,
          cid: asset.cid,
        });
      }
    }

    const mailOptions = {
      to: toEmails.join(','),
      subject,
      template: html,
      templatename: TemplateNames.CUSTOM_HTML,
      from: fromName ? `"${fromName}" <${process.env.EMAIL_CONFIG_USER}>` : undefined,
      replyTo,
      cc: campaign.cc?.join(','),
      bcc: campaign.bcc?.join(','),
      attachment: mailAttachments,
      headers: {
        'X-Campaign-ID': campaign.id,
        'X-Company-Code': compRow.company_code
      }
    };

    await this.azureQueueService.sendEmailMessage(mailOptions);
  }
}
