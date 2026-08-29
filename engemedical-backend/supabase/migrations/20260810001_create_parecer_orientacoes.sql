-- Catálogo de orientações de parecer médico (texto de tela vs texto profissional de email)
-- texto_tela    -> exibido no prontuário/PDF (mantido como hoje)
-- texto_email   -> texto profissional enviado no email (PARECER_MEDICO / ASO_RELEASE)
-- libera_cliente-> true: email roteado para o cliente (ASO_RELEASE) | false: email para a equipe (PARECER_MEDICO)

CREATE TABLE IF NOT EXISTS public.parecer_orientacoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria      VARCHAR NOT NULL DEFAULT 'Geral',
  texto_tela     VARCHAR NOT NULL,
  texto_email    TEXT    NOT NULL,
  libera_cliente BOOLEAN NOT NULL DEFAULT true,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  ordem          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uk_parecer_orientacoes_texto UNIQUE (texto_tela, categoria)
);

-- Garante a constraint mesmo se a tabela já existir (aplicação parcial anterior).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uk_parecer_orientacoes_texto'
  ) THEN
    ALTER TABLE public.parecer_orientacoes
      ADD CONSTRAINT uk_parecer_orientacoes_texto UNIQUE (texto_tela, categoria);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parecer_orientacoes_ativo ON public.parecer_orientacoes (ativo);
CREATE INDEX IF NOT EXISTS idx_parecer_orientacoes_categoria ON public.parecer_orientacoes (categoria);

INSERT INTO public.parecer_orientacoes
  (categoria, texto_tela, texto_email, libera_cliente, ordem)
VALUES
  -- Cardiologia
  ('Cardiologia', 'HAS / Acompanhamento com cardiologista', 'O colaborador apresenta diagnóstico de HAS e/ou alteração cardiovascular, devendo manter tratamento e acompanhamento médico periódico com cardiologista.', false, 1),

  -- Visão / Oftalmologia
  ('Visão / Oftalmologia', 'Uso de óculos / Acompanhamento com oftalmologista', 'Recomendamos que o colaborador realize acompanhamento periódico com médico oftalmologista, mantendo o uso de óculos de grau durante as atividades laborais.', true, 2),
  ('Visão / Oftalmologia', 'Visão monocular — apto com orientação', 'O colaborador apresenta visão monocular e está apto ao trabalho, devendo manter acompanhamento oftalmológico regular e respeitar as orientações médicas quanto a atividades que demandem acuidade visual.', false, 3),

  -- Trabalho em Altura
  ('Trabalho em Altura', 'Apto para trabalho em altura — utilizar cinto', 'O colaborador está apto para trabalho em altura, sendo obrigatório o uso do cinto de segurança e demais equipamentos de proteção individual (EPI) conforme NR-35.', true, 4),
  ('Trabalho em Altura', 'Inapto para trabalho em altura', 'O colaborador está inapto para atividades em altura, devendo a empresa realocá-lo para atividades compatíveis com suas condições de saúde.', false, 5),

  -- Restrições Físicas
  ('Restrições Físicas', 'Não carregar peso excessivo', 'O colaborador não deve realizar o transporte manual de cargas acima do limite recomendado, conforme avaliação médica.', true, 6),

  -- Acompanhamento / Retorno
  ('Acompanhamento / Retorno', 'Retorno em 30 dias para reavaliação', 'O colaborador deverá retornar em 30 dias para reavaliação das condições de saúde e nova avaliação ocupacional.', true, 7),

  -- PCD / Deficiência
  ('PCD / Deficiência', 'PCD — deficiência auditiva', 'O colaborador se enquadra como Pessoa com Deficiência (PCD), apresentando deficiência auditiva, devendo ser realizadas as adequações necessárias no ambiente de trabalho.', false, 8)
ON CONFLICT (texto_tela, categoria) DO NOTHING;

