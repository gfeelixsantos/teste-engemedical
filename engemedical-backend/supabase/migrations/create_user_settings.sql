-- Create extension pgcrypto if it doesn't exist for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create table user_settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_codigo varchar NOT NULL UNIQUE,
    assinatura_imagem_url text,
    assina_digitalmente boolean NOT NULL DEFAULT false,
    psc_padrao varchar,
    assinatura_posicao varchar CHECK (assinatura_posicao IN ('baixo', 'centro', 'topo')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for user_codigo
CREATE INDEX IF NOT EXISTS idx_user_settings_user_codigo ON public.user_settings(user_codigo);

-- Add comments for clarity
COMMENT ON TABLE public.user_settings IS 'Stores user preferences and settings';
COMMENT ON COLUMN public.user_settings.user_codigo IS 'Unique identifier for the professional user';
COMMENT ON COLUMN public.user_settings.assinatura_imagem_url IS 'URL to the image of the handwritten signature';
COMMENT ON COLUMN public.user_settings.assina_digitalmente IS 'Flag indicating if the user signs digitally';
COMMENT ON COLUMN public.user_settings.psc_padrao IS 'Default PSC provider if digital signature is enabled';
COMMENT ON COLUMN public.user_settings.assinatura_posicao IS 'Position of signature on document: bottom, center, or top';
