ALTER TABLE public.riscos_config
  ADD COLUMN IF NOT EXISTS grupo          VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS parecer_apto   TEXT,
  ADD COLUMN IF NOT EXISTS parecer_inapto TEXT,
  ADD COLUMN IF NOT EXISTS parecer_opcoes TEXT[],
  ADD COLUMN IF NOT EXISTS observacao     TEXT;

CREATE INDEX IF NOT EXISTS idx_riscos_config_grupo ON public.riscos_config (grupo);

UPDATE public.riscos_config
  SET grupo = 'ACIDENTES'
  WHERE tipo IN ('ALTURA', 'CONFINADO') AND (grupo IS NULL OR grupo = '');

UPDATE public.riscos_config SET
  parecer_apto    = 'APTO PARA TRABALHO EM ALTURA',
  parecer_inapto  = 'INAPTO PARA TRABALHO EM ALTURA',
  parecer_opcoes  = ARRAY[
    'APTO PARA TRABALHO EM ALTURA',
    'APTO PARA TRABALHO EM ALTURA COM CINTO ACIMA DE 100 KG',
    'INAPTO PARA TRABALHO EM ALTURA'
  ]
WHERE tipo = 'ALTURA';

UPDATE public.riscos_config SET
  parecer_apto    = 'APTO PARA ESPAÇO CONFINADO',
  parecer_inapto  = 'INAPTO PARA ESPAÇO CONFINADO',
  parecer_opcoes  = ARRAY[
    'APTO PARA ESPAÇO CONFINADO',
    'INAPTO PARA ESPAÇO CONFINADO'
  ]
WHERE tipo = 'CONFINADO';
