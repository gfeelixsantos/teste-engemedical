ALTER TABLE public.prestadores
ADD COLUMN IF NOT EXISTS unidade VARCHAR;

UPDATE public.prestadores
SET unidade = ''
WHERE unidade IS NULL;

ALTER TABLE public.prestadores
ALTER COLUMN unidade SET DEFAULT '';

ALTER TABLE public.prestadores
ALTER COLUMN unidade SET NOT NULL;
