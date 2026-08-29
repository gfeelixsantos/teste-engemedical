-- Migration: Create customer_email_campaigns schema for bulk email campaigns
-- Feature: Customer Email Campaign System
-- Date: 2026-06-04

-- ==============================================================================
-- TABLE: customer_email_campaigns
-- Purpose: Main campaign table tracking lifecycle, status, and recipient counters
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customer_email_campaigns (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     varchar(200)  NOT NULL,
  scope                    varchar(20)   NOT NULL CHECK (scope IN ('all', 'selected')),
  status                   varchar(30)   NOT NULL CHECK (status IN (
    'draft',
    'active',
    'cancelling',
    'cancelled',
    'completed',
    'completed_with_failures',
    'failed',
    'expired',
    'deleted'
  )),
  subject                  varchar(255)  NOT NULL,
  from_name                varchar(200)  NULL,
  reply_to                 text          NULL,
  cc                       jsonb         NOT NULL DEFAULT '[]'::jsonb,
  bcc                      jsonb         NOT NULL DEFAULT '[]'::jsonb,
  selected_company_codes   jsonb         NOT NULL DEFAULT '[]'::jsonb,
  editor_source            jsonb         NOT NULL,
  html_body                text          NOT NULL,
  text_body                text          NOT NULL,
  attachments              jsonb         NOT NULL DEFAULT '[]'::jsonb,
  inline_assets            jsonb         NOT NULL DEFAULT '[]'::jsonb,
  content_version          integer       NOT NULL DEFAULT 1,
  total_companies          integer       NOT NULL DEFAULT 0,
  pending_companies        integer       NOT NULL DEFAULT 0,
  sent_companies           integer       NOT NULL DEFAULT 0,
  failed_companies         integer       NOT NULL DEFAULT 0,
  cancelled_companies      integer       NOT NULL DEFAULT 0,
  skipped_companies        integer       NOT NULL DEFAULT 0,
  batch_size               integer       NOT NULL DEFAULT 25,
  batch_interval_seconds   integer       NOT NULL DEFAULT 10,
  requested_by_codigo      varchar(20)   NOT NULL,
  requested_by_nome        varchar(200)  NULL,
  requested_by_unidade     varchar(100)  NULL,
  last_dispatch_at         timestamptz   NULL,
  cancel_requested_at      timestamptz   NULL,
  cancelled_at             timestamptz   NULL,
  completed_at             timestamptz   NULL,
  hidden_at                timestamptz   NULL,
  expires_at               timestamptz   NOT NULL DEFAULT (now() + interval '30 days'),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now()
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_cec_status_expires_at
  ON public.customer_email_campaigns (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_cec_requested_by_created_at
  ON public.customer_email_campaigns (requested_by_codigo, created_at DESC);

-- ==============================================================================
-- TABLE: customer_email_campaign_companies
-- Purpose: Per-company tracking with status and delivery metadata
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customer_email_campaign_companies (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id             uuid          NOT NULL REFERENCES public.customer_email_campaigns(id) ON DELETE CASCADE,
  company_code            varchar(20)   NOT NULL,
  company_name            varchar(255)  NOT NULL,
  emails                  jsonb         NOT NULL DEFAULT '[]'::jsonb,
  status                  varchar(30)   NOT NULL CHECK (status IN (
    'pending',
    'claimed',
    'queued',
    'sending',
    'sent',
    'retry',
    'failed',
    'cancelled',
    'skipped_no_email',
    'skipped_cancelled',
    'skipped_stale_version'
  )),
  version_used            integer       NULL,
  subject_used            varchar(255)  NULL,
  html_used               text          NULL,
  last_error              text          NULL,
  attempt_count           integer       NOT NULL DEFAULT 0,
  claimed_by              varchar(100)  NULL,
  claimed_at              timestamptz   NULL,
  queued_at               timestamptz   NULL,
  sent_at                 timestamptz   NULL,
  retry_after             timestamptz   NULL,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, company_code)
);

-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_cecc_campaign_status_retry
  ON public.customer_email_campaign_companies (campaign_id, status, retry_after, updated_at);

CREATE INDEX IF NOT EXISTS idx_cecc_campaign_company
  ON public.customer_email_campaign_companies (campaign_id, company_code);

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.customer_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_email_campaign_companies ENABLE ROW LEVEL SECURITY;

-- Campaigns: service_role can do everything
DO $$ BEGIN
  CREATE POLICY "cec_service_role_all"
    ON public.customer_email_campaigns
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Companies: service_role can do everything
DO $$ BEGIN
  CREATE POLICY "cecc_service_role_all"
    ON public.customer_email_campaign_companies
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function: claim_customer_email_campaign_companies
-- Purpose: Atomically claim a batch of companies for processing by a worker
-- Returns: Set of claimed company rows
CREATE OR REPLACE FUNCTION public.claim_customer_email_campaign_companies(
  p_campaign_id uuid,
  p_limit integer,
  p_worker_id text
)
RETURNS SETOF public.customer_email_campaign_companies
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE public.customer_email_campaign_companies c
       SET status = 'claimed',
           claimed_by = p_worker_id,
           claimed_at = now(),
           updated_at = now()
     WHERE c.id IN (
       SELECT id
         FROM public.customer_email_campaign_companies
        WHERE campaign_id = p_campaign_id
          AND (
            status = 'pending'
            OR (status = 'retry' AND retry_after IS NOT NULL AND retry_after <= now())
          )
        ORDER BY created_at
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
     )
     RETURNING *
  )
  SELECT * FROM claimed;
END;
$$;

-- Function: cancel_customer_email_campaign_pending
-- Purpose: Cancel all pending companies for a campaign
-- Side effects: Marks pending/retry companies as 'cancelled'
CREATE OR REPLACE FUNCTION public.cancel_customer_email_campaign_pending(
  p_campaign_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark all pending and retry companies as cancelled
  UPDATE public.customer_email_campaign_companies
     SET status = 'cancelled',
         updated_at = now()
   WHERE campaign_id = p_campaign_id
     AND status IN ('pending', 'claimed', 'queued', 'retry');

  -- Counters can be updated by the backend logic or another helper
END;
$$;
