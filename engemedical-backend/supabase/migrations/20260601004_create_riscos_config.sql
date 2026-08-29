CREATE TABLE IF NOT EXISTS public.riscos_config (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       VARCHAR NOT NULL UNIQUE,
  descricao  VARCHAR NOT NULL,
  codigos    TEXT[] NOT NULL DEFAULT '{}',
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riscos_config_tipo ON public.riscos_config (tipo);
CREATE INDEX IF NOT EXISTS idx_riscos_config_ativo ON public.riscos_config (ativo);

INSERT INTO public.riscos_config (tipo, descricao, codigos) VALUES
  ('ALTURA', 'Trabalho em Altura', ARRAY['179','213','252','263','336','395','777','782','941','978','1277','1302','1379']),
  ('CONFINADO', 'Espaço Confinado', ARRAY['237','364','382','666','977'])
ON CONFLICT (tipo) DO NOTHING;
