CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rows must come from an audited backfill. Runtime authorization must not derive from registration_code.
CREATE TABLE IF NOT EXISTS public.user_company_memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  company_code TEXT NOT NULL,
  company_name TEXT,
  role         TEXT NOT NULL DEFAULT 'CLIENTE',
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_company_memberships_company_code_normalized
    CHECK (company_code = btrim(company_code) AND company_code <> ''),
  CONSTRAINT user_company_memberships_user_company_unique
    UNIQUE (user_id, company_code)
);

CREATE INDEX IF NOT EXISTS idx_user_company_memberships_lookup
  ON public.user_company_memberships (user_id, active, company_code);

COMMENT ON TABLE public.user_company_memberships IS
  'Rows must come from an audited backfill; runtime authorization must not derive from registration_code.';
