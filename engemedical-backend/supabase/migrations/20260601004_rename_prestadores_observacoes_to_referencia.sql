DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prestadores'
      AND column_name = 'observacoes'
  ) THEN
    ALTER TABLE public.prestadores
    RENAME COLUMN observacoes TO referencia;
  END IF;
END $$;
