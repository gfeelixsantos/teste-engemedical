-- Migration: Create user_activity_logs table for LGPD operational audit
-- Phase 1.3 — Activity Log / Auditoria Operacional LGPD

-- Create table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_codigo     varchar(255) NOT NULL,
  user_nome       varchar(255),
  user_perfil     varchar(100),
  acao            varchar(100) NOT NULL,
  recurso_id      varchar(255),
  recurso_tipo    varchar(100),
  paciente_codigo varchar(100),
  paciente_nome   varchar(255),
  unidade         varchar(100),
  detalhes        jsonb,
  ip              varchar(45),
  user_agent      varchar(512),
  request_id      varchar(100),
  created_at      timestamptz  DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ual_user_codigo     ON public.user_activity_logs (user_codigo);
CREATE INDEX IF NOT EXISTS idx_ual_acao            ON public.user_activity_logs (acao);
CREATE INDEX IF NOT EXISTS idx_ual_paciente_codigo ON public.user_activity_logs (paciente_codigo);
CREATE INDEX IF NOT EXISTS idx_ual_created_at      ON public.user_activity_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_ual_recurso_id      ON public.user_activity_logs (recurso_id);
CREATE INDEX IF NOT EXISTS idx_ual_unidade         ON public.user_activity_logs (unidade);
CREATE INDEX IF NOT EXISTS idx_ual_request_id      ON public.user_activity_logs (request_id);

-- Enable Row Level Security
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent via DO block — Supabase does not support CREATE POLICY IF NOT EXISTS)

-- INSERT: allow only service_role
DO $$ BEGIN
  CREATE POLICY "ual_insert_service_role"
    ON public.user_activity_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SELECT: allow only service_role
DO $$ BEGIN
  CREATE POLICY "ual_select_service_role"
    ON public.user_activity_logs
    FOR SELECT
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: block for ALL roles including service_role (records are immutable)
DO $$ BEGIN
  CREATE POLICY "ual_no_update"
    ON public.user_activity_logs
    FOR UPDATE
    TO PUBLIC
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: block for ALL roles including service_role (records cannot be deleted)
DO $$ BEGIN
  CREATE POLICY "ual_no_delete"
    ON public.user_activity_logs
    FOR DELETE
    TO PUBLIC
    USING (false);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
