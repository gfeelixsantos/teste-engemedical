-- Migration: Add multi-target support to customer_email_campaigns
-- Feature: Multi-Target Customer Email Campaign System
-- Date: 2026-08-08

-- 1. Remove antiga restrição CHECK do campo scope
ALTER TABLE public.customer_email_campaigns 
  DROP CONSTRAINT IF EXISTS customer_email_campaigns_scope_check;

-- 2. Adiciona nova restrição CHECK incluindo 'multi', 'app_users', 'custom_emails'
ALTER TABLE public.customer_email_campaigns 
  ADD CONSTRAINT customer_email_campaigns_scope_check 
  CHECK (scope IN ('all', 'selected', 'app_users', 'custom_emails', 'multi'));

-- 3. Adiciona as novas colunas de suporte a multi-origem
ALTER TABLE public.customer_email_campaigns 
  ADD COLUMN IF NOT EXISTS target_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_app_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_emails jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Atualizar tamanho da coluna company_code em customer_email_campaign_companies para suportar sufixos longos
ALTER TABLE public.customer_email_campaign_companies 
  ALTER COLUMN company_code TYPE varchar(50);
