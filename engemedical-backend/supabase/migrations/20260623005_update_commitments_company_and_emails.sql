ALTER TABLE public.employee_commitments ADD COLUMN company VARCHAR(255);
ALTER TABLE public.employee_commitments ADD COLUMN company_contact VARCHAR(255);
ALTER TABLE public.employee_commitments ADD COLUMN emails_comunicado TEXT[] DEFAULT '{}'::TEXT[];

-- Migrate data if needed, then drop old column
ALTER TABLE public.employee_commitments DROP COLUMN IF EXISTS client_email;
