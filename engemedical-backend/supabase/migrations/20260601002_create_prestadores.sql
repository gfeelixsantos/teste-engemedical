CREATE TABLE IF NOT EXISTS public.prestadores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR NOT NULL,
  endereco    TEXT,
  horario     VARCHAR,
  referencia  TEXT,
  grupos      TEXT[] NOT NULL DEFAULT '{}',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prestadores_grupos ON public.prestadores USING GIN (grupos);
CREATE INDEX IF NOT EXISTS idx_prestadores_ativo ON public.prestadores (ativo);
