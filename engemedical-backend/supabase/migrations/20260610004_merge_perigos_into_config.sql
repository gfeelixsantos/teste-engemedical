-- =====================================================
-- Migrar riscos_perigos para dentro de riscos_config
-- Relacionamento 1:1 (1 risco = 1 perigo)
-- =====================================================

-- 1. Adicionar 14 colunas do perigo em riscos_config
--    (nome do perigo já existe como 'descricao' ou será adicionado separadamente)
ALTER TABLE public.riscos_config
  ADD COLUMN IF NOT EXISTS perigo_nome VARCHAR,
  ADD COLUMN IF NOT EXISTS perigo_tipo_exposicao VARCHAR,
  ADD COLUMN IF NOT EXISTS perigo_fonte_geradora TEXT,
  ADD COLUMN IF NOT EXISTS perigo_trajetoria_acao TEXT,
  ADD COLUMN IF NOT EXISTS perigo_tecnica_utilizada TEXT,
  ADD COLUMN IF NOT EXISTS perigo_possiveis_danos TEXT,
  ADD COLUMN IF NOT EXISTS perigo_medidas_administrativas TEXT,
  ADD COLUMN IF NOT EXISTS perigo_epc_eficaz BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS perigo_epc_descricao TEXT,
  ADD COLUMN IF NOT EXISTS perigo_epi_eficaz BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS perigo_epi_descricao TEXT,
  ADD COLUMN IF NOT EXISTS perigo_acoes_necessarias TEXT,
  ADD COLUMN IF NOT EXISTS perigo_criterio_monitoracao TEXT,
  ADD COLUMN IF NOT EXISTS perigo_observacao TEXT;

-- 2. Migrar dados existentes de riscos_perigos → riscos_config
UPDATE public.riscos_config rc SET
  perigo_nome = rp.nome,
  perigo_tipo_exposicao = rp.tipo_exposicao,
  perigo_fonte_geradora = rp.fonte_geradora,
  perigo_trajetoria_acao = rp.trajetoria_acao,
  perigo_tecnica_utilizada = rp.tecnica_utilizada,
  perigo_possiveis_danos = rp.possiveis_danos,
  perigo_medidas_administrativas = rp.medidas_administrativas,
  perigo_epc_eficaz = rp.epc_eficaz,
  perigo_epc_descricao = rp.epc_descricao,
  perigo_epi_eficaz = rp.epi_eficaz,
  perigo_epi_descricao = rp.epi_descricao,
  perigo_acoes_necessarias = rp.acoes_necessarias,
  perigo_criterio_monitoracao = rp.criterio_monitoracao,
  perigo_observacao = rp.observacao
FROM public.riscos_perigos rp
WHERE rp.risco_config_id = rc.id;

-- 3. Dropar tabela riscos_perigos (inclui FK e índice automaticamente)
DROP TABLE IF EXISTS public.riscos_perigos;
