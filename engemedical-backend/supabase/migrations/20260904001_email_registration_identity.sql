CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ALTER COLUMN cpf DROP NOT NULL;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'users'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'cpf'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.idx_users_cpf;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_unique_not_empty
  ON public.users (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_not_empty
  ON public.users (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL,
  cpf VARCHAR(14),
  email VARCHAR(200),
  password TEXT NOT NULL,
  tipo_usuario VARCHAR(20),
  registration_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20),
  ADD COLUMN IF NOT EXISTS registration_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'clients'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'cpf'
  LOOP
    EXECUTE format('ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_unique_not_empty
  ON public.clients (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cpf_unique_not_empty
  ON public.clients (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

CREATE INDEX IF NOT EXISTS idx_clients_registration_code
  ON public.clients (registration_code);
