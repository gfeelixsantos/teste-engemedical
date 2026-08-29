CREATE TABLE IF NOT EXISTS public.users (
  codigo VARCHAR(20) PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  telefone VARCHAR(50),
  perfil VARCHAR(100) NOT NULL DEFAULT 'CONVIDADO',
  conselho VARCHAR(50),
  uf_conselho VARCHAR(10),
  registro_conselho VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  anonimizado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  ultimo_login TIMESTAMPTZ,
  criado_por VARCHAR(20),
  atualizado_por VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users (cpf);
CREATE INDEX IF NOT EXISTS idx_users_perfil ON public.users (perfil);
