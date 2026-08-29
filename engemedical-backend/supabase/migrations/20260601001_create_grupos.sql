CREATE TABLE IF NOT EXISTS public.grupos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR UNIQUE NOT NULL,
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grupos_ativo ON public.grupos (ativo);

INSERT INTO public.grupos (nome)
SELECT DISTINCT grupo FROM public.exames WHERE grupo IS NOT NULL
ON CONFLICT (nome) DO NOTHING;
