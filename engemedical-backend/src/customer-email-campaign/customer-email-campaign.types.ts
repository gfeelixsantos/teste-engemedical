export type CustomerEmailCampaignScope =
  | 'all'
  | 'selected'
  | 'app_users'
  | 'custom_emails'
  | 'multi';

export type CustomerEmailCampaignTargetSource =
  | 'all'
  | 'selected'
  | 'app_users'
  | 'custom_emails';

export type CustomerEmailCampaignStatus =
  | 'draft'
  | 'active'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'completed_with_failures'
  | 'failed'
  | 'expired'
  | 'deleted';

export type CustomerEmailCampaignCompanyStatus =
  | 'pending'
  | 'claimed'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'retry'
  | 'failed'
  | 'cancelled'
  | 'skipped_no_email'
  | 'skipped_cancelled'
  | 'skipped_stale_version';

export interface CreateCustomerEmailCampaignDto {
  name: string;
  scope: CustomerEmailCampaignScope;
  targetSources?: CustomerEmailCampaignTargetSource[];
  subject: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  selectedCompanyCodes?: string[];
  targetAppUserIds?: string[];
  customEmails?: string[];
  editorSource: any;
  htmlBody: string;
  textBody: string;
  attachments?: any[];
  inlineAssets?: any[];
  requestedByCodigo: string;
  requestedByNome?: string;
  requestedByUnidade?: string;
}

export interface UpdateCustomerEmailCampaignDto {
  name?: string;
  scope?: CustomerEmailCampaignScope;
  targetSources?: CustomerEmailCampaignTargetSource[];
  subject?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  selectedCompanyCodes?: string[];
  targetAppUserIds?: string[];
  customEmails?: string[];
  editorSource?: any;
  htmlBody?: string;
  textBody?: string;
  attachments?: any[];
  inlineAssets?: any[];
}

