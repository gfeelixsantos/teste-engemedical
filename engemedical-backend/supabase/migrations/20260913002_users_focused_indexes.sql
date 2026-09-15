CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_not_empty
  ON public.users (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE INDEX IF NOT EXISTS idx_users_email_lookup_not_empty
  ON public.users (email)
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_unique_not_empty
  ON public.users (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE INDEX IF NOT EXISTS idx_users_active_profile_name
  ON public.users (ativo, perfil, nome)
  WHERE anonimizado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_name_not_anonymized
  ON public.users (nome)
  WHERE anonimizado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_name_not_anonymized
  ON public.users (ativo, nome)
  WHERE anonimizado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_tipo_usuario_active
  ON public.users (tipo_usuario, ativo)
  WHERE anonimizado_em IS NULL AND tipo_usuario IS NOT NULL;

DROP INDEX IF EXISTS public.idx_users_registration_code;
