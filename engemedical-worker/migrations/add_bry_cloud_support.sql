-- Migration: Adicionar suporte ao BRy Cloud na tabela user_settings
-- Data: 2025-01-15

-- Adicionar colunas para suporte ao BRy Cloud (BRYKMS)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS assinatura_provider TEXT NULL CHECK (assinatura_provider IN ('PSC', 'BRYKMS'));

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS bry_cloud_user TEXT NULL;

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS bry_cloud_pin TEXT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_settings_provider ON user_settings(assinatura_provider);
CREATE INDEX IF NOT EXISTS idx_user_settings_bry_user ON user_settings(bry_cloud_user);

-- Adicionar comentários
COMMENT ON COLUMN user_settings.assinatura_provider IS 'Provedor de assinatura digital: PSC ou BRYKMS';
COMMENT ON COLUMN user_settings.bry_cloud_user IS 'ID do certificado do usuário no BRy Cloud';
COMMENT ON COLUMN user_settings.bry_cloud_pin IS 'PIN do certificado criptografado (AES-256-GCM)';

-- Garantir que apenas um provedor pode ser selecionado por vez
ALTER TABLE user_settings 
ADD CONSTRAINT chk_single_provider 
CHECK (
    (assinatura_provider IS NULL) OR
    (assinatura_provider = 'PSC' AND bry_cloud_user IS NULL) OR
    (assinatura_provider = 'BRYKMS' AND psc_padrao IS NULL)
);

-- Atualizar registros existentes para manter compatibilidade
UPDATE user_settings 
SET assinatura_provider = 'PSC' 
WHERE assinatura_provider IS NULL 
AND (psc_padrao IS NOT NULL OR assina_digitalmente = true);
