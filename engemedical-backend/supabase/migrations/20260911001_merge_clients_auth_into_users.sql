CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20),
  ADD COLUMN IF NOT EXISTS registration_code TEXT;

ALTER TABLE public.users
  ALTER COLUMN registration_code TYPE TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_not_empty
  ON public.users (lower(email))
  WHERE email IS NOT NULL AND email <> '';

DROP INDEX IF EXISTS public.idx_users_registration_code;

CREATE INDEX IF NOT EXISTS idx_users_tipo_usuario
  ON public.users (tipo_usuario);

DO $$
BEGIN
  IF to_regclass('public.clients') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.clients
    ALTER COLUMN registration_code TYPE TEXT;

  IF to_regclass('public.clients_migration_backup') IS NULL THEN
    CREATE TABLE public.clients_migration_backup AS
    SELECT * FROM public.clients;
  END IF;

  UPDATE public.users users
  SET
    email = COALESCE(NULLIF(lower(users.email), ''), NULLIF(lower(clients.email), '')),
    password = COALESCE(users.password, clients.password),
    tipo_usuario = COALESCE(NULLIF(users.tipo_usuario, ''), NULLIF(clients.tipo_usuario, '')),
    registration_code = COALESCE(
      NULLIF(users.registration_code, ''),
      NULLIF(clients.registration_code, ''),
      NULLIF(clients.codigo, '')
    ),
    atualizado_em = now()
  FROM public.clients clients
  WHERE users.codigo = CASE
    WHEN length(clients.codigo) <= 20 THEN clients.codigo
    ELSE 'CLI-' || upper(left(encode(digest(clients.codigo || ':' || clients.id::text, 'sha256'), 'hex'), 16))
  END;

  INSERT INTO public.users (
    codigo,
    cpf,
    nome,
    email,
    password,
    perfil,
    tipo_usuario,
    registration_code,
    ultimo_login,
    criado_em,
    atualizado_em
  )
  SELECT
    CASE
      WHEN length(clients.codigo) <= 20 THEN clients.codigo
      ELSE 'CLI-' || upper(left(encode(digest(clients.codigo || ':' || clients.id::text, 'sha256'), 'hex'), 16))
    END,
    NULLIF(clients.cpf, ''),
    COALESCE(NULLIF(clients.email, ''), clients.codigo),
    NULLIF(lower(clients.email), ''),
    clients.password,
    CASE
      WHEN clients.tipo_usuario = 'cliente' THEN 'CLIENTE'
      ELSE 'CONVIDADO'
    END,
    clients.tipo_usuario,
    COALESCE(NULLIF(clients.registration_code, ''), clients.codigo),
    clients.updated_at,
    COALESCE(clients.created_at, now()),
    COALESCE(clients.updated_at, now())
  FROM public.clients clients
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.users users
    WHERE users.codigo = CASE
      WHEN length(clients.codigo) <= 20 THEN clients.codigo
      ELSE 'CLI-' || upper(left(encode(digest(clients.codigo || ':' || clients.id::text, 'sha256'), 'hex'), 16))
    END
  )
  ON CONFLICT (codigo) DO UPDATE
  SET
    email = COALESCE(NULLIF(lower(public.users.email), ''), EXCLUDED.email),
    password = COALESCE(public.users.password, EXCLUDED.password),
    tipo_usuario = COALESCE(NULLIF(public.users.tipo_usuario, ''), EXCLUDED.tipo_usuario),
    registration_code = COALESCE(NULLIF(public.users.registration_code, ''), EXCLUDED.registration_code),
    atualizado_em = now();

  DROP TABLE IF EXISTS public.clients;
END $$;
