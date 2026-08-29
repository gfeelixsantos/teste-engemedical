CREATE TABLE IF NOT EXISTS public.exames (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo              VARCHAR NOT NULL,
  nome               VARCHAR NOT NULL,
  codigos            TEXT[] NOT NULL DEFAULT '{}',
  status_finalizacao VARCHAR NOT NULL
                     CHECK (status_finalizacao IN ('FINALIZADO', 'AGUARDANDO_RESULTADO')),
  enviar_para_azure  BOOLEAN NOT NULL DEFAULT false,
  requer_assinatura  BOOLEAN NOT NULL DEFAULT false,
  template_key       VARCHAR,
  estimativa_minutos INTEGER,
  ativo              BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exames_grupo ON public.exames (grupo);
CREATE INDEX IF NOT EXISTS idx_exames_ativo ON public.exames (ativo);
CREATE INDEX IF NOT EXISTS idx_exames_codigos ON public.exames USING GIN (codigos);
