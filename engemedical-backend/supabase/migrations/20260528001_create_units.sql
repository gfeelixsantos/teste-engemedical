CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  nome_exibicao VARCHAR(200),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  endereco VARCHAR(300),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  cep VARCHAR(10),
  whatsapp VARCHAR(50),
  email VARCHAR(200),
  horario_funcionamento TEXT,
  qrcode_path VARCHAR(200),
  salas JSONB NOT NULL DEFAULT '{"recepcao":[],"exames":[]}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_nome ON public.units (nome);
CREATE INDEX IF NOT EXISTS idx_units_ordem ON public.units (ordem);
