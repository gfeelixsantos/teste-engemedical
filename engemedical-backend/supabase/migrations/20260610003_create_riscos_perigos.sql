CREATE TABLE IF NOT EXISTS public.riscos_perigos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risco_config_id           UUID NOT NULL REFERENCES public.riscos_config(id) ON DELETE CASCADE,
  nome                      VARCHAR NOT NULL,
  tipo_exposicao            VARCHAR,
  fonte_geradora            TEXT,
  trajetoria_acao           TEXT,
  tecnica_utilizada         TEXT,
  possiveis_danos           TEXT,
  medidas_administrativas   TEXT,
  epc_eficaz                BOOLEAN DEFAULT false,
  epc_descricao             TEXT,
  epi_eficaz                BOOLEAN DEFAULT false,
  epi_descricao             TEXT,
  acoes_necessarias         TEXT,
  criterio_monitoracao      TEXT,
  observacao                TEXT,
  ativo                     BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riscos_perigos_config ON public.riscos_perigos(risco_config_id);
