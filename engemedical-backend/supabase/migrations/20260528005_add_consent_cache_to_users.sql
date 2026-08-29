-- Migration: Add consent cache columns to users table
-- These are denormalized from user_consents for fast checking
-- The user_consents table remains the source of truth for LGPD audit

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS consentimento_aceito BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentimento_aceito_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consentimento_versao VARCHAR;
