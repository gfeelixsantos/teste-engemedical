ALTER TABLE public.employee_commitments DROP CONSTRAINT IF EXISTS employee_commitments_user_codigo_fkey;
DROP INDEX IF EXISTS idx_employee_commitments_user_codigo;
ALTER TABLE public.employee_commitments DROP COLUMN IF EXISTS user_codigo;

ALTER TABLE public.employee_commitments ADD COLUMN participants TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_employee_commitments_participants ON public.employee_commitments USING GIN (participants);
