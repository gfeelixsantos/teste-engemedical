ALTER TABLE public.users
  ALTER COLUMN registration_code TYPE TEXT;

DROP INDEX IF EXISTS public.idx_users_registration_code;
